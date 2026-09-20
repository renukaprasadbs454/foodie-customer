import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, Image, Dimensions, Pressable, Animated, Easing } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import { useGetActiveBannersQuery } from '../../../api/endpoints/bannersApi';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Animated Floating Shape Component
const FloatingShape = ({ emoji, initialDelay, left, right, top, bottom, size = 40 }: any) => {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 3000,
                    delay: initialDelay,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 3000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [floatAnim]);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -12]
    });

    const rotate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '10deg']
    });

    return (
        <Animated.View style={{
            position: 'absolute',
            left, right, top, bottom,
            transform: [{ translateY }, { rotate }]
        }}>
            <Text style={{ fontSize: size }}>{emoji}</Text>
        </Animated.View>
    );
};

export function PromotionalBannerCarousel() {
    const { tokens } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { data: banners, isLoading } = useGetActiveBannersQuery();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!banners || banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const nextIndex = (prev + 1) % banners.length;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                return nextIndex;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [banners]);

    if (isLoading) {
        return (
            <View style={{ height: 145, marginHorizontal: tokens.spacing.md, backgroundColor: '#E5E7EB', borderRadius: 20 }} />
        );
    }

    if (!banners || banners.length === 0) {
        return null;
    }

    const handleBannerPress = (banner: any) => {
        switch (banner.ctaType) {
            case 'OPEN_COUPON':
            case 'OPEN_COUPONS':
                break;
            case 'OPEN_RESTAURANT':
            case 'OPEN_RESTAURANT_MENU':
                if (banner.ctaTarget) {
                    navigation.navigate('Menu', { restaurantId: banner.ctaTarget });
                }
                break;
            default:
                break;
        }
    };

    const handleScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        const roundIndex = Math.round(index);
        if (currentIndex !== roundIndex) {
            setCurrentIndex(roundIndex);
        }
    };

    // Predefined vibrant gradients
    const vibrantGradients: [string, string][] = [
        ['#8B5CF6', '#6D28D9'], // Purple
        ['#F97316', '#EA580C'], // Orange
        ['#EC4899', '#BE185D'], // Pink
        ['#14B8A6', '#0F766E'], // Teal
    ];
    const emojis = [['✨', '🎉', '🎁'], ['🍔', '🔥', '🛵'], ['🎊', '🤑', '💥'], ['🍰', '✨', '🎈']];

    return (
        <View style={{ marginVertical: tokens.spacing.md }}>
            <FlatList
                ref={flatListRef}
                data={banners}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => {
                    const gradient = vibrantGradients[index % vibrantGradients.length];
                    const activeEmojis = emojis[index % emojis.length];

                    return (
                        <Pressable
                            onPress={() => handleBannerPress(item)}
                            style={{
                                width: width,
                                paddingHorizontal: tokens.spacing.md,
                            }}
                        >
                            <View style={{
                                width: '100%',
                                height: 145,
                                borderRadius: 20,
                                overflow: 'hidden',
                                position: 'relative',
                                elevation: 4,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 6,
                            }}>
                                <LinearGradient
                                    colors={gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                                />

                                {/* Floating Animated Elements */}
                                <FloatingShape emoji={activeEmojis[0]} size={45} top={-10} right={10} initialDelay={0} />
                                <FloatingShape emoji={activeEmojis[1]} size={35} bottom={10} right={60} initialDelay={1000} />
                                <FloatingShape emoji={activeEmojis[2]} size={30} top={20} left={200} initialDelay={500} />

                                {/* Banner Content */}
                                <View style={{
                                    flex: 1,
                                    padding: 20,
                                    justifyContent: 'center',
                                    width: '75%',
                                }}>
                                    <Text style={{
                                        color: '#FFFFFF',
                                        fontWeight: '900',
                                        fontSize: 22,
                                        fontStyle: 'italic',
                                        letterSpacing: -0.5,
                                        textShadowColor: 'rgba(0, 0, 0, 0.4)',
                                        textShadowOffset: { width: 1, height: 1 },
                                        textShadowRadius: 3,
                                    }} numberOfLines={2}>
                                        {item.title}
                                    </Text>

                                    {item.subtitle && (
                                        <Text style={{
                                            color: '#FEF3C7',
                                            fontSize: 13,
                                            fontWeight: '600',
                                            marginTop: 4,
                                            marginBottom: 8,
                                            letterSpacing: 0.2,
                                            textShadowColor: 'rgba(0, 0, 0, 0.4)',
                                            textShadowOffset: { width: 1, height: 1 },
                                            textShadowRadius: 2,
                                        }} numberOfLines={2}>
                                            {item.subtitle}
                                        </Text>
                                    )}

                                    {/* Action Button Pill */}
                                    <View style={{
                                        alignSelf: 'flex-start',
                                        backgroundColor: '#FFFFFF',
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        marginTop: item.subtitle ? 0 : 12,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 3,
                                        elevation: 3,
                                    }}>
                                        <Text style={{
                                            color: '#E11D48',
                                            fontWeight: '800',
                                            fontSize: 12,
                                            textTransform: 'uppercase'
                                        }}>
                                            {item.ctaText || 'EXPLORE NOW'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Massive Highlight Pill like "Win upto Rs1000" (rendered using CTA Target if needed or fixed text to match vibe) */}
                                {item.ctaType === 'OPEN_COUPON' && (
                                    <Animated.View style={{
                                        position: 'absolute',
                                        bottom: 12,
                                        right: 12,
                                        backgroundColor: '#EC4899',
                                        borderWidth: 2,
                                        borderColor: '#FFFFFF',
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 16,
                                        transform: [{ rotate: '-3deg' }],
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 5,
                                    }}>
                                        <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                                            USE {item.ctaTarget || 'CODE'}
                                        </Text>
                                    </Animated.View>
                                )}
                            </View>
                        </Pressable>
                    );
                }}
            />

            {/* Pagination Indicator */}
            {banners.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: tokens.spacing.sm, gap: 6 }}>
                    {banners.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: currentIndex === i ? 20 : 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: currentIndex === i ? tokens.color.accent : '#D1D5DB',
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
