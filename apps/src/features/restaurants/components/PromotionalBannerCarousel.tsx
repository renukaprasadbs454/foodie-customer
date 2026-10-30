import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Image,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text } from 'foodie-shared-rn';
import { useGetActiveBannersQuery } from '../../../api/endpoints/bannersApi';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ENV } from '../../../constants/env';

export interface PromoBannerTheme {
  gradient: [string, string, string];
  topTitleColor: string;
  bigHighlightColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  ctaBg: string;
  ctaTextColor: string;
}

export const PROMO_BANNER_THEMES: PromoBannerTheme[] = [
  {
    // 1. Dark Emerald Green & Gold (Exact theme from screenshot!)
    gradient: ['#012B18', '#053E23', '#0A4D2E'],
    topTitleColor: '#FCD34D',
    bigHighlightColor: '#FFFFFF',
    subtitleColor: '#D1FAE5',
    badgeBg: 'rgba(0, 0, 0, 0.45)',
    badgeBorder: '#F59E0B',
    badgeText: '#FCD34D',
    ctaBg: '#000000',
    ctaTextColor: '#FFFFFF',
  },
  {
    // 2. Rich Deep Dark Orange / Amber Flame
    gradient: ['#1C0701', '#3D1302', '#6C2204'],
    topTitleColor: '#FCD34D',
    bigHighlightColor: '#FFFFFF',
    subtitleColor: '#FED7AA',
    badgeBg: 'rgba(0, 0, 0, 0.45)',
    badgeBorder: '#F59E0B',
    badgeText: '#FCD34D',
    ctaBg: '#000000',
    ctaTextColor: '#FFFFFF',
  },
  {
    // 3. Rich Deep Dark Pink / Royal Burgundy
    gradient: ['#1A020F', '#3D0424', '#700940'],
    topTitleColor: '#FCD34D',
    bigHighlightColor: '#FFFFFF',
    subtitleColor: '#FBCFE8',
    badgeBg: 'rgba(0, 0, 0, 0.45)',
    badgeBorder: '#F59E0B',
    badgeText: '#FCD34D',
    ctaBg: '#000000',
    ctaTextColor: '#FFFFFF',
  },
  {
    // 4. Rich Deep Dark Red / Ruby Crimson
    gradient: ['#1A0202', '#3D0404', '#6E0808'],
    topTitleColor: '#FCD34D',
    bigHighlightColor: '#FFFFFF',
    subtitleColor: '#FECACA',
    badgeBg: 'rgba(0, 0, 0, 0.45)',
    badgeBorder: '#F59E0B',
    badgeText: '#FCD34D',
    ctaBg: '#000000',
    ctaTextColor: '#FFFFFF',
  },
];

interface PromoBannerItem {
  id: string;
  badge?: string;
  topTitle: string;
  bigHighlight: string;
  subtitle?: string;
  ctaText: string;
  ctaType: string;
  ctaTarget?: string;
  imageUrl?: string;
  theme: PromoBannerTheme;
}

const DEFAULT_PROMO_BANNERS: Omit<PromoBannerItem, 'theme'>[] = [
  {
    id: 'promo-1',
    badge: '⚡ SPECIAL DEAL',
    topTitle: 'MEGA OFFER',
    bigHighlight: 'ON HOTEL MAYURA',
    subtitle: 'Up to 60% offer',
    ctaText: 'Order now ›',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'Chicken',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600',
  },
  {
    id: 'promo-2',
    badge: '⚡ SPECIAL DEAL',
    topTitle: 'ROYAL FEAST',
    bigHighlight: 'UP TO 50% OFF',
    subtitle: 'Authentic Hyderabadi spice & tender cuts.',
    ctaText: 'Order now ›',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'Biryani',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=600',
  },
  {
    id: 'promo-3',
    badge: '⚡ SPECIAL DEAL',
    topTitle: 'WEEKEND SPECIAL',
    bigHighlight: 'FLAT ₹100 OFF',
    subtitle: 'Waffles, milkshakes & artisanal treats.',
    ctaText: 'Order now ›',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'South Indian',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600',
  },
  {
    id: 'promo-4',
    badge: '⚡ SPECIAL DEAL',
    topTitle: 'CHEF CURATED',
    bigHighlight: 'SAVE BIG TODAY',
    subtitle: 'Top rated gourmet feasts for family.',
    ctaText: 'Order now ›',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'Chicken',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600',
  },
];

