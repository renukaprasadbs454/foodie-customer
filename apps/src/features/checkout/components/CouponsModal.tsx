import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal as RNModal, SafeAreaView } from 'react-native';
import { Text, Toast, useTheme } from 'foodie-shared-rn';
import type { EligibleCoupon } from '../types';
import { formatMoney } from '../../menu/types';
import { calculateCouponDiscount, getCouponEligibility, formatCouponAmount, sortCouponsByEligibility } from '../couponUtils';
export { calculateCouponDiscount, getCouponEligibility, formatCouponAmount, sortCouponsByEligibility };

type Props = {
    visible: boolean;
    onClose: () => void;
    coupons: EligibleCoupon[];
    selectedCode: string | null;
    orderAmount?: number;
    onApply: (code: string | null) => void;
};

export function CouponsModal({ visible, onClose, coupons, selectedCode, orderAmount = 0, onApply }: Props) {
    const { tokens } = useTheme();

    // Track local selection before hitting the final Apply bottom bar button
    const [localSelection, setLocalSelection] = useState<string | null>(selectedCode);
    const [toast, setToast] = useState<{ message: string; variant: 'info' | 'success' | 'error' | 'warning' } | null>(null);

    // Sort coupons: eligible at top, locked below, preserving relative order
    const sortedCoupons = React.useMemo(
        () => sortCouponsByEligibility(coupons, orderAmount),
        [coupons, orderAmount]
    );

    // Sync when opened
    React.useEffect(() => {
        if (visible) {
            setLocalSelection(selectedCode);
        }
    }, [visible, selectedCode]);


    const renderSubtitle = (coupon: EligibleCoupon) => {
        const { isEligible, amountNeeded } = getCouponEligibility(coupon, orderAmount);

        if (!isEligible) {
            return {
                text: `Add eligible items worth ₹${formatCouponAmount(amountNeeded)} more to unlock`,
                color: '#D97706', // Warm orange color matching screenshot
                isEligible: false
            };
        }

        const type = (coupon.discountType || '').toUpperCase();
        if (type === 'FLAT') {
            return {
                text: `Save ₹${formatCouponAmount(Number(coupon.value))} with this code`,
                color: '#1D4ED8',
                isEligible: true
            };
        }
        if (type === 'PERCENTAGE' || type === 'PERCENT') {
            if (orderAmount > 0) {
                const { discountAmount } = calculateCouponDiscount(coupon, orderAmount);
                return {
                    text: `Save ₹${formatCouponAmount(discountAmount)} on this order`,
                    color: '#1D4ED8',
                    isEligible: true
                };
            }
            return {
                text: `Save ${coupon.value}% on this order`,
                color: '#1D4ED8',
                isEligible: true
            };
        }
        return {
            text: `Special offer for you`,
            color: '#1D4ED8',
            isEligible: true
        };
    };

    const getTitle = (coupon: EligibleCoupon) => {
        const type = (coupon.discountType || '').toUpperCase();
        if (type === 'FLAT') {
            return `Flat ₹${formatCouponAmount(Number(coupon.value))} OFF`;
        }
        return `${coupon.value}% OFF`;
    };

    // The bottom bar appears if ANY coupon is selected locally and eligible.
    const selectedCouponObj = coupons.find(c => c.code === localSelection);
    const selectedEligibility = selectedCouponObj ? getCouponEligibility(selectedCouponObj, orderAmount) : null;
    const isSelectedEligible = selectedCouponObj && selectedEligibility?.isEligible;

    return (
        <RNModal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                {/* Header like Image 2 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    backgroundColor: '#FFFFFF',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                }}>
                    <Pressable onPress={onClose} style={{ paddingRight: 16 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>←</Text>
                    </Pressable>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Coupons</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Available coupons</Text>
                        {localSelection && (
                            <Pressable onPress={() => setLocalSelection(null)}>
                                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Clear</Text>
                            </Pressable>
                        )}
                    </View>

                    {sortedCoupons.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ fontSize: 40 }}>🎫</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 }}>
                                No active coupons available
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 20 }}>
                            {sortedCoupons.map((coupon) => {
                                const { isEligible, amountNeeded } = getCouponEligibility(coupon, orderAmount);
                                const subInfo = renderSubtitle(coupon);
                                const isSelected = localSelection === coupon.code && isEligible;
                                return (
                                    <Pressable
                                        key={coupon.code}
                                        onPress={() => {
                                            if (isEligible) {
                                                setLocalSelection(coupon.code);
                                            } else {
                                                setToast({
                                                    message: `Add eligible items worth ₹${formatCouponAmount(amountNeeded)} more to unlock`,
                                                    variant: 'warning',
                                                });
                                            }
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            backgroundColor: 'transparent',
                                            opacity: isEligible ? 1 : 0.85,
                                        }}
                                    >
                                        {/* Left Icon */}
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: isEligible ? '#DBEAFE' : '#F3F4F6',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 2,
                                            marginRight: 12
                                        }}>
                                            <Text style={{ color: isEligible ? '#1D4ED8' : '#9CA3AF', fontSize: 12, fontWeight: 'bold' }}>%</Text>
                                        </View>

                                        {/* Center Details */}
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 16, fontWeight: '800', color: isEligible ? '#111827' : '#374151' }}>
                                                    {getTitle(coupon)}
                                                </Text>
                                                <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>ⓘ</Text>
                                            </View>

                                            <Text style={{ fontSize: 13, color: subInfo.color, fontWeight: '700', marginTop: 4, marginBottom: 8 }}>
                                                {subInfo.text}
                                            </Text>

                                            <View style={{
                                                alignSelf: 'flex-start',
                                                backgroundColor: '#FFFFFF',
                                                borderWidth: 1,
                                                borderColor: isEligible ? '#E5E7EB' : '#F3F4F6',
                                                borderRadius: 6,
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                            }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: isEligible ? '#374151' : '#9CA3AF', letterSpacing: 0.5 }}>
                                                    {coupon.code}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Radio Button */}
                                        <View style={{
                                            width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                                            borderColor: isSelected ? '#14532D' : (isEligible ? '#D1D5DB' : '#E5E7EB'),
                                            justifyContent: 'center', alignItems: 'center',
                                            marginTop: 4
                                        }}>
                                            {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#14532D' }} />}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>

                {/* Bottom bar with Tap to Apply */}
                <View style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 10,
                }}>
                    {isSelectedEligible && selectedCouponObj && (
                        <View style={{
                            backgroundColor: '#1E3A8A', // Deep blue background matching design
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: '#DBEAFE',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10
                            }}>
                                <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: 'bold' }}>%</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                {(() => {
                                    const { discountAmount } = calculateCouponDiscount(selectedCouponObj, orderAmount);
                                    return (
                                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                                            Save ₹{formatCouponAmount(discountAmount)} with '{selectedCouponObj.code}'
                                        </Text>
                                    );
                                })()}
                            </View>
                        </View>
                    )}

                    <Pressable
                        onPress={() => {
                            if (isSelectedEligible) {
                                onApply(localSelection);
                                onClose();
                            }
                        }}
                        disabled={!isSelectedEligible}
                        style={({ pressed }) => ({
                            backgroundColor: !isSelectedEligible ? '#D1D5DB' : (pressed ? '#114022' : '#14532D'),
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                        })}
                    >
                        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: !isSelectedEligible ? '#6B7280' : '#FCD34D', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                            Apply Coupon
                        </Text>
                    </Pressable>
                </View>

                <Toast
                    visible={Boolean(toast)}
                    message={toast?.message ?? ''}
                    variant={toast?.variant ?? 'info'}
                    accessibilityLabel={toast?.message ?? 'Toast'}
                    onDismiss={() => setToast(null)}
                />
            </SafeAreaView>
        </RNModal>
    );
}
