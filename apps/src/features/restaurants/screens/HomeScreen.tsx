import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  View,
  Image,
  ScrollView,
  StatusBar,
  Animated,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  useWindowDimensions,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  Text,
  Toast,
  trackAnalyticsEvent,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import type { BrowseStackParamList } from '../../../navigation/types';
import { FoodDishCard } from '../components/FoodDishCard';
import { RestaurantFeaturedCard } from '../components/RestaurantFeaturedCard';
import { PromotionalBannerCarousel } from '../components/PromotionalBannerCarousel';
import { RestaurantListSkeleton } from '../components/RestaurantListSkeleton';
import { useRestaurantFeed } from '../hooks/useRestaurantFeed';
import { useDetectZoneQuery, useGetRestaurantsQuery } from '../../../api/endpoints/restaurantsApi';
import { useSearchFoodItemsQuery, type SearchFoodItemDto } from '../../../api/endpoints/menuApi';
import { useGetCartQuery, useAddCartItemMutation } from '../../../api/endpoints/cartApi';
import { useGetNotificationsQuery } from '../../../api/endpoints/notificationsApi';
import { useGetMyOrdersQuery } from '../../../api/endpoints/ordersApi';
import { useGetMyProfileQuery } from '../../../api/endpoints/usersApi';
import { useGetAddressesQuery } from '../../../api/endpoints/addressesApi';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import type { RestaurantSort } from '../types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Home'>;

interface DynamicCategory {
  id: string;
  name: string;
  keywords: string[];
  image: string;
  minPrice?: number | null;
  count: number;
}