export function PromotionalBannerCarousel({
  onSelectCategory,
  onBannerChange,
}: {
  onSelectCategory?: (category: string) => void;
  onBannerChange?: (gradient: [string, string, string]) => void;
}) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { data: apiBanners } = useGetActiveBannersQuery();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const displayBanners: PromoBannerItem[] =
    apiBanners && apiBanners.length > 0
      ? apiBanners.map((b, idx) => {
          const fallback = DEFAULT_PROMO_BANNERS[idx % DEFAULT_PROMO_BANNERS.length]!;
          const resolvedImg = b.imageUrl?.startsWith('/api')
            ? `${ENV.apiBaseUrl}${b.imageUrl}`
            : b.imageUrl || fallback.imageUrl;

          let top = 'SPECIAL OFFER';
          let highlight = b.title || 'UP TO 50% OFF';
          if (b.title && b.title.length > 12) {
            const words = b.title.split(' ');
            if (words.length > 2) {
              top = words.slice(0, 2).join(' ').toUpperCase();
              highlight = words.slice(2).join(' ').toUpperCase();
            }
          }

          const theme = PROMO_BANNER_THEMES[idx % PROMO_BANNER_THEMES.length]!;

          return {
            id: b.id,
            badge: '⚡ SPECIAL DEAL',
            topTitle: top,
            bigHighlight: highlight,
            subtitle: b.subtitle || 'Fresh, fast & hygienic meals',
            ctaText: b.ctaText ? `${b.ctaText} ›` : 'Order Now ›',
            ctaType: b.ctaType || 'OPEN_RESTAURANT',
            ctaTarget: b.ctaTarget,
            imageUrl: resolvedImg,
            theme,
          };
        })
      : DEFAULT_PROMO_BANNERS.map((item, idx) => ({
          ...item,
          theme: PROMO_BANNER_THEMES[idx % PROMO_BANNER_THEMES.length]!,
        }));

  // Auto-scroll loop every 3.5s with smooth animation
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % displayBanners.length;
        try {
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        } catch {
          flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
        }
        const activeTheme = displayBanners[nextIndex]?.theme || PROMO_BANNER_THEMES[0]!;
        if (onBannerChange) {
          onBannerChange(activeTheme.gradient);
        }
        return nextIndex;
      });
    }, 3600);
    return () => clearInterval(interval);
  }, [displayBanners, width, onBannerChange]);

  const handleBannerPress = (banner: PromoBannerItem) => {
    if (banner.ctaType === 'OPEN_RESTAURANT' && banner.ctaTarget) {
      navigation.navigate('Menu', { restaurantId: banner.ctaTarget });
    } else if (banner.ctaType === 'OPEN_CATEGORY' && banner.ctaTarget) {
      if (onSelectCategory) {
        onSelectCategory(banner.ctaTarget);
      }
    } else {
      navigation.navigate('Search', { initialQuery: banner.ctaTarget || '' });
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index >= 0 && index < displayBanners.length && currentIndex !== index) {
      setCurrentIndex(index);
      const activeTheme = displayBanners[index]?.theme || PROMO_BANNER_THEMES[0]!;
      if (onBannerChange) {
        onBannerChange(activeTheme.gradient);
      }
    }
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayBanners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({
            offset: info.index * width,
            animated: true,
          });
        }}
        renderItem={({ item }) => {
          const hasValidImage = Boolean(item.imageUrl && !failedImages[item.id]);

          return (
            <View style={{ width, paddingHorizontal: 16 }}>
              <Pressable
                onPress={() => handleBannerPress(item)}
                style={({ pressed }) => [
                  styles.bannerContentRow,
                  { opacity: pressed ? 0.94 : 1 },
                ]}
              >
                {/* Left Content */}
                <View style={[styles.leftContent, !hasValidImage && { flex: 1.5 }]}>
                  {item.badge ? (
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], alignSelf: 'flex-start' }}>
                      <View style={[styles.badgePill, { backgroundColor: item.theme.badgeBg, borderColor: item.theme.badgeBorder }]}>
                        <Text style={[styles.badgeText, { color: item.theme.badgeText }]}>
                          {item.badge}
                        </Text>
                      </View>
                    </Animated.View>
                  ) : null}

                  {/* Top Header */}
                  <Text style={[styles.topTitleText, { color: item.theme.topTitleColor }]} numberOfLines={1}>
                    {item.topTitle}
                  </Text>

                  {/* Big Hero Text */}
                  <Text style={[styles.bigHighlightText, { color: item.theme.bigHighlightColor }]} numberOfLines={1}>
                    {item.bigHighlight}
                  </Text>

                  {item.subtitle ? (
                    <Text style={[styles.subtitleText, { color: item.theme.subtitleColor }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}

                  {/* Order Now Button with Gold Styling */}
                  <View style={[styles.orderNowPill, { backgroundColor: item.theme.ctaBg }]}>
                    <Text style={[styles.orderNowText, { color: item.theme.ctaTextColor }]}>
                      {item.ctaText}
                    </Text>
                  </View>
                </View>

                {/* Right Dish Visual with floating animated round frame */}
                {hasValidImage ? (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View style={[styles.dishFrame, { borderColor: item.theme.badgeBorder }]}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.dishImage}
                        resizeMode="cover"
                        onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                      />
                    </View>
                  </Animated.View>
                ) : (
                  <View style={[styles.discountBadgeVisual, { borderColor: item.theme.badgeBorder }]}>
                    <Text style={styles.discountBadgeIcon}>🍽️</Text>
                    <Text style={[styles.discountBadgeHighlight, { color: item.theme.topTitleColor }]}>SPECIAL</Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        }}
      />

      {/* Pagination Indicators */}
      {displayBanners.length > 1 && (
        <View style={styles.dotsRow}>
          {displayBanners.map((_, i) => {
            const isActive = currentIndex === i;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 4,
    overflow: 'visible',
  },
  bannerContentRow: {
    minHeight: 175,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 8,
    overflow: 'visible',
  },
  leftContent: {
    flex: 1.25,
    justifyContent: 'center',
    paddingRight: 10,
    paddingTop: 4,
    zIndex: 2,
    overflow: 'visible',
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topTitleText: {
    fontSize: 21,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    lineHeight: 25,
    marginTop: 2,
  },
  bigHighlightText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 27,
    marginTop: 1,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 8,
  },
  orderNowPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNowText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  dishFrame: {
    width: 120,
    height: 115,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  discountBadgeVisual: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  discountBadgeIcon: {
    fontSize: 28,
    marginBottom: 2,
  },
  discountBadgeHighlight: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 22,
    backgroundColor: '#FCD34D',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});


