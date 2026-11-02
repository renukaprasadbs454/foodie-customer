import { baseApi } from '../baseApi';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  ApplyCouponRequest,
  ApplyCouponResult,
  EligibleCoupon,
} from '../../features/checkout/types';
import { isZoneMatching } from './bannersApi';

export type EligibleCouponsArg = {
  restaurantId?: string;
  cartTotal?: number | string;
  zoneId?: string | null;
};

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

/**
 * P2-CUS-04 coupons on Checkout — eligible list + apply preview (no redeem).
 * Fetches admin-created coupons in real time from Admin BFF with fallback to remote backend.
 */
export const couponsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleCoupons: builder.query<EligibleCoupon[], EligibleCouponsArg | void>({
      queryFn: async (arg, _queryApi, _extraOptions, baseQuery) => {
        const restaurantId = arg?.restaurantId || '';
        const cartTotal = Number(arg?.cartTotal || 0);
        const cleanZone = arg?.zoneId ? arg.zoneId.trim() : '';

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

        // Try candidate Admin BFF endpoints (where admin creates coupons in real-time)
        for (const base of candidateBffUrls) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1800);
            const targetUrl = `${base}/api/bff/coupons/eligible?cartTotal=${cartTotal}${cleanZone ? `&zoneId=${encodeURIComponent(cleanZone)}` : ''}`;
            const res = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
              const json = await res.json();
              const list = json?.data ?? json;
              if (Array.isArray(list) && list.length > 0) {
                fetchedCoupons = list.map((c: any) => ({
                  code: c.code,
                  discountType: c.discountType || (c.benefitMode === 'FLAT' ? 'FLAT' : 'PERCENT'),
                  value: Number(c.value ?? c.discountValue ?? 0),
                  minOrderAmount: Number(c.minOrderAmount ?? c.minPurchase ?? 0),
                  maxDiscountAmount: c.maxDiscountAmount != null ? Number(c.maxDiscountAmount) : (c.maxDiscount != null ? Number(c.maxDiscount) : null),
                  expiryDate: c.expiryDate || null,
                  zoneId: c.zoneId || null,
                  zoneName: c.zoneName || null,
                }));
                break;
              }
            }
          } catch {
            // Try next candidate
          }
        }

        // Also query remote backend if BFF is unreachable
        if (fetchedCoupons.length === 0) {
          try {
            const relativeRes = await baseQuery({
              url: '/api/v1/coupons/eligible',
              params: {
                cartTotal,
                ...(restaurantId ? { restaurantId } : {}),
                ...(cleanZone ? { zoneId: cleanZone } : {}),
              },
              headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
            });

            if (relativeRes.data) {
              const rawList = (relativeRes.data as any)?.data ?? relativeRes.data ?? [];
              if (Array.isArray(rawList) && rawList.length > 0) {
                fetchedCoupons = rawList.map((c: any) => ({
                  code: c.code,
                  discountType: c.discountType || (c.benefitMode === 'FLAT' ? 'FLAT' : 'PERCENT'),
                  value: Number(c.value ?? c.discountValue ?? 0),
                  minOrderAmount: Number(c.minOrderAmount ?? c.minPurchase ?? 0),
                  maxDiscountAmount: c.maxDiscountAmount != null ? Number(c.maxDiscountAmount) : (c.maxDiscount != null ? Number(c.maxDiscount) : null),
                  expiryDate: c.expiryDate || null,
                  zoneId: c.zoneId || null,
                  zoneName: c.zoneName || null,
                }));
              }
            }
          } catch {
            // Fall through
          }
        }

        const filtered = filterCouponsForZone(fetchedCoupons, cleanZone);
        return { data: filtered };
      },
      providesTags: [{ type: 'Coupon', id: 'ELIGIBLE' }],
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