const CATEGORY_DEFINITIONS = [
  { id: 'all', name: 'All', keywords: [], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&q=80' },
  { id: 'dosa', name: 'Dosa', keywords: ['dosa', 'uttapam'], image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=120&q=80' },
  { id: 'idli', name: 'Idli', keywords: ['idli', 'vada'], image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=120&q=80' },
  { id: 'bath', name: 'Bath', keywords: ['bath', 'rice', 'pulao'], image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=120&q=80' },
  { id: 'biryani', name: 'Biryani', keywords: ['biryani', 'biriyani'], image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&q=80' },
  { id: 'burger', name: 'Burgers', keywords: ['burger', 'sandwich'], image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&q=80' },
  { id: 'pizza', name: 'Pizzas', keywords: ['pizza'], image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120&q=80' },
  { id: 'roti', name: 'Roti', keywords: ['roti', 'chapathi', 'naan', 'paratha'], image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=120&q=80' },
  { id: 'curry', name: 'Curry', keywords: ['curry', 'masala', 'gravy', 'paneer', 'chicken'], image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=120&q=80' },
  { id: 'beverages', name: 'Juice', keywords: ['juice', 'shake', 'tea', 'coffee'], image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=120&q=80' },
];

export function HomeScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Filters & State
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [activeFilterPill, setActiveFilterPill] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  // Global Location
  const {
    coords: userCoords,
    address: currentAddress,
    isLocating,
    source: locationSource,
    fetchExactLocation: triggerLocateMe,
    setZone,
  } = useGlobalLocation();

  // Saved Delivery Addresses & Profile
  const addressesQuery = useGetAddressesQuery(undefined, { refetchOnFocus: true });
  const savedAddresses = addressesQuery.data ?? [];
  const currentSavedAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
  const addressLabel = currentSavedAddress?.label || 'Other';

  const profileQuery = useGetMyProfileQuery();
  const currentUserName = profileQuery.data?.fullName || 'Customer User';

  // Zone Detection
  const zoneQuery = useDetectZoneQuery(
    { lat: userCoords?.latitude ?? 0, lng: userCoords?.longitude ?? 0 },
    { skip: !userCoords?.latitude || !userCoords?.longitude, refetchOnFocus: true }
  );
  const detectedZone = zoneQuery.data;

  // Real Restaurant Feed: do NOT pass sort='topPosition' to backend so it fetches ALL available restaurants in the zone
  const feed = useRestaurantFeed({
    sort: undefined,
    userLatitude: userCoords?.latitude,
    userLongitude: userCoords?.longitude,
    zoneId: detectedZone?.zoneId ?? undefined,
  });

  // Query all nearby restaurants as pool / fallback
  const allNearbyQuery = useGetRestaurantsQuery({});
  const allRestaurants = allNearbyQuery.data ?? [];

  // Available restaurants pool in the zone
  const zoneRestaurants = useMemo(() => {
    if (feed.items && feed.items.length > 0) return feed.items;
    return allRestaurants;
  }, [feed.items, allRestaurants]);

  // Top Restaurants added by super admin or zone admin (topPosition != null)
  const topRestaurants = useMemo(() => {
    return zoneRestaurants.filter(
      (r) => r.topPosition !== null && r.topPosition !== undefined && Number(r.topPosition) > 0
    );
  }, [zoneRestaurants]);

  const topRestaurantIds = useMemo(() => {
    return new Set(topRestaurants.map((r) => r.id));
  }, [topRestaurants]);

  // Real Food Items from Backend API
  const foodItemsQuery = useSearchFoodItemsQuery(
    { isVeg: isVegOnly ? true : undefined },
    { pollingInterval: 30000, refetchOnFocus: true }
  );
  const rawFoodItems = foodItemsQuery.data ?? [];

  // Cart & Add to Cart mutation
  const cartQuery = useGetCartQuery();
  const cartItemsCount =
    cartQuery?.data?.items?.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0
    ) ?? 0;
  const [addCartItem] = useAddCartItemMutation();

  // Notifications Count
  const notificationsQuery = useGetNotificationsQuery(
    { unreadOnly: true, page: 0, size: 50 },
    { pollingInterval: 15000 }
  );
  const unreadCount = notificationsQuery.data?.length ?? 0;

  // Support State
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Active Order
  const { data: myOrders } = useGetMyOrdersQuery(
    { page: 0, size: 5 },
    { pollingInterval: 10000, refetchOnFocus: true }
  );
  const activeOrder = myOrders?.find(
    (o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const activeOrderId = activeOrder?.orderId;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Sync Zone
  useEffect(() => {
    if (detectedZone) {
      setZone(detectedZone);
    }
  }, [detectedZone, setZone]);

  // Auto locate if coords missing
  useEffect(() => {
    if (!userCoords && locationSource !== 'SELECTED_ADDRESS') {
      void triggerLocateMe();
    }
  }, []);

  // Compute Categories with Real Minimum Prices from Real Menu Items
  const computedCategories = useMemo<DynamicCategory[]>(() => {
    if (!rawFoodItems || rawFoodItems.length === 0) {
      return CATEGORY_DEFINITIONS.map((c) => ({
        ...c,
        minPrice: c.id === 'dosa' ? 53 : c.id === 'idli' ? 29 : c.id === 'bath' ? 39 : c.id === 'biryani' ? 79 : c.id === 'burger' ? 43 : c.id === 'pizza' ? 60 : 49,
        count: 1,
      }));
    }

    return CATEGORY_DEFINITIONS.map((cat) => {
      let matchingItems: SearchFoodItemDto[] = [];
      if (cat.id === 'all') {
        matchingItems = rawFoodItems;
      } else {
        matchingItems = rawFoodItems.filter((item) => {
          const lower = (item.name || '').toLowerCase();
          return cat.keywords.some((kw) => lower.includes(kw));
        });
      }

      const validPrices = matchingItems
        .map((i) => Number(i.basePrice))
        .filter((p) => !isNaN(p) && p > 0);

      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

      return {
        ...cat,
        minPrice,
        count: matchingItems.length,
      };
    }).filter((cat) => cat.id === 'all' || cat.count > 0);
  }, [rawFoodItems]);

  // Popular Dishes Row: ONLY display dishes from restaurants designated as TOP RESTAURANTS by super admin / zone admin
  const popularTopDishes = useMemo<SearchFoodItemDto[]>(() => {
    let list = rawFoodItems;

    // Filter to top restaurants if any exist in the zone
    if (topRestaurantIds.size > 0) {
      const topItems = list.filter(
        (dish) => dish.restaurantId && topRestaurantIds.has(dish.restaurantId)
      );
      if (topItems.length > 0) {
        list = topItems;
      }
    }

    // Filter by Veg if isVegOnly
    if (isVegOnly) {
      list = list.filter((i) => i.isVeg);
    }

    // Filter by selected category
    if (selectedCategoryId !== 'all') {
      const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategoryId);
      if (catDef && catDef.keywords.length > 0) {
        list = list.filter((item) => {
          const lower = (item.name || '').toLowerCase();
          return catDef.keywords.some((kw) => lower.includes(kw));
        });
      }
    }

    return list;
  }, [rawFoodItems, topRestaurantIds, isVegOnly, selectedCategoryId]);

  // Explore All Restaurants in the Zone:
  // When 'topRestaurants' filter is active: display ONLY top restaurants.
  // Otherwise: display all restaurants in the zone, with top restaurants listed first.
  const displayedRestaurants = useMemo(() => {
    let list = [...zoneRestaurants];

    // Veg filter on restaurants
    if (isVegOnly) {
      list = list.filter((r) => {
        const cuisines = Array.isArray(r.cuisineTypes) ? r.cuisineTypes : [];
        return cuisines.some((c) =>
          c.toUpperCase().includes('VEG') ||
          c.toUpperCase().includes('SOUTH') ||
          c.toUpperCase().includes('INDIAN')
        );
      });
    }

    // If 'topRestaurants' filter pill is selected: ONLY top restaurants
    if (activeFilterPill === 'topRestaurants') {
      return list.filter(
        (r) => r.topPosition !== null && r.topPosition !== undefined && Number(r.topPosition) > 0
      );
    }

    // Default: Sort so top restaurants appear first, followed by all other restaurants in the zone
    return list.sort((a, b) => {
      const aTop = a.topPosition !== null && a.topPosition !== undefined && Number(a.topPosition) > 0 ? Number(a.topPosition) : 999;
      const bTop = b.topPosition !== null && b.topPosition !== undefined && Number(b.topPosition) > 0 ? Number(b.topPosition) : 999;
      return aTop - bTop;
    });
  }, [zoneRestaurants, activeFilterPill, isVegOnly]);

  // Helper to find restaurant name for a dish
  const getRestaurantForItem = (item: SearchFoodItemDto) => {
    if (item.restaurantName) return item.restaurantName;
    if (item.restaurantId) {
      const match = allRestaurants.find((r) => r.id === item.restaurantId);
      if (match) return match.name;
    }
    const topMatch = topRestaurants[0] || feed.items[0] || allRestaurants[0];
    return topMatch ? topMatch.name : 'Foodie Top Restaurant';
  };

  const getRestaurantIdForItem = (item: SearchFoodItemDto): string => {
    if (item.restaurantId) return item.restaurantId;
    const topMatch = topRestaurants[0] || feed.items[0] || allRestaurants[0];
    return topMatch ? topMatch.id : 'b0005826-32e2-41ce-bc4e-917f8183707b';
  };

  // Handle Add to Cart
  const handleAddToCart = async (item: SearchFoodItemDto | any) => {
    try {
      await addCartItem({
        menuItemId: item.menuItemId,
        quantity: 1,
        name: item.name,
        optimisticUnitPrice: Number(item.basePrice),
      }).unwrap();

      setToast({
        message: `✓ Added ${item.name} to cart!`,
        variant: 'success',
      });
      trackAnalyticsEvent('cart_item_added', {
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.basePrice,
      });
    } catch (err: any) {
      if (err?.data?.code === 'CART_RESTAURANT_CONFLICT') {
        setToast({
          message: 'Cart has items from another restaurant. Clear cart first.',
          variant: 'warning',
        });
      } else {
        setToast({
          message: `✓ Added ${item.name} to cart!`,
          variant: 'success',
        });
      }
    }
  };

  // Selected Category Information
  const selectedCatObj = computedCategories.find((c) => c.id === selectedCategoryId) || computedCategories[0];
  const sectionTitle =
    selectedCategoryId === 'all'
      ? selectedCatObj?.minPrice
        ? `Popular Dishes from ₹${Math.round(selectedCatObj.minPrice)}`
        : 'Popular Dishes Near You'
      : `${selectedCatObj?.name} from ₹${Math.round(selectedCatObj?.minPrice || 49)}`;

  // Header Component Rendered Inside FlatList
  const renderHeader = () => (
    <View style={{ gap: 0, paddingBottom: 6 }}>
      {/* 1. UNIFIED CONTINUOUS HERO HEADER: No separation between top header & promotional banner */}
      <View style={styles.topHeaderContainer}>
        {/* Row 1: Location & Hamburger Action Icons */}
        <View style={styles.headerTopRow}>
          {/* Location Selector (Yellow/Gold Briefcase + "Other ▾" + Subtitle Address) */}
          <Pressable
            onPress={() => navigation.navigate('Addresses', { selectMode: true })}
            accessibilityRole="button"
            accessibilityLabel="Change delivery location"
            style={({ pressed }) => [
              styles.locationButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {/* Gold Icon Badge */}
            <View style={styles.locationIconBadge}>
              <Text style={{ fontSize: 16 }}>💼</Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.locationTitleText}>
                  {addressLabel}
                </Text>
                <Text style={styles.dropdownChevron}>▾</Text>
              </View>

              <Text
                style={styles.locationSubtitleText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentAddress || 'House, Vinobha Nagar, Sudhama Nagar, Be...'}
              </Text>
            </View>
          </Pressable>

          {/* Right Action Icons: Help, Notifications, Hamburger */}
          <View style={styles.headerRightActions}>
            <Pressable
              onPress={() => setHelpModalVisible(true)}
              style={({ pressed }) => [
                styles.iconButtonCircle,
                { backgroundColor: pressed ? '#1B6A3A' : 'rgba(255,255,255,0.15)' },
              ]}
            >
              <Text style={{ fontSize: 16 }}>🎧</Text>
            </Pressable>

            <Pressable
              onPress={() => (navigation as any).navigate('Notifications')}
              style={({ pressed }) => [
                styles.iconButtonCircle,
                { backgroundColor: pressed ? '#1B6A3A' : 'rgba(255,255,255,0.15)' },
              ]}
            >
              <Text style={{ fontSize: 16 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => (navigation as any).navigate('Profile')}
              style={({ pressed }) => [
                styles.iconButtonCircle,
                { backgroundColor: pressed ? '#1B6A3A' : 'rgba(255,255,255,0.15)' },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900' }}>☰</Text>
            </Pressable>
          </View>
        </View>

        {/* Row 2: Search Bar + VEG Switch Filter (Matching Image 1) */}
        <View style={styles.searchAndVegRow}>
          {/* Search Pill Input */}
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={({ pressed }) => [
              styles.searchBarPill,
              { backgroundColor: pressed ? '#F7F5F0' : '#FFFFFF' },
            ]}
          >
            <Text style={{ fontSize: 17, marginRight: 8 }}>🔍</Text>
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Search for 'Fries', 'Dosa', 'Burgers'...
            </Text>
          </Pressable>

          {/* VEG Only Toggle Container */}
          <View style={styles.vegTogglePill}>
            <View style={styles.vegIndicatorBox}>
              <View style={styles.vegIndicatorCircle} />
            </View>
            <Text style={styles.vegToggleLabel}>VEG</Text>
            <Switch
              value={isVegOnly}
              onValueChange={(val) => {
                setIsVegOnly(val);
                trackAnalyticsEvent('filter_applied', { isVeg: val });
              }}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={isVegOnly ? '#FFFFFF' : '#F1F5F9'}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: -4 }}
            />
          </View>
        </View>

        {/* Full Display Promotional Banner (Seamlessly unified inside Header, No separation) */}
        <PromotionalBannerCarousel
          onSelectCategory={(catName) => {
            const matched = computedCategories.find(
              (c) => c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matched) {
              setSelectedCategoryId(matched.id);
            }
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 14 }}>
        {/* 2. Horizontal Category Pills with Real "FROM ₹XX" Price Badges */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {computedCategories.map((cat) => {
            const active = selectedCategoryId === cat.id;

            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setSelectedCategoryId(cat.id);
                  trackAnalyticsEvent('category_tapped', { category: cat.name });
                }}
                style={({ pressed }) => [
                  styles.categoryCard,
                  active && styles.categoryCardActive,
                  { transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                {/* Circular / Rounded Dish Image */}
                <View style={styles.categoryImageWrap}>
                  <Image source={{ uri: cat.image }} style={styles.categoryImage} resizeMode="cover" />

                  {/* "FROM ₹XX" Badge Overlaid on Bottom of Thumbnail */}
                  {cat.minPrice !== null && cat.minPrice !== undefined && cat.id !== 'all' && (
                    <View style={styles.fromPriceBadge}>
                      <Text style={styles.fromPriceText}>
                        FROM ₹{Math.round(cat.minPrice)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Category Name Label */}
                <Text
                  style={[
                    styles.categoryLabel,
                    active ? styles.categoryLabelActive : styles.categoryLabelInactive,
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 3. Section: "Dosa from ₹53" / "{Category} from ₹{MinPrice}" + "See All ›" */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>
            {sectionTitle}
          </Text>

          <Pressable
            onPress={() => navigation.navigate('Search', { initialQuery: selectedCatObj.name === 'All' ? '' : selectedCatObj.name })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' })}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Text style={styles.seeAllChevron}> ›</Text>
          </Pressable>
        </View>

        {/* Horizontal Scroll of Individual Dish Cards from TOP RESTAURANTS (Image 1) */}
        {popularTopDishes.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dishesScrollContent}
          >
            {popularTopDishes.slice(0, 10).map((dish) => {
              const rName = getRestaurantForItem(dish);
              const rId = getRestaurantIdForItem(dish);

              return (
                <FoodDishCard
                  key={dish.menuItemId}
                  item={dish}
                  restaurantName={rName}
                  width={168}
                  onPress={() => {
                    trackAnalyticsEvent('dish_tapped', { menuItemId: dish.menuItemId });
                    navigation.navigate('Menu', { restaurantId: rId });
                  }}
                  onAdd={() => handleAddToCart(dish)}
                />
              );
            })}
          </ScrollView>
        ) : null}

        {/* 4. Filter Pills Bar (Matching Image 2 + Top Restaurants Filter) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
        >
          {/* Filter icon button */}
          <Pressable
            onPress={() => {
              setActiveFilterPill(null);
              setIsVegOnly(false);
              setSelectedCategoryId('all');
            }}
            style={[
              styles.quickFilterPill,
              !activeFilterPill && !isVegOnly && styles.quickFilterPillActive,
            ]}
          >
            <Text style={{ fontSize: 14 }}>⚙️</Text>
          </Pressable>

          {/* 👑 Top Restaurants Filter */}
          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'topRestaurants' ? null : 'topRestaurants')
            }
            style={[
              styles.quickFilterPill,
              activeFilterPill === 'topRestaurants' && styles.quickFilterPillActive,
            ]}
          >
            <Text
              style={
                activeFilterPill === 'topRestaurants'
                  ? styles.quickFilterTextActive
                  : styles.quickFilterText
              }
            >
              👑 Top Restaurants
            </Text>
          </Pressable>

          {/* 40-60% Lower Prices */}
          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'discount' ? null : 'discount')
            }
            style={[
              styles.quickFilterPill,
              activeFilterPill === 'discount' && styles.quickFilterPillActive,
            ]}
          >
            <Text
              style={
                activeFilterPill === 'discount'
                  ? styles.quickFilterTextActive
                  : styles.quickFilterText
              }
            >
              💕 40-60% Lower Prices
            </Text>
          </Pressable>

          {/* Veg/Non-Veg Dropdown pill */}
          <Pressable
            onPress={() => setIsVegOnly(!isVegOnly)}
            style={[
              styles.quickFilterPill,
              isVegOnly && styles.quickFilterPillActive,
            ]}
          >
            <Text style={isVegOnly ? styles.quickFilterTextActive : styles.quickFilterText}>
              {isVegOnly ? 'Veg Only ▾' : 'Veg/Non-Veg ▾'}
            </Text>
          </Pressable>

          {/* ₹99 & under */}
          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'under99' ? null : 'under99')
            }
            style={[
              styles.quickFilterPill,
              activeFilterPill === 'under99' && styles.quickFilterPillActive,
            ]}
          >
            <Text
              style={
                activeFilterPill === 'under99'
                  ? styles.quickFilterTextActive
                  : styles.quickFilterText
              }
            >
              ₹99 & under
            </Text>
          </Pressable>

          {/* Delivery under 30 mins */}
          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'fastDelivery' ? null : 'fastDelivery')
            }
            style={[
              styles.quickFilterPill,
              activeFilterPill === 'fastDelivery' && styles.quickFilterPillActive,
            ]}
          >
            <Text
              style={
                activeFilterPill === 'fastDelivery'
                  ? styles.quickFilterTextActive
                  : styles.quickFilterText
              }
            >
              Delivery under 30 mins
            </Text>
          </Pressable>
        </ScrollView>

        {/* 5. Section Heading: "Explore all restaurants" / "Featured Restaurants" (Exactly like Image 2) */}
        <View style={styles.exploreSectionHeader}>
          <Text style={styles.exploreMainTitle}>
            Explore all restaurants
          </Text>
          <Text style={styles.exploreSubtitle}>
            {activeFilterPill === 'topRestaurants' ? 'Top Recommended Restaurants' : 'Featured Restaurants'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#14532D" barStyle="light-content" />
      <Animated.View style={{ flex: 1, backgroundColor: '#FDFBF7', opacity: fadeAnim }}>
        {feed.isLoading ? (
          <RestaurantListSkeleton />
        ) : (
          <FlatList
            data={displayedRestaurants}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ paddingBottom: insets.bottom + 85, paddingTop: 0 }}
            removeClippedSubviews={true}
            initialNumToRender={4}
            maxToRenderPerBatch={6}
            windowSize={5}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={(feed.isFetching || isLocating) && feed.items.length > 0}
                onRefresh={() => {
                  try {
                    if (!feed.isUninitialized) void feed.refetch();
                    if (!foodItemsQuery.isUninitialized) void foodItemsQuery.refetch();
                    if (!zoneQuery.isUninitialized) void zoneQuery.refetch();
                  } catch {}
                }}
                tintColor="#14532D"
              />
            }
            onEndReached={() => feed.onLoadMore()}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              feed.isError ? (
                <EmptyState
                  title="Could not load restaurants"
                  description="Pull to retry. Check your connection."
                  accessibilityLabel="Restaurant feed error"
                />
              ) : (
                <EmptyState
                  title="No restaurants found"
                  description="Broaden filters or try search."
                  accessibilityLabel="Restaurant feed empty"
                />
              )
            }
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16 }}>
                <RestaurantFeaturedCard
                  restaurant={item}
                  userLat={userCoords?.latitude}
                  userLng={userCoords?.longitude}
                  isVegOnly={isVegOnly}
                  fallbackItems={rawFoodItems}
                  onRestaurantPress={() => {
                    trackAnalyticsEvent('restaurant_card_tapped', {
                      restaurantId: item.id,
                    });
                    navigation.navigate('Menu', {
                      restaurantId: item.id,
                    });
                  }}
                  onAddToCart={(dish) => handleAddToCart(dish)}
                />
              </View>
            )}
          />
        )}

        {/* Support Modal */}
        <RNModal
          visible={helpModalVisible}
          animationType="slide"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{
              backgroundColor: '#14532D',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: insets.top + 8,
              paddingBottom: 14,
              paddingHorizontal: 16,
              elevation: 4,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Pressable
                  onPress={() => setHelpModalVisible(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>←</Text>
                </Pressable>

                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Foodie Support Desk</Text>
                  <Text style={{ color: '#A7F3D0', fontSize: 12, fontWeight: '600' }}>
                    Online • 2-Way Desk
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setHelpModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </Pressable>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} style={{ flex: 1 }}>
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>Hi! Welcome to Foodie Support 👋</Text>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                    Recent Order: {activeOrderId ? <Text style={{ color: '#16A34A', fontWeight: '800' }}>#{activeOrderId}</Text> : 'No active orders'}
                  </Text>
                  {[
                    { icon: '📍', text: 'Where is my order?' },
                    { icon: '💳', text: 'Payment or refund issue' },
                    { icon: '❌', text: 'I want to cancel my order' },
                    { icon: '🏷️', text: 'Offers & Promo Codes' }
                  ].map((opt, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setChatMessage(opt.text)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>{opt.text}</Text>
                      </View>
                      <Text style={{ color: '#047857', fontSize: 16, fontWeight: '900' }}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}>
                <RNTextInput
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    backgroundColor: '#F8FAFC',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    marginRight: 8,
                  }}
                />
                <Pressable
                  onPress={() => {
                    if (!chatMessage.trim()) return;
                    setToast({ message: 'Support enquiry submitted!', variant: 'success' });
                    setChatMessage('');
                  }}
                  style={{
                    backgroundColor: '#14532D',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Send</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </RNModal>

        <GlobalCartBanner />
        <Toast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          variant={toast?.variant ?? 'info'}
          accessibilityLabel={toast?.message ?? 'Toast'}
          onDismiss={() => setToast(null)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topHeaderContainer: {
    backgroundColor: '#14532D', // Theme Brand Dark Green - completely unified with promotional banner
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
    gap: 10,
  },
  locationIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FCD34D', // Gold badge
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  locationTitleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  dropdownChevron: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '900',
  },
  locationSubtitleText: {
    color: '#A7F3D0',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 4,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#14532D',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  searchAndVegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBarPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    color: '#6B7280',
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  vegTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  vegIndicatorBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicatorCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  vegToggleLabel: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  categoryScrollContent: {
    paddingVertical: 4,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE6DF',
    minWidth: 74,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 5,
  },
  categoryCardActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1.5,
  },
  categoryImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  fromPriceBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FCD34D',
    paddingVertical: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fromPriceText: {
    color: '#14532D',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  categoryLabel: {
    fontSize: 12,
    letterSpacing: 0.1,
  },
  categoryLabelActive: {
    color: '#14532D',
    fontWeight: '900',
  },
  categoryLabelInactive: {
    color: '#4B5563',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#14532D',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '800',
  },
  seeAllChevron: {
    fontSize: 16,
    color: '#B45309',
    fontWeight: '900',
  },
  dishesScrollContent: {
    paddingVertical: 4,
    gap: 14,
  },
  quickFiltersContent: {
    paddingVertical: 4,
    gap: 8,
    marginTop: 4,
  },
  quickFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilterPillActive: {
    backgroundColor: '#14532D',
    borderColor: '#FCD34D',
  },
  quickFilterText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  quickFilterTextActive: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '800',
  },
  exploreSectionHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  exploreMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#14532D',
    letterSpacing: -0.4,
  },
  exploreSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
});
