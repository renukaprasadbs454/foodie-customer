import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal as RNModal, SafeAreaView } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { EligibleCoupon } from '../types';
import { formatMoney } from '../../menu/types';

type Props = {
    visible: boolean;
    onClose: () => void;
    coupons: EligibleCoupon[];
    selectedCode: string | null;
    onApply: (code: string | null) => void;
};

export function CouponsModal({ visible, onClose, coupons, selectedCode, onApply }: Props) {
    const { tokens } = useTheme();

    // Track local selection before hitting the final Apply bottom bar button
    const [localSelection, setLocalSelection] = useState<string | null>(selectedCode);

    // Sync when opened
    React.useEffect(() => {
        if (visible) {
            setLocalSelection(selectedCode);
        }
    }, [visible, selectedCode]);

    const renderSubtitle = (coupon: EligibleCoupon) => {
        // If not eligible (mock condition based on minOrderAmount)
        // Actually the EligibleCoupon comes from backend. We assume they are all selectable, 
        // but we can render the required text based on discountType.
        if (coupon.discountType === 'FLAT') {
            return `Save ₹${formatMoney(Number(coupon.value))} with this code`;
        }
        if (coupon.discountType === 'PERCENTAGE') {
            let desc = `Save ${coupon.value}% on this order`;
            if (coupon.maxDiscountAmount) {
                desc += ` up to ₹${coupon.maxDiscountAmount}`;
            }
            return desc;
        }
        return `Special offer for you`;
    };

    const getTitle = (coupon: EligibleCoupon) => {
        if (coupon.discountType === 'FLAT') {
            return `Flat ₹${formatMoney(Number(coupon.value))} OFF`;
        }
        return `${coupon.value}% OFF`;
    };

    // The bottom bar appears if ANY coupon is selected locally.
    const selectedCouponObj = coupons.find(c => c.code === localSelection);

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

                    {coupons.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ fontSize: 40 }}>🎫</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 }}>
                                No active coupons available
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 20 }}>
                            {coupons.map((coupon) => {
                                const isSelected = localSelection === coupon.code;
                                return (
                                    <Pressable
                                        key={coupon.code}
                                        onPress={() => setLocalSelection(coupon.code)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            backgroundColor: 'transparent',
                                        }}
                                    >
                                        {/* Left Icon */}
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: '#DBEAFE',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginTop: 2,
                                            marginRight: 12
                                        }}>
                                            <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: 'bold' }}>%</Text>
                                        </View>

                                        {/* Center Details */}
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                                                    {getTitle(coupon)}
                                                </Text>
                                                <Text style={{ marginLeft: 6, fontSize: 13, color: '#6B7280' }}>ⓘ</Text>
                                            </View>

                                            <Text style={{ fontSize: 13, color: '#1D4ED8', fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                                                {renderSubtitle(coupon)}
                                            </Text>

                                            <View style={{
                                                alignSelf: 'flex-start',
                                                backgroundColor: '#FFFFFF',
                                                borderWidth: 1,
                                                borderColor: '#E5E7EB',
                                                borderRadius: 6,
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                            }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', letterSpacing: 0.5 }}>
                                                    {coupon.code}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Radio Button */}
                                        <View style={{
                                            width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                                            borderColor: isSelected ? '#14532D' : '#D1D5DB',
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
                    {selectedCouponObj && (
                        <View style={{
                            backgroundColor: '#1E3A8A', // Foodie secondary deep blue/green or dark theme
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
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                                Save ₹{formatMoney(Number(selectedCouponObj.value))} with '{selectedCouponObj.code}'
                            </Text>
                        </View>
                    )}

                    <Pressable
                        onPress={() => {
                            onApply(localSelection);
                            onClose();
                        }}
                        disabled={!localSelection && localSelection === selectedCode}
                        style={({ pressed }) => ({
                            backgroundColor: pressed ? '#114022' : '#14532D',
                            borderRadius: 12,
                            paddingVertical: 14,
                            alignItems: 'center',
                        })}
                    >
                        <Text style={{ color: '#FCD34D', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                            Tap to apply
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </RNModal>
    );
}
