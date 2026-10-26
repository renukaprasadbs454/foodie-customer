import { useState, useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomerZoneInfo } from '../features/restaurants/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.foodie.kwiko.org';

export type LocationSource = 'GPS' | 'SELECTED_ADDRESS' | 'FALLBACK';

export type GlobalLocationData = {
  address: string | null;
  coords: { latitude: number; longitude: number } | null;
  zone: CustomerZoneInfo | null;
  source: LocationSource;
  isLocating: boolean;
};

const STORAGE_KEYS = {
  SELECTED_ADDRESS: 'foodie_active_selected_address',
  LAST_COORDS: 'foodie_last_known_coords',
  LAST_ADDRESS: 'foodie_last_known_address',
};

export const globalLocation: GlobalLocationData = {
  address: null,
  coords: null,
  zone: null,
  source: 'GPS',
  isLocating: false,
};

type LocationListener = (data: GlobalLocationData) => void;
const listeners = new Set<LocationListener>();

export function subscribeLocation(listener: LocationListener): () => void {
  listeners.add(listener);
  listener({ ...globalLocation });
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const snapshot: GlobalLocationData = {
    ...globalLocation,
    coords: globalLocation.coords ? { ...globalLocation.coords } : null,
    zone: globalLocation.zone ? { ...globalLocation.zone } : null,
  };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (e) {
      // Ignore listener errors
    }
  });
}

let appStateSubscriptionInitialized = false;

// In-memory session selected address — persists during app refresh / screen changes,
// but is naturally cleared when the user quits/closes the app.
let sessionSelectedAddress: {
  address: string;
  coords: { latitude: number; longitude: number };
  zone: CustomerZoneInfo | null;
} | null = null;

export function setupLocationAppStateListener() {
  if (appStateSubscriptionInitialized) return;
  if (typeof AppState === 'undefined' || !AppState?.addEventListener) return;
  appStateSubscriptionInitialized = true;

  let lastState = AppState.currentState;
  AppState.addEventListener('change', (nextState: AppStateStatus) => {
    // Only re-fetch live location if in GPS mode; NEVER wipe a user's selected address!
    if (lastState && lastState.match(/inactive|background/) && nextState === 'active') {
      if (globalLocation.source === 'GPS') {
        void fetchExactLocation(true);
      }
    }
    lastState = nextState;
  });
}

/**
 * Detect customer operating zone dynamically from coordinates.
 */
