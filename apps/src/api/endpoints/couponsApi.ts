import { baseApi } from '../baseApi';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ApplyCouponRequest,
  ApplyCouponResult,
  EligibleCoupon,
} from '../../features/checkout/types';
import {
  isCouponExpired,
  filterCouponsForRestaurant,
  isCouponInRestaurantZone,
  normalizeZoneId,
  isZoneMatching,
} from '../../features/checkout/couponUtils';

export { isCouponExpired, filterCouponsForRestaurant, isCouponInRestaurantZone, normalizeZoneId };

export type EligibleCouponsArg = {
  restaurantId?: string;
  restaurantZoneId?: string | null;
  zoneId?: string | null;
  restaurantName?: string | null;
  cartTotal?: number | string;
  enabledCouponIds?: string[] | null;
};

const STORAGE_KEY_PREFIX = '@foodie:restaurant_coupons:';

/**
 * Filter coupons for customer zone (backward-compatible helper).
 */
export function filterCouponsForZone(coupons: EligibleCoupon[], zoneId?: string | null): EligibleCoupon[] {
  if (!Array.isArray(coupons)) return [];
  const cleanZone = zoneId ? zoneId.trim() : '';

  return coupons.filter((c) => {
    if (!c || !c.code) return false;

    // 1. If coupon explicitly belongs to All Zones or has no zone set (Super Admin created for all zones)
    const isAllZones =
      !c.zoneId ||
      c.zoneId === 'ALL' ||
      !c.zoneId.trim() ||
      (c.zoneName && c.zoneName.toLowerCase().includes('all'));

    if (isAllZones) {
      return true;
    }

    // 2. Check zone matching on coupon's zoneId and zoneName
    if (cleanZone && cleanZone.toLowerCase() !== 'all') {
      if (c.zoneId && isZoneMatching(c.zoneId, cleanZone)) return true;
      if (c.zoneName && isZoneMatching(c.zoneName, cleanZone)) return true;
      return false;
    }

    // 3. If customer zone is not specified, show all active coupons
    return true;
  });
}

function mapRawCoupon(c: any, isExplicitRestaurantSource?: boolean, restaurantId?: string): EligibleCoupon {
  const isAct =
    c.isActive !== false &&
    String(c.status || '').toUpperCase() !== 'DEACTIVATED' &&
    String(c.status || '').toUpperCase() !== 'DISABLED';

  const isPromo =
    String(c.couponType || '').toUpperCase() === 'PROMO_COUPON' ||
    String(c.couponType || '').toUpperCase() === 'PROMO' ||
    String(c.couponType || '').toUpperCase() === 'NEW_USER' ||
    String(c.couponType || '').toUpperCase() === 'FIRST_ORDER' ||
    String(c.funderType || '').toUpperCase() === 'FOODIE';

  const couponRestId = isPromo
    ? null
    : c.restaurantId
    ? String(c.restaurantId).trim()
    : isExplicitRestaurantSource && restaurantId
    ? restaurantId
    : null;

  return {
    couponId: String(c.couponId || c.id || c.code || ''),
    code: String(c.code || '').trim().toUpperCase(),
    title: c.title || undefined,
    discountType: c.discountType || (c.benefitMode === 'FLAT' ? 'FLAT' : 'PERCENT'),
    value: Number(c.value ?? c.discountValue ?? 0),
    minOrderAmount: Number(c.minOrderAmount ?? c.minPurchase ?? 0),
    maxDiscountAmount:
      c.maxDiscountAmount != null
        ? Number(c.maxDiscountAmount)
        : c.maxDiscount != null
        ? Number(c.maxDiscount)
        : null,
    maxDiscount:
      c.maxDiscount != null
        ? Number(c.maxDiscount)
        : c.maxDiscountAmount != null
        ? Number(c.maxDiscountAmount)
        : null,
    couponType: c.couponType || c.type || (isPromo ? 'PROMO_COUPON' : (couponRestId ? 'RESTAURANT' : undefined)),
    funderType: c.funderType || (isPromo ? 'FOODIE' : (c.adminDiscount != null && c.restaurantDiscount != null ? 'SHARED' : undefined)),
    adminDiscount: c.adminDiscount != null ? Number(c.adminDiscount) : null,
    restaurantDiscount: c.restaurantDiscount != null ? Number(c.restaurantDiscount) : null,
    expiryDate: c.expiryDate || null,
    restaurantId: couponRestId,
    restaurantName: c.restaurantName || null,
    isActive: isAct,
    status: c.status || (isAct ? 'ACTIVE' : 'DEACTIVATED'),
    approvalStatus: c.approvalStatus || 'APPROVED',
    zoneId: c.zoneId || null,
    zoneName: c.zoneName || null,
    isAllZones: Boolean(c.isAllZones || !c.zoneId || c.zoneId === 'ALL' || (c.zoneName && String(c.zoneName).toLowerCase().includes('all'))),
  };
}

