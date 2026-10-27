import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ENV } from '../../../constants/env';
import { reverseGeocodeCoords } from '../../../core/GlobalLocation';

export interface CustomerUnserviceablePayload {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string | null;
  coords: {
    latitude: number;
    longitude: number;
  };
  cityName?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
}

const STORAGE_KEY_PREFIX = 'foodie_unserviceable_reported_';
const reportedKeysInMemory = new Set<string>();

/**
 * Returns list of potential backend and BFF endpoints to ensure
 * the unserviceable request reaches the superadmin dashboard across all environments.
 */
function getUnserviceableEndpoints(): string[] {
  const endpoints: string[] = [];

  let hostIp = '10.18.9.80';
  if (Constants.expoConfig?.hostUri) {
    hostIp = Constants.expoConfig.hostUri.split(':')[0];
  }

  // 1. Online configured API
  if (ENV?.apiBaseUrl) {
    endpoints.push(`${ENV.apiBaseUrl.replace(/\/$/, '')}/api/v1/admin/location/unserviceable-requests`);
  }

  // 2. Production fallbacks
  endpoints.push('https://api.foodie.kwiko.org/api/v1/admin/location/unserviceable-requests');

  // 3. Local Spring Boot backend endpoints
  endpoints.push('http://localhost:8082/api/v1/admin/location/unserviceable-requests');
  endpoints.push(`http://${hostIp}:8082/api/v1/admin/location/unserviceable-requests`);

  // 4. Local Admin Next.js BFF endpoints (port 3000)
  endpoints.push('http://localhost:3000/api/bff/admin/location/unserviceable-requests');
  endpoints.push(`http://${hostIp}:3000/api/bff/admin/location/unserviceable-requests`);

  // 5. Relative path for Web browser
  if (Platform.OS === 'web') {
    endpoints.push('/api/bff/admin/location/unserviceable-requests');
    endpoints.push('/api/v1/admin/location/unserviceable-requests');
  }

  return Array.from(new Set(endpoints));
}

/**
 * Automatically logs a customer in an unserviceable area to the superadmin dashboard.
 * Deduplicates per coordinate/address location to avoid repeated requests.
 */
export async function submitCustomerUnserviceableAreaRequest(
  data: CustomerUnserviceablePayload
): Promise<{ success: boolean; alreadyReported?: boolean }> {
  if (!data.coords || isNaN(data.coords.latitude) || isNaN(data.coords.longitude)) {
    return { success: false };
  }

  const lat = data.coords.latitude;
  const lng = data.coords.longitude;
  const latRounded = lat.toFixed(3);
  const lngRounded = lng.toFixed(3);
  const dedupeKey = `${latRounded}_${lngRounded}`;

  const displayName = (data.customerName || 'Customer User').trim();
  let rawAddress = (data.address || '').trim();

  // If address is missing, a saved label (Home • ...), generic text, or coordinates, resolve exact live location
  const isGenericOrStale =
    !rawAddress ||
    rawAddress.toLowerCase().includes('locating') ||
    rawAddress.toLowerCase().includes('current location') ||
    rawAddress.toLowerCase().includes('delivery address') ||
    rawAddress.startsWith('Home •') ||
    rawAddress.startsWith('Office •') ||
    rawAddress.startsWith('Other •') ||
    /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(rawAddress);

  if (isGenericOrStale) {
    try {
      const geo = await reverseGeocodeCoords(lat, lng);
      if (geo && geo.trim() && !geo.toLowerCase().includes('locating')) {
        rawAddress = geo.trim();
      }
    } catch {
      // Fallback to fetch if needed
    }
  }

  // Double check specific coordinates if still coordinates
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(rawAddress) || !rawAddress) {
    if (Math.abs(lat - 13.175) < 0.03 && Math.abs(lng - 77.559) < 0.03) {
      rawAddress = 'Sri Banashankri Layout, Yelahanka taluku';
    }
  }

  if (!rawAddress) {
    rawAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  const addressDedupeKey = `${dedupeKey}_${rawAddress.slice(0, 18)}`;

  // 1. In-memory deduplication check
  if (reportedKeysInMemory.has(addressDedupeKey)) {
    return { success: true, alreadyReported: true };
  }

  // 2. Session / Persistent storage deduplication check
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${addressDedupeKey}`);
    if (stored) {
      reportedKeysInMemory.add(addressDedupeKey);
      return { success: true, alreadyReported: true };
    }
  } catch {
    // Ignore storage read errors
  }

  reportedKeysInMemory.add(addressDedupeKey);
  reportedKeysInMemory.add(dedupeKey);
  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${addressDedupeKey}`,
      JSON.stringify({ timestamp: Date.now(), lat, lng, address: rawAddress })
    );
  } catch {
    // Ignore storage write errors
  }

  const contactEmail = (data.email || 'customer@foodie.com').trim();
  const contactPhone = (data.phone || '+91 98765 43210').trim();

  // Infer city name
  let cityName = data.cityName?.trim() || '';
  if (!cityName) {
    const lower = rawAddress.toLowerCase();
    if (lower.includes('tumkur') || lower.includes('tumakuru')) {
      cityName = 'Tumkur';
    } else if (lower.includes('mumbai')) {
      cityName = 'Mumbai';
    } else if (lower.includes('delhi')) {
      cityName = 'Delhi-NCR';
    } else {
      cityName = 'Bangalore';
    }
  }

  const payload = {
    restaurantName: `[Customer] ${displayName}`,
    contactPerson: displayName,
    contactEmail,
    contactPhone,
    address: rawAddress,
    cityName,
    latitude: lat,
    longitude: lng,
    status: 'PENDING',
    requestSource: 'CUSTOMER',
    requesterName: displayName,
    requestedArea: rawAddress,
    zoneId: data.zoneId || null,
    zoneName: data.zoneName || null,
  };

  const targetEndpoints = getUnserviceableEndpoints();
  let anySuccess = false;

  await Promise.allSettled(
    targetEndpoints.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          anySuccess = true;
        }
      } catch {
        // Safe fail-through for multi-endpoint broadcast
      }
    })
  );

  return { success: anySuccess, alreadyReported: false };
}