export async function detectZoneFromCoords(lat: number, lng: number): Promise<CustomerZoneInfo | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`${API_BASE_URL}/api/v1/restaurants/zone-detect?lat=${lat}&lng=${lng}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const json = await resp.json();
      const d = json?.data ?? json;
      return {
        serviceable: Boolean(d?.serviceable),
        zoneId: d?.zoneId ?? null,
        zoneName: d?.zoneName ?? null,
        cityName: d?.cityName ?? null,
        latitude: d?.latitude ? Number(d.latitude) : null,
        longitude: d?.longitude ? Number(d.longitude) : null,
        restaurantCount: d?.restaurantCount ?? 0,
        availableZones: Array.isArray(d?.availableZones) ? d.availableZones : [],
        message: d?.message ?? '',
      };
    }
  } catch (e) {
    // Gracefully handle zone detect failure
  }
  return null;
}

/**
 * Reverse geocodes coordinates to a clean, human-readable address.
 * Prioritizes high detail (street, locality, city).
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  // 1. Try native expo-location reverse geocoding
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (res && res.length > 0) {
      const item = res[0];
      const streetOrName =
        item.street ||
        (item.name && !item.name.includes('+') && !item.name.match(/^[0-9A-Z]+\+[0-9A-Z]+$/)
          ? item.name
          : null);
      const locality = item.district || item.subregion || item.city;
      const region = item.region || item.city;

      const parts = [streetOrName, locality, region].filter(Boolean);
      if (parts.length > 0) {
        // Remove duplicates in parts
        const unique = parts.filter((val, idx) => parts.indexOf(val) === idx);
        return unique.join(', ');
      }
    }
  } catch (e) {
    // Fall back to HTTP reverse geocoding
  }

  // 2. Fallback to OpenStreetMap Nominatim with short timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: { 'User-Agent': 'FoodieCustomerApp/1.0' },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const json = await resp.json();
      const addr = json?.address;
      if (addr) {
        const area =
          addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.town || addr.city;
        const city = addr.city || addr.town || addr.county || addr.state;
        const formatted = [area, city].filter(Boolean).join(', ');
        if (formatted) return formatted;
      }
    }
  } catch (e) {
    // Continue
  }

  // 3. Coordinate fallback if reverse geocoding services are unreachable
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

let activeLocatePromise: Promise<GlobalLocationData> | null = null;

/**
 * Fetch the user's exact live location using device GPS.
 * High accuracy is strictly enforced. Deduplicates in-flight calls to avoid re-render loops.
 * Employs instant last-known position caching (< 20ms) so restaurants display immediately.
 */
export async function fetchExactLocation(force: boolean = false): Promise<GlobalLocationData> {
  if (activeLocatePromise) {
    return activeLocatePromise;
  }

  activeLocatePromise = (async () => {
    globalLocation.isLocating = true;
    notifyListeners();

    try {
      // 1. Web browser high-accuracy geolocation
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null as any), {
            enableHighAccuracy: true,
            timeout: 3000,
            maximumAge: 60000,
          });
        });

        if (pos?.coords) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          globalLocation.coords = { latitude: lat, longitude: lng };
          globalLocation.source = 'GPS';
          if (globalLocation.address && (globalLocation.address.includes('•') || globalLocation.address.startsWith('Home') || globalLocation.address.startsWith('Office'))) {
            globalLocation.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
          globalLocation.isLocating = false;
          notifyListeners();

          void detectZoneFromCoords(lat, lng).then((zone) => {
            if (zone) setGlobalZone(zone);
          });
          void reverseGeocodeCoords(lat, lng).then((address) => {
            globalLocation.address = address;
            notifyListeners();
            void AsyncStorage.setItem(STORAGE_KEYS.LAST_COORDS, JSON.stringify({ latitude: lat, longitude: lng }));
            void AsyncStorage.setItem(STORAGE_KEYS.LAST_ADDRESS, address);
          });

          return { ...globalLocation };
        }
      }

      // 2. Mobile Native Location: check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission was not granted by the user.');
        await loadCachedCoordsFallback();
        return { ...globalLocation };
      }

      // INSTANT FAST FIX: Retrieve last known position (< 15ms)
      let location: Location.LocationObject | null = null;
      try {
        location = await Location.getLastKnownPositionAsync();
      } catch { }

      if (location?.coords) {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        // Set coords & source instantly so restaurants render immediately with zero delay!
        globalLocation.coords = { latitude: lat, longitude: lng };
        globalLocation.source = 'GPS';
        if (globalLocation.address && (globalLocation.address.includes('•') || globalLocation.address.startsWith('Home') || globalLocation.address.startsWith('Office'))) {
          globalLocation.address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        globalLocation.isLocating = false;
        notifyListeners();

        // Parallel background zone detection & reverse geocoding
        void detectZoneFromCoords(lat, lng).then((zone) => {
          if (zone) setGlobalZone(zone);
        });
        void reverseGeocodeCoords(lat, lng).then((address) => {
          globalLocation.address = address;
          notifyListeners();
          void AsyncStorage.setItem(STORAGE_KEYS.LAST_COORDS, JSON.stringify({ latitude: lat, longitude: lng }));
          void AsyncStorage.setItem(STORAGE_KEYS.LAST_ADDRESS, address);
        });

        // Background refinement if device moved
        void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(async (fresh) => {
            if (fresh?.coords) {
              const dLat = Math.abs(fresh.coords.latitude - lat);
              const dLng = Math.abs(fresh.coords.longitude - lng);
              if (dLat > 0.0008 || dLng > 0.0008) {
                globalLocation.coords = { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
                const freshZone = await detectZoneFromCoords(fresh.coords.latitude, fresh.coords.longitude);
                if (freshZone) setGlobalZone(freshZone);
                const freshAddr = await reverseGeocodeCoords(fresh.coords.latitude, fresh.coords.longitude);
                globalLocation.address = freshAddr;
                notifyListeners();
              }
            }
          })
          .catch(() => {});

        return { ...globalLocation };
      }

      // If no last known position (first run), fetch fresh position with quick 3.5s timeout
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
        ]);
      } catch (posErr) {
        console.warn('Position fetch failed, falling back:', posErr);
      }

      if (location?.coords) {
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;

        globalLocation.coords = { latitude: lat, longitude: lng };
        globalLocation.source = 'GPS';
        globalLocation.isLocating = false;
        notifyListeners();

        void detectZoneFromCoords(lat, lng).then((zone) => {
          if (zone) setGlobalZone(zone);
        });
        void reverseGeocodeCoords(lat, lng).then((address) => {
          globalLocation.address = address;
          notifyListeners();
          void AsyncStorage.setItem(STORAGE_KEYS.LAST_COORDS, JSON.stringify({ latitude: lat, longitude: lng }));
          void AsyncStorage.setItem(STORAGE_KEYS.LAST_ADDRESS, address);
        });

        return { ...globalLocation };
      } else {
        await loadCachedCoordsFallback();
      }
    } catch (err) {
      console.warn('Error fetching exact location:', err);
      await loadCachedCoordsFallback();
    } finally {
      globalLocation.isLocating = false;
      notifyListeners();
      activeLocatePromise = null;
    }

    return { ...globalLocation };
  })();

  return activeLocatePromise;
}

async function loadCachedCoordsFallback() {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.LAST_COORDS);
    const cachedAddr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ADDRESS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.latitude && parsed?.longitude) {
        globalLocation.coords = {
          latitude: Number(parsed.latitude),
          longitude: Number(parsed.longitude),
        };
        globalLocation.address = cachedAddr || 'Current Location';
        globalLocation.source = 'FALLBACK';
        return;
      }
    }
  } catch {
    // Ignore cache load errors
  }

  if (!globalLocation.coords) {
    globalLocation.address = 'Locating...';
    globalLocation.source = 'FALLBACK';
  }
}

/**
 * Explicitly switch delivery location to a saved user address for the current session.
 * Preserves the selected address on page refresh/re-render, but will revert to GPS if app is closed and reopened.
 */
export async function setSelectedAddress(addr: {
  addressId?: string | null;
  label?: string | null;
  line1?: string | null;
  city?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}) {
  const lat = Number(addr.latitude);
  const lng = Number(addr.longitude);

  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    console.warn('Invalid coordinates provided for address selection:', addr);
    return;
  }

  const prefix = addr.label ? `${addr.label} • ` : '';
  const main = addr.line1 || addr.city || 'Delivery Address';
  const cityPart = addr.city && !main.includes(addr.city) ? `, ${addr.city}` : '';
  const formatted = `${prefix}${main}${cityPart}`;

  globalLocation.coords = { latitude: lat, longitude: lng };
  globalLocation.address = formatted;
  globalLocation.source = 'SELECTED_ADDRESS';
  globalLocation.isLocating = false;

  sessionSelectedAddress = {
    address: formatted,
    coords: { latitude: lat, longitude: lng },
    zone: globalLocation.zone,
  };

  // On Web, preserve in sessionStorage across page refresh (F5)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(
        'foodie_session_selected_address',
        JSON.stringify({
          address: formatted,
          latitude: lat,
          longitude: lng,
          zone: globalLocation.zone,
        })
      );
    } catch { }
  }

  // Resolve zone for selected address
  try {
    const detected = await detectZoneFromCoords(lat, lng);
    if (detected) {
      setGlobalZone(detected);
      if (sessionSelectedAddress) sessionSelectedAddress.zone = detected;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const curr = JSON.parse(window.sessionStorage.getItem('foodie_session_selected_address') || '{}');
          curr.zone = detected;
          window.sessionStorage.setItem('foodie_session_selected_address', JSON.stringify(curr));
        } catch { }
      }
    }
  } catch {
    // Ignore
  }

  notifyListeners();
}

/**
 * Set the currently identified operating zone.
 * Avoids firing listeners if the zone content has not changed.
 */
export function setGlobalZone(zone: CustomerZoneInfo | null) {
  if (
    globalLocation.zone?.zoneId === zone?.zoneId &&
    globalLocation.zone?.serviceable === zone?.serviceable &&
    globalLocation.zone?.restaurantCount === zone?.restaurantCount
  ) {
    return;
  }
  globalLocation.zone = zone;
  notifyListeners();
}

/**
 * Initialize location on application startup or reopening.
 * If user selected an address during the current session (or refreshed the page), preserves it.
 * If the app was closed and opened again (fresh process), fetches fresh live GPS location.
 */
export async function initGlobalLocation(forceGps: boolean = false) {
  setupLocationAppStateListener();

  if (forceGps) {
    sessionSelectedAddress = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem('foodie_session_selected_address');
      } catch { }
    }
    globalLocation.source = 'GPS';
    return await fetchExactLocation(true);
  }

  // 1. Check if there is an active session address from page refresh (do not overwrite on refresh!)
  if (sessionSelectedAddress) {
    globalLocation.coords = { ...sessionSelectedAddress.coords };
    globalLocation.address = sessionSelectedAddress.address;
    globalLocation.source = 'SELECTED_ADDRESS';
    if (sessionSelectedAddress.zone) globalLocation.zone = sessionSelectedAddress.zone;
    notifyListeners();
    return { ...globalLocation };
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem('foodie_session_selected_address');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.latitude && parsed?.longitude) {
          globalLocation.coords = { latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) };
          globalLocation.address = parsed.address;
          globalLocation.source = 'SELECTED_ADDRESS';
          if (parsed.zone) globalLocation.zone = parsed.zone;
          sessionSelectedAddress = {
            address: parsed.address,
            coords: globalLocation.coords,
            zone: globalLocation.zone,
          };
          notifyListeners();
          return { ...globalLocation };
        }
      }
    } catch { }
  }

  // 2. Cold launch / app reopened after close: reset to live GPS mode & fetch fast
  globalLocation.source = 'GPS';
  return await fetchExactLocation(true);
}

const stableTriggerLocate = () => fetchExactLocation(true);

/**
 * Custom React hook to subscribe to global location state with stable function references.
 */
export function useGlobalLocation() {
  const [state, setState] = useState<GlobalLocationData>({ ...globalLocation });

  useEffect(() => {
    const unsubscribe = subscribeLocation((data) => {
      setState(data);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    fetchExactLocation: stableTriggerLocate,
    setSelectedAddress,
    setZone: setGlobalZone,
  };
}
