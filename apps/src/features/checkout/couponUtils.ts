import type { EligibleCoupon } from './types';

export function isCouponExpired(expiryDate?: string | null): boolean {
    if (!expiryDate) return false;
    const s = String(expiryDate).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const endOfDay = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 23, 59, 59, 999).getTime();
        return Date.now() > endOfDay;
    }
    const t = new Date(s).getTime();
    if (!isNaN(t)) {
        return Date.now() > t;
    }
    return false;
}

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

    // Check if this is a restaurant coupon:
    // Only cap restaurant coupons; do not touch platform / other coupons!
    const isRestaurantCoupon =
        coupon.couponType === 'RESTAURANT' ||
        coupon.couponType === 'RESTAURANT_COUPON' ||
        coupon.couponType === 'RESTAURANT_FIRST_ORDER' ||
        coupon.funderType === 'SHARED' ||
        coupon.funderType === 'RESTAURANT' ||
        coupon.funderType === 'MERCHANT' ||
        Boolean(coupon.restaurantId && String(coupon.restaurantId).trim() !== '' && String(coupon.restaurantId) !== 'null') ||
        (coupon.restaurantDiscount != null && Number(coupon.restaurantDiscount) > 0);

    if (isRestaurantCoupon) {
        const rawMax = coupon.maxDiscountAmount != null && coupon.maxDiscountAmount !== ''
            ? Number(coupon.maxDiscountAmount)
            : (coupon.maxDiscount != null && coupon.maxDiscount !== '' ? Number(coupon.maxDiscount) : null);
        if (rawMax != null && rawMax > 0 && !isNaN(rawMax)) {
            discountAmount = Math.min(discountAmount, rawMax);
        }
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

export function normalizeZoneId(rawZoneId?: string | null): string {
    if (!rawZoneId) return '';
    const s = String(rawZoneId).trim().toLowerCase();
    if (!s || s === 'null' || s === 'undefined') return '';
    const stripped = s.replace(/^dz-/, '').replace(/-zone$/, '').trim();
    if (stripped === 'bengaluru' || stripped === 'bangalore' || stripped === 'blr') return 'bangalore';
    if (stripped === 'tumakuru' || stripped === 'tumkur' || stripped === 'tmk') return 'tumkur';
    if (stripped === 'hubballi' || stripped === 'hubli' || stripped === 'hbl') return 'hubballi';
    if (stripped === 'mysuru' || stripped === 'mysore') return 'mysore';
    if (stripped === 'hassan') return 'hassan';
    return stripped;
}

/**
 * Validates whether a coupon is applicable to the selected restaurant's assigned zone.
 * Conditions:
 * 1. Explicit All Locations / All Zones: available to all zones (restaurant must still enable).
 * 2. Missing zone information is NEVER treated as All Locations.
 * 3. Exact zone comparison: Selected Restaurant Zone ID = Coupon Zone ID.
 */
export function isCouponInRestaurantZone(
    couponZoneId?: string | null,
    couponZoneName?: string | null,
    isAllZones?: boolean,
    restaurantZoneId?: string | null
): boolean {
    const normRestZone = normalizeZoneId(restaurantZoneId);
    if (!normRestZone) {
        return false;
    }

    // 1. Explicit All Locations / All Zones
    const isExplicitAll =
        isAllZones === true ||
        (couponZoneId && String(couponZoneId).trim().toUpperCase() === 'ALL') ||
        (couponZoneName && (couponZoneName.trim().toLowerCase() === 'all zones' || couponZoneName.trim().toUpperCase() === 'ALL'));

    if (isExplicitAll) {
        return true;
    }

    // 2. Missing zone information must not be treated as All Locations
    if (!couponZoneId && !couponZoneName) {
        return false;
    }

    // 3. Compare Selected Restaurant Zone ID = Coupon Zone ID
    const normCouponZone = normalizeZoneId(couponZoneId || couponZoneName);
    if (!normCouponZone) {
        return false;
    }

    return normCouponZone === normRestZone;
}

export function isZoneMatching(target: string, customerZone: string): boolean {
    if (!target || !customerZone) return false;
    const t = target.trim().toLowerCase();
    const c = customerZone.trim().toLowerCase();
    if (t === 'all' || c === 'all') return true;
    if (t === c) return true;

    const normT = normalizeZoneId(t);
    const normC = normalizeZoneId(c);
    if (normT && normC && normT === normC) return true;

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

    return false;
}

export type FilterCouponsOptions = {
    restaurantName?: string | null;
    enabledCouponIds?: (string | null | undefined)[] | null;
};

/**
 * Displays only coupons enabled by the selected restaurant in its applicable zone.
 * Conditions satisfied:
 * 1. Coupon belongs to the selected restaurant's applicable zone (Selected Restaurant Zone ID = Coupon Zone ID).
 * 2. Selected restaurant has enabled the coupon (isActive: true, not deactivated, not other restaurant's).
 * 3. Coupon is active and published (approvalStatus: APPROVED).
 * 4. Coupon is within its validity period (not expired).
 */
export function filterCouponsForRestaurant(
    coupons: EligibleCoupon[],
    restaurantId?: string | null,
    restaurantZoneId?: string | null,
    optionsOrName?: FilterCouponsOptions | string | null,
    legacyZoneId?: string | null
): EligibleCoupon[] {
    if (!Array.isArray(coupons) || !restaurantId || !restaurantId.trim()) {
        return [];
    }
    const cleanRestId = restaurantId.trim().toLowerCase();

    // Resolve restaurantZoneId and options
    let resolvedZoneId = restaurantZoneId ? restaurantZoneId.trim() : '';
    let enabledIdsSet: Set<string> | null = null;

    if (optionsOrName && typeof optionsOrName === 'object') {
        if (Array.isArray(optionsOrName.enabledCouponIds)) {
            enabledIdsSet = new Set(
                optionsOrName.enabledCouponIds
                    .filter(Boolean)
                    .map((id) => String(id).trim().toLowerCase())
            );
        }
    } else if (typeof optionsOrName === 'string' && legacyZoneId) {
        // Legacy positional: (coupons, restaurantId, restaurantName, zoneId)
        resolvedZoneId = legacyZoneId.trim();
    }

    return coupons.filter((c) => {
        if (!c || !c.code) return false;

        // 1. Must be enabled by the restaurant
        if (c.isActive === false) return false;
        const statusUpper = String(c.status || '').toUpperCase();
        if (
            statusUpper === 'DEACTIVATED' ||
            statusUpper === 'DISABLED' ||
            statusUpper === 'INACTIVE' ||
            statusUpper === 'DELETED'
        ) {
            return false;
        }

        // 2. Must be approved & published
        if (c.approvalStatus && String(c.approvalStatus).toUpperCase() !== 'APPROVED') {
            return false;
        }

        // 3. Must be within validity period (not expired)
        if (isCouponExpired(c.expiryDate)) {
            return false;
        }

        // 4. Zone Validation:
        // Must belong to the selected restaurant's assigned zone
        // Compare: Selected Restaurant Zone ID = Coupon Zone ID
        if (resolvedZoneId) {
            if (!isCouponInRestaurantZone(c.zoneId, c.zoneName, c.isAllZones, resolvedZoneId)) {
                return false;
            }
        }

        // 5. Restaurant Assignment & Enable Validation:
        const couponRestId = c.restaurantId ? String(c.restaurantId).trim().toLowerCase() : '';
        const couponId = c.couponId ? String(c.couponId).trim().toLowerCase() : '';
        const couponCode = c.code ? String(c.code).trim().toLowerCase() : '';

        if (couponRestId) {
            // Belongs to a restaurant: strictly match the selected restaurant
            if (
                couponRestId !== cleanRestId &&
                !cleanRestId.includes(couponRestId) &&
                !couponRestId.includes(cleanRestId)
            ) {
                return false;
            }
        } else {
            // Unassigned coupon (global / zone template)
            // Show only if explicitly enabled for this restaurant via enabledCouponIds
            if (enabledIdsSet) {
                const isEnabled =
                    (couponId && enabledIdsSet.has(couponId)) ||
                    (couponCode && enabledIdsSet.has(couponCode));
                if (!isEnabled) {
                    return false;
                }
            } else {
                // Do not show coupons just because they exist in the global coupon list
                return false;
            }
        }

        return true;
    });
}
