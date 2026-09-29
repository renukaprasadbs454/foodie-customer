import type { EligibleCoupon } from './types';

export function calculateCouponDiscount(
    coupon: EligibleCoupon,
    orderAmount: number
): { discountAmount: number; finalTotal: number } {
    const val = Number(coupon.value) || 0;
    const type = (coupon.discountType || '').toUpperCase();
    let discountAmount = 0;

    if (type === 'FLAT') {
        discountAmount = val;
    } else {
        // PERCENTAGE or PERCENT: strictly (orderTotal * discountPercentage) / 100
        discountAmount = (orderAmount * val) / 100;
    }

    if (orderAmount > 0) {
        discountAmount = Math.min(discountAmount, orderAmount);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100);

    return { discountAmount, finalTotal };
}

export function getCouponEligibility(
    coupon: EligibleCoupon,
    orderAmount: number
): { isEligible: boolean; minPurchase: number; amountNeeded: number } {
    const minPurchase = Number(coupon.minOrderAmount) || 0;
    if (minPurchase <= 0 || orderAmount >= minPurchase) {
        return { isEligible: true, minPurchase, amountNeeded: 0 };
    }
    const amountNeeded = Math.max(0, Math.round((minPurchase - orderAmount) * 100) / 100);
    return { isEligible: false, minPurchase, amountNeeded };
}

export function formatCouponAmount(val: number): string {
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}

export function sortCouponsByEligibility(
    coupons: EligibleCoupon[],
    orderAmount: number
): EligibleCoupon[] {
    const eligible: EligibleCoupon[] = [];
    const locked: EligibleCoupon[] = [];

    for (const coupon of coupons) {
        const { isEligible } = getCouponEligibility(coupon, orderAmount);
        if (isEligible) {
            eligible.push(coupon);
        } else {
            locked.push(coupon);
        }
    }

    return [...eligible, ...locked];
}

