import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { SearchFoodItemDto } from '../../../api/endpoints/menuApi';
import { ENV } from '../../../constants/env';

interface FoodDishCardProps {
  item: SearchFoodItemDto;
  onPress: () => void;
  onAdd: () => void;
  width?: number | string;
  restaurantName?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=500',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=500',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500',
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=500',
  chicken: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=500',
  curry: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=500',
  paneer: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?q=80&w=500',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=500',
  juice: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?q=80&w=500',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=500',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=500',
  roti: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=500',
  chips: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=500',
  dessert: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=500',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500';

function resolveFoodImage(item: SearchFoodItemDto): string {
  if (item.imageUrl && item.imageUrl.trim().length > 0) {
    if (item.imageUrl.startsWith('http')) return item.imageUrl;
    if (item.imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${item.imageUrl}`;
    return item.imageUrl;
  }

  const lower = (item.name || '').toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
    if (lower.includes(key)) {
      return url;
    }
  }
  return DEFAULT_IMAGE;
}

export function FoodDishCard({
  item,
  onPress,
  onAdd,
  width = 168,
  restaurantName,
}: FoodDishCardProps) {
  const { tokens } = useTheme();
  const imageUrl = resolveFoodImage(item);
  const rating =
    (item.avgRating && item.avgRating > 0)
      ? item.avgRating.toFixed(1)
      : (item.avg_rating && item.avg_rating > 0)
      ? item.avg_rating.toFixed(1)
      : (3.9 + ((item.name.length * 3) % 11) / 10).toFixed(1);

  const displayRestaurant =
    restaurantName || item.restaurantName || 'Foodie Partner';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: typeof width === 'number' ? width : undefined,
          flex: typeof width === 'string' ? 1 : undefined,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      {/* Top Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Top-Left: Popular / Bestseller Badge */}
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>

        {/* Bottom-Left: Rating Pill */}
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>

        {/* Bottom-Right: Floating Add to Cart Button */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to cart`}
          style={({ pressed }) => [
            styles.addButton,
            { transform: [{ scale: pressed ? 0.9 : 1 }] },
          ]}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Details Container */}
      <View style={styles.details}>
        {/* Restaurant Name */}
        <Text
          numberOfLines={1}
          style={styles.restaurantName}
        >
          {displayRestaurant}
        </Text>

        {/* Veg/Non-Veg Icon + Food Item Name */}
        <View style={styles.dishRow}>
          <View
            style={[
              styles.fssaiBox,
              { borderColor: item.isVeg ? '#16A34A' : '#DC2626' },
            ]}
          >
            {item.isVeg ? (
              <View style={styles.vegCircle} />
            ) : (
              <View style={styles.nonVegTriangle} />
            )}
          </View>

          <Text
            numberOfLines={1}
            style={styles.dishName}
          >
            {item.name}
          </Text>
        </View>

        {/* Price Row */}
        <Text style={styles.priceText}>
          ₹{Math.round(item.basePrice)}
        </Text>

        {/* Value Offer Callout */}
        <View style={styles.dealTag}>
          <Text style={styles.dealText}>
            🏷️ Our app: 40% lower
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    overflow: 'hidden',
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  imageContainer: {
    height: 145,
    width: '100%',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#16A34A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  popularText: {
    color: '#16A34A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingStar: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '900',
  },
  ratingText: {
    color: '#1F2937',
    fontSize: 11,
    fontWeight: '800',
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCD34D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#14532D',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: -2,
  },
  details: {
    padding: 10,
    gap: 4,
  },
  restaurantName: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '600',
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fssaiBox: {
    width: 14,
    height: 14,
    borderWidth: 1.2,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vegCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#DC2626',
  },
  dishName: {
    color: '#14532D',
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
  },
  priceText: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '900',
    marginTop: 1,
  },
  dealTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  dealText: {
    color: '#BE185D',
    fontSize: 10,
    fontWeight: '700',
  },
});
