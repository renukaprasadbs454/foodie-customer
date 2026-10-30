import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Text } from 'foodie-shared-rn';
import type { SearchFoodItemDto } from '../../../api/endpoints/menuApi';
import { ENV } from '../../../constants/env';

interface FoodDishCardProps {
  item: SearchFoodItemDto;
  onPress: () => void;
  onAdd: () => void;
  width?: number | string;
  restaurantName?: string;
}

function resolveDishImage(imageUrl?: string | null): string | null {
  if (!imageUrl || imageUrl.trim().length === 0) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
  return imageUrl;
}

export function FoodDishCard({
  item,
  onPress,
  onAdd,
  width = 168,
  restaurantName,
}: FoodDishCardProps) {
  const imageUrl = resolveDishImage(item.imageUrl);

  const hasRealRating =
    (item.avgRating && item.avgRating > 0) ||
    (item.avg_rating && item.avg_rating > 0);
  const rating = hasRealRating
    ? (item.avgRating || item.avg_rating)!.toFixed(1)
    : null;

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
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      {/* Top Image or Clean Graphic Container */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={{ fontSize: 36 }}>{item.isVeg ? '🥗' : '🍲'}</Text>
          </View>
        )}

        {/* Rating Pill (Only if genuine rating exists) */}
        {rating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        )}

        {/* Floating Add to Cart Button */}
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
        <Text numberOfLines={1} style={styles.restaurantName}>
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

          <Text numberOfLines={1} style={styles.dishName}>
            {item.name}
          </Text>
        </View>

        {/* Real Price Display */}
        <Text style={styles.priceText}>
          ₹{Math.round(item.basePrice)}
        </Text>
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#F7F5F0',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 83, 45, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  ratingStar: {
    color: '#FCD34D',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  addButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  details: {
    padding: 10,
    gap: 3,
  },
  restaurantName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dishRow: {
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
  vegCircle: {
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
  dishName: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  priceText: {
    color: '#14532D',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
});
