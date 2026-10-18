import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  Text,
  trackAnalyticsEvent,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import type { BrowseStackParamList } from '../../../navigation/types';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantListSkeleton } from '../components/RestaurantListSkeleton';
import { useRestaurantFeed } from '../hooks/useRestaurantFeed';
import type { RestaurantSort } from '../types';
import { RESTAURANT_SORT_WHITELIST, isRestaurantSort } from '../types';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import { useDetectZoneQuery } from '../../../api/endpoints/restaurantsApi';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RestaurantListing'>;

/** P2-CUS-01 Restaurant Listing — zone-constrained filtered/sorted results. */
export function RestaurantListingScreen({ navigation, route }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const initialSort = route.params?.sort;
  const [sort, setSort] = useState<RestaurantSort>(
    initialSort && isRestaurantSort(initialSort) ? initialSort : 'nearby',
  );
  const [cuisineType] = useState(route.params?.cuisineType);
  const search = route.params?.search;

  const { coords, zone: globalZone } = useGlobalLocation();
  const zoneQuery = useDetectZoneQuery(
    { lat: coords?.latitude ?? 0, lng: coords?.longitude ?? 0 },
    { skip: !coords?.latitude || !coords?.longitude }
  );
  const activeZone = zoneQuery.data || globalZone;

  const feed = useRestaurantFeed({
    search,
    cuisineType,
    sort,
    userLatitude: coords?.latitude,
    userLongitude: coords?.longitude,
    zoneId: activeZone?.zoneId ?? undefined,
  });

  useEffect(() => {
    trackAnalyticsEvent('customer_restaurant_listing_viewed');
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#14532D" barStyle="light-content" />
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.color.background,
          paddingHorizontal: tokens.spacing.md,
          gap: tokens.spacing.md,
        }}
      >
        <View style={{
          paddingVertical: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.md,
          backgroundColor: '#14532D',
          marginHorizontal: -tokens.spacing.md,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          paddingBottom: tokens.spacing.lg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="heading1" accessibilityRole="header" style={{ color: '#F59E0B', fontWeight: '900' }}>
                All Restaurants
              </Text>
              <Text style={{ color: '#A7F3D0', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                Available at your delivery location
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>‹ Back</Text>
            </Pressable>
          </View>
        </View>
        {!isConnected ? (
          <Text variant="caption" color={tokens.color.warning}>
            Offline — showing cached results when available.
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {RESTAURANT_SORT_WHITELIST.filter((opt) => opt !== 'topPosition').map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                setSort(option);
                trackAnalyticsEvent('sort_changed', { sort: option });
                trackAnalyticsEvent('restaurant_list_filtered', {
                  sort: option,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option}`}
              style={{
                paddingHorizontal: tokens.spacing.md,
                paddingVertical: tokens.spacing.sm,
                borderRadius: tokens.radius.md,
                backgroundColor:
                  sort === option ? tokens.color.accent : tokens.color.surface,
                borderWidth: 1,
                borderColor: tokens.color.border,
              }}
            >
              <Text
                variant="label"
                color={
                  sort === option
                    ? '#FFFFFF'
                    : tokens.color.textPrimary
                }
              >
                {option === 'createdAt' ? '🆕 New Arrivals' : option === 'avgRating' ? '★ Top Rated' : '📍 Nearby'}
              </Text>
            </Pressable>
          ))}
        </View>
        {feed.isLoading ? (
          <RestaurantListSkeleton />
        ) : (
          <FlatList
            data={feed.items}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: tokens.spacing.sm }}
            contentContainerStyle={{ gap: tokens.spacing.sm, paddingBottom: 48 }}
            refreshControl={
              <RefreshControl
                refreshing={feed.isFetching && feed.items.length > 0}
                onRefresh={() => {
                  void feed.refetch();
                }}
              />
            }
            onEndReached={() => feed.onLoadMore()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <EmptyState
                title="No matching restaurants"
                description="Clear filters or try a different sort."
                accessibilityLabel="Restaurant listing empty"
                actionLabel="Back to Home"
                onAction={() => navigation.navigate('Home')}
              />
            }
            renderItem={({ item }) => (
              <RestaurantCard
                restaurant={item}
                columnMode={true}
                userLat={coords?.latitude}
                userLng={coords?.longitude}
                onPress={() =>
                  navigation.navigate('Menu', {
                    restaurantId: item.id,
                  })
                }
              />
            )}
          />
        )}
        <GlobalCartBanner />
      </View>
    </SafeAreaView >
  );
}
