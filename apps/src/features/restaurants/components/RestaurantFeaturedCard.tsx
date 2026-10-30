import React from 'react';
import { View, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'foodie-shared-rn';
import type { RestaurantSummary } from '../types';
import { getDistanceKm, getEstimatedTimeMins } from '../types';
import { useGetMenuQuery } from '../../../api/endpoints/menuApi';
import { ENV } from '../../../constants/env';

interface RestaurantFeaturedCardProps {
  restaurant: RestaurantSummary;
  onRestaurantPress: () => void;
  onAddToCart: (item: any) => void;
  isVegOnly?: boolean;
  userLat?: number;
  userLng?: number;
}

function resolveDishImage(imageUrl?: string | null): string | null {
  if (!imageUrl || imageUrl.trim().length === 0) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
  return imageUrl;
}

function resolveRestaurantCover(imageUrl?: string | null): string | null {
  if (!imageUrl || imageUrl.trim().length === 0) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
  return imageUrl;
}

export function RestaurantFeaturedCard({
  restaurant,
  onRestaurantPress,
  onAddToCart,
  isVegOnly = false,
  userLat,
  userLng,
}: RestaurantFeaturedCardProps) {
  // Fetch only the real menu belonging to this specific restaurant
  const { data: menuData } = useGetMenuQuery(restaurant.id, {
    skip: !restaurant.id,
  });

  // Extract real menu items added by this restaurant only (no mock fallbacks)
  const realItems = React.useMemo(() => {
    let items = (menuData?.categories?.flatMap((c) => c.items) || []) as any[];

    if (isVegOnly) {
      items = items.filter((i) => i.isVeg);
    }

    return items;
  }, [menuData, isVegOnly]);

  // Compute lowest item price strictly if real items exist with valid prices
  const minItemPrice = React.useMemo(() => {
    if (realItems.length === 0) return null;
    const prices = realItems
      .map((i) => Number(i.basePrice))
      .filter((p) => !isNaN(p) && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [realItems]);

  // ETA calculation
  let timeText = '20-30 mins';
  if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
    const dist = getDistanceKm(
      userLat,
      userLng,
      Number(restaurant.latitude),
      Number(restaurant.longitude)
    );
    const eta = getEstimatedTimeMins(dist);
    timeText = `${eta.min}-${eta.max} mins`;
  }

  // Cuisines formatting
  const cuisines = Array.isArray(restaurant.cuisineTypes) && restaurant.cuisineTypes.length > 0
    ? restaurant.cuisineTypes.slice(0, 3).join(', ')
    : 'Multi-cuisine';

  // Only display rating if genuine
  const hasRealRating =
    restaurant.avgRating !== null &&
    restaurant.avgRating !== undefined &&
    restaurant.avgRating > 0;
  const ratingText = hasRealRating ? restaurant.avgRating!.toFixed(1) : null;

  // Offline / Closed Check
  const isOffline = restaurant.isOpen === false;

  const coverUrl = resolveRestaurantCover(restaurant.imageUrl);

  return (
    <View
      style={[
        styles.cardContainer,
        isOffline && styles.cardContainerOffline,
      ]}
    >
      {/* Top Header of Restaurant Card */}
      <Pressable
        onPress={onRestaurantPress}
        disabled={isOffline}
        style={({ pressed }) => [
          styles.headerPressable,
          { opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            {/* Badges Row: Offline vs Top Restaurant */}
            <View style={styles.badgeRow}>
              {isOffline ? (
                <View style={styles.offlineBadge}>
                  <Text style={styles.offlineBadgeText}>⚫ OFFLINE / CURRENTLY CLOSED</Text>
                </View>
              ) : (
                <>
                  {restaurant.topPosition !== null &&
                    restaurant.topPosition !== undefined &&
                    Number(restaurant.topPosition) > 0 && (
                      <View style={styles.topRestoBadge}>
                        <Text style={styles.topRestoBadgeText}>👑 TOP RESTAURANT</Text>
                      </View>
                    )}
                  {minItemPrice !== null && (
                    <View style={styles.itemsAtBadge}>
                      <Text style={styles.itemsAtText}>
                        Dishes from ₹{Math.round(minItemPrice)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Restaurant Name */}
            <Text
              style={[
                styles.restaurantTitle,
                isOffline && styles.restaurantTitleOffline,
              ]}
              numberOfLines={1}
            >
              {restaurant.name}
            </Text>

            {/* Rating • ETA • Cuisines */}
            <View style={styles.infoRow}>
              {ratingText ? (
                <>
                  <View style={[styles.starBadge, isOffline && styles.starBadgeOffline]}>
                    <Text style={styles.starIcon}>★</Text>
                    <Text style={styles.ratingText}>{ratingText}</Text>
                  </View>
                  <Text style={styles.bulletDot}>•</Text>
                </>
              ) : null}

              <Text style={[styles.infoText, isOffline && styles.infoTextOffline]}>
                ⏱️ {timeText}
              </Text>
              <Text style={styles.bulletDot}>•</Text>
              <Text
                style={[styles.infoText, isOffline && styles.infoTextOffline, { flexShrink: 1 }]}
                numberOfLines={1}
              >
                {cuisines}
              </Text>
            </View>

            {/* If offline, show a clean explanation message */}
            {isOffline && (
              <Text style={styles.offlineNotice}>
                This restaurant is currently not accepting orders.
              </Text>
            )}
          </View>

          {/* Restaurant Cover Thumbnail on Right (if restaurant uploaded one) */}
          {coverUrl && (
            <View style={[styles.restaurantCoverContainer, isOffline && styles.restaurantCoverOffline]}>
              <Image
                source={{ uri: coverUrl }}
                style={[styles.restaurantCoverImage, isOffline && { opacity: 0.35 }]}
                resizeMode="cover"
              />
              {isOffline && (
                <View style={styles.coverClosedOverlay}>
                  <Text style={styles.coverClosedText}>CLOSED</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>

      {/* Horizontal Scroll of Dishes Inside this Restaurant — ONLY rendered if the restaurant has real menu items and is open */}
      {!isOffline && realItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dishesScroll}
        >
          {realItems.slice(0, 10).map((dish, idx) => {
            const dishImage = resolveDishImage(dish.imageUrl);
            const basePrice = Math.round(Number(dish.basePrice));

            return (
              <View key={dish.menuItemId || dish.id || idx} style={styles.dishCard}>
                {/* Dish Photo or Clean Dish Card if no image */}
                {dishImage ? (
                  <View style={styles.dishImageWrap}>
                    <Image
                      source={{ uri: dishImage }}
                      style={styles.dishImage}
                      resizeMode="cover"
                    />
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
                ) : (
                  <View style={styles.dishNoImageHeader}>
                    <View style={styles.dishIconBadge}>
                      <Text style={{ fontSize: 20 }}>{dish.isVeg ? '🥗' : '🍲'}</Text>
                    </View>
                    <Pressable
                      onPress={() => onAddToCart(dish)}
                      style={({ pressed }) => [
                        styles.addInlineButton,
                        { transform: [{ scale: pressed ? 0.9 : 1 }] },
                      ]}
                    >
                      <Text style={styles.addInlineButtonText}>ADD +</Text>
                    </Pressable>
                  </View>
                )}

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

                  {/* Real Price Display — NO dummy strikethrough or fake discounts */}
                  <View style={styles.priceRow}>
                    <Text style={styles.realPriceText}>
                      ₹{basePrice}
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
    borderRadius: 22,
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
  // Black & White monochrome style when offline/closed
  cardContainerOffline: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
  },
  headerPressable: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  topRestoBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  topRestoBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  itemsAtBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  itemsAtText: {
    color: '#065F46',
    fontSize: 10.5,
    fontWeight: '800',
  },
  offlineBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  offlineBadgeText: {
    color: '#F9FAFB',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  restaurantTitle: {
    color: '#14532D',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  restaurantTitleOffline: {
    color: '#374151', // Neutral charcoal
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 2,
  },
  starBadgeOffline: {
    backgroundColor: '#4B5563',
  },
  starIcon: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '900',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  bulletDot: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  infoText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  infoTextOffline: {
    color: '#6B7280',
  },
  offlineNotice: {
    color: '#4B5563',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
  },
  restaurantCoverContainer: {
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  restaurantCoverOffline: {
    backgroundColor: '#374151',
  },
  restaurantCoverImage: {
    width: '100%',
    height: '100%',
  },
  coverClosedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverClosedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dishesScroll: {
    paddingTop: 10,
    gap: 12,
  },
  dishCard: {
    width: 140,
    backgroundColor: '#FDFBF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    overflow: 'hidden',
  },
  dishImageWrap: {
    width: 140,
    height: 95,
    position: 'relative',
    backgroundColor: '#F3EFEA',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  dishNoImageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F2EB',
    height: 52,
  },
  dishIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addInlineButton: {
    backgroundColor: '#14532D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addInlineButtonText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '900',
  },
  addButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  dishDetails: {
    padding: 10,
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
    flex: 1,
    color: '#1F2937',
    fontSize: 12.5,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  realPriceText: {
    color: '#14532D',
    fontSize: 13.5,
    fontWeight: '900',
  },
});
