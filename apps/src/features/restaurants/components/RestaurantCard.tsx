import React from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { Badge, Text, useTheme } from 'foodie-shared-rn';
import type { RestaurantSummary } from '../types';
import { getDistanceKm, getEstimatedTimeMins } from '../types';
import { ENV } from '../../../constants/env';

type Props = {
  restaurant: RestaurantSummary;
  onPress: () => void;
  columnMode?: boolean;
  userLat?: number;
  userLng?: number;
};

// Curated high-resolution Unsplash food images for fallback hashing
const FALLBACK_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600', // Burger & Fries
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600', // Pizza
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600', // Bowls / Curries
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600', // Specialty Dessert
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600', // Salad
];

function getRestaurantImage(restaurant: RestaurantSummary): string {
  if (restaurant.imageUrl) {
    if (restaurant.imageUrl.startsWith('http')) return restaurant.imageUrl;
    if (restaurant.imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${restaurant.imageUrl}`;
    return restaurant.imageUrl;
  }
  // Dynamic fallback based on name hashing
  let hash = 0;
  const name = restaurant.name || '';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_FOOD_IMAGES.length;
  return FALLBACK_FOOD_IMAGES[index]!;
}

export function RestaurantCard({ restaurant, onPress, columnMode, userLat, userLng }: Props) {
  const { tokens } = useTheme();
  const cuisine = restaurant.cuisineTypes?.slice(0, columnMode ? 1 : 2).join(' · ');
  const rating =
    restaurant.avgRating !== null && restaurant.avgRating !== undefined
      ? restaurant.avgRating.toFixed(1)
      : null;

  const imageUrl = getRestaurantImage(restaurant);

  let distanceText = `${(2.5 + (restaurant.name.length % 3)).toFixed(1)} km`;
  let timeText = `${20 + (Math.abs(restaurant.name.length * 7) % 25)}m`;

  if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
    const dist = getDistanceKm(userLat, userLng, Number(restaurant.latitude), Number(restaurant.longitude));
    distanceText = `${dist.toFixed(1)} km`;
    const eta = getEstimatedTimeMins(dist);
    timeText = `${eta.min}-${eta.max}m`;
  }

  // Treat missing isOpen as true for backwards compatibility or mock data
  const isClosed = restaurant.isOpen === false;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isClosed}
      delayPressIn={100}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Restaurant ${restaurant.name}`}
      style={{
        backgroundColor: tokens.color.surface,
        borderRadius: tokens.radius.md,
        borderWidth: 1,
        borderColor: tokens.color.border,
        overflow: 'hidden',
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: tokens.spacing.sm,
        flex: columnMode ? 1 : undefined,
        marginHorizontal: columnMode ? 4 : 0,
      }}
    >
      {/* Cover Image */}
      <View style={{ height: columnMode ? 110 : 150, width: '100%', backgroundColor: '#F0ECE4' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', opacity: isClosed ? 0.3 : 1 }}
          resizeMode="cover"
        />
        {restaurant.city && !columnMode ? (
          <View style={{
            position: 'absolute',
            top: tokens.spacing.sm,
            right: tokens.spacing.sm,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: tokens.radius.sm,
            paddingHorizontal: tokens.spacing.sm,
            paddingVertical: 2,
          }}>
            <Text variant="caption" style={{ fontWeight: '700', color: tokens.color.accent }}>
              {restaurant.city.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info details */}
      <View style={{ padding: columnMode ? tokens.spacing.sm : tokens.spacing.md, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            variant={columnMode ? "label" : "heading3"}
            numberOfLines={1}
            style={{ flex: 1, fontWeight: '700', color: tokens.color.textPrimary, fontSize: columnMode ? 13 : 16 }}
          >
            {restaurant.name}
          </Text>
          {rating ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#14532D', // Dark Green
              paddingHorizontal: columnMode ? 5 : 8,
              paddingVertical: columnMode ? 2 : 3,
              borderRadius: tokens.radius.sm,
              marginLeft: 4,
            }}>
              <Text style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: columnMode ? 10 : 13, marginRight: 2 }}>★</Text>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: columnMode ? 10 : 12 }}>
                {rating}
              </Text>
            </View>
          ) : null}
        </View>

        {cuisine ? (
          <Text variant="caption" color={tokens.color.textSecondary} numberOfLines={1} style={{ fontWeight: '500', fontSize: 11 }}>
            {cuisine}
          </Text>
        ) : null}

        {restaurant.description && !columnMode ? (
          <Text
            variant="caption"
            color={tokens.color.textSecondary}
            numberOfLines={2}
            style={{ marginTop: tokens.spacing.xs, lineHeight: 16 }}
          >
            {restaurant.description}
          </Text>
        ) : null}

        {/* ETA */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: columnMode ? 2 : 4 }}>
          <Text style={{ fontSize: columnMode ? 11 : 13 }}>⏱️</Text>
          <Text style={{ fontSize: columnMode ? 11 : 13, color: '#14532D', fontWeight: '700' }}>
            {timeText}
          </Text>
          <Text style={{ color: '#D1D5DB', fontSize: columnMode ? 9 : 10, marginHorizontal: columnMode ? 1 : 4 }}>|</Text>
          <Text style={{ fontSize: columnMode ? 11 : 13, color: '#6B7280', fontWeight: '600' }}>
            {distanceText}
          </Text>
        </View>
      </View>

      {/* CLOSED OVERLAY */}
      {isClosed && (
        <View style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.md,
        }}>
          <View style={{
            backgroundColor: '#1F2937', // Dark Gray
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            opacity: 0.95,
          }}>
            <Text style={{ color: '#F9FAFB', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}>
              Currently Closed
            </Text>
            <Text style={{ color: '#D1D5DB', fontSize: 10, textAlign: 'center', marginTop: 2 }}>
              We will notify you when they open
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