function mergeUniqueCoupons(primary: EligibleCoupon[], secondary: EligibleCoupon[]): EligibleCoupon[] {
  const seen = new Set<string>();
  const merged: EligibleCoupon[] = [];
  for (const c of primary) {
    const key = (c.code || c.couponId || '').toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(c);
    }
  }
  for (const c of secondary) {
    const key = (c.code || c.couponId || '').toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(c);
    }
  }
  return merged;
}

/**
 * P2-CUS-04 coupons on Checkout / Cart — restaurant-specific eligible list + apply preview.
 * Fetches and displays ONLY the enabled coupons of the selected restaurant.
 */
export const couponsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleCoupons: builder.query<EligibleCoupon[], EligibleCouponsArg | void>({
      queryFn: async (arg, _queryApi, _extraOptions, baseQuery) => {
        const restaurantId = (arg?.restaurantId || '').trim();
        const restaurantZoneId = (arg?.restaurantZoneId || arg?.zoneId || '').trim();
        const restaurantName = (arg?.restaurantName || '').trim();
        const cartTotal = Number(arg?.cartTotal || 0);
        const enabledCouponIds = arg?.enabledCouponIds || null;

        // If no restaurant is selected, no restaurant-specific coupons can be shown
        if (!restaurantId) {
          return { data: [] };
        }

        // Determine host IP (for mobile emulator / web / LAN dev server)
        let hostIp = 'localhost';
        if (Constants.expoConfig?.hostUri) {
          hostIp = Constants.expoConfig.hostUri.split(':')[0];
        } else if (Platform.OS === 'android') {
          hostIp = '10.0.2.2';
        }

        const candidateBffUrls = [
          `http://${hostIp}:3000`,
          `http://localhost:3000`,
          `http://127.0.0.1:3000`,
          `http://10.109.177.186:3000`,
          `http://${hostIp}:3100`,
          `http://localhost:3100`,
        ];

        let fetchedCoupons: EligibleCoupon[] = [];

        // 1. Try candidate Admin/Restaurant BFF endpoints with restaurantId
        for (const base of candidateBffUrls) {
          try {
            const endpoints = [
              `${base}/api/bff/restaurant/coupons?restaurantId=${encodeURIComponent(restaurantId)}${restaurantZoneId ? `&zoneId=${encodeURIComponent(restaurantZoneId)}` : ''}&_t=${Date.now()}`,
              `${base}/api/bff/coupons/eligible?restaurantId=${encodeURIComponent(restaurantId)}&cartTotal=${cartTotal}${restaurantZoneId ? `&zoneId=${encodeURIComponent(restaurantZoneId)}` : ''}`,
            ];

            for (const targetUrl of endpoints) {
              try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 1500);
                const res = await fetch(targetUrl, { signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                  const json = await res.json();
                  const list = json?.data ?? json;
                  if (Array.isArray(list) && list.length > 0) {
                    const mapped = list.map((item: any) => mapRawCoupon(item, true, restaurantId));
                    fetchedCoupons = mergeUniqueCoupons(fetchedCoupons, mapped);
                  }
                }
              } catch {
                // Next candidate
              }
            }
            if (fetchedCoupons.length > 0) {
              break;
            }
          } catch {
            // Next base URL
          }
        }

        // 2. Query remote backend endpoints with restaurantId
        try {
          const restRes = await baseQuery({
            url: '/api/v1/restaurant/coupons',
            params: {
              restaurantId,
              ...(restaurantZoneId ? { zoneId: restaurantZoneId } : {}),
            },
          });
          if (restRes.data) {
            const rawList = (restRes.data as any)?.data ?? restRes.data ?? [];
            if (Array.isArray(rawList) && rawList.length > 0) {
              const mapped = rawList.map((item: any) => mapRawCoupon(item, true, restaurantId));
              fetchedCoupons = mergeUniqueCoupons(fetchedCoupons, mapped);
            }
          }
        } catch {
          // Fall through
        }

        try {
          const relativeRes = await baseQuery({
            url: '/api/v1/coupons/eligible',
            params: {
              restaurantId,
              cartTotal,
              ...(restaurantZoneId ? { zoneId: restaurantZoneId } : {}),
            },
            headers: restaurantZoneId ? { 'x-active-zone-id': restaurantZoneId } : undefined,
          });

          if (relativeRes.data) {
            const rawList = (relativeRes.data as any)?.data ?? relativeRes.data ?? [];
            if (Array.isArray(rawList) && rawList.length > 0) {
              const mapped = rawList.map((item: any) => mapRawCoupon(item, true, restaurantId));
              fetchedCoupons = mergeUniqueCoupons(fetchedCoupons, mapped);
            }
          }
        } catch {
          // Fall through
        }

        // 3. Check local AsyncStorage for restaurant-specific cached coupons
        try {
          const storageKey = `${STORAGE_KEY_PREFIX}${restaurantId}`;
          const cached = await AsyncStorage.getItem(storageKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map((item: any) => mapRawCoupon(item, true, restaurantId));
              // AsyncStorage reflects restaurant's immediate toggle changes
              fetchedCoupons = mergeUniqueCoupons(mapped, fetchedCoupons);
            }
          }
        } catch {
          // Ignore storage read error
        }

        // 4. Strict Restaurant Scoping and Zone Verification
        const filtered = filterCouponsForRestaurant(
          fetchedCoupons,
          restaurantId,
          restaurantZoneId,
          {
            restaurantName,
            enabledCouponIds,
          }
        );

        return { data: filtered };
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Coupon', id: 'ELIGIBLE' },
        { type: 'Coupon', id: `RESTAURANT-${arg?.restaurantId || 'ALL'}` },
      ],
      keepUnusedDataFor: 0,
    }),
    applyCoupon: builder.mutation<ApplyCouponResult, ApplyCouponRequest>({
      queryFn: async (body, _queryApi, _extraOptions, baseQuery) => {
        let hostIp = 'localhost';
        if (Constants.expoConfig?.hostUri) {
          hostIp = Constants.expoConfig.hostUri.split(':')[0];
        } else if (Platform.OS === 'android') {
          hostIp = '10.0.2.2';
        }

        const candidateBffUrls = [
          `http://${hostIp}:3000`,
          `http://localhost:3000`,
          `http://127.0.0.1:3000`,
          `http://10.109.177.186:3000`,
          `http://${hostIp}:3100`,
          `http://localhost:3100`,
        ];

        for (const base of candidateBffUrls) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${base}/api/bff/coupons/apply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal: controller.signal,
            });
            clearTimeout(timer);
            const json = await res.json();
            if (res.ok && json?.success && json?.data) {
              return { data: json.data as ApplyCouponResult };
            }
            if (!res.ok && json?.error?.message) {
              return { error: { status: res.status, data: json } as any };
            }
          } catch {
            // Try next
          }
        }

        // Fallback to baseQuery
        const baseRes = await baseQuery({
          url: '/api/v1/coupons/apply',
          method: 'POST',
          body,
          headers: body.zoneId ? { 'x-active-zone-id': body.zoneId } : undefined,
        });

        if (baseRes.data) {
          return { data: ((baseRes.data as any)?.data ?? baseRes.data) as ApplyCouponResult };
        }
        return { error: baseRes.error as any };
      },
      invalidatesTags: [{ type: 'Coupon', id: 'ELIGIBLE' }],
    }),
  }),
});

export const { useGetEligibleCouponsQuery, useApplyCouponMutation } =
  couponsApi;
