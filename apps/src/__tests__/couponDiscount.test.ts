import { describe, it, expect } from '@jest/globals';
import { calculateCouponDiscount } from '../features/checkout/couponUtils';
import type { EligibleCoupon } from '../features/checkout/types';

describe('calculateCouponDiscount', () => {
  it('calculates percentage discount dynamically based on order amount (e.g., 7% of ₹700 = ₹49, total ₹651)', () => {
    const coupon: EligibleCoupon = {
      code: 'FOODIE1234567',
      discountType: 'PERCENTAGE',
      value: 7,
    };
    const result = calculateCouponDiscount(coupon, 700);
    expect(result.discountAmount).toBe(49);
    expect(result.finalTotal).toBe(651);
  });

  it('calculates percentage discount for ₹299 order with 7% discount (₹20.93)', () => {
    const coupon: EligibleCoupon = {
      code: 'FOODIE1234567',
      discountType: 'PERCENTAGE',
      value: 7,
    };
    const result = calculateCouponDiscount(coupon, 299);
    expect(result.discountAmount).toBe(20.93);
    expect(result.finalTotal).toBe(278.07);
  });

  it('calculates percentage discount for ₹500 order with 15% discount', () => {
    const coupon: EligibleCoupon = {
      code: 'FOODIE15',
      discountType: 'PERCENTAGE',
      value: 15,
    };
    const result = calculateCouponDiscount(coupon, 500);
    expect(result.discountAmount).toBe(75);
    expect(result.finalTotal).toBe(425);
  });

  it('handles FLAT discount coupons properly', () => {
    const coupon: EligibleCoupon = {
      code: 'FOODIE60',
      discountType: 'FLAT',
      value: 60,
    };
    const result = calculateCouponDiscount(coupon, 200);
    expect(result.discountAmount).toBe(60);
    expect(result.finalTotal).toBe(140);
  });
});

describe('getCouponEligibility', () => {
  it('identifies ineligible coupon when cart total is below minOrderAmount (e.g. ₹299 < ₹500)', () => {
    const { getCouponEligibility } = require('../features/checkout/couponUtils');
    const coupon: EligibleCoupon = {
      code: 'FOODIE1234567',
      discountType: 'PERCENTAGE',
      value: 7,
      minOrderAmount: 500,
    };
    const res = getCouponEligibility(coupon, 299);
    expect(res.isEligible).toBe(false);
    expect(res.minPurchase).toBe(500);
    expect(res.amountNeeded).toBe(201);
  });

  it('identifies eligible coupon when cart total reaches minOrderAmount (e.g. ₹700 >= ₹500)', () => {
    const { getCouponEligibility } = require('../features/checkout/couponUtils');
    const coupon: EligibleCoupon = {
      code: 'FOODIE1234567',
      discountType: 'PERCENTAGE',
      value: 7,
      minOrderAmount: 500,
    };
    const res = getCouponEligibility(coupon, 700);
    expect(res.isEligible).toBe(true);
    expect(res.amountNeeded).toBe(0);
  });
});

describe('sortCouponsByEligibility', () => {
  it('places eligible coupons at top and locked coupons below while preserving relative order', () => {
    const { sortCouponsByEligibility } = require('../features/checkout/couponUtils');
    const coupons: EligibleCoupon[] = [
      { code: 'FOODIE17', discountType: 'PERCENTAGE', value: 50, minOrderAmount: 700 }, // locked for ₹200 (needs 500 more)
      { code: 'FOODIE45', discountType: 'FLAT', value: 29, minOrderAmount: 0 },         // eligible
      { code: 'FOODIE65', discountType: 'FLAT', value: 53, minOrderAmount: 0 },         // eligible
      { code: 'FOODIE89', discountType: 'PERCENTAGE', value: 30, minOrderAmount: 0 },   // eligible
      { code: 'HGHG', discountType: 'PERCENTAGE', value: 45, minOrderAmount: 501 },       // locked for ₹200 (needs 301 more)
    ];

    const sorted = sortCouponsByEligibility(coupons, 200);
    expect(sorted.map((c: EligibleCoupon) => c.code)).toEqual([
      'FOODIE45',
      'FOODIE65',
      'FOODIE89',
      'FOODIE17',
      'HGHG',
    ]);
  });
});

