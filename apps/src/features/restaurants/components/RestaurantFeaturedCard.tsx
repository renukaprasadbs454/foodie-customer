import React from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { RestaurantSummary } from '../types';
import { getDistanceKm, getEstimatedTimeMins } from '../types';
import { useGetMenuQuery, type SearchFoodItemDto } from '../../../api/endpoints/menuApi';
import { ENV } from '../../../constants/env';

interface RestaurantFeaturedCardProps {
  restaurant: RestaurantSummary;
  onRestaurantPress: () => void;
  onAddToCart: (item: any) => void;
  isVegOnly?: boolean;
  userLat?: number;
  userLng?: number;
  fallbackItems?: SearchFoodItemDto[];
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=400',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400',
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=400',
  chicken: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=400',
  curry: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=400',
  paneer: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=400',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=400',
  juice: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?q=80&w=400',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=400',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=400',
  roti: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=400',
  chips: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=400',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400';

function resolveItemImage(imageUrl?: string | null, name?: string): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
    return imageUrl;
  }
  const lower = (name || '').toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return DEFAULT_IMAGE;
}

export function RestaurantFeaturedCard({
  restaurant,
  onRestaurantPress,
  onAddToCart,
  isVegOnly = false,
  userLat,
  userLng,
  fallbackItems = [],
}: RestaurantFeaturedCardProps) {
  // Fetch real menu for this restaurant from backend
  const { data: menuData } = useGetMenuQuery(restaurant.id, {
    skip: !restaurant.id,
  });

  // Extract all dishes from menu categories
  const realItems = React.useMemo(() => {
    let items = (menuData?.categories?.flatMap((c) => c.items) || []) as any[];

    if (items.length === 0 && fallbackItems.length > 0) {
      // Use fallback matching items from global food search
      items = fallbackItems.filter(
        (f) =>
          !f.restaurantId ||
          f.restaurantId === restaurant.id ||
          restaurant.name.toLowerCase().includes(f.restaurantName?.toLowerCase() || '')
      );
    }

    if (isVegOnly) {
      items = items.filter((i) => i.isVeg);
    }

    return items;
  }, [menuData, fallbackItems, isVegOnly, restaurant]);

  // Compute lowest item price for "% Items At ₹XX"
  const minItemPrice = React.useMemo(() => {
    if (realItems.length === 0) return 49;
    const prices = realItems.map((i) => Number(i.basePrice)).filter((p) => !isNaN(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 49;
  }, [realItems]);

  // ETA calculation
  let timeText = '20-30 mins';
  if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
    const dist = getDistanceKm(userLat, userLng, Number(restaurant.latitude), Number(restaurant.longitude));
    const eta = getEstimatedTimeMins(dist);
    timeText = `${eta.min}-${eta.max} mins`;
  }

  // Cuisines formatting
  const cuisines = Array.isArray(restaurant.cuisineTypes)
    ? restaurant.cuisineTypes.slice(0, 2).join(', ')
    : 'Multi-cuisine';

  const rating =
    restaurant.avgRating !== null && restaurant.avgRating !== undefined && restaurant.avgRating > 0
      ? restaurant.avgRating.toFixed(1)
      : '4.2';

  // Dynamic discount badge
  const discountPct = 20 + (Math.abs(restaurant.name.length * 5) % 21); // 20% to 40%

  return (
    <View style={styles.cardContainer}>
      {/* Top Header of Restaurant Card */}
      <Pressable onPress={onRestaurantPress} style={styles.headerPressable}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            {/* Discount Header Pill & Top Restaurant Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Text style={styles.discountBadgeText}>
                {discountPct}% LOWER PRICES
              </Text>
              {(restaurant.topPosition !== null && restaurant.topPosition !== undefined && Number(restaurant.topPosition) > 0) && (
                <View style={styles.topRestoBadge}>
                  <Text style={styles.topRestoBadgeText}>👑 TOP RESTAURANT</Text>
                </View>
              )}
            </View>

            {/* Restaurant Name */}
            <Text style={styles.restaurantTitle} numberOfLines={1}>
              {restaurant.name}
            </Text>

            {/* Rating • ETA • Cuisines */}
            <View style={styles.infoRow}>
              <View style={styles.starBadge}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.infoText}>{timeText}</Text>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {cuisines}
              </Text>
            </View>

            {/* Items At ₹XX */}
            <View style={styles.itemsAtRow}>
              <View style={styles.pctIconBadge}>
                <Text style={styles.pctIconText}>%</Text>
              </View>
              <Text style={styles.itemsAtText}>
                Items At ₹{Math.round(minItemPrice)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Horizontal Scroll of Dishes Inside this Restaurant */}
      {realItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dishesScroll}
        >
          {realItems.slice(0, 8).map((dish, idx) => {
            const dishImage = resolveItemImage(dish.imageUrl, dish.name);
            const basePrice = Math.round(Number(dish.basePrice) || 59);
            const originalPrice = Math.round(basePrice * 1.35); // 35% higher original
            const appSavings = 20 + ((idx * 7) % 21); // 20-40% lower

            return (
              <View key={dish.menuItemId || idx} style={styles.dishCard}>
                {/* Dish Photo with Floating Add Button */}
                <View style={styles.dishImageWrap}>
                  <Image source={{ uri: dishImage }} style={styles.dishImage} resizeMode="cover" />

                  {/* Floating Circular Add Button in Bottom Right */}
                  <Pressable
                    onPress={() => onAddToCart(dish)}
                    style={({ pressed }) => [
                      styles.addButton,
                      { transform: [{ scale: pressed ? 0.9 : 1 }] },
                    ]}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </Pressable>
                </View>

                {/* Dish Details */}
                <View style={styles.dishDetails}>
                  {/* FSSAI Veg / Non-Veg Icon + Name */}
                  <View style={styles.nameRow}>
                    <View
                      style={[
                        styles.fssaiBox,
                        { borderColor: dish.isVeg ? '#16A34A' : '#DC2626' },
                      ]}
                    >
                      {dish.isVeg ? (
                        <View style={styles.vegDot} />
                      ) : (
                        <View style={styles.nonVegTriangle} />
                      )}
                    </View>
                    <Text style={styles.dishTitle} numberOfLines={1}>
                      {dish.name}
                    </Text>
                  </View>

                  {/* Price Row: Strikethrough Original + Discounted Pill */}
                  <View style={styles.priceRow}>
                    <Text style={styles.strikethroughPrice}>
                      ₹{originalPrice}
                    </Text>
                    <View style={styles.discountPricePill}>
                      <Text style={styles.discountPriceText}>
                        ₹{basePrice}
                      </Text>
                    </View>
                  </View>

                  {/* Savings Tag */}
                  <View style={styles.savingsTag}>
                    <Text style={styles.savingsText}>
                      💕 Our app: {appSavings}% lower
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  headerPressable: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  discountBadgeText: {
    color: '#D97706', // Theme Gold/Amber
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  restaurantTitle: {
    color: '#14532D', // Theme Brand Dark Green
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    gap: 2,
  },
  starIcon: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '900',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  bulletDot: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  infoText: {
    color: '#6B7280',
    fontSize: 12.5,
    fontWeight: '600',
  },
  itemsAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pctIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pctIconText: {
    color: '#047857',
    fontSize: 10.5,
    fontWeight: '900',
  },
  itemsAtText: {
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '800',
  },
  topRestoBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  topRestoBadgeText: {
    color: '#92400E',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  dishesScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  dishCard: {
    width: 148,
    borderRadius: 16,
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#F0ECE4',
    overflow: 'hidden',
  },
  dishImageWrap: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FCD34D', // Gold accent
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: '#14532D',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -2,
  },
  dishDetails: {
    padding: 8,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fssaiBox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vegDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#DC2626',
  },
  dishTitle: {
    color: '#1F2937',
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strikethroughPrice: {
    color: '#9CA3AF',
    fontSize: 12,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountPricePill: {
    backgroundColor: '#FEF3C7', // Gold/Amber pill
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  discountPriceText: {
    color: '#92400E',
    fontSize: 12.5,
    fontWeight: '900',
  },
  savingsTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 1,
  },
  savingsText: {
    color: '#BE185D',
    fontSize: 9.5,
    fontWeight: '700',
  },
});
