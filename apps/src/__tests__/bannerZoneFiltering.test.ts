import {
  filterBannersForZone,
  resolveBannerZone,
  PromotionBannerLike,
} from '../features/restaurants/utils/zoneTargeting';

type PromotionBannerResponse = PromotionBannerLike;

describe('Banner Zone-Based Filtering and Isolation', () => {
  const mockMayuraBanner: PromotionBannerResponse = {
    id: 'c53185a6-2fc0-45e8-ae21-d117d0927b7f',
    title: 'Mega offer on Hotel Mayura',
    subtitle: 'Up to 60% offer',
    imageUrl: 'auto-generated',
    ctaText: 'Order now',
    ctaType: 'OPEN_RESTAURANT',
    ctaTarget: 'b0005826-32e2-41ce-bc4e-917f8183707b', // Hotel Mayura (Tumkur)
    status: 'ACTIVE',
    displayOrder: 0,
  };

  const mockMayuraBanner2: PromotionBannerResponse = {
    id: '52c60274-4cb2-4203-b7f6-65e992dd39de',
    title: 'Mega offer on Hotel Mayura',
    subtitle: 'upto 50% offer',
    imageUrl: 'auto-generated',
    ctaText: 'Order now',
    ctaType: 'OPEN_RESTAURANT',
    ctaTarget: 'b0005826-32e2-41ce-bc4e-917f8183707b', // Hotel Mayura (Tumkur)
    status: 'ACTIVE',
    displayOrder: 0,
  };

  const mockTumkurDelightBanner: PromotionBannerResponse = {
    id: 'd46b0de0-8f4d-48d0-9919-5c79f19653fc',
    title: 'Kwiko',
    subtitle: '50% offer on',
    imageUrl: 'auto-generated',
    ctaText: 'order now',
    ctaType: 'OPEN_RESTAURANT',
    ctaTarget: 'ed9ac710-9915-4cbc-b3cb-30cd0981dd03', // Tumkur delight (Tumkur)
    status: 'ACTIVE',
    displayOrder: 0,
  };

  const mockBengaluruBanner: PromotionBannerResponse = {
    id: '11ef78ec-cc89-4db4-aead-45c6f881e117',
    title: 'Bengaluru offer',
    subtitle: 'upto 50% offer',
    imageUrl: 'auto-generated',
    ctaText: 'Order now',
    ctaType: 'OPEN_RESTAURANT',
    ctaTarget: '8742d1a6-a93f-4c53-9c71-ed431157888e', // Shetty biriyani 2 (Bengaluru zone)
    status: 'ACTIVE',
    displayOrder: 0,
  };

  const mockGlobalBanner: PromotionBannerResponse = {
    id: 'global-1',
    title: 'Flat 50% Off on First Order',
    subtitle: 'Welcome to Kwiko',
    imageUrl: 'https://example.com/banner.jpg',
    ctaText: 'Explore',
    ctaType: 'OPEN_SEARCH',
    status: 'ACTIVE',
    displayOrder: 1,
    isAllZones: true,
  };

  const allActiveBanners: PromotionBannerResponse[] = [
    mockMayuraBanner,
    mockMayuraBanner2,
    mockTumkurDelightBanner,
    mockBengaluruBanner,
    mockGlobalBanner,
  ];

  describe('resolveBannerZone', () => {
    it('correctly maps Hotel Mayura banner to tumkur zone', () => {
      expect(resolveBannerZone(mockMayuraBanner)).toBe('tumkur');
      expect(resolveBannerZone(mockMayuraBanner2)).toBe('tumkur');
    });

    it('correctly maps Tumkur Delight banner to tumkur zone', () => {
      expect(resolveBannerZone(mockTumkurDelightBanner)).toBe('tumkur');
    });

    it('correctly maps Bengaluru offer banner to bangalore zone', () => {
      expect(resolveBannerZone(mockBengaluruBanner)).toBe('bangalore');
    });

    it('correctly maps isAllZones banner to ALL', () => {
      expect(resolveBannerZone(mockGlobalBanner)).toBe('ALL');
    });
  });

  describe('filterBannersForZone - Zone Isolation', () => {
    it('displays ONLY Tumkur banners when customer is in Tumkur zone', () => {
      const result = filterBannersForZone(allActiveBanners, 'dz-tumkur');
      const bannerIds = result.map((b) => b.id);

      expect(bannerIds).toContain(mockMayuraBanner.id);
      expect(bannerIds).toContain(mockMayuraBanner2.id);
      expect(bannerIds).toContain(mockTumkurDelightBanner.id);
      expect(bannerIds).toContain(mockGlobalBanner.id);
      // Bengaluru banner must NOT display in Tumkur
      expect(bannerIds).not.toContain(mockBengaluruBanner.id);
    });

    it('displays ONLY Bangalore banners when customer is in Bangalore zone (e.g. rajankunte, bangalore)', () => {
      const result = filterBannersForZone(allActiveBanners, 'dz-40ebeb'); // Bangalore zone
      const bannerIds = result.map((b) => b.id);

      expect(bannerIds).toContain(mockBengaluruBanner.id);
      expect(bannerIds).toContain(mockGlobalBanner.id);
      // Hotel Mayura & Tumkur Delight banners must NEVER display in Bangalore
      expect(bannerIds).not.toContain(mockMayuraBanner.id);
      expect(bannerIds).not.toContain(mockMayuraBanner2.id);
      expect(bannerIds).not.toContain(mockTumkurDelightBanner.id);
    });

    it('also blocks Tumkur banners when customerZone is "bengaluru-central" or "bangalore"', () => {
      const result = filterBannersForZone(allActiveBanners, 'bangalore');
      const bannerIds = result.map((b) => b.id);

      expect(bannerIds).toContain(mockBengaluruBanner.id);
      expect(bannerIds).not.toContain(mockMayuraBanner.id);
      expect(bannerIds).not.toContain(mockMayuraBanner2.id);
      expect(bannerIds).not.toContain(mockTumkurDelightBanner.id);
    });

    it('strictly returns ZERO banners when customer is in an unserviceable location (e.g. Yadiyur)', () => {
      // Yadiyur has isServiceable: false or zoneId: null
      const unserviceableResult1 = filterBannersForZone(allActiveBanners, null, false);
      expect(unserviceableResult1).toEqual([]);

      const unserviceableResult2 = filterBannersForZone(allActiveBanners, 'unserviceable', false);
      expect(unserviceableResult2).toEqual([]);

      const unserviceableResult3 = filterBannersForZone(allActiveBanners, '');
      expect(unserviceableResult3).toEqual([]);
    });

    it('excludes inactive and expired banners', () => {
      const inactiveBanner: PromotionBannerResponse = {
        ...mockMayuraBanner,
        id: 'inactive-mayura',
        status: 'INACTIVE',
      };
      const expiredBanner: PromotionBannerResponse = {
        ...mockMayuraBanner,
        id: 'expired-mayura',
        status: 'ACTIVE',
        endsAt: new Date(Date.now() - 3600000).toISOString(),
      } as any;

      const result = filterBannersForZone([inactiveBanner, expiredBanner], 'dz-tumkur');
      expect(result).toHaveLength(0);
    });
  });
});

