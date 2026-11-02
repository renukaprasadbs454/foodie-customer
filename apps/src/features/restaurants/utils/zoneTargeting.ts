import type { CustomerZoneInfo, RestaurantSummary } from '../types';
import { getDistanceKm } from '../types';
import { isZoneMatching } from '../../../api/endpoints/bannersApi';
import type { SearchFoodItemDto } from '../../../api/endpoints/menuApi';

// Hardcoded catalogue of known restaurant IDs per zone (acts as deterministic mapping)
export const TUMKUR_ZONE_RESTAURANT_IDS = new Set<string>([
  'b0005826-32e2-41ce-bc4e-917f8183707b', // Hotel Mayura
  'b9cc0e0f-8de6-4f2f-b70a-f3d61f86dab5', // Basveshwara kanavali
  '2d11171f-4cd9-4b1a-adab-bc98b888f669', // Rayara mane
  'ed9ac710-9915-4cbc-b3cb-30cd0981dd03', // Tumkur delight
  '5d938f03-719b-48c3-9c57-99b94d14374f', // Madhuvan
  'd3133510-5295-4753-9418-c06ecb3e962f', // Meghana Foods (Biryani)
  'dab800d2-31cf-4013-a9cf-e3a0bafd9baf', // CTR (Dosa)
]);

export const BANGALORE_ZONE_RESTAURANT_IDS = new Set<string>([
  '51081eb4-1441-467b-ac81-5107d15a6731', // Demo
  '1283e199-22f1-4b7f-9bab-930a0d2c4387', // Yiu
  '4be4128c-db89-4e72-8017-fa2c3f6b5d79', // Empire
  '0ef1ee83-fef4-458a-952c-3b9c543a366a', // Test Restaurant
  'b7409190-8c81-44a8-8cee-d817d84df5f0', // Test Restaurant
  '16b86453-52f9-4526-bd76-02234a8478da', // Ganesha Hotel
  '8f1de57c-777a-470c-a8a9-063646a989af', // Royal Hotel
  'ebef972f-8a30-4a57-a2a6-66e3d31d4389', // Shetty biriyani house
  '8742d1a6-a93f-4c53-9c71-ed431157888e', // Shetty biriyani 2
  'e27b20dc-783b-4aff-8af6-9da360b2ff9f', // Spice Garden Biryani
  '533656b2-2c7a-4e39-899b-9b8015cdd8aa', // Asian Wok & Noodle House
]);

export const HASSAN_ZONE_RESTAURANT_IDS = new Set<string>([
  '5b99c65e-59a5-42f6-a5ce-92b386f1698c', // Raama
]);

/**
 * Checks whether a given restaurant belongs strictly to the customer's active zone.
 */
export function isRestaurantInZone(
  restaurant: RestaurantSummary | {
    id?: string;
    zoneId?: string | null;
    zoneName?: string | null;
    city?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    name?: string;
  },
  zone?: CustomerZoneInfo | {
    zoneId?: string | null;
    zoneName?: string | null;
    cityName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null
): boolean {
  if (!zone) return true;

  const zoneIdStr = (zone.zoneId || zone.zoneName || zone.cityName || '').toLowerCase();
  const isBlrCustomer = isZoneMatching('bangalore', zoneIdStr) || isZoneMatching('bengaluru', zoneIdStr);
  const isTmkCustomer = isZoneMatching('tumkur', zoneIdStr) || isZoneMatching('tumakuru', zoneIdStr);
  const isHasCustomer = isZoneMatching('hassan', zoneIdStr);

  const restoId = (restaurant as any).id || (restaurant as any).restaurantId || '';

  // 1. Infallible Catalog lookup by Restaurant ID
  if (restoId) {
    if (TUMKUR_ZONE_RESTAURANT_IDS.has(restoId)) {
      return isTmkCustomer;
    }
    if (BANGALORE_ZONE_RESTAURANT_IDS.has(restoId)) {
      return isBlrCustomer;
    }
    if (HASSAN_ZONE_RESTAURANT_IDS.has(restoId)) {
      return isHasCustomer;
    }
  }

  // 2. ZoneId field match if present
  if ((restaurant as any).zoneId) {
    const rZone = String((restaurant as any).zoneId);
    if (isZoneMatching(rZone, zoneIdStr)) return true;
    // Explicit foreign zone tag
    if (isZoneMatching('tumkur', rZone) && isBlrCustomer) return false;
    if (isZoneMatching('bangalore', rZone) && isTmkCustomer) return false;
  }

  // 3. City name check
  if (restaurant.city) {
    const c = restaurant.city.toLowerCase();
    const isRestoTumkur = c.includes('tumkur') || c.includes('tumakuru') || c.includes('tumakur');
    const isRestoBangalore = c.includes('bangalore') || c.includes('bengaluru') || c.includes('ramapura');

    if (isRestoTumkur && isBlrCustomer) return false;
    if (isRestoBangalore && isTmkCustomer) return false;
    if (isRestoTumkur && isTmkCustomer) return true;
    if (isRestoBangalore && isBlrCustomer) return true;
  }

  // 4. Geographic coordinates boundary check
  const lat = Number(restaurant.latitude);
  const lng = Number(restaurant.longitude);

  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    // Tumkur latitude is ~13.31 - 13.36, Longitude ~77.08 - 77.15
    // Bangalore latitude is ~12.91 - 13.18, Longitude ~77.56 - 77.68
    if (isTmkCustomer) {
      if (lat >= 13.25 && lng <= 77.35) return true;
      if (lat < 13.20) return false; // Strictly in Bangalore/south
    }
    if (isBlrCustomer) {
      if (lat < 13.25 && lng >= 77.40) return true;
      if (lat >= 13.28) return false; // Strictly in Tumkur/north
    }

    // Distance to zone center
    if (zone.latitude && zone.longitude) {
      const dist = getDistanceKm(Number(zone.latitude), Number(zone.longitude), lat, lng);
      return dist <= 30.0;
    }
  }

  // Fallback: If no discriminating feature found, preserve item
  return true;
}

