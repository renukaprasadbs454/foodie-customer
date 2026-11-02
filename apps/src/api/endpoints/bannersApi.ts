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
    const cleanZone = zoneId ? zoneId.trim() : '';

    return banners.filter((b) => {
        if (!b) return false;
        if (b.status && b.status !== 'ACTIVE') return false;

        // Expiry check
        const now = Date.now();
        if ((b as any).endsAt) {
            const end = new Date((b as any).endsAt).getTime();
            if (!isNaN(end) && now > end) return false;
        }
        if ((b as any).startsAt) {
            const start = new Date((b as any).startsAt).getTime();
            if (!isNaN(start) && now < start) return false;
        }

        // 1. Explicit All Zones check (Admin created banner for All Zones)
        const isAll = b.isAllZones === true ||
            (Array.isArray(b.targetZoneIds) && b.targetZoneIds.includes('ALL')) ||
            (Array.isArray(b.targetZoneNames) && b.targetZoneNames.includes('All Zones'));

        if (isAll) {
            return true;
        }

        // 2. Explicit target zones check (Admin created banner for specific zone)
        if (Array.isArray(b.targetZoneIds) && b.targetZoneIds.length > 0) {
            if (!cleanZone || cleanZone.toLowerCase() === 'all') {
                return false;
            }
            const names = b.targetZoneNames || [];
            const allTargets = [...b.targetZoneIds, ...names];
            return allTargets.some((t) => isZoneMatching(t, cleanZone));
        }

        // 3. Reject any banner without explicit admin zone targeting
        // Legacy/unregistered banners from remote DB lack targetZoneIds/isAllZones and must NEVER be displayed!
        return false;
    });
}

export const bannersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getActiveBanners: builder.query<PromotionBannerResponse[], string | null | void>({
            queryFn: async (zoneId, _queryApi, _extraOptions, baseQuery) => {
                const cleanZone = zoneId ? zoneId.trim() : '';

                // Try 1: Fetch from Admin BFF dev server (direct port 3000 / 3100)
                const hostCandidates = [
                    `http://localhost:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                    `http://127.0.0.1:3000/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
                    `http://localhost:3100/api/bff/banners/active${cleanZone ? `?zoneId=${encodeURIComponent(cleanZone)}` : ''}`,
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

                // Try 2: Standard API query /api/v1/banners/active
                try {
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
                } catch {
                    // Fall through
                }

                return { data: [] };
            },
            providesTags: (_result, _error, arg) => [{ type: 'Banners' as const, id: arg || 'ALL' }],
        }),
    }),
});

export const { useGetActiveBannersQuery } = bannersApi;
