import React from 'react';
import { View, Pressable, ScrollView, Modal as RNModal } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { EligibleCoupon } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
    visible: boolean;
    onClose: () => void;
    coupons: EligibleCoupon[];
    selectedCode: string | null;
    onApply: (code: string | null) => void;
};

export function CouponsModal({ visible, onClose, coupons, selectedCode, onApply }: Props) {
    const { tokens } = useTheme();
    const insets = useSafeAreaInsets();

    const renderDescription = (coupon: EligibleCoupon) => {
        if (coupon.discountType === 'FLAT') {
            return `Get flat ₹${coupon.value} OFF on this order`;
        }
        if (coupon.discountType === 'PERCENTAGE') {
            let desc = `Get ${coupon.value}% OFF on this order`;
            if (coupon.maxDiscountAmount) {
                desc += ` up to ₹${coupon.maxDiscountAmount}`;
            }
            return desc;
        }
        return `Use code ${coupon.code} for an exclusive discount`;
    };

    const renderCondition = (coupon: EligibleCoupon) => {
        if (coupon.minOrderAmount && Number(coupon.minOrderAmount) > 0) {
            return `Applicable on orders above ₹${coupon.minOrderAmount}`;
        }
        return `No minimum order value`;
    };

    return (
        <RNModal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="formSheet"
        >
            <View style={{ flex: 1, backgroundColor: '#F2F2F7', paddingTop: insets.top }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: '#FFFFFF',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Coupons & Offers</Text>
                    <Pressable onPress={onClose} style={{ padding: 4 }}>
                        <Text style={{ fontSize: 18, color: '#6B7280', fontWeight: 'bold' }}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
                    {coupons.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ fontSize: 40 }}>🎫</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 }}>
                                No active coupons available right now
                            </Text>
                        </View>
                    ) : (
                        coupons.map((coupon) => {
                            const isSelected = selectedCode === coupon.code;
                            return (
                                <View
                                    key={coupon.code}
                                    style={{
                                        backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                                        borderRadius: 16,
                                        padding: 16,
                                        borderWidth: 1.5,
                                        borderColor: isSelected ? '#22C55E' : '#E5E7EB',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 6,
                                        elevation: 2,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, paddingRight: 12 }}>
                                            <View style={{
                                                alignSelf: 'flex-start',
                                                backgroundColor: isSelected ? '#DCFCE7' : '#FEF3C7',
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 6,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#86EFAC' : '#FCD34D',
                                                marginBottom: 10,
                                            }}>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#166534' : '#92400E', letterSpacing: 0.5 }}>
                                                    {coupon.code}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                                                {renderDescription(coupon)}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
                                                {renderCondition(coupon)}
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={() => {
                                                onApply(isSelected ? null : coupon.code);
                                                onClose();
                                            }}
                                            style={({ pressed }) => ({
                                                backgroundColor: "transparent",
                                                paddingHorizontal: 0,
                                                paddingVertical: 6,
                                                opacity: pressed ? 0.7 : 1,
                                            })}
                                        >
                                            <Text style={{
                                                color: isSelected ? '#EF4444' : '#14532D',
                                                fontWeight: '800',
                                                fontSize: 14,
                                            }}>
                                                {isSelected ? 'REMOVE' : 'APPLY'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </RNModal>
    );
}