/**
 * Filters food items strictly for the restaurants present in the target zone,
 * and fills in accurate restaurant names.
 */
export function filterFoodItemsForZone(
  foodItems: SearchFoodItemDto[],
  zoneRestaurants: RestaurantSummary[]
): SearchFoodItemDto[] {
  if (!Array.isArray(foodItems) || foodItems.length === 0) return [];
  if (!Array.isArray(zoneRestaurants) || zoneRestaurants.length === 0) return foodItems;

  const restoMap = new Map<string, RestaurantSummary>();
  zoneRestaurants.forEach((r) => {
    if (r.id) restoMap.set(r.id, r);
  });

  return foodItems
    .filter((item) => {
      if (!item.restaurantId) return true;
      // Filter out dishes from restaurants outside this zone
      return restoMap.has(item.restaurantId);
    })
    .map((item) => {
      const match = item.restaurantId ? restoMap.get(item.restaurantId) : undefined;
      return {
        ...item,
        restaurantName: match?.name || item.restaurantName || 'Foodie Partner',
      };
    });
}

/**
 * Returns the canonical zone identifier and display name for a given restaurant.
 */
export function getRestaurantZone(restaurant?: {
  id?: string | null;
  zoneId?: string | null;
  zoneName?: string | null;
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  name?: string | null;
} | null): { zoneId: string; zoneName: string } {
  if (!restaurant) {
    return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
  }

  const restoId = (restaurant as any).id || (restaurant as any).restaurantId || '';

  // 1. Infallible Catalog lookup by Restaurant ID
  if (restoId) {
    if (TUMKUR_ZONE_RESTAURANT_IDS.has(restoId)) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (BANGALORE_ZONE_RESTAURANT_IDS.has(restoId)) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (HASSAN_ZONE_RESTAURANT_IDS.has(restoId)) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
  }

  // 2. Explicit zoneId field
  if ((restaurant as any).zoneId) {
    const z = String((restaurant as any).zoneId).toLowerCase();
    if (z.includes('tumkur') || z.includes('tumakuru') || z.includes('tmk')) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (z.includes('bangalore') || z.includes('bengaluru') || z.includes('blr')) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (z.includes('hassan')) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
    return { zoneId: String((restaurant as any).zoneId), zoneName: (restaurant as any).zoneName || 'Local Zone' };
  }

  // 3. City name check
  if (restaurant.city) {
    const c = restaurant.city.toLowerCase();
    if (c.includes('tumkur') || c.includes('tumakuru')) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (c.includes('bangalore') || c.includes('bengaluru') || c.includes('ramapura')) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (c.includes('hassan')) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
  }

  // 4. Geographic coordinates
  const lat = Number(restaurant.latitude);
  const lng = Number(restaurant.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    if (lat >= 13.25 && lng <= 77.35) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (lat < 13.25 && lat > 12.5) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
  }

  // Default to Bengaluru Zone
  return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
}

/**
 * Returns the canonical zone identifier and display name for a customer delivery address.
 */
export function getAddressZone(address?: {
  addressId?: string;
  city?: string | null;
  pincode?: string | null;
  line1?: string | null;
  line2?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  zoneId?: string | null;
} | null): { zoneId: string; zoneName: string } {
  if (!address) {
    return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
  }

  // 1. Explicit zoneId if provided
  if ((address as any).zoneId) {
    const z = String((address as any).zoneId).toLowerCase();
    if (z.includes('tumkur') || z.includes('tumakuru') || z.includes('tmk')) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (z.includes('bangalore') || z.includes('bengaluru') || z.includes('blr')) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (z.includes('hassan')) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
  }

  // 2. City name check
  if (address.city) {
    const c = address.city.toLowerCase();
    if (c.includes('tumkur') || c.includes('tumakuru') || c.includes('tumakur')) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (c.includes('bangalore') || c.includes('bengaluru') || c.includes('ramapura')) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (c.includes('hassan')) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
  }

  // 3. Pincode check
  if (address.pincode) {
    const pin = address.pincode.trim();
    if (pin.startsWith('572')) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (pin.startsWith('560')) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
    if (pin.startsWith('573')) {
      return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
    }
  }

  // 4. Coordinates check
  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    if (lat >= 13.25 && lng <= 77.35) {
      return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
    }
    if (lat < 13.25 && lat > 12.5) {
      return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
    }
  }

  // 5. Line1 / Line2 text fallback
  const text = `${address.line1 || ''} ${address.line2 || ''}`.toLowerCase();
  if (text.includes('tumkur') || text.includes('tumakuru')) {
    return { zoneId: 'dz-tumkur-zone', zoneName: 'Tumkur Zone' };
  }
  if (text.includes('bangalore') || text.includes('bengaluru')) {
    return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
  }
  if (text.includes('hassan')) {
    return { zoneId: 'dz-hassan-zone', zoneName: 'Hassan Zone' };
  }

  // Default to Bengaluru Zone
  return { zoneId: 'dz-bengaluru-zone', zoneName: 'Bengaluru Zone' };
}

/**
 * Checks whether a given delivery address belongs strictly to the selected restaurant's zone.
 * An order cannot be placed across zones (intra-zone only).
 */
export function isAddressInRestaurantZone(
  address?: any | null,
  restaurant?: any | null
): boolean {
  if (!address || !restaurant) return true;
  const restoZone = getRestaurantZone(restaurant);
  const addrZone = getAddressZone(address);
  return restoZone.zoneId === addrZone.zoneId;
}
