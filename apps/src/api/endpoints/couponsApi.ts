import { baseApi } from '../baseApi';
import type {
  ApplyCouponRequest,
  ApplyCouponResult,
  EligibleCoupon,
} from '../../features/checkout/types';
import { isZoneMatching } from './bannersApi';

export type EligibleCouponsArg = {
  restaurantId: string;
  cartTotal: number | string;
  zoneId?: string | null;
};

export function filterCouponsForZone(coupons: EligibleCoupon[], zoneId?: string | null): EligibleCoupon[] {
  if (!Array.isArray(coupons)) return [];
  if (!zoneId || zoneId.trim().toLowerCase() === 'all') {
    return coupons;
  }
  const cleanZone = zoneId.trim();

  return coupons.filter((c) => {
    // 1. If coupon explicitly belongs to All Zones or has no zone set
    if (!c.zoneId || c.zoneId === 'ALL') {
      // Also check code/title for zone names (e.g. HUBBALLI124, BLR150, TMK80)
      const codeOrTitle = `${c.code || ''} ${c.zoneName || ''}`.toLowerCase();
      const hasHub = codeOrTitle.includes('hubballi') || codeOrTitle.includes('hubli');
      const hasTmk = codeOrTitle.includes('tumkur') || codeOrTitle.includes('tumakuru') || codeOrTitle.includes('tmk');
      const hasBlr = codeOrTitle.includes('bangalore') || codeOrTitle.includes('bengaluru') || codeOrTitle.includes('blr');

      const isBlrCustomer = isZoneMatching('bangalore', cleanZone);
      const isTmkCustomer = isZoneMatching('tumkur', cleanZone);
      const isHubCustomer = isZoneMatching('hubballi', cleanZone);

      if (hasHub) return isHubCustomer;
      if (hasTmk) return isTmkCustomer;
      if (hasBlr) return isBlrCustomer;

      return true;
    }

    // 2. Check zone matching on coupon's zoneId and zoneName
    if (isZoneMatching(c.zoneId, cleanZone)) return true;
    if (c.zoneName && isZoneMatching(c.zoneName, cleanZone)) return true;

    return false;
  });
}

/**
 * P2-CUS-04 coupons on Checkout — eligible list + apply preview (no redeem).
 */
export const couponsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEligibleCoupons: builder.query<EligibleCoupon[], EligibleCouponsArg>({
      queryFn: async ({ restaurantId, cartTotal, zoneId }, _queryApi, _extraOptions, baseQuery) => {
        const cleanZone = zoneId ? zoneId.trim() : '';

        // Try 1: Query Admin BFF for eligible coupons in this zone
        try {
          const bffUrl = `/api/bff/coupons/eligible?restaurantId=${encodeURIComponent(restaurantId)}&cartTotal=${cartTotal}${cleanZone ? `&zoneId=${encodeURIComponent(cleanZone)}` : ''}`;
          const bffRes = await baseQuery({
            url: bffUrl,
            headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
          });

          const unwrapped = (bffRes.data as any)?.data ?? bffRes.data;
          if (Array.isArray(unwrapped) && unwrapped.length > 0) {
            return { data: filterCouponsForZone(unwrapped as EligibleCoupon[], cleanZone) };
          }
        } catch {
          // Fall through
        }

        // Try 2: Query backend /api/v1/coupons/eligible
        try {
          const relativeRes = await baseQuery({
            url: '/api/v1/coupons/eligible',
            params: { restaurantId, cartTotal, ...(cleanZone ? { zoneId: cleanZone } : {}) },
            headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
          });

          const rawList = (relativeRes.data as any)?.data ?? relativeRes.data ?? [];
          if (Array.isArray(rawList) && rawList.length > 0) {
            return { data: filterCouponsForZone(rawList as EligibleCoupon[], cleanZone) };
          }
        } catch {
          // Fall through
        }

        // Try 3: Direct BFF call to localhost:3100
        try {
          const directUrl = `http://localhost:3100/api/bff/coupons/eligible?restaurantId=${encodeURIComponent(restaurantId)}&cartTotal=${cartTotal}${cleanZone ? `&zoneId=${encodeURIComponent(cleanZone)}` : ''}`;
          const directRes = await fetch(directUrl);
          if (directRes.ok) {
            const json = await directRes.json();
            const list = json?.data ?? json;
            if (Array.isArray(list) && list.length > 0) {
              return { data: filterCouponsForZone(list as EligibleCoupon[], cleanZone) };
            }
          }
        } catch {
          // Fall through
        }

        return { data: [] };
      },
      providesTags: [{ type: 'Coupon', id: 'ELIGIBLE' }],
      keepUnusedDataFor: 0,
    }),
    applyCoupon: builder.mutation<ApplyCouponResult, ApplyCouponRequest>({
      query: (body) => ({
        url: '/api/v1/coupons/apply',
        method: 'POST',
        body,
        headers: body.zoneId ? { 'x-active-zone-id': body.zoneId } : undefined,
      }),
      transformResponse: (response: unknown) => {
        return ((response as any)?.data ?? response) as ApplyCouponResult;
      },
      invalidatesTags: [{ type: 'Coupon', id: 'ELIGIBLE' }],
    }),
  }),
});

export const { useGetEligibleCouponsQuery, useApplyCouponMutation } =
  couponsApi;
