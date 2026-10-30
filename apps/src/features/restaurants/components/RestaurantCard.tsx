import React from 'react';
import { TouchableOpacity, View, Image, StyleSheet } from 'react-native';
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

function resolveRestaurantImage(imageUrl?: string | null): string | null {
  if (!imageUrl || imageUrl.trim().length === 0) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
  return imageUrl;
}

export function RestaurantCard({
  restaurant,
  onPress,
  columnMode,
  userLat,
  userLng,
  showDistance = true,
}: Props) {
  const { tokens } = useTheme();

  const cuisine =
    Array.isArray(restaurant.cuisineTypes) && restaurant.cuisineTypes.length > 0
      ? restaurant.cuisineTypes.slice(0, columnMode ? 1 : 2).join(' · ')
      : 'Multi-cuisine';

  const hasRealRating =
    restaurant.avgRating !== null &&
    restaurant.avgRating !== undefined &&
    restaurant.avgRating > 0;
  const rating = hasRealRating ? restaurant.avgRating!.toFixed(1) : null;

  const imageUrl = resolveRestaurantImage(restaurant.imageUrl);

  let distanceText = '2.5 km';
  let timeText = '20-30m';

  if (userLat && userLng && restaurant.latitude && restaurant.longitude) {
    const dist = getDistanceKm(
      userLat,
      userLng,
      Number(restaurant.latitude),
      Number(restaurant.longitude)
    );
    distanceText = `${dist.toFixed(1)} km`;
    const eta = getEstimatedTimeMins(dist);
    timeText = `${eta.min}-${eta.max}m`;
  }

  const isClosed = restaurant.isOpen === false;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isClosed}
      delayPressIn={100}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Restaurant ${restaurant.name}`}
      style={[
        styles.cardContainer,
        columnMode && styles.cardContainerColumn,
        isClosed && styles.cardContainerClosed,
      ]}
    >
      {/* Cover Image Container */}
      <View
        style={[
          styles.imageContainer,
          { height: columnMode ? 115 : 160 },
          isClosed && styles.imageContainerClosed,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.coverImage, isClosed && styles.coverImageClosed]}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={isClosed ? ['#F3F4F6', '#E5E7EB'] : ['#064E3B', '#14532D']}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.placeholderCenter}>
              <Text style={{ fontSize: columnMode ? 28 : 36, opacity: isClosed ? 0.35 : 1 }}>🍽️</Text>
            </View>
          </LinearGradient>
        )}

        {/* Bottom gradient overlay if open */}
        {!isClosed && (
          <LinearGradient
            colors={['transparent', 'rgba(10, 35, 18, 0.75)']}
            style={styles.gradientOverlay}
          >
            <View style={styles.imageOverlayContent}>
              {restaurant.topPosition !== null &&
              restaurant.topPosition !== undefined &&
              Number(restaurant.topPosition) > 0 ? (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>👑 TOP CHOICE</Text>
                </View>
              ) : null}

              {showDistance && (
                <View style={styles.timePill}>
                  <Text style={styles.timePillText}>⏱️ {timeText}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        )}

        {/* Black and White Closed / Offline Overlay */}
        {isClosed && (
          <View style={styles.closedOverlay}>
            <View style={styles.closedTagBox}>
              <Text style={styles.closedTagMain}>⚫ OFFLINE / CLOSED</Text>
              <Text style={styles.closedTagSub}>Not accepting orders</Text>
            </View>
          </View>
        )}
      </View>

      {/* Info details */}
      <View
        style={[
          styles.detailsContainer,
          { padding: columnMode ? 9 : 12 },
          isClosed && styles.detailsContainerClosed,
        ]}
      >
        {/* Title and Rating row */}
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.restaurantTitle,
              { fontSize: columnMode ? 14 : 16 },
              isClosed && styles.restaurantTitleClosed,
            ]}
          >
            {restaurant.name}
          </Text>

          {isClosed ? (
            <View style={styles.closedMiniBadge}>
              <Text style={styles.closedMiniBadgeText}>CLOSED</Text>
            </View>
          ) : rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingScore}>{rating}</Text>
              <Text style={styles.ratingStar}>★</Text>
            </View>
          ) : null}
        </View>

        {/* Cuisine Types */}
        {cuisine ? (
          <Text
            numberOfLines={1}
            style={[styles.cuisineText, isClosed && styles.cuisineTextClosed]}
          >
            {cuisine}
          </Text>
        ) : null}

        {/* Bottom Distance & City */}
        <View style={styles.bottomMetaRow}>
          {showDistance && (
            <Text style={[styles.distanceMeta, isClosed && styles.distanceMetaClosed]}>
              📍 {distanceText}
            </Text>
          )}
          {restaurant.city ? (
            <Text style={[styles.cityMeta, isClosed && styles.cityMetaClosed]}>
              • {restaurant.city}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#131F18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
  },
  cardContainerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardContainerClosed: {
    backgroundColor: '#121815',
    borderColor: '#9CA3AF',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#1A2920',
    position: 'relative',
  },
  imageContainerClosed: {
    backgroundColor: '#1F2421',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageClosed: {
    opacity: 0.7,
  },
  placeholderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  imageOverlayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  topBadgeText: {
    color: '#000000',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  timePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  timePillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  closedTagBox: {
    backgroundColor: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  closedTagMain: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  closedTagSub: {
    color: '#E5E7EB',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  detailsContainer: {
    gap: 4,
    backgroundColor: '#131F18',
  },
  detailsContainerClosed: {
    backgroundColor: '#121815',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantTitle: {
    flex: 1,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  restaurantTitleClosed: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  closedMiniBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#000000',
  },
  closedMiniBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
    marginLeft: 6,
  },
  ratingScore: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10.5,
    marginRight: 2,
  },
  ratingStar: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  cuisineText: {
    fontWeight: '500',
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  cuisineTextClosed: {
    color: '#6B7280',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  distanceMeta: {
    fontSize: 11,
    color: '#FCD34D',
    fontWeight: '700',
  },
  distanceMetaClosed: {
    color: '#6B7280',
  },
  cityMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cityMetaClosed: {
    color: '#6B7280',
  },
});
