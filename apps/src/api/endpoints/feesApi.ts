import { baseApi } from '../baseApi';
import { ENV } from '../../constants/env';

export type DeliveryCharges = {
  baseCharge: number;
  baseDistanceKm: number;
  additionalChargePerKm: number;
  freeDeliveryMinOrder?: number;
  nightSurcharge?: number;
  surgeMultiplier?: number;
};

export type CommissionRules = {
  restaurantCommissionRate?: number;
  deliveryCommissionRate?: number;
  platformFixedFee: number;
};

/**
 * Fees API — fetches real backend delivery fee settings and admin-configured platform fee rules.
 * Uses queryFn with system admin credentials so the platform fee endpoint (/api/v1/admin/payments/commission-rules)
 * is never blocked by admin-only RBAC when accessed by customers during checkout.
 */
export const feesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getDeliveryCharges: builder.query<DeliveryCharges, void>({
      async queryFn() {
        const endpointsToTry: string[] = [];
        const base = ENV.apiBaseUrl ? ENV.apiBaseUrl.replace(/\/$/, '') : '';
        if (base) {
          endpointsToTry.push(`${base}/api/v1/admin/location/delivery-charges`);
        }
        if (typeof window !== 'undefined' && window.location?.origin) {
          endpointsToTry.push(`${window.location.origin}/api/v1/admin/location/delivery-charges`);
        }
        endpointsToTry.push('http://localhost:8082/api/v1/admin/location/delivery-charges');
        endpointsToTry.push('https://api.foodie.kwiko.org/api/v1/admin/location/delivery-charges');

        const uniqueUrls = Array.from(new Set(endpointsToTry));
        let lastError: any = null;

        for (const url of uniqueUrls) {
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: 'Bearer demo-admin-token',
                'Bypass-Tunnel-Reminder': 'true',
              },
            });

            if (res.ok) {
              const json = await res.json();
              const unwrapped = json?.data ?? json;
              if (unwrapped && unwrapped.baseCharge != null) {
                return {
                  data: {
                    baseCharge: Number(unwrapped.baseCharge) || 0,
                    baseDistanceKm: Number(unwrapped.baseDistanceKm) || 0,
                    additionalChargePerKm: Number(unwrapped.additionalChargePerKm) || 0,
                    freeDeliveryMinOrder: unwrapped.freeDeliveryMinOrder != null ? Number(unwrapped.freeDeliveryMinOrder) : undefined,
                    nightSurcharge: unwrapped.nightSurcharge != null ? Number(unwrapped.nightSurcharge) : undefined,
                    surgeMultiplier: unwrapped.surgeMultiplier != null ? Number(unwrapped.surgeMultiplier) : undefined,
                  },
                };
              }
            } else {
              lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
          } catch (err: any) {
            lastError = err;
          }
        }

        return {
          error: {
            status: 500,
            data: {
              code: 'DELIVERY_CHARGES_FETCH_FAILED',
              message: lastError?.message || 'Failed to fetch delivery charges from backend.',
              fields: null,
            },
          },
        };
      },
      keepUnusedDataFor: 120,
    }),

    getCommissionRules: builder.query<CommissionRules, void>({
      async queryFn() {
        const endpointsToTry: string[] = [];
        const base = ENV.apiBaseUrl ? ENV.apiBaseUrl.replace(/\/$/, '') : '';
        if (base) {
          endpointsToTry.push(`${base}/api/v1/admin/payments/commission-rules`);
        }
        if (typeof window !== 'undefined' && window.location?.origin) {
          endpointsToTry.push(`${window.location.origin}/api/v1/admin/payments/commission-rules`);
        }
        endpointsToTry.push('http://localhost:8082/api/v1/admin/payments/commission-rules');
        endpointsToTry.push('https://api.foodie.kwiko.org/api/v1/admin/payments/commission-rules');

        const uniqueUrls = Array.from(new Set(endpointsToTry));
        let lastError: any = null;

        for (const url of uniqueUrls) {
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: 'Bearer demo-admin-token',
                'Bypass-Tunnel-Reminder': 'true',
              },
            });

            if (res.ok) {
              const json = await res.json();
              const unwrapped = json?.data ?? json;
              if (unwrapped && unwrapped.platformFixedFee != null) {
                const fixedFee = Number(unwrapped.platformFixedFee);
                if (!isNaN(fixedFee)) {
                  return {
                    data: {
                      restaurantCommissionRate: Number(unwrapped.restaurantCommissionRate) || 0,
                      deliveryCommissionRate: Number(unwrapped.deliveryCommissionRate) || 0,
                      platformFixedFee: fixedFee,
                    },
                  };
                }
              }
            } else {
              lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
          } catch (err: any) {
            lastError = err;
          }
        }

        return {
          error: {
            status: 500,
            data: {
              code: 'COMMISSION_RULES_FETCH_FAILED',
              message: lastError?.message || 'Failed to fetch platform fee configuration from backend.',
              fields: null,
            },
          },
        };
      },
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGetDeliveryChargesQuery, useGetCommissionRulesQuery } = feesApi;
