import { baseApi } from '../baseApi';

export interface PromotionBannerResponse {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl: string;
    ctaText?: string;
    ctaType?: string;
    ctaTarget?: string;
    status: string;
    displayOrder: number;
    targetZoneIds?: string[];
    targetZoneNames?: string[];
    isAllZones?: boolean;
}

export function isZoneMatching(target: string, customerZone: string): boolean {
    if (!target || !customerZone) return false;
    const t = target.trim().toLowerCase();
    const c = customerZone.trim().toLowerCase();
    if (t === 'all' || c === 'all') return true;
    if (t === c) return true;

    const isTBlr = t.includes('bangalore') || t.includes('bengaluru') || t.includes('blr');
    const isCBlr = c.includes('bangalore') || c.includes('bengaluru') || c.includes('blr');
    if (isTBlr && isCBlr) return true;

    const isTTmk = t.includes('tumkur') || t.includes('tumakuru') || t.includes('tmk');
    const isCTmk = c.includes('tumkur') || c.includes('tumakuru') || c.includes('tmk');
    if (isTTmk && isCTmk) return true;

    const isTHub = t.includes('hubballi') || t.includes('hubli') || t.includes('hbl');
    const isCHub = c.includes('hubballi') || c.includes('hubli') || c.includes('hbl');
    if (isTHub && isCHub) return true;

    const isTMys = t.includes('mysore') || t.includes('mysuru');
    const isCMys = c.includes('mysore') || c.includes('mysuru');
    if (isTMys && isCMys) return true;

    const isTHas = t.includes('hassan');
    const isCHas = c.includes('hassan');
    if (isTHas && isCHas) return true;

    const strip = (s: string) => s.replace(/^dz-/, '').replace(/-zone$/, '').replace(/\s+zone$/i, '').trim();
    if (strip(t) === strip(c)) return true;

    return false;
}

export function filterBannersForZone(banners: PromotionBannerResponse[], zoneId?: string | null): PromotionBannerResponse[] {
    if (!Array.isArray(banners)) return [];
    if (!zoneId || zoneId.trim().toLowerCase() === 'all') {
        return banners;
    }
    const cleanZone = zoneId.trim();

    return banners.filter((b) => {
        if (b.status && b.status !== 'ACTIVE') return false;

        // 1. Explicit All Zones check
        if (b.isAllZones === true || b.targetZoneIds?.includes('ALL')) {
            return true;
        }

        // 2. Explicit target zones check
        if (Array.isArray(b.targetZoneIds) && b.targetZoneIds.length > 0) {
            const names = b.targetZoneNames || [];
            const allTargets = [...b.targetZoneIds, ...names];
            return allTargets.some((t) => isZoneMatching(t, cleanZone));
        }

        // 3. Title/subtitle zone targeting check (for legacy/backend banners without targetZoneIds)
        const text = `${b.title || ''} ${b.subtitle || ''}`.toLowerCase();
        const hasBlr = text.includes('bangalore') || text.includes('bengaluru') || text.includes('blr');
        const hasTmk = text.includes('tumkur') || text.includes('tumakuru') || text.includes('tmk');
        const hasHub = text.includes('hubballi') || text.includes('hubli') || text.includes('hbl');
        const hasMys = text.includes('mysore') || text.includes('mysuru');
        const hasHas = text.includes('hassan');

        const isBlrCustomer = isZoneMatching('bangalore', cleanZone);
        const isTmkCustomer = isZoneMatching('tumkur', cleanZone);
        const isHubCustomer = isZoneMatching('hubballi', cleanZone);
        const isMysCustomer = isZoneMatching('mysore', cleanZone);
        const isHasCustomer = isZoneMatching('hassan', cleanZone);

        // If the banner mentions a specific zone, only show it if the customer is in that zone
        if (hasHub) return isHubCustomer;
        if (hasTmk) return isTmkCustomer;
        if (hasBlr) return isBlrCustomer;
        if (hasMys) return isMysCustomer;
        if (hasHas) return isHasCustomer;

        // Generic banner with no specific city name in title -> show across all zones
        return true;
    });
}

export const bannersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getActiveBanners: builder.query<PromotionBannerResponse[], string | null | void>({
            queryFn: async (zoneId, _queryApi, _extraOptions, baseQuery) => {
                const cleanZone = zoneId ? zoneId.trim() : '';

                // Try 1: Fetch from Admin BFF (direct localhost or via proxy)
                try {
                    const bffUrl = cleanZone
                        ? `/api/bff/banners/active?zoneId=${encodeURIComponent(cleanZone)}`
                        : '/api/bff/banners/active';
                    const res = await baseQuery({
                        url: bffUrl,
                        headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
                    });

                    const unwrapped = (res.data as any)?.data ?? res.data;
                    if (Array.isArray(unwrapped) && unwrapped.length > 0) {
                        return { data: filterBannersForZone(unwrapped as PromotionBannerResponse[], cleanZone) };
                    }
                } catch {
                    // Fall through
                }

                // Try 2: Fetch from direct localhost:3100
                try {
                    const directUrl = `http://localhost:3100/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`;
                    const directRes = await fetch(directUrl);
                    if (directRes.ok) {
                        const json = await directRes.json();
                        const list = json?.data ?? json;
                        if (Array.isArray(list) && list.length > 0) {
                            return { data: filterBannersForZone(list as PromotionBannerResponse[], cleanZone) };
                        }
                    }
                } catch {
                    // Fall through
                }

                // Try 3: Standard backend query /api/v1/banners/active
                const relativeRes = await baseQuery({
                    url: '/api/v1/banners/active',
                    params: cleanZone ? { zoneId: cleanZone } : undefined,
                    headers: cleanZone ? { 'x-active-zone-id': cleanZone } : undefined,
                });

                if (relativeRes.data) {
                    const rawList = (relativeRes.data as any)?.data ?? relativeRes.data ?? [];
                    if (Array.isArray(rawList)) {
                        return { data: filterBannersForZone(rawList as PromotionBannerResponse[], cleanZone) };
                    }
                }

                return { data: [] };
            },
            providesTags: (_result, _error, arg) => [{ type: 'Banners' as const, id: arg || 'ALL' }],
        }),
    }),
});

export const { useGetActiveBannersQuery } = bannersApi;
