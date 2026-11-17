import { baseApi } from '../baseApi';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
    isZoneMatching,
    resolveBannerZone,
    filterBannersForZone,
    type PromotionBannerLike,
} from '../../features/restaurants/utils/zoneTargeting';

export type PromotionBannerResponse = PromotionBannerLike;
export { isZoneMatching, resolveBannerZone, filterBannersForZone };

export const bannersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getActiveBanners: builder.query<PromotionBannerResponse[], string | null | void>({
            queryFn: async (zoneId, _queryApi, _extraOptions, baseQuery) => {
                const cleanZone = zoneId ? zoneId.trim() : '';
                if (!cleanZone || cleanZone.toLowerCase() === 'unserviceable') {
                    return { data: [] };
                }

                // Try 1: Standard API query /api/v1/banners/active
                try {
                    const relativeRes = await baseQuery({
                        url: '/api/v1/banners/active',
                        params: cleanZone ? { zoneId: cleanZone } : undefined,
                        headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
                    });

                    if (relativeRes.data) {
                        const rawList = (relativeRes.data as any)?.data ?? relativeRes.data ?? [];
                        if (Array.isArray(rawList)) {
                            const filtered = filterBannersForZone(rawList as PromotionBannerResponse[], cleanZone);
                            return { data: filtered };
                        }
                    }
                } catch {
                    // Fall through
                }

                // Try 2: Fetch from Admin BFF dev server (host LAN IP or localhost port 3000)
                let hostIp = 'localhost';
                if (Constants.expoConfig?.hostUri) {
                    hostIp = Constants.expoConfig.hostUri.split(':')[0];
                } else if (Platform.OS === 'android') {
                    hostIp = '10.0.2.2';
                }

                const hostCandidates = [
                    `http://${hostIp}:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                    `http://localhost:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                    `http://127.0.0.1:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                    `http://10.109.177.186:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                ];

                for (const url of hostCandidates) {
                    try {
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), 1500);
                        const res = await fetch(url, { signal: controller.signal });
                        clearTimeout(timer);
                        if (res.ok) {
                            const json = await res.json();
                            const list = json?.data ?? json;
                            if (Array.isArray(list)) {
                                return { data: filterBannersForZone(list as PromotionBannerResponse[], cleanZone) };
                            }
                        }
                    } catch {
                        // try next
                    }
                }

                return { data: [] };
            },
            providesTags: (_result, _error, arg) => [{ type: 'Banners' as const, id: arg || 'ALL' }],
        }),
    }),
});

export const { useGetActiveBannersQuery } = bannersApi;
