import {
  filterCouponsForRestaurant,
  isCouponInRestaurantZone,
  normalizeZoneId,
  isCouponExpired,
} from '../features/checkout/couponUtils';
import type { EligibleCoupon } from '../features/checkout/types';

describe('Zone-Based and Restaurant-Specific Coupon Display & Validation in Foodie Customer App', () => {
  const tumkurRestA_Id = 'b0005826-32e2-41ce-bc4e-917f8183707b'; // Hotel Mayura (Tumkur)
  const tumkurRestB_Id = '8742d1a6-a93f-4c53-9c71-ed431157888e'; // Shetty Biriyani 2 (Tumkur)
  const bangaloreRest_Id = '4be4128c-db89-4e72-8017-fa2c3f6b5d79'; // Empire Restaurant (Bangalore)
  const emptyRest_Id = '00000000-0000-0000-0000-000000000000'; // Restaurant C with no coupons

  const tumkurZoneId = 'dz-tumkur';
  const bangaloreZoneId = 'dz-bangalore';

  const mockCoupons: EligibleCoupon[] = [
    // Tumkur Zone Coupon 1 (Enabled by Tumkur Rest A & Tumkur Rest B)
    {
      couponId: 'c-tmk-01',
      code: 'SPICE20',
      title: 'SPICE20 • Tumkur Zone',
      discountType: 'PERCENT',
      value: 20,
      minOrderAmount: 200,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestA_Id,
      restaurantName: 'Hotel Mayura',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
    },
    // Tumkur Zone Coupon 2 (Enabled only by Tumkur Rest A)
    {
      couponId: 'c-tmk-02',
      code: 'MAYURA_TUMKUR',
      title: 'MAYURA_TUMKUR • Hotel Mayura',
      discountType: 'FLAT',
      value: 50,
      minOrderAmount: 300,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestA_Id,
      restaurantName: 'Hotel Mayura',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-tumkur-zone',
      zoneName: 'Tumkur Zone',
    },
    // Tumkur Zone Coupon 3 (Enabled only by Tumkur Rest B)
    {
      couponId: 'c-tmk-03',
      code: 'SHETTY_TUMKUR',
      title: 'SHETTY_TUMKUR • Shetty Biriyani 2',
      discountType: 'PERCENT',
      value: 15,
      minOrderAmount: 250,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestB_Id,
      restaurantName: 'Shetty Biriyani 2',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
    },
    // Tumkur Zone Coupon Disabled by Tumkur Rest A
    {
      couponId: 'c-tmk-disabled',
      code: 'TMK_DISABLED',
      title: 'Disabled Tumkur Promo',
      discountType: 'PERCENT',
      value: 25,
      minOrderAmount: 250,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestA_Id,
      restaurantName: 'Hotel Mayura',
      isActive: false,
      status: 'DEACTIVATED',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
    },
    // Bangalore Zone Coupon 1 (Enabled by Bangalore Restaurant)
    {
      couponId: 'c-blr-01',
      code: 'BLR150',
      title: 'BLR150 • Bangalore Zone',
      discountType: 'FLAT',
      value: 150,
      minOrderAmount: 600,
      expiryDate: '2029-12-31',
      restaurantId: bangaloreRest_Id,
      restaurantName: 'Empire Restaurant',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-bangalore',
      zoneName: 'Bangalore Zone',
    },
    // Bangalore Zone Coupon 2 (Enabled by Bangalore Restaurant)
    {
      couponId: 'c-blr-02',
      code: 'KWIKO40',
      title: 'KWIKO40 • Bangalore Zone',
      discountType: 'PERCENT',
      value: 20,
      minOrderAmount: 400,
      expiryDate: '2029-12-31',
      restaurantId: bangaloreRest_Id,
      restaurantName: 'Empire Restaurant',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'dz-bengaluru-zone',
      zoneName: 'Bangalore Zone',
    },
    // All Locations Coupon (Enabled by Tumkur Rest A)
    {
      couponId: 'c-all-01',
      code: 'WELCOME50',
      title: 'WELCOME50 • All Zones',
      discountType: 'PERCENT',
      value: 50,
      minOrderAmount: 99,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestA_Id,
      restaurantName: 'Hotel Mayura',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: null,
      zoneName: 'All Zones',
      isAllZones: true,
    },
    // All Locations Coupon (NOT enabled by any restaurant - global list only)
    {
      couponId: 'c-all-unassigned',
      code: 'GLOBAL_UNASSIGNED',
      title: 'GLOBAL_UNASSIGNED • All Zones',
      discountType: 'PERCENT',
      value: 10,
      minOrderAmount: 100,
      expiryDate: '2029-12-31',
      restaurantId: null,
      restaurantName: null,
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: 'ALL',
      zoneName: 'All Zones',
      isAllZones: true,
    },
    // Coupon with Missing Zone information (null zoneId and null zoneName)
    {
      couponId: 'c-missing-zone',
      code: 'MISSING_ZONE_COUPON',
      title: 'Missing Zone Info Promo',
      discountType: 'PERCENT',
      value: 15,
      minOrderAmount: 200,
      expiryDate: '2029-12-31',
      restaurantId: tumkurRestA_Id,
      restaurantName: 'Hotel Mayura',
      isActive: true,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      zoneId: null,
      zoneName: null,
      isAllZones: false,
    },
  ];

  describe('Zone Normalization & Comparison (Selected Restaurant Zone ID = Coupon Zone ID)', () => {
    it('normalizes various zone formats correctly', () => {
      expect(normalizeZoneId('dz-tumkur')).toBe('tumkur');
      expect(normalizeZoneId('dz-tumkur-zone')).toBe('tumkur');
      expect(normalizeZoneId('Tumkur')).toBe('tumkur');
      expect(normalizeZoneId('dz-bangalore')).toBe('bangalore');
      expect(normalizeZoneId('dz-bengaluru-zone')).toBe('bangalore');
      expect(normalizeZoneId('Bengaluru')).toBe('bangalore');
      expect(normalizeZoneId('dz-hubballi-zone')).toBe('hubballi');
    });

    it('verifies Selected Restaurant Zone ID = Coupon Zone ID strictly', () => {
      // Tumkur restaurant with Tumkur coupon
      expect(isCouponInRestaurantZone('dz-tumkur', 'Tumkur Zone', false, 'dz-tumkur')).toBe(true);
      expect(isCouponInRestaurantZone('dz-tumkur-zone', 'Tumkur Zone', false, 'dz-tumkur')).toBe(true);

      // Tumkur restaurant with Bangalore coupon -> NEVER MATCHES
      expect(isCouponInRestaurantZone('dz-bangalore', 'Bangalore Zone', false, 'dz-tumkur')).toBe(false);
      expect(isCouponInRestaurantZone('dz-bengaluru-zone', 'Bangalore Zone', false, 'dz-tumkur')).toBe(false);

      // Bangalore restaurant with Tumkur coupon -> NEVER MATCHES
      expect(isCouponInRestaurantZone('dz-tumkur', 'Tumkur Zone', false, 'dz-bangalore')).toBe(false);

      // Bangalore restaurant with Bangalore coupon
      expect(isCouponInRestaurantZone('dz-bangalore', 'Bangalore Zone', false, 'dz-bangalore')).toBe(true);
      expect(isCouponInRestaurantZone('dz-bengaluru-zone', 'Bangalore Zone', false, 'dz-bangalore')).toBe(true);
    });

    it('does not treat missing zone information as All Locations', () => {
      expect(isCouponInRestaurantZone(null, null, false, 'dz-tumkur')).toBe(false);
      expect(isCouponInRestaurantZone(undefined, undefined, false, 'dz-bangalore')).toBe(false);
      expect(isCouponInRestaurantZone('', '', false, 'dz-tumkur')).toBe(false);
    });

    it('allows explicit All Locations / All Zones coupons across all restaurant zones', () => {
      expect(isCouponInRestaurantZone(null, 'All Zones', true, 'dz-tumkur')).toBe(true);
      expect(isCouponInRestaurantZone('ALL', 'All Zones', false, 'dz-bangalore')).toBe(true);
      expect(isCouponInRestaurantZone(null, 'ALL', false, 'dz-hubballi-zone')).toBe(true);
    });
  });

  describe('Example 1: Tumkur Zone Restaurants', () => {
    it('customer selects Tumkur Restaurant A: displays Tumkur coupons enabled by Restaurant A and enabled All Locations coupons', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).toContain('SPICE20');
      expect(codes).toContain('MAYURA_TUMKUR');
      expect(codes).toContain('WELCOME50'); // All Locations enabled by Rest A
      expect(codes).not.toContain('SHETTY_TUMKUR'); // Belongs to Rest B
      expect(codes).not.toContain('BLR150'); // Bangalore zone
      expect(codes).not.toContain('KWIKO40'); // Bangalore zone
    });

    it('customer selects Tumkur Restaurant B: shows only coupons Restaurant B has enabled', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestB_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).toContain('SHETTY_TUMKUR');
      expect(codes).not.toContain('MAYURA_TUMKUR'); // Rest A only
      expect(codes).not.toContain('BLR150'); // Bangalore zone
      expect(codes).not.toContain('WELCOME50'); // Rest B did not enable WELCOME50
    });

    it('Tumkur coupon must NOT appear in Bangalore Restaurant', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        bangaloreRest_Id,
        bangaloreZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).not.toContain('SPICE20');
      expect(codes).not.toContain('MAYURA_TUMKUR');
      expect(codes).not.toContain('SHETTY_TUMKUR');
    });
  });

  describe('Example 2: Bangalore Zone Restaurants', () => {
    it('customer selects Bangalore Restaurant: displays only Bangalore coupons enabled by that restaurant', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        bangaloreRest_Id,
        bangaloreZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).toContain('BLR150');
      expect(codes).toContain('KWIKO40');
      expect(codes).not.toContain('SPICE20');
      expect(codes).not.toContain('MAYURA_TUMKUR');
      expect(codes).not.toContain('SHETTY_TUMKUR');
    });

    it('Bangalore coupon must NOT appear in a Tumkur Restaurant', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).not.toContain('BLR150');
      expect(codes).not.toContain('KWIKO40');
    });
  });

  describe('Example 3: Disabled and Inactive Coupons', () => {
    it('does not display disabled or deactivated coupons', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).not.toContain('TMK_DISABLED');
    });

    it('does not display coupons with missing zone information', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).not.toContain('MISSING_ZONE_COUPON');
    });

    it('does not display unassigned global coupons that the restaurant has not enabled', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      const codes = results.map((c) => c.code);

      expect(codes).not.toContain('GLOBAL_UNASSIGNED');
    });

    it('returns empty list for a restaurant that has not enabled any coupons', () => {
      const results = filterCouponsForRestaurant(
        mockCoupons,
        emptyRest_Id,
        tumkurZoneId
      );
      expect(results).toHaveLength(0);
    });
  });

  describe('Example 4 & 5: Refresh and Restaurant Switching', () => {
    it('switching from Tumkur to Bangalore: Tumkur coupons disappear and Bangalore coupons appear', () => {
      // Step 1: Customer visits Tumkur Restaurant A
      const tumkurResults = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      expect(tumkurResults.map((c) => c.code)).toContain('SPICE20');
      expect(tumkurResults.map((c) => c.code)).not.toContain('BLR150');

      // Step 2: Customer switches to Bangalore Restaurant
      const bangaloreResults = filterCouponsForRestaurant(
        mockCoupons,
        bangaloreRest_Id,
        bangaloreZoneId
      );
      expect(bangaloreResults.map((c) => c.code)).toContain('BLR150');
      expect(bangaloreResults.map((c) => c.code)).not.toContain('SPICE20');
    });

    it('switching from Bangalore to Tumkur: Bangalore coupons disappear and Tumkur coupons appear', () => {
      // Step 1: Customer visits Bangalore Restaurant
      const bangaloreResults = filterCouponsForRestaurant(
        mockCoupons,
        bangaloreRest_Id,
        bangaloreZoneId
      );
      expect(bangaloreResults.map((c) => c.code)).toContain('BLR150');

      // Step 2: Customer switches to Tumkur Restaurant B
      const tumkurResults = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestB_Id,
        tumkurZoneId
      );
      expect(tumkurResults.map((c) => c.code)).toContain('SHETTY_TUMKUR');
      expect(tumkurResults.map((c) => c.code)).not.toContain('BLR150');
    });
  });

  describe('Example 6: All Locations Coupons Follow Existing Eligibility Rules & Must Be Enabled', () => {
    it('All Locations coupon appears only when the selected restaurant has enabled it', () => {
      // Rest A enabled WELCOME50
      const restAResults = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestA_Id,
        tumkurZoneId
      );
      expect(restAResults.map((c) => c.code)).toContain('WELCOME50');

      // Rest B did not enable WELCOME50
      const restBResults = filterCouponsForRestaurant(
        mockCoupons,
        tumkurRestB_Id,
        tumkurZoneId
      );
      expect(restBResults.map((c) => c.code)).not.toContain('WELCOME50');
    });
  });
});
