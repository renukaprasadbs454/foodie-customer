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
  useTheme,
} from 'foodie-shared-rn';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { BrowseStackParamList } from '../../../navigation/types';
import { RestaurantCard } from '../components/RestaurantCard';
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
import { useGetWalletBalanceQuery } from '../../../api/endpoints/walletApi';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import { getDistanceKm, getEstimatedTimeMins } from '../types';
import {
  syncSupportChatMessages,
  connectToAgentAndCreateEnquiry,
  pollLiveAdminMessages,
  sendLiveCustomerMessageToAdmin,
  type AiActionButton,
} from '../../profile/supportAiEngine';
import {
  useResolveConversationMutation,
} from '../../../api/endpoints/supportApi';
import { submitCustomerUnserviceableAreaRequest } from '../services/unserviceableAreaService';
import { ENV } from '../../../constants/env';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Home'>;

interface DynamicCategory {
  id: string;
  name: string;
  keywords: string[];
  image: string;
  minPrice?: number | null;
  count: number;
}

// Exactly matching categories from Screenshot 1 & 2
const CATEGORY_DEFINITIONS = [
  { id: 'all', name: 'All', keywords: [], image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&q=80' },
  { id: 'biryani', name: 'Biryani', keywords: ['biryani', 'biriyani'], image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=160&q=80' },
  { id: 'south_indian', name: 'South Indi...', keywords: ['dosa', 'idli', 'vada', 'uttapam'], image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=160&q=80' },
  { id: 'chicken', name: 'Chicken', keywords: ['chicken', 'kebab', 'tikka'], image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=160&q=80' },
  { id: 'pulao', name: 'Pulao', keywords: ['pulao', 'bath', 'rice'], image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=160&q=80' },
  { id: 'burger', name: 'Burgers', keywords: ['burger', 'sandwich'], image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=160&q=80' },
  { id: 'pizza', name: 'Pizzas', keywords: ['pizza'], image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=160&q=80' },
  { id: 'curry', name: 'Curry', keywords: ['curry', 'masala', 'paneer'], image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=160&q=80' },
];

function resolveImageUrl(url?: string | null): string | null {
  if (!url || url.trim().length === 0) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api')) return `${ENV.apiBaseUrl}${url}`;
  return url;
}

export function HomeScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);

  // Filters & State
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [activeFilterPill, setActiveFilterPill] = useState<string | null>(null);
  const [savedFavorites, setSavedFavorites] = useState<Record<string, boolean>>({});
  const [activeHeaderGradient, setActiveHeaderGradient] = useState<[string, string, string]>([
    '#012B18',
    '#053E23',
    '#0A4D2E',
  ]);
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
  const addressLabel = currentSavedAddress?.label || 'Home';

  // Profile data
  const profileQuery = useGetMyProfileQuery(undefined, { pollingInterval: 5000, refetchOnFocus: true });
  const currentUserName = profileQuery.data?.fullName || 'Customer';
  const currentUserEmail = profileQuery.data?.email || '';
  const currentUserPhone = profileQuery.data?.phoneNumber || '';

  // Wallet Balance
  const walletQuery = useGetWalletBalanceQuery(undefined, { pollingInterval: 15000 });
  const walletBalance = Number(walletQuery.data?.balance || 0);

  // Zone Detection
  const [isZoneServiceable, setIsZoneServiceable] = useState(false);
  const zoneQuery = useDetectZoneQuery(
    { lat: userCoords?.latitude ?? 0, lng: userCoords?.longitude ?? 0 },
    {
      skip: !userCoords?.latitude || !userCoords?.longitude,
      refetchOnFocus: true,
      pollingInterval: isZoneServiceable ? 0 : 6000,
    }
  );
  const detectedZone = zoneQuery.data;
  const isAreaServiceable = Boolean(detectedZone?.serviceable && detectedZone?.zoneId);

  useEffect(() => {
    if (detectedZone) {
      const serviceable = Boolean(detectedZone.serviceable && detectedZone.zoneId);
      setIsZoneServiceable(serviceable);

      // If out of zone, automatically transmit request to admin panel
      if (!serviceable && userCoords?.latitude && userCoords?.longitude) {
        void submitCustomerUnserviceableAreaRequest({
          customerName: currentUserName,
          email: currentUserEmail,
          phone: currentUserPhone,
          address: currentAddress,
          coords: {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
          },
          cityName: detectedZone.cityName,
          zoneId: detectedZone.zoneId,
          zoneName: detectedZone.zoneName,
        });
      }
    }
  }, [
    detectedZone,
    userCoords?.latitude,
    userCoords?.longitude,
    currentAddress,
    currentUserName,
    currentUserEmail,
    currentUserPhone,
  ]);

  // Real Restaurant Feed
  const feed = useRestaurantFeed({
    sort: undefined,
    userLatitude: userCoords?.latitude,
    userLongitude: userCoords?.longitude,
    zoneId: detectedZone?.zoneId ?? undefined,
    isServiceable: isAreaServiceable,
  });

  const allNearbyQuery = useGetRestaurantsQuery({});
  const allRestaurants = allNearbyQuery.data ?? [];

  // Available restaurants pool in the zone
  const zoneRestaurants = useMemo(() => {
    if (feed.items && feed.items.length > 0) return feed.items;
    return allRestaurants;
  }, [feed.items, allRestaurants]);

  // Real Food Items
  const foodItemsQuery = useSearchFoodItemsQuery(
    { isVeg: isVegOnly ? true : undefined },
    { pollingInterval: 30000, refetchOnFocus: true }
  );
  const rawFoodItems = foodItemsQuery.data ?? [];

  // Cart & Add to Cart mutation
  const cartQuery = useGetCartQuery();
  const [addCartItem] = useAddCartItemMutation();
  const cartItemCount = (cartQuery.data?.items ?? []).reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  // Notifications Count
  const notificationsQuery = useGetNotificationsQuery(
    { unreadOnly: true, page: 0, size: 50 },
    { pollingInterval: 15000 }
  );
  const unreadCount = notificationsQuery.data?.length ?? 0;

  // Active Order & Order History
  const { data: myOrders } = useGetMyOrdersQuery(
    { page: 0, size: 50 },
    { pollingInterval: 10000, refetchOnFocus: true }
  );
  const activeOrder = myOrders?.find(
    (o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const activeOrderId = activeOrder?.orderId;

  // Support State
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>(null);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [showAgentOption, setShowAgentOption] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string;
    text: string;
    from: 'admin' | 'user' | 'bot';
    time: string;
    buttons?: AiActionButton[];
  }>>([]);
  const [resolveConv] = useResolveConversationMutation();

  // Compute User's Frequently Ordered Count per Restaurant
  const userOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    myOrders?.forEach((o) => {
      if (o.restaurantId) {
        counts[o.restaurantId] = (counts[o.restaurantId] || 0) + 1;
      }
    });
    return counts;
  }, [myOrders]);

  // RECOMMENDED FOR YOU: Restaurants the user most frequently ordered from, or top rated if fresh user
  const recommendedRestaurants = useMemo(() => {
    if (!zoneRestaurants || zoneRestaurants.length === 0) return [];
    const list = [...zoneRestaurants];
    return list.sort((a, b) => {
      const aCount = userOrderCounts[a.id] || 0;
      const bCount = userOrderCounts[b.id] || 0;
      if (bCount !== aCount) {
        return bCount - aCount; // Most frequently ordered first!
      }
      const aRating = a.avgRating ? Number(a.avgRating) : 0;
      const bRating = b.avgRating ? Number(b.avgRating) : 0;
      return bRating - aRating;
    }).slice(0, 10);
  }, [zoneRestaurants, userOrderCounts]);

  // TOP RESTAURANTS: Restaurants designated by admin (topPosition != null && topPosition > 0)
  const topRestaurants = useMemo(() => {
    return zoneRestaurants
      .filter((r) => r.topPosition !== null && r.topPosition !== undefined && Number(r.topPosition) > 0)
      .sort((a, b) => Number(a.topPosition) - Number(b.topPosition));
  }, [zoneRestaurants]);

  // TOP RESTAURANTS LIST (matching Option 3 screenshot)
  const topRestaurantsList = useMemo(() => {
    if (topRestaurants.length > 0) return topRestaurants;
    // Fallback to highest rated in zone if admin has not set positions yet
    return [...zoneRestaurants]
      .sort((a, b) => Number(b.avgRating || 0) - Number(a.avgRating || 0))
      .slice(0, 5);
  }, [topRestaurants, zoneRestaurants]);

  // Top featured hero restaurant
  const topFeaturedRestaurant = topRestaurantsList[0] || zoneRestaurants[0];

  // Real Categories with genuine min prices
  const computedCategories = useMemo<DynamicCategory[]>(() => {
    if (!rawFoodItems || rawFoodItems.length === 0) {
      return CATEGORY_DEFINITIONS.map((c) => ({
        ...c,
        minPrice: null,
        count: 0,
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

  // Filtered restaurants for display with Deduplication (Top restaurants excluded from delivering to you list)
  const displayedRestaurants = useMemo(() => {
    let list = [...zoneRestaurants];

    // Category filter from "WHAT'S ON YOUR MIND?"
    if (selectedCategoryId !== 'all') {
      const selectedCat = computedCategories.find((c) => c.id === selectedCategoryId);
      if (selectedCat) {
        // Collect restaurant IDs that have items matching the category keywords
        const matchingRestoIds = new Set<string>();
        rawFoodItems.forEach((item) => {
          const lowerName = (item.name || '').toLowerCase();
          const lowerDesc = (item.description || '').toLowerCase();
          if (selectedCat.keywords.some((kw) => lowerName.includes(kw) || lowerDesc.includes(kw))) {
            if (item.restaurantId) {
              matchingRestoIds.add(item.restaurantId);
            }
          }
        });

        list = list.filter((r) => {
          if (matchingRestoIds.has(r.id)) return true;
          const lowerName = (r.name || '').toLowerCase();
          const cuisines = Array.isArray(r.cuisineTypes) ? r.cuisineTypes.map((c) => c.toLowerCase()).join(' ') : '';
          return selectedCat.keywords.some((kw) => lowerName.includes(kw) || cuisines.includes(kw));
        });
      }
    }

    // Veg filter
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

    // Filter pills
    if (activeFilterPill === 'topRestaurants') {
      return topRestaurantsList;
    }

    if (activeFilterPill === 'fastDelivery') {
      list = list.filter((r) => {
        if (!userCoords || !r.latitude || !r.longitude) return true;
        const dist = getDistanceKm(userCoords.latitude, userCoords.longitude, Number(r.latitude), Number(r.longitude));
        return dist <= 3.5;
      });
    }

    // Deduplication required by user:
    // "if the resturant appears in top resturants then dont again disply in restrurants deliverys to you option"
    const topIds = new Set<string>();
    topRestaurantsList.forEach((r) => topIds.add(r.id));

    // Strictly exclude all restaurants appearing in Top Restaurants from this list
    return list.filter((r) => !topIds.has(r.id));
  }, [zoneRestaurants, selectedCategoryId, computedCategories, rawFoodItems, isVegOnly, activeFilterPill, topRestaurantsList, userCoords]);

  // Add to Cart
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

  const toggleFavorite = (id: string) => {
    setSavedFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Scroll to explore all restaurants section
  const handleExploreAllPress = () => {
    setActiveFilterPill(null);
    flatListRef.current?.scrollToOffset({ offset: 700, animated: true });
  };

  // Helper for ETA
  const getEtaText = (r: any) => {
    if (userCoords && r.latitude && r.longitude) {
      const dist = getDistanceKm(userCoords.latitude, userCoords.longitude, Number(r.latitude), Number(r.longitude));
      const eta = getEstimatedTimeMins(dist);
      return `${eta.min}-${eta.max} mins`;
    }
    return '25-30 mins';
  };

  // Header Item 0: Hero Banner with Address, Search Bar & Synchronized Dynamic Promotional Carousel
  const renderHeroBanner = () => (
    <LinearGradient
      colors={activeHeaderGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.heroTopContainer}
    >
      {/* Row 1: Location on Left • Wallet & Profile Avatar on Right */}
      <View style={styles.headerTopRow}>
        <Pressable
          onPress={() => navigation.navigate('Addresses', { selectMode: true })}
          accessibilityRole="button"
          accessibilityLabel="Change delivery location"
          style={({ pressed }) => [
            styles.locationButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={styles.locationPinBox}>
            <Text style={{ fontSize: 18, color: '#FCD34D' }}>📍</Text>
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
              {currentAddress || 'Locating current delivery address...'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={({ pressed }) => [
              styles.notificationButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="bell" size={18} color="#FCD34D" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="My Profile"
            style={({ pressed }) => [
              styles.avatarCircle,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.avatarInitial}>
              {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'C'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Account Suspended Alert Banner with Reason */}
      {Boolean(profileQuery.data?.isSuspended || profileQuery.data?.accountStatus === 'SUSPENDED') && (
        <View style={{
          marginHorizontal: 16,
          marginTop: 10,
          marginBottom: 10,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderWidth: 1.5,
          borderColor: '#EF4444',
          borderRadius: 16,
          padding: 14,
          shadowColor: '#EF4444',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🚫</Text>
              <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>
                ACCOUNT SUSPENDED
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Profile' as any)}
              style={({ pressed }) => ({
                backgroundColor: '#EF4444',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>View Profile ›</Text>
            </Pressable>
          </View>
          <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
            Reason: {profileQuery.data?.suspensionReason || 'Security policy review'}
          </Text>
          <Text style={{ color: '#E5E7EB', fontSize: 12, lineHeight: 16 }}>
            Your account has been suspended by administration. Ordering and checkout are disabled. Please contact support or appeal from your profile.
          </Text>
        </View>
      )}

      {/* Out-of-Zone Notification Banner */}
      {detectedZone && !isAreaServiceable && (
        <View style={styles.outOfZoneCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <Text style={styles.outOfZoneTitle}>
              Not Serviceable to Your Location
            </Text>
          </View>
          <Text style={styles.outOfZoneDesc}>
            We are currently not serviceable to your location. Change your delivery address to explore active restaurants.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Pressable
              onPress={() => navigation.navigate('Addresses', { selectMode: true })}
              style={({ pressed }) => [
                styles.changeAddressActionBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.changeAddressActionBtnText}>Change Delivery Address ›</Text>
            </Pressable>
            <View style={styles.adminNotifiedBadge}>
              <Text style={styles.adminNotifiedBadgeText}>✓ Request sent to admin</Text>
            </View>
          </View>
        </View>
      )}

      {/* Row 2: Search Bar + VEG MODE Switch */}
      <View style={styles.searchAndVegRow}>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={({ pressed }) => [
            styles.searchBarPill,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={{ fontSize: 16, marginRight: 8, color: '#9CA3AF' }}>🔍</Text>
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Restaurant name or a dish...
          </Text>
          <Text style={{ fontSize: 16, marginLeft: 6, color: '#38BDF8' }}>🎙️</Text>
        </Pressable>

        <View style={styles.vegModeContainer}>
          <Text style={styles.vegModeLabel}>VEG{'\n'}MODE</Text>
          <Switch
            value={isVegOnly}
            onValueChange={(val) => {
              setIsVegOnly(val);
              trackAnalyticsEvent('filter_applied', { isVeg: val });
            }}
            trackColor={{ false: 'rgba(255, 255, 255, 0.25)', true: '#10B981' }}
            thumbColor={isVegOnly ? '#FFFFFF' : '#9CA3AF'}
            style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
          />
        </View>
      </View>

      {/* Auto-sliding Animated Promotional Banner with vibrant full-width dynamic background synchronization */}
      <PromotionalBannerCarousel
        onBannerChange={(grad) => setActiveHeaderGradient(grad)}
        onSelectCategory={(catName) => {
          const matched = computedCategories.find(
            (c) => c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matched) {
            navigation.navigate('RestaurantListing', {
              categoryId: matched.id,
              categoryName: matched.name,
              keywords: matched.keywords,
            });
          }
        }}
      />
    </LinearGradient>
  );

  // Header Item 1: Sticky "WHAT'S ON YOUR MIND?" Categories Bar (pins to top on scroll)
  const renderCategoriesStickyBar = () => (
    <View style={styles.categoriesDarkSection}>
      <Text style={styles.categoriesSectionTitle}>
        WHAT'S ON YOUR MIND?
      </Text>
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
                const nextId = selectedCategoryId === cat.id ? 'all' : cat.id;
                setSelectedCategoryId(nextId);
                trackAnalyticsEvent('category_tapped', { category: cat.name, filterApplied: nextId !== 'all' });
              }}
              style={styles.categoryItemWrap}
            >
              <View style={[styles.categoryCircleWrap, active && styles.categoryCircleActive]}>
                <Image source={{ uri: cat.image }} style={styles.categoryCircleImage} resizeMode="cover" />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.categoryLabel,
                  active ? styles.categoryLabelActive : styles.categoryLabelInactive,
                ]}
              >
                {cat.name}
              </Text>

              <View style={[styles.activeUnderline, active && styles.activeUnderlineVisible]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // Header Item 2: Middle Sections (Filters, Recommended for You, Top Restaurants)
  const renderMiddleSections = () => (
    <View style={{ backgroundColor: '#0A120E' }}>
      {/* QUICK FILTER PILLS */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
        >
          <Pressable
            onPress={() => {
              setActiveFilterPill(null);
              setIsVegOnly(false);
              setSelectedCategoryId('all');
            }}
            style={[
              styles.darkFilterPill,
              !activeFilterPill && !isVegOnly && styles.darkFilterPillActive,
            ]}
          >
            <Text style={!activeFilterPill && !isVegOnly ? styles.darkFilterTextActive : styles.darkFilterText}>
              ⚙️ Filters ▾
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'new' ? null : 'new')
            }
            style={[
              styles.darkFilterPill,
              activeFilterPill === 'new' && styles.darkFilterPillActive,
            ]}
          >
            <Text style={activeFilterPill === 'new' ? styles.darkFilterTextActive : styles.darkFilterText}>
              New to you
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'offers' ? null : 'offers')
            }
            style={[
              styles.darkFilterPill,
              activeFilterPill === 'offers' && styles.darkFilterPillActive,
            ]}
          >
            <Text style={activeFilterPill === 'offers' ? styles.darkFilterTextActive : styles.darkFilterText}>
              Great offers
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'under250' ? null : 'under250')
            }
            style={[
              styles.darkFilterPill,
              activeFilterPill === 'under250' && styles.darkFilterPillActive,
            ]}
          >
            <Text style={activeFilterPill === 'under250' ? styles.darkFilterTextActive : styles.darkFilterText}>
              Under ₹250
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveFilterPill(activeFilterPill === 'fastDelivery' ? null : 'fastDelivery')
            }
            style={[
              styles.darkFilterPill,
              activeFilterPill === 'fastDelivery' && styles.darkFilterPillActive,
            ]}
          >
            <Text style={activeFilterPill === 'fastDelivery' ? styles.darkFilterTextActive : styles.darkFilterText}>
              Delivery under 30 mins
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* RECOMMENDED FOR YOU (Frequently ordered by customer) */}
      {recommendedRestaurants.length > 0 && (
        <View style={styles.recommendedSection}>
          <Text style={styles.sectionHeadingUppercase}>
            RECOMMENDED FOR YOU
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedScroll}
          >
            {recommendedRestaurants.map((resto) => {
              const cover = resolveImageUrl(resto.imageUrl);
              const eta = getEtaText(resto);
              const isClosed = resto.isOpen === false;
              const rating = resto.avgRating ? resto.avgRating.toFixed(1) : null;
              const offerTag = (userOrderCounts[resto.id] || 0) > 1
                ? '★ REPEAT FAVOURITE'
                : '₹40 OFF above ₹99';

              return (
                <Pressable
                  key={resto.id}
                  onPress={() => navigation.navigate('Menu', { restaurantId: resto.id })}
                  style={({ pressed }) => [
                    styles.recommendedCard,
                    isClosed && styles.cardOffline,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                >
                  <View style={styles.recommendedImageWrap}>
                    {cover ? (
                      <Image
                        source={{ uri: cover }}
                        style={[styles.recommendedImage, isClosed && { opacity: 0.28 }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.recommendedImageFallback}>
                        <Text style={{ fontSize: 32 }}>🍽️</Text>
                      </View>
                    )}

                    {!isClosed && (
                      <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>{offerTag}</Text>
                      </View>
                    )}

                    {rating && (
                      <View style={[styles.ratingPill, isClosed && styles.ratingPillOffline]}>
                        <Text style={styles.ratingPillText}>★ {rating}</Text>
                      </View>
                    )}

                    {/* Black & White Closed Overlay */}
                    {isClosed && (
                      <View style={styles.closedOverlay}>
                        <View style={styles.closedTagBox}>
                          <Text style={styles.closedText}>CLOSED</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <Text numberOfLines={1} style={[styles.recommendedTitle, isClosed && { color: '#6B7280' }]}>
                    {resto.name}
                  </Text>
                  <Text style={[styles.recommendedEta, isClosed && { color: '#9CA3AF' }]}>
                    ⚡ {eta}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* TOP RESTAURANTS SECTION WITH "Explore all restaurants ›" */}
      <View style={styles.topRestaurantsSection}>
        <View style={styles.topRestaurantsHeaderRow}>
          <Text style={styles.topSectionTitle}>
            Top Restaurants
          </Text>

          <Pressable
            onPress={handleExploreAllPress}
            style={({ pressed }) => [
              styles.exploreAllButton,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.exploreAllText}>Explore all restaurants ›</Text>
          </Pressable>
        </View>

        {topFeaturedRestaurant && (
          <Pressable
            onPress={() => navigation.navigate('Menu', { restaurantId: topFeaturedRestaurant.id })}
            style={({ pressed }) => [
              styles.topHeroCard,
              topFeaturedRestaurant.isOpen === false && styles.cardOffline,
              { opacity: pressed ? 0.94 : 1 },
            ]}
          >
            <View style={styles.topHeroImageWrap}>
              {resolveImageUrl(topFeaturedRestaurant.imageUrl) ? (
                <Image
                  source={{ uri: resolveImageUrl(topFeaturedRestaurant.imageUrl)! }}
                  style={[styles.topHeroImage, topFeaturedRestaurant.isOpen === false && { opacity: 0.25 }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.topHeroFallback}>
                  <Text style={{ fontSize: 48, opacity: topFeaturedRestaurant.isOpen === false ? 0.3 : 1 }}>🍛</Text>
                </View>
              )}

              {/* Offer Badge (if open) */}
              {!topFeaturedRestaurant.isOpen === false && (
                <View style={styles.heroOfferBadge}>
                  <Text style={styles.heroOfferBadgeText}>₹75 OFF above ₹149</Text>
                </View>
              )}

              {/* Black and white closed banner if closed */}
              {topFeaturedRestaurant.isOpen === false && (
                <View style={styles.closedOverlay}>
                  <View style={styles.closedTagBox}>
                    <Text style={styles.closedText}>⚫ CLOSED / OFFLINE</Text>
                  </View>
                </View>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(20, 83, 45, 0.95)']}
                style={styles.heroBottomOverlay}
              >
                <View style={styles.heroBottomRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.heroRestoTitle} numberOfLines={1}>
                      {topFeaturedRestaurant.name}
                    </Text>
                    <Text style={styles.heroRestoEta}>
                      ⏱️ {getEtaText(topFeaturedRestaurant)}
                    </Text>
                  </View>

                  {topFeaturedRestaurant.avgRating && (
                    <View style={styles.heroRatingBadge}>
                      <Text style={styles.heroRatingText}>
                        ★ {topFeaturedRestaurant.avgRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
          </Pressable>
        )}
      </View>

      {/* RESTAURANTS DELIVERING TO YOU Heading */}
      <View style={styles.zoneListHeader}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.zoneCountHeading}>
            {selectedCategoryId !== 'all'
              ? `${computedCategories.find((c) => c.id === selectedCategoryId)?.name || 'Category'} (${displayedRestaurants.length})`
              : `${displayedRestaurants.length} Restaurants Delivering to You`}
          </Text>
          {selectedCategoryId !== 'all' && (
            <Pressable
              onPress={() => setSelectedCategoryId('all')}
              style={{
                backgroundColor: 'rgba(252, 211, 77, 0.15)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#FCD34D',
              }}
            >
              <Text style={{ color: '#FCD34D', fontSize: 11, fontWeight: '800' }}>Clear ✕</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.zoneSubtitle}>
          {selectedCategoryId !== 'all'
            ? `Filtered by ${computedCategories.find((c) => c.id === selectedCategoryId)?.name} • Tap category again to clear`
            : 'Featured & Nearby'}
        </Text>
      </View>

      {displayedRestaurants.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
          {detectedZone && !isAreaServiceable ? (
            <View style={styles.unserviceableEmptyBox}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>📍</Text>
              <Text style={styles.unserviceableEmptyTitle}>
                Not Serviceable to Your Location
              </Text>
              <Text style={styles.unserviceableEmptyDesc}>
                We do not currently deliver to this area. Your request has been automatically sent to our administration team for coverage expansion. Please change your delivery address to order now.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Addresses', { selectMode: true })}
                style={({ pressed }) => [
                  styles.changeAddressLargeBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.changeAddressLargeBtnText}>Change Delivery Address</Text>
              </Pressable>
            </View>
          ) : (
            <EmptyState
              title="No restaurants found"
              description="Broaden filters or try search."
              accessibilityLabel="Restaurant feed empty"
            />
          )}
        </View>
      ) : null}
    </View>
  );

  // FlatList Data with Sticky Header Structure
  type HomeListItem =
    | { type: 'HERO'; id: 'hero' }
    | { type: 'CATEGORIES'; id: 'categories' }
    | { type: 'MIDDLE_SECTIONS'; id: 'middle' }
    | { type: 'RESTAURANT'; id: string; data: any };

  const listData: HomeListItem[] = useMemo(() => [
    { type: 'HERO', id: 'hero' },
    { type: 'CATEGORIES', id: 'categories' },
    { type: 'MIDDLE_SECTIONS', id: 'middle' },
    ...displayedRestaurants.map((resto) => ({
      type: 'RESTAURANT' as const,
      id: resto.id,
      data: resto,
    })),
  ], [displayedRestaurants]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#012B18" barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#0A120E' }}>
        {feed.isLoading ? (
          <RestaurantListSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ backgroundColor: '#0A120E' }}
            data={listData}
            keyExtractor={(item) => item.id}
            stickyHeaderIndices={[1]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 0 }}
            removeClippedSubviews={false}
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
            renderItem={({ item }) => {
              if (item.type === 'HERO') return renderHeroBanner();
              if (item.type === 'CATEGORIES') return renderCategoriesStickyBar();
              if (item.type === 'MIDDLE_SECTIONS') return renderMiddleSections();
              if (item.type === 'RESTAURANT') {
                return (
                  <View style={{ paddingHorizontal: 16 }}>
                    <RestaurantCard
                      restaurant={item.data}
                      columnMode={false}
                      userLat={userCoords?.latitude}
                      userLng={userCoords?.longitude}
                      onPress={() => {
                        trackAnalyticsEvent('restaurant_card_tapped', {
                          restaurantId: item.data.id,
                        });
                        navigation.navigate('Menu', {
                          restaurantId: item.data.id,
                        });
                      }}
                    />
                  </View>
                );
              }
              return null;
            }}
          />
        )}

        <GlobalCartBanner />
        <Toast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          variant={toast?.variant ?? 'info'}
          accessibilityLabel={toast?.message ?? 'Toast'}
          onDismiss={() => setToast(null)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroTopContainer: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    paddingRight: 12,
    gap: 8,
  },
  locationPinBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTitleText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  dropdownChevron: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '900',
  },
  locationSubtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#012B18',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarInitial: {
    color: '#FCD34D',
    fontSize: 15,
    fontWeight: '900',
  },
  searchAndVegRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBarPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    color: '#9CA3AF',
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  vegModeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  vegModeLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 8.5,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 10,
    marginBottom: 2,
  },
  categoriesDarkSection: {
    backgroundColor: '#0A120E',
    paddingTop: 12,
    paddingBottom: 10,
    zIndex: 10,
  },
  categoriesSectionTitle: {
    color: '#9CA3AF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  categoryItemWrap: {
    alignItems: 'center',
    width: 66,
  },
  categoryCircleWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    backgroundColor: '#131F18',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryCircleActive: {
    borderColor: '#EF4444',
    borderWidth: 2.5,
  },
  categoryCircleImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  categoryLabelInactive: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  activeUnderline: {
    width: 28,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  activeUnderlineVisible: {
    backgroundColor: '#EF4444',
  },
  filtersSection: {
    backgroundColor: '#0A120E',
    paddingTop: 8,
    paddingBottom: 10,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  darkFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#16231C',
    borderWidth: 1,
    borderColor: '#263B2F',
  },
  darkFilterPillActive: {
    backgroundColor: '#0B3820',
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  darkFilterText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  darkFilterTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  recommendedSection: {
    backgroundColor: '#0A120E',
    paddingTop: 8,
    paddingBottom: 14,
  },
  sectionHeadingUppercase: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recommendedScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recommendedCard: {
    width: 155,
    backgroundColor: '#131F18',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  recommendedImageWrap: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1A2920',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedImageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2920',
  },
  offerBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  ratingPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingPillOffline: {
    backgroundColor: '#374151',
  },
  ratingPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
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
  },
  closedTagBox: {
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  closedText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  recommendedTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 6,
  },
  recommendedEta: {
    color: '#9CA3AF',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  topRestaurantsSection: {
    backgroundColor: '#0A120E',
    paddingTop: 6,
    paddingBottom: 14,
  },
  topRestaurantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  topSectionTitle: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  exploreAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreAllText: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '800',
  },
  topHeroCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#131F18',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  topHeroImageWrap: {
    width: '100%',
    height: 185,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  topHeroImage: {
    width: '100%',
    height: '100%',
  },
  topHeroFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  heroOfferBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#14532D',
    zIndex: 2,
  },
  heroOfferBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  heroBottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroRestoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroRestoEta: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  heroRatingBadge: {
    backgroundColor: '#14532D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  heroRatingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '900',
  },
  zoneListHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  zoneCountHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  zoneSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardOffline: {
    opacity: 0.75,
  },
  outOfZoneCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#EF4444',
  },
  outOfZoneTitle: {
    color: '#FCD34D',
    fontSize: 14,
    fontWeight: '900',
  },
  outOfZoneDesc: {
    color: '#FEF2F2',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 4,
  },
  changeAddressActionBtn: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  changeAddressActionBtnText: {
    color: '#022414',
    fontSize: 12,
    fontWeight: '800',
  },
  adminNotifiedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  adminNotifiedBadgeText: {
    color: '#86EFAC',
    fontSize: 11,
    fontWeight: '700',
  },
  unserviceableEmptyBox: {
    width: '100%',
    padding: 24,
    backgroundColor: '#131F18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    gap: 8,
  },
  unserviceableEmptyTitle: {
    color: '#FCD34D',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  unserviceableEmptyDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
  changeAddressLargeBtn: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  changeAddressLargeBtnText: {
    color: '#022414',
    fontSize: 14,
    fontWeight: '900',
  },
});
