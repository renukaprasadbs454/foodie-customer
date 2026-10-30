import React, { useRef, useState, useEffect } from 'react';
import { View, FlatList, Image, Pressable, Animated, useWindowDimensions, StyleSheet } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import { useGetActiveBannersQuery } from '../../../api/endpoints/bannersApi';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ENV } from '../../../constants/env';

interface FallbackBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  ctaText: string;
  ctaType: string;
  ctaTarget?: string;
  imageUrl?: string;
  gradient: [string, string];
}

const DEFAULT_PROMO_BANNERS: FallbackBanner[] = [
  {
    id: 'promo-1',
    badge: 'Powered by Foodie',
    title: 'Breakfast Staples',
    subtitle: 'Starting at ₹49',
    ctaText: 'ORDER NOW',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'South Indian',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=500',
    gradient: ['#0B2B1E', '#14532D'],
  },
  {
    id: 'promo-2',
    badge: 'Foodie Gold Special',
    title: 'Royal Biryani Feast',
    subtitle: 'Flat 50% Off Today',
    ctaText: 'EXPLORE',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'Biryani',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=500',
    gradient: ['#78350F', '#B45309'],
  },
  {
    id: 'promo-3',
    badge: 'Pure Veg Specials',
    title: 'Crispy Dosa Combos',
    subtitle: 'Starting at ₹53',
    ctaText: 'ORDER NOW',
    ctaType: 'OPEN_CATEGORY',
    ctaTarget: 'Dosa',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=500',
    gradient: ['#064E3B', '#047857'],
  },
];

export function PromotionalBannerCarousel({ onSelectCategory }: { onSelectCategory?: (category: string) => void }) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { zone } = useGlobalLocation();
  const { data: apiBanners } = useGetActiveBannersQuery();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine backend banners or fallbacks
  const displayBanners = (apiBanners && apiBanners.length > 0)
    ? apiBanners.map((b, idx) => ({
        id: b.id,
        badge: 'Foodie Spotlight',
        title: b.title,
        subtitle: b.subtitle || 'Special Limited Offer',
        ctaText: b.ctaText || 'ORDER NOW',
        ctaType: b.ctaType || 'OPEN_RESTAURANT',
        ctaTarget: b.ctaTarget,
        imageUrl: b.imageUrl?.startsWith('/api') ? `${ENV.apiBaseUrl}${b.imageUrl}` : b.imageUrl || DEFAULT_PROMO_BANNERS[idx % DEFAULT_PROMO_BANNERS.length]!.imageUrl,
        gradient: DEFAULT_PROMO_BANNERS[idx % DEFAULT_PROMO_BANNERS.length]!.gradient,
      }))
    : DEFAULT_PROMO_BANNERS;

  // Auto-scroll banners one after another every 3.5s
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
        return nextIndex;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [displayBanners.length, width]);

  const handleBannerPress = (banner: any) => {
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

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (currentIndex !== index) {
      setCurrentIndex(index);
    }
  };

  const bannerCardWidth = width - 32;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayBanners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
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
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 0 }}>
            <Pressable
              onPress={() => handleBannerPress(item)}
              style={({ pressed }) => [
                styles.bannerCard,
                { width, opacity: pressed ? 0.95 : 1 },
              ]}
            >
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Decorative Subtle Gold Wave Accent */}
              <View style={styles.decorativeGoldCircle} />
              <View style={styles.decorativeGoldWave} />

              {/* Left Content Column */}
              <View style={styles.leftContent}>
                {/* Brand Tag */}
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>{item.badge} ✨</Text>
                </View>

                {/* Hero Title in 3D Gold / White */}
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Subtitle / Price highlight */}
                {item.subtitle && (
                  <Text style={styles.heroSubtitle}>
                    {item.subtitle}
                  </Text>
                )}

                {/* Yellow/Gold "ORDER NOW" Button */}
                <View style={styles.orderButton}>
                  <Text style={styles.orderButtonText}>{item.ctaText}</Text>
                </View>
              </View>

              {/* Right Dish Visual Image */}
              <View style={styles.rightImageContainer}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.heroDishImage}
                    resizeMode="cover"
                  />
                )}
                {/* Gold Glow Ring */}
                <View style={styles.imageGlowRing} />
              </View>
            </Pressable>
          </View>
        )}
      />

      {/* Gold Discount Offer Strip (Exactly matching the reference image) */}
      <View style={styles.goldOfferStrip}>
        <View style={styles.stripDivider} />
        <Text style={styles.stripText}>
          GET ADDITIONAL ₹20 FREE CASH WITH GOLD
        </Text>
        <View style={styles.stripDivider} />
      </View>

      {/* Pagination Indicators */}
      {displayBanners.length > 1 && (
        <View style={styles.dotsRow}>
          {displayBanners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex === i ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    marginHorizontal: 0,
    width: '100%',
  },
  bannerCard: {
    height: 195,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  decorativeGoldCircle: {
    position: 'absolute',
    right: -40,
    top: -30,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(252, 211, 77, 0.12)',
  },
  decorativeGoldWave: {
    position: 'absolute',
    left: -60,
    bottom: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(252, 211, 77, 0.08)',
  },
  leftContent: {
    flex: 1.25,
    justifyContent: 'center',
    zIndex: 2,
    paddingRight: 8,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  brandBadgeText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: '#FCD34D', // Gold hero title matching screenshot
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 12,
  },
  orderButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCD34D',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  orderButtonText: {
    color: '#14532D',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  rightImageContainer: {
    width: 135,
    height: 135,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    position: 'relative',
  },
  heroDishImage: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 3.5,
    borderColor: '#FCD34D',
  },
  imageGlowRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
    borderColor: 'rgba(252, 211, 77, 0.4)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#14532D',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#D1D5DB',
  },
  goldOfferStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCD34D',
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
    gap: 8,
  },
  stripDivider: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#14532D',
    opacity: 0.4,
  },
  stripText: {
    color: '#14532D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

