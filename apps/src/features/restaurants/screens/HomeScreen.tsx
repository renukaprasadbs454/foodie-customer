import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Modal,
  Text,
  TextInput,
  Toast,
  trackAnalyticsEvent,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BrowseStackParamList } from '../../../navigation/types';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantListSkeleton } from '../components/RestaurantListSkeleton';
import { useRestaurantFeed } from '../hooks/useRestaurantFeed';
import type { RestaurantSort } from '../types';
import { RESTAURANT_SORT_WHITELIST } from '../types';
import { useGetCartQuery } from '../../../api/endpoints/cartApi';
import { useGetNotificationsQuery } from '../../../api/endpoints/notificationsApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_ITEMS } from '../mockData';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { syncSupportChatMessages, connectToAgentAndCreateEnquiry, STORAGE_KEY, EnquiryRecord, generateSupportReply } from '../../profile/supportAiEngine';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Home'>;

/**
 * P2-CUS-01 Home — location-optional APPROVED restaurant feed (UI-API Home).
 * No COD UI. Geo bias omitted until a location module is approved (feed without lat/lng).
 */
export function HomeScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { isConnected } = useConnectivity();
  const [cuisineType, setCuisineType] = useState<string | undefined>();
  const [sort, setSort] = useState<RestaurantSort>('avgRating');
  const [cuisineDraft, setCuisineDraft] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState('Locating...');

  // Support / Complaint Chat State
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>('ENQ-901');
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [showAgentOption, setShowAgentOption] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { id: '1', text: 'Hi! How can we help you today with your order or application?', from: 'admin', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);

  // Sync Help chat modal history with persistent storage key `foodie_support_enquiries` and API route
  const syncChatFromStorage = async () => {
    let enquiries: EnquiryRecord[] = [];

    // 1. Try fetching from server endpoints
    const endpoints = [
      'http://10.59.183.92:3000/api/support-tickets',
      'http://10.59.183.92:3001/api/support-tickets',
      'http://localhost:3000/api/support-tickets',
      'http://localhost:3001/api/support-tickets',
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            enquiries = json.data;
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Fallback to AsyncStorage / localStorage
    if (enquiries.length === 0) {
      try {
        let rawData: string | null = null;
        rawData = await AsyncStorage.getItem(STORAGE_KEY);
        if (!rawData && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          rawData = window.localStorage.getItem(STORAGE_KEY);
        }

        if (rawData) {
          enquiries = JSON.parse(rawData);
        }
      } catch (e) {}
    }

    // Purge test tickets > 905
    enquiries = enquiries.filter((e) => {
      const num = parseInt((e.id || '').replace('ENQ-', ''), 10);
      return isNaN(num) || num <= 905;
    });

    if (enquiries.length > 0) {
      const activeRec = enquiries.find((e) => e.id === 'ENQ-901') || enquiries[0];

      if (activeRec && activeRec.messages && activeRec.messages.length > 0) {
        const formatted = activeRec.messages.map((m) => ({
          id: m.id,
          text: m.message,
          from: m.sender === 'admin' ? 'admin' : 'user',
          time: m.timestamp,
        }));
        setChatHistory(formatted);
        if (!activeEnquiryId) {
          setActiveEnquiryId(activeRec.id);
        }

        // Auto-end agent mode ONLY when an actual human admin replies or resolves the ticket
        const lastMsg = activeRec.messages[activeRec.messages.length - 1];
        const isRealAdminReply =
          lastMsg &&
          lastMsg.sender === 'admin' &&
          !lastMsg.senderName?.includes('Assistant') &&
          !lastMsg.senderName?.includes('Desk') &&
          !lastMsg.senderName?.includes('Bot') &&
          !lastMsg.message.includes('Message sent to Admin Support') &&
          !lastMsg.message.includes('Message delivered to Admin Support');

        const isResolved = activeRec.status === 'RESOLVED';

        if (isRealAdminReply || isResolved) {
          setIsAgentConnected(false);
          setShowAgentOption(false);
        }
      }
    }
  };

  useEffect(() => {
    if (helpModalVisible) {
      void syncChatFromStorage();
      const interval = setInterval(() => {
        void syncChatFromStorage();
      }, 2000);

      const handleStorageChange = () => {
        void syncChatFromStorage();
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('foodie_enquiry_updated', handleStorageChange);
      }

      return () => {
        clearInterval(interval);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorageChange);
          window.removeEventListener('foodie_enquiry_updated', handleStorageChange);
        }
      };
    }
  }, [helpModalVisible]);

  const feed = useRestaurantFeed({
    cuisineType,
    sort,
    userLatitude: userCoords?.latitude,
    userLongitude: userCoords?.longitude,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useFocusEffect(
    React.useCallback(() => {
      void feed.refetch();
    }, [feed.refetch])
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setCurrentAddress('Location Permission Denied');
          return;
        }

        const fetchLocAndGeocode = async (loc: Location.LocationObject) => {
          if (!isMounted) return;
          setUserCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });

          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (reverseGeocode.length > 0 && isMounted) {
              const addr = reverseGeocode[0];
              const parts = [
                addr.name && !addr.name.includes('+') && !addr.name.match(/^[0-9A-Z]+\+[0-9A-Z]+$/) ? addr.name : null,
                addr.district || addr.subregion || addr.city,
                addr.region,
              ].filter(Boolean);
              setCurrentAddress(parts.join(', ') || 'Unknown Location');
            }
          } catch (e) {
            // Silently fallback if geocode fails
          }
        };

        // Get initial quickly
        const lastLoc = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastLoc) await fetchLocAndGeocode(lastLoc);

        // Try getting accurate
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await fetchLocAndGeocode(location);

      } catch (err) {
        if (isMounted && currentAddress === 'Locating...') {
          setCurrentAddress('Bengaluru, Karnataka');
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const applyCuisine = () => {
    const next = cuisineDraft.trim() || undefined;
    setCuisineType(next);
    trackAnalyticsEvent('filter_applied', { cuisineType: next ?? 'all' });
  };

  const cartQuery = useGetCartQuery();
  const cartItemsCount = cartQuery?.data?.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0;

  const notificationsQuery = useGetNotificationsQuery({ unreadOnly: true, page: 0, size: 50 }, { pollingInterval: 15000 });
  const unreadCount = notificationsQuery.data?.length ?? 0;


  const renderHeader = () => (
    <View style={{ gap: tokens.spacing.lg, paddingBottom: tokens.spacing.sm }}>
      {/* Curved iOS Premium Dark Header */}
      <View style={{
        backgroundColor: '#14532D', // Re-applied brand dark green
        marginHorizontal: 0,
        marginTop: 0,
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: 12,
        paddingBottom: tokens.spacing.md,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
      }}>
        {/* Top Row: Brand & Cart */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: '#FCD34D', fontWeight: '900', letterSpacing: -0.5, fontSize: 34 }}>
            Foodie
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Help Button */}
            <Pressable
              onPress={() => setHelpModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Get support help"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#1B6A3A' : 'rgba(255, 255, 255, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>❓ Help</Text>
            </Pressable>

            {/* Notifications Button */}
            <Pressable
              onPress={() => (navigation as any).navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel="View notifications"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#1B6A3A' : 'rgba(255, 255, 255, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
                minWidth: 44,
                justifyContent: 'center',
              })}
            >
              <Text style={{ fontSize: 20 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#EF4444',
                  borderRadius: 12,
                  paddingHorizontal: 5,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: '#14532D',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Cart Button */}
            <Pressable
              onPress={() => navigation.navigate('Cart')}
              accessibilityRole="button"
              accessibilityLabel={`Open Cart, ${cartItemsCount} items`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: pressed ? '#1B6A3A' : 'rgba(255, 255, 255, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              })}
            >
              <Text style={{ marginRight: 6, fontSize: 18 }}>🛒</Text>
              {cartItemsCount > 0 ? (
                <View style={{
                  backgroundColor: '#FCD34D',
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                  <Text style={{ color: '#14532D', fontWeight: '800', fontSize: 13 }}>
                    {cartItemsCount}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>Empty</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Second Row: Location Button (Subtle) */}
        <Pressable
          onPress={() => navigation.navigate('Addresses', {})}
          accessibilityRole="button"
          accessibilityLabel="Change delivery address"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, color: '#A7F3D0', fontWeight: '800', letterSpacing: 0.5 }}>DELIVERING TO  </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
            {currentAddress.length > 28 ? currentAddress.substring(0, 28) + '...' : currentAddress}
          </Text>
          <Text style={{ color: '#FCD34D', fontSize: 16, marginLeft: 6, fontWeight: '900' }}>›</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.lg }}>

        {/* Styled Search Button */}
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: pressed ? '#F3ECE0' : '#FFFFFF',
            padding: tokens.spacing.md,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: tokens.color.border,
            shadowColor: '#14532D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
            marginTop: -tokens.spacing.xs,
          })}
        >
          <Text style={{ marginRight: tokens.spacing.sm, fontSize: 16 }}>🔍</Text>
          <Text variant="bodySmall" color={tokens.color.textSecondary} style={{ flex: 1, fontWeight: '500' }}>
            Search dishes, cuisines, restaurants...
          </Text>
        </Pressable>

        {/* Scrollable Visual Categories */}
        <View style={{ gap: tokens.spacing.sm }}>
          <Text variant="heading2" style={{ fontWeight: '800', color: tokens.color.textPrimary }}>
            What's on your mind?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: tokens.spacing.xs,
              gap: tokens.spacing.md,
            }}
          >
            {CATEGORY_ITEMS.map((cat) => {
              const active = cuisineType === cat.cuisine || (!cuisineType && cat.cuisine === undefined);
              return (
                <Pressable
                  key={cat.name}
                  onPress={() => {
                    if (cuisineType === cat.cuisine && cat.cuisine !== undefined) {
                      setCuisineType(undefined);
                    } else {
                      setCuisineType(cat.cuisine);
                    }
                    trackAnalyticsEvent('category_tapped', { category: cat.name });
                  }}
                  style={{
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: active ? '#FEF3C7' : '#F3F4F6', // active: gold background
                    borderWidth: 2,
                    borderColor: active ? '#FCD34D' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    shadowColor: '#14532D',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: active ? 0.3 : 0.1,
                    shadowRadius: 6,
                    elevation: active ? 4 : 2,
                  }}>
                    {/* Real Image replacement for cartoony emojis */}
                    {(cat as any).image ? (
                      <Image source={{ uri: (cat as any).image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{(cat as any).icon}</Text>
                    )}
                  </View>
                  <Text variant="caption" style={{
                    color: active ? '#14532D' : tokens.color.textPrimary,
                    fontWeight: active ? '800' : '600',
                    fontSize: 12,
                  }}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Top Restaurants Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: tokens.spacing.xs,
        }}>
          <View>
            <Text variant="heading2" style={{ fontWeight: '800', color: tokens.color.textPrimary }}>
              Top Restaurants
            </Text>
            <Text variant="caption" color={tokens.color.textSecondary}>
              Chef-crafted meals curated for you
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('RestaurantListing', { sort: 'avgRating' })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text variant="label" color={tokens.color.accentMuted} style={{ fontWeight: '700' }}>
              View All →
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: tokens.spacing.md,
            gap: tokens.spacing.sm,
          }}
          style={{ marginHorizontal: -tokens.spacing.md }}
        >
          {RESTAURANT_SORT_WHITELIST.map((option) => {
            const active = sort === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setSort(option);
                  trackAnalyticsEvent('filter_applied', { sort: option });
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: tokens.spacing.lg,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: tokens.radius.full,
                  backgroundColor: active ? tokens.color.accent : tokens.color.surface,
                  borderWidth: 1,
                  borderColor: active ? tokens.color.accent : tokens.color.border,
                  elevation: active ? 3 : 0,
                  shadowColor: '#14532D',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: active ? 0.2 : 0,
                  shadowRadius: 4,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text variant="caption" style={{
                  color: active ? '#FFFFFF' : tokens.color.textPrimary,
                  fontWeight: active ? '700' : '500',
                }}>
                  {option === 'createdAt' ? '🆕 New Arrivals' : option === 'avgRating' ? '★ Top Rated' : '📍 Nearby Restaurants'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!isConnected && (
          <Text variant="caption" color={tokens.color.warning}>
            Offline — showing cached results.
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#14532D' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#14532D" barStyle="light-content" />
      <Animated.View style={{
        flex: 1,
        backgroundColor: tokens.color.background,
        paddingHorizontal: 0,
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        }],
      }}>
        {feed.isLoading ? (
          <RestaurantListSkeleton />
        ) : (
          <FlatList
            data={feed.items}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ paddingHorizontal: tokens.spacing.md - 4 }}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ paddingBottom: tokens.spacing.xl, paddingTop: 0, gap: tokens.spacing.md }}
            removeClippedSubviews={true}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={feed.isFetching && feed.items.length > 0}
                onRefresh={() => {
                  void feed.refetch();
                }}
                tintColor={tokens.color.accent}
              />
            }
            onEndReached={() => {
              feed.onLoadMore();
            }}
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
              <RestaurantCard
                restaurant={item}
                columnMode={true}
                userLat={userCoords?.latitude}
                userLng={userCoords?.longitude}
                onPress={() => {
                  trackAnalyticsEvent('restaurant_card_tapped', {
                    restaurantId: item.id,
                  });
                  navigation.navigate('Menu', {
                    restaurantId: item.id,
                  });
                }}
              />
            )}
          />
        )}
        <RNModal
          visible={helpModalVisible}
          animationType="slide"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#E5DDD5' }}>
            <View style={{
              backgroundColor: '#075E54', // WhatsApp Green
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: insets.top + 10,
              paddingBottom: 12,
              paddingHorizontal: 16,
            }}>
              <Pressable onPress={() => setHelpModalVisible(false)} style={{ marginRight: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>←</Text>
              </Pressable>

              <View style={{ width: 40, height: 40, backgroundColor: '#128C7E', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 20 }}>🎧</Text>
              </View>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>Admin Support</Text>
                <Text style={{ color: '#D5F5E3', fontSize: 12 }}>online • Instant replies</Text>
              </View>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                style={{ flex: 1 }}
              >
                {chatHistory.map((msg) => {
                  const isAdminOrBot = msg.from === 'admin' || msg.from === 'bot';
                  const isHumanAdmin = msg.from === 'admin' && (
                    msg.text.includes('Ticket #') ||
                    msg.text.includes('Admin Support') ||
                    msg.text.includes('reviewing your message') ||
                    msg.text.includes('validating') ||
                    msg.text.includes('investigating') ||
                    msg.text.includes('Response sent') ||
                    msg.text.includes('Our team')
                  ) && !msg.text.includes('Foodie Customer Support Assistant') && !msg.text.includes('Orders are typically delivered');

                  const isAutoBot = isAdminOrBot && !isHumanAdmin;

                  return (
                    <View key={msg.id} style={{
                      alignSelf: isAdminOrBot ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      marginBottom: 12,
                    }}>
                      {/* Sender Designation Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, alignSelf: isAdminOrBot ? 'flex-start' : 'flex-end', gap: 6 }}>
                        {isHumanAdmin ? (
                          <View style={{ backgroundColor: '#14532D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#FCD34D', fontSize: 10, fontWeight: '800' }}>🎧 Live Admin Agent</Text>
                          </View>
                        ) : isAutoBot ? (
                          <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>🤖 Foodie Assistant</Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>You</Text>
                        )}
                        <Text style={{ color: '#94A3B8', fontSize: 10 }}>{msg.time}</Text>
                      </View>

                      {/* Message Bubble */}
                      <View style={{
                        backgroundColor: isAdminOrBot ? (isHumanAdmin ? '#FFFFFF' : '#F1F5F9') : '#14532D',
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderWidth: isHumanAdmin ? 1.5 : 1,
                        borderColor: isHumanAdmin ? '#FCD34D' : (isAdminOrBot ? '#CBD5E1' : '#14532D'),
                        borderTopLeftRadius: isAdminOrBot ? 2 : 16,
                        borderTopRightRadius: isAdminOrBot ? 16 : 2,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                        elevation: 1,
                      }}>
                        <Text style={{ color: isAdminOrBot ? '#0F172A' : '#FFFFFF', fontSize: 14, lineHeight: 20 }}>
                          {msg.text}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Quick Action Suggestion Chips & Conditional Agent Escalation */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, paddingHorizontal: 12, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {/* Show Connect to Agent chip ONLY when required or requested */}
                  {(showAgentOption && !isAgentConnected) && (
                    <Pressable
                      onPress={async () => {
                        const userText = chatMessage.trim() || 'I want to connect to a live support agent.';
                        setChatMessage('');
                        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const { enquiryRecord, systemConfirmationMsg } = await connectToAgentAndCreateEnquiry(
                          userText,
                          'Ananya Sharma',
                          'ananya.s@gmail.com',
                          '+91 98765 12345',
                          undefined,
                          'ENQ-901'
                        );

                        setActiveEnquiryId(enquiryRecord.id);
                        setIsAgentConnected(true);
                        setShowAgentOption(false);

                        setChatHistory((prev) => [
                          ...prev,
                          { id: `user-${Date.now()}`, text: userText, from: 'user', time: nowTime },
                          { id: systemConfirmationMsg.id, text: systemConfirmationMsg.message, from: 'admin', time: systemConfirmationMsg.timestamp },
                        ]);
                      }}
                      style={{ backgroundColor: '#14532D', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#FCD34D' }}
                    >
                      <Text style={{ color: '#FCD34D', fontSize: 12, fontWeight: '800' }}>🎧 Connect to Live Support Agent</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => setChatMessage('Where is my delivery?')}
                    style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1' }}
                  >
                    <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>📍 Live Tracking</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setChatMessage('Refund status for my order')}
                    style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1' }}
                  >
                    <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>💳 Refund Info</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setChatMessage('Are there active coupons or offers?')}
                    style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1' }}
                  >
                    <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>🏷️ Offers & Coupons</Text>
                  </Pressable>
                </View>
              </ScrollView>

              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                padding: 8,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                backgroundColor: 'transparent',
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  minHeight: 48,
                  maxHeight: 120,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  marginRight: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}>
                  <RNTextInput
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Message Foodie Support..."
                    multiline
                    placeholderTextColor="#9CA3AF"
                    style={{ flex: 1, fontSize: 16, color: '#111827', paddingVertical: 12, maxHeight: 100 }}
                  />
                </View>
                <Pressable
                  onPress={async () => {
                    if (!chatMessage.trim()) return;

                    const userText = chatMessage.trim();
                    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const newMsg = {
                      id: `user-${Date.now()}`,
                      text: userText,
                      from: 'user',
                      time: nowTime,
                    };

                    setChatHistory((prev) => [...prev, newMsg]);
                    setChatMessage('');

                    const textLower = userText.toLowerCase();
                    const isExplicitAgentRequest =
                      textLower.includes('connect') ||
                      textLower.includes('agent') ||
                      textLower.includes('human') ||
                      textLower.includes('representative') ||
                      textLower.includes('talk to someone');

                    if (isExplicitAgentRequest || isAgentConnected) {
                      const { enquiryRecord, systemConfirmationMsg } = await connectToAgentAndCreateEnquiry(
                        userText,
                        'Ananya Sharma',
                        'ananya.s@gmail.com',
                        '+91 98765 12345',
                        undefined,
                        'ENQ-901'
                      );

                      setActiveEnquiryId(enquiryRecord.id);
                      setIsAgentConnected(true);
                      setShowAgentOption(false);

                      setChatHistory((prev) => [
                        ...prev,
                        {
                          id: systemConfirmationMsg.id,
                          text: systemConfirmationMsg.message,
                          from: 'admin',
                          time: systemConfirmationMsg.timestamp,
                        },
                      ]);
                    } else {
                      // Smart Chatbot Engine & Real-Time Sync with Admin Support Desk
                      const { aiMsg, aiResult } = await syncSupportChatMessages(userText, 'ENQ-901', 'Ananya Sharma');

                      if (aiResult && aiResult.suggestAgent) {
                        setShowAgentOption(true);
                      } else {
                        setShowAgentOption(false);
                      }

                      setChatHistory((prev) => [
                        ...prev,
                        {
                          id: aiMsg.id,
                          text: aiMsg.message,
                          from: 'admin',
                          time: aiMsg.timestamp,
                        },
                      ]);
                    }
                  }}
                  style={{
                    backgroundColor: '#128C7E',
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Send</Text>
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
