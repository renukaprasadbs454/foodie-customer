import React from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from 'foodie-shared-rn';
import type { RestaurantSummary } from '../types';
import { getDistanceKm, getEstimatedTimeMins } from '../types';
import { ENV } from '../../../constants/env';

type Props = {
  restaurant: RestaurantSummary;
  onPress: () => void;
  columnMode?: boolean;
  userLat?: number;
  userLng?: number;
  showDistance?: boolean;
};

// Curated high-resolution food images for fallback hashing
const FALLBACK_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600', // Burger & Fries
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600', // Pizza
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600', // Bowls / Curries
  'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=600', // Royal Biryani
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600', // Italian
  'https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=600', // Crispy Chicken
];

function getRestaurantImage(restaurant: RestaurantSummary): string {
  if (restaurant.imageUrl) {
    if (restaurant.imageUrl.startsWith('http')) return restaurant.imageUrl;
    if (restaurant.imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${restaurant.imageUrl}`;
    return restaurant.imageUrl;
  }
  let hash = 0;
  const name = restaurant.name || '';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_FOOD_IMAGES.length;
  return FALLBACK_FOOD_IMAGES[index]!;
}

export function RestaurantCard({ restaurant, onPress, columnMode, userLat, userLng, showDistance = true }: Props) {
  const { tokens } = useTheme();
  const cuisine = restaurant.cuisineTypes?.slice(0, columnMode ? 1 : 2).join(' · ');
  const rating =
    restaurant.avgRating !== null && restaurant.avgRating !== undefined
      ? restaurant.avgRating.toFixed(1)
      : (4.0 + (Math.abs((restaurant.name || '').length * 3) % 9) / 10).toFixed(1);

  const imageUrl = getRestaurantImage(restaurant);

  let distanceText = `${(2.2 + (restaurant.name.length % 3)).toFixed(1)} km`;
  let timeText = `${20 + (Math.abs(restaurant.name.length * 7) % 20)}m`;

  if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
    const dist = getDistanceKm(userLat, userLng, Number(restaurant.latitude), Number(restaurant.longitude));
    distanceText = `${dist.toFixed(1)} km`;
    const eta = getEstimatedTimeMins(dist);
    timeText = `${eta.min}-${eta.max}m`;
  }

  const isClosed = restaurant.isOpen === false;
  const offerTag = (restaurant.name.length % 2 === 0) ? '⚡ FREE DELIVERY' : '★ FLAT ₹50 OFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isClosed}
      delayPressIn={100}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Restaurant ${restaurant.name}`}
      style={{
        backgroundColor: tokens.color.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EFEBE4',
        overflow: 'hidden',
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: tokens.spacing.md,
        flex: columnMode ? 1 : undefined,
        marginHorizontal: columnMode ? 4 : 0,
      }}
    >
      {/* Cover Image Container */}
      <View style={{ height: columnMode ? 120 : 165, width: '100%', backgroundColor: '#F0ECE4', position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%', opacity: isClosed ? 0.35 : 1 }}
          resizeMode="cover"
        />

        {/* Bottom subtle gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(10, 35, 18, 0.75)']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 50,
            justifyContent: 'flex-end',
            paddingHorizontal: 8,
            paddingBottom: 6,
          }}
        >
          {/* Overlaid ETA pill or offer on image bottom */}
          {!isClosed && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{
                backgroundColor: '#FCD34D',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
              }}>
                <Text style={{ color: '#14532D', fontSize: columnMode ? 9 : 10, fontWeight: '900', letterSpacing: 0.3 }}>
                  {offerTag}
                </Text>
              </View>

              {showDistance && (
                <View style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: columnMode ? 9 : 10, fontWeight: '700' }}>
                    ⏱️ {timeText}
                  </Text>
                </View>
              )}
            </View>
          )}
        </LinearGradient>

        {isClosed ? (
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}>
            <View style={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              paddingVertical: 5,
              paddingHorizontal: 12,
              borderRadius: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }}>
              <Text style={{ color: '#F9FAFB', fontWeight: '800', fontSize: columnMode ? 11 : 13, textAlign: 'center' }}>
                Currently Closed
              </Text>
              <Text style={{ color: '#D1D5DB', fontSize: columnMode ? 9 : 10, textAlign: 'center', marginTop: 2 }}>
                We will notify you when open
              </Text>
            </View>
          </View>
        ) : restaurant.city && !columnMode ? (
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(20, 83, 45, 0.88)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: 'rgba(252, 211, 77, 0.4)',
          }}>
            <Text style={{ fontWeight: '800', color: '#FCD34D', fontSize: 10, letterSpacing: 0.5 }}>
              {restaurant.city.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info details */}
      <View style={{
        padding: columnMode ? 10 : 12,
        gap: 4,
        backgroundColor: isClosed ? '#F9FAFB' : tokens.color.surface,
      }}>
        {/* Title and Rating row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            variant={columnMode ? "label" : "heading3"}
            numberOfLines={1}
            style={{
              flex: 1,
              fontWeight: '800',
              color: isClosed ? '#4B5563' : tokens.color.textPrimary,
              fontSize: columnMode ? 14 : 16,
              letterSpacing: -0.2,
            }}
          >
            {restaurant.name}
          </Text>

          {isClosed ? (
            <View style={{
              backgroundColor: '#FEE2E2',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginLeft: 4,
            }}>
              <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>CLOSED</Text>
            </View>
          ) : rating ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#14532D', // Brand dark green
              paddingHorizontal: columnMode ? 6 : 8,
              paddingVertical: columnMode ? 2 : 3,
              borderRadius: 8,
              marginLeft: 6,
              shadowColor: '#14532D',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: columnMode ? 10 : 12, marginRight: 2 }}>
                {rating}
              </Text>
              <Text style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: columnMode ? 9 : 11 }}>★</Text>
            </View>
          ) : null}
        </View>

        {/* Cuisine Types */}
        {cuisine ? (
          <Text variant="caption" color={tokens.color.textSecondary} numberOfLines={1} style={{ fontWeight: '500', fontSize: 11, color: '#6B7280' }}>
            {cuisine}
          </Text>
        ) : null}

        {restaurant.description && !columnMode ? (
          <Text
            variant="caption"
            color={tokens.color.textSecondary}
            numberOfLines={1}
            style={{ marginTop: 2, fontSize: 12, lineHeight: 16, color: '#9CA3AF' }}
          >
            {restaurant.description}
          </Text>
        ) : null}

        {/* Bottom Distance & Delivery info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
          {showDistance && (
            <>
              <Text style={{ fontSize: 11, color: '#14532D', fontWeight: '700' }}>
                📍 {distanceText}
              </Text>
              <Text style={{ color: '#D1D5DB', fontSize: 9 }}>•</Text>
            </>
          )}
          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>
            {restaurant.topPosition ? '👑 Best Seller' : '🛵 Fast Delivery'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

