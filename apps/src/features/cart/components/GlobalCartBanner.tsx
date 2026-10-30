import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import { useNavigation } from '@react-navigation/native';
import { useGetCartQuery, useRemoveCartItemMutation, useUpdateCartItemQuantityMutation } from '../../../api/endpoints/cartApi';
import { formatMoney } from '../../menu/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { MOCK_RESTAURANTS } from '../../restaurants/mockData';

export function GlobalCartBanner() {
    const { tokens } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const isSmallScreen = screenWidth < 380;
    const isUltraSmallScreen = screenWidth < 350;

    const navigation = useNavigation<any>();
    const cartQuery = useGetCartQuery();
    const [updateQuantity] = useUpdateCartItemQuantityMutation();
    const [removeItem] = useRemoveCartItemMutation();

    const cartItemsCount = cartQuery?.data?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    const cartSubtotal = cartQuery?.data?.subtotal ?? 0;
    const restaurantId = cartQuery?.data?.restaurantId;
    if (cartItemsCount === 0) return null;

    const mockRestaurant = restaurantId ? MOCK_RESTAURANTS.find((r: any) => r.id === restaurantId) : null;
    const realRestaurantName = cartQuery?.data?.restaurantName;
    const restaurantName = realRestaurantName || mockRestaurant?.name || 'Selected Restaurant';

    const lastItem = cartQuery?.data?.items?.[cartQuery.data.items.length - 1];
    let subtitleText = `From ${restaurantName}`;
    if (lastItem) {
        subtitleText = `${lastItem.name} ${cartItemsCount > 1 ? `+ ${cartItemsCount - 1} more` : ''}`;
    }

    const handleRemove = () => {
        if (!lastItem) return;
        if (lastItem.quantity > 1) {
            updateQuantity({ cartItemId: lastItem.cartItemId, quantity: lastItem.quantity - 1 });
        } else {
            removeItem(lastItem.cartItemId);
        }
    };

    return (
        <Pressable
            onPress={() => navigation.navigate('Cart')}
            accessibilityRole="button"
            accessibilityLabel={`Cart banner: ${cartItemsCount} items, total ₹${formatMoney(cartSubtotal)}. Tap to view cart.`}
            style={({ pressed }) => ({
                position: 'absolute',
                bottom: isSmallScreen ? tokens.spacing.md + 4 : tokens.spacing.lg + 8,
                left: isSmallScreen ? 10 : tokens.spacing.md,
                right: isSmallScreen ? 10 : tokens.spacing.md,
                borderRadius: 22,
                overflow: 'hidden',
                shadowColor: '#14532D',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
                opacity: pressed ? 0.95 : 1,
            })}
        >
            <LinearGradient
                colors={['#0F3E22', '#14532D', '#166534']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: isUltraSmallScreen ? 10 : isSmallScreen ? 12 : 16,
                    paddingVertical: isSmallScreen ? 10 : 12,
                    borderWidth: 1.5,
                    borderColor: '#FCD34D',
                    borderRadius: 22,
                }}
            >
                {/* Left section: Item count badge, Price (flexShrink: 0 and numberOfLines=1 guarantee it never wraps vertically), and Subtitle */}
                <View style={{ flex: 1, minWidth: 0, marginRight: 8, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmallScreen ? 6 : 8, flexWrap: 'nowrap' }}>
                        <View style={{
                            backgroundColor: '#FCD34D',
                            borderRadius: 10,
                            paddingHorizontal: isSmallScreen ? 7 : 9,
                            paddingVertical: 3,
                            flexShrink: 0,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Text variant="label" style={{ color: '#134E4A', fontWeight: '900', fontSize: isSmallScreen ? 11 : 12 }}>
                                {cartItemsCount} {cartItemsCount === 1 ? 'ITEM' : 'ITEMS'}
                            </Text>
                        </View>
                        <Text
                            variant="bodySmall"
                            color="#FFFFFF"
                            style={{
                                fontWeight: '900',
                                fontSize: isUltraSmallScreen ? 14 : isSmallScreen ? 15 : 17,
                                flexShrink: 0,
                            }}
                            numberOfLines={1}
                        >
                            ₹{formatMoney(cartSubtotal)}
                        </Text>
                    </View>
                    <Text
                        variant="caption"
                        style={{
                            color: '#E8F5E9',
                            fontWeight: '600',
                            fontSize: isSmallScreen ? 10 : 11,
                            marginTop: 2,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {subtitleText}
                    </Text>
                </View>

                {/* Right section: Remove button + View Cart */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isUltraSmallScreen ? 4 : isSmallScreen ? 6 : 10, flexShrink: 0 }}>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Remove last item"
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            opacity: pressed ? 0.7 : 1,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            paddingHorizontal: isSmallScreen ? 6 : 8,
                            paddingVertical: isSmallScreen ? 4 : 5,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.3)',
                        })}
                    >
                        <Feather name="minus" size={isSmallScreen ? 12 : 14} color="#FFF" />
                        <Text variant="label" style={{ color: '#FFF', fontWeight: '800', fontSize: isSmallScreen ? 10 : 11 }}>
                            Remove
                        </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Text variant="label" style={{ color: '#FCD34D', fontWeight: '900', fontSize: isSmallScreen ? 13 : 14, letterSpacing: 0.3 }}>
                            View Cart
                        </Text>
                        <Feather name="arrow-right" size={isSmallScreen ? 14 : 16} color="#FCD34D" />
                    </View>
                </View>
            </LinearGradient>
        </Pressable>
    );
}
