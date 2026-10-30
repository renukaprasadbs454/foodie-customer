import React, { useEffect, useState, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  Text,
  trackAnalyticsEvent,
  useConnectivity,
} from 'foodie-shared-rn';
import { LinearGradient } from 'expo-linear-gradient';
import type { BrowseStackParamList } from '../../../navigation/types';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantListSkeleton } from '../components/RestaurantListSkeleton';
import { useRestaurantFeed } from '../hooks/useRestaurantFeed';
import type { RestaurantSort, RestaurantSummary } from '../types';
import { RESTAURANT_SORT_WHITELIST, isRestaurantSort } from '../types';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import { useDetectZoneQuery } from '../../../api/endpoints/restaurantsApi';
import { useSearchFoodItemsQuery } from '../../../api/endpoints/menuApi';
import { useGetMyOrdersQuery } from '../../../api/endpoints/ordersApi';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RestaurantListing'>;

export function RestaurantListingScreen({ navigation, route }: Props) {
  const { isConnected } = useConnectivity();
  const initialSort = route.params?.sort;
  const [sort, setSort] = useState<RestaurantSort>(
    initialSort && isRestaurantSort(initialSort) ? initialSort : 'nearby',
  );

  const categoryId = route.params?.categoryId;
  const categoryName = route.params?.categoryName || 'All Restaurants';
  const rawKeywords = route.params?.keywords;
  const keywords = useMemo(() => {
    if (Array.isArray(rawKeywords) && rawKeywords.length > 0) return rawKeywords;
    if (categoryId && categoryId !== 'all') return [categoryId.toLowerCase()];
    return [];
  }, [rawKeywords, categoryId]);

  const search = route.params?.search;
  const cuisineType = route.params?.cuisineType;

  const { coords, zone: globalZone } = useGlobalLocation();
  const zoneQuery = useDetectZoneQuery(
    { lat: coords?.latitude ?? 0, lng: coords?.longitude ?? 0 },
    { skip: !coords?.latitude || !coords?.longitude }
  );
  const activeZone = zoneQuery.data || globalZone;

  // Active Zone Restaurants Feed
  const feed = useRestaurantFeed({
    search,
    cuisineType,
    sort,
    userLatitude: coords?.latitude,
    userLongitude: coords?.longitude,
    zoneId: activeZone?.zoneId ?? undefined,
  });

  const zoneRestaurants = feed.items || [];

  // Food Items Query for Keyword Matching
  const foodQuery = useSearchFoodItemsQuery(
    {},
    { pollingInterval: 30000, refetchOnFocus: true }
  );
  const allFoodItems = foodQuery.data || [];

  // Customer Past Orders
  const { data: myOrders } = useGetMyOrdersQuery(
    { page: 0, size: 50 },
    { pollingInterval: 15000, refetchOnFocus: true }
  );

  useEffect(() => {
    trackAnalyticsEvent('customer_restaurant_listing_viewed', {
      category: categoryName,
    });
  }, [categoryName]);

  // 1. Identify which restaurants in the zone actually serve this category/food
  const matchingRestaurants = useMemo<RestaurantSummary[]>(() => {
    if (!zoneRestaurants || zoneRestaurants.length === 0) return [];
    if (!keywords || keywords.length === 0) return zoneRestaurants;

    // Check restaurants that have menu items matching keywords
    const restoIdsWithFood = new Set<string>();
    allFoodItems.forEach((item) => {
      const lower = (item.name || '').toLowerCase();
      if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        if (item.restaurantId) restoIdsWithFood.add(item.restaurantId);
      }
    });

    const filtered = zoneRestaurants.filter((resto) => {
      // 1. Has menu items matching category
      if (restoIdsWithFood.has(resto.id)) return true;
      // 2. Or restaurant cuisine matches category
      const cuisines = Array.isArray(resto.cuisineTypes) ? resto.cuisineTypes : [];
      return cuisines.some((c) =>
        keywords.some((kw) => c.toLowerCase().includes(kw.toLowerCase()))
      );
    });

    // Fallback if strict filter yields 0: return all zone restaurants
    return filtered.length > 0 ? filtered : zoneRestaurants;
  }, [zoneRestaurants, keywords, allFoodItems]);

  // 2. Identify restaurants previously ordered from by this user for this food
  // USER MANDATE: "disply only they ordered biriyani that resturant prevoiusly if not dont disply recomended resturants"
  const previouslyOrderedRestaurants = useMemo<RestaurantSummary[]>(() => {
    if (!myOrders || myOrders.length === 0) return [];
    if (!matchingRestaurants || matchingRestaurants.length === 0) return [];

    const pastMatchingRestoIds = new Set<string>();

    myOrders.forEach((order) => {
      if (!order.restaurantId) return;

      if (!keywords || keywords.length === 0) {
        pastMatchingRestoIds.add(order.restaurantId);
        return;
      }

      // Check if past order items match the category
      const orderItems = (order as any).items as any[] | undefined;
      const orderHasMatchingFood = orderItems?.some((item: any) => {
        const itemName = (item.name || item.itemName || '').toLowerCase();
        return keywords.some((kw) => itemName.includes(kw.toLowerCase()));
      });

      // Check if order was from a restaurant matching the cuisine
      const resto = matchingRestaurants.find((r) => r.id === order.restaurantId);
      const cuisines = Array.isArray(resto?.cuisineTypes) ? resto!.cuisineTypes : [];
      const restoMatches = cuisines.some((c) =>
        keywords.some((kw) => c.toLowerCase().includes(kw.toLowerCase()))
      );

      if (orderHasMatchingFood || restoMatches) {
        pastMatchingRestoIds.add(order.restaurantId);
      }
    });

    return matchingRestaurants.filter((r) => pastMatchingRestoIds.has(r.id));
  }, [myOrders, matchingRestaurants, keywords]);

  const hasPreviousOrders = previouslyOrderedRestaurants.length > 0;

  // Header component with Recommended section if previous orders exist
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Banner with Option 3 Clean Light Style */}
      <View style={styles.heroHeader}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {categoryName}
            </Text>
            <Text style={styles.heroSubtitle}>
              {matchingRestaurants.length} restaurants serving in your area
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
        </View>

        {/* Sort Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortChipsRow}
        >
          {RESTAURANT_SORT_WHITELIST.filter((opt) => opt !== 'topPosition').map((option) => {
            const active = sort === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setSort(option);
                  trackAnalyticsEvent('sort_changed', { sort: option });
                }}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={active ? styles.sortChipTextActive : styles.sortChipText}>
                  {option === 'createdAt'
                    ? '🆕 New Arrivals'
                    : option === 'avgRating'
                    ? '★ Top Rated'
                    : '📍 Nearby'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* RECOMMENDED FOR YOU SECTION — ONLY displayed if customer previously ordered this food! */}
      {hasPreviousOrders ? (
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>
              👑 RECOMMENDED FOR YOU
            </Text>
            <Text style={styles.sectionBadge}>
              Ordered previously by you ★
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedScroll}
          >
            {previouslyOrderedRestaurants.map((resto) => (
              <View key={resto.id} style={{ width: 220, marginRight: 12 }}>
                <RestaurantCard
                  restaurant={resto}
                  columnMode={true}
                  userLat={coords?.latitude}
                  userLng={coords?.longitude}
                  onPress={() => navigation.navigate('Menu', { restaurantId: resto.id })}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* All Restaurants Header */}
      <View style={styles.allSectionHeader}>
        <Text style={styles.allSectionTitle}>
          ALL RESTAURANTS SERVING {categoryName.toUpperCase()}
        </Text>
        <Text style={styles.allSectionSubtitle}>
          Real-time menu availability & instant delivery
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#FAF8F5" barStyle="dark-content" />
      <View style={styles.screenBody}>
        {!isConnected && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              Offline — Showing cached restaurants.
            </Text>
          </View>
        )}

        {feed.isLoading ? (
          <RestaurantListSkeleton />
        ) : (
          <FlatList
            data={matchingRestaurants}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={feed.isFetching && feed.items.length > 0}
                onRefresh={() => {
                  void feed.refetch();
                  void foodQuery.refetch();
                }}
                tintColor="#14532D"
              />
            }
            onEndReached={() => feed.onLoadMore()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <EmptyState
                title={`No restaurants serving ${categoryName}`}
                description="Try exploring other cuisines or check your delivery address."
                accessibilityLabel="No restaurants found"
                actionLabel="Explore All"
                onAction={() => navigation.navigate('Home')}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.restaurantRowWrap}>
                <RestaurantCard
                  restaurant={item}
                  columnMode={false}
                  userLat={coords?.latitude}
                  userLng={coords?.longitude}
                  onPress={() =>
                    navigation.navigate('Menu', {
                      restaurantId: item.id,
                    })
                  }
                />
              </View>
            )}
          />
        )}
        <GlobalCartBanner />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenBody: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  offlineNotice: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  offlineNoticeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerContainer: {
    backgroundColor: '#FAF8F5',
  },
  heroHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#14532D', // Option 3 Dark Green
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#6B7280',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  backButtonText: {
    color: '#14532D',
    fontWeight: '800',
    fontSize: 13,
  },
  sortChipsRow: {
    gap: 8,
    paddingTop: 4,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: '#14532D',
    borderColor: '#14532D',
  },
  sortChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  recommendedSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#14532D',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  recommendedScroll: {
    paddingBottom: 6,
  },
  allSectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  allSectionTitle: {
    color: '#14532D',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  allSectionSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 64,
  },
  restaurantRowWrap: {
    paddingHorizontal: 16,
  },
});

