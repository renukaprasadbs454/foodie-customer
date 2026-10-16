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
import { useDetectZoneQuery } from '../../../api/endpoints/restaurantsApi';
import type { RestaurantSort } from '../types';
import { RESTAURANT_SORT_WHITELIST } from '../types';
import { useGetCartQuery } from '../../../api/endpoints/cartApi';
import { useGetNotificationsQuery } from '../../../api/endpoints/notificationsApi';
import { useGetMyOrdersQuery } from '../../../api/endpoints/ordersApi';
import { useGetMyProfileQuery } from '../../../api/endpoints/usersApi';
import { useGetAddressesQuery } from '../../../api/endpoints/addressesApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORY_ITEMS } from '../mockData';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { evaluateSmartSupportReply, AiActionButton } from '../../profile/supportAiEngine';
import {
  useGetMyConversationsQuery,
  useSendMessageMutation,
  useResolveConversationMutation,
} from '../../../api/endpoints/supportApi';
import { PromotionalBannerCarousel } from '../components/PromotionalBannerCarousel';
import { syncSupportChatMessages, connectToAgentAndCreateEnquiry, pollLiveAdminMessages, sendLiveCustomerMessageToAdmin } from '../../profile/supportAiEngine';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Home'>;

async function reverseGeocodeCoords(lat: number, lng: number): Promise<string | null> {
  // 1. Fast boundary match for Tumkur (app default center)
  if (Math.abs(lat - 13.3379) < 0.15 && Math.abs(lng - 77.1173) < 0.15) {
    return 'Tumkur, Karnataka';
  }
  // 2. Fast boundary match for Bengaluru
  if (Math.abs(lat - 12.9716) < 0.25 && Math.abs(lng - 77.5946) < 0.25) {
    return 'Bengaluru, Karnataka';
  }

  // 3. Try expo Location.reverseGeocodeAsync
  try {
    const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (res && res.length > 0) {
      const item = res[0];
      const parts = [
        item.name && !item.name.includes('+') && !item.name.match(/^[0-9A-Z]+\+[0-9A-Z]+$/) ? item.name : null,
        item.district || item.subregion || item.city,
        item.region,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch (e) {}

  // 4. Try free reverse geocode API with short timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const json = await resp.json();
      const addr = json.address;
      if (addr) {
        const area = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.town || addr.city;
        const city = addr.city || addr.town || addr.county || addr.state;
        const formatted = [area, city].filter(Boolean).join(', ');
        if (formatted) return formatted;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * P2-CUS-01 Home — location-optional APPROVED restaurant feed (UI-API Home).
 * No COD UI. Geo bias omitted until a location module is approved (feed without lat/lng).
 */
export function HomeScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { isConnected } = useConnectivity();
  const [cuisineType, setCuisineType] = useState<string | undefined>();
  const [sort, setSort] = useState<RestaurantSort>('topPosition');
  const [cuisineDraft, setCuisineDraft] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState('Locating...');

  // Fetch saved delivery addresses (Instant priority & selection)
  const addressesQuery = useGetAddressesQuery(undefined, { refetchOnFocus: true });
  const savedAddresses = addressesQuery.data ?? [];

  // Fetch profile for dynamic customer name & contact details
  const profileQuery = useGetMyProfileQuery();
  const currentUserName = profileQuery.data?.fullName || 'Customer User';
  const currentUserEmail = profileQuery.data?.email || 'customer@foodie.com';
  const currentUserPhone = profileQuery.data?.phoneNumber || '+91 98765 43210';

  // Fetch active orders dynamically (no hardcoded ORD-9821)
  const { data: myOrders } = useGetMyOrdersQuery(
    { page: 0, size: 5 },
    { pollingInterval: 10000, refetchOnFocus: true }
  );
  const activeOrder = myOrders?.find(
    (o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && o.status !== 'COMPLETED'
  );
  const activeOrderId = activeOrder?.orderId;

  // Support / Complaint Chat State
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

  // Network State (Reduced for Chat UI only)
  const [resolveConv] = useResolveConversationMutation();

  useEffect(() => {
    if (!isAgentConnected || !activeEnquiryId) return;

    const token = setInterval(async () => {
      try {
        const { messages: msgs, status } = await pollLiveAdminMessages(activeEnquiryId);

        if (msgs && msgs.length > 0) {
          setChatHistory(prev => {
            let changed = false;
            const newHist = [...prev];
            msgs.forEach(m => {
              const mappedFrom = m.sender === 'admin' ? 'admin' : (m.senderName === 'Foodie AI Support' ? 'bot' : 'user');
              const exists = newHist.find(x =>
                x.id === m.id ||
                (x.text === m.message && x.from === mappedFrom)
              );

              if (!exists) {
                newHist.push({
                  id: m.id,
                  text: m.message,
                  from: mappedFrom as 'admin' | 'bot' | 'user',
                  time: m.timestamp,
                });
                changed = true;
              }
            });
            return changed ? newHist : prev;
          });
        }

        if (status === 'RESOLVED') {
          setIsAgentConnected(false);
          setActiveEnquiryId(null);
          setChatHistory([
            { id: `sys-resolved-${Date.now()}`, text: '✅ Your past query was marked as RESOLVED. Is there anything else I can help you with?', from: 'bot', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
        }
      } catch (e) { }
    }, 2500);

    return () => clearInterval(token);
  }, [isAgentConnected, activeEnquiryId]);

  const handleUserSubmitMessage = async (rawText: string) => {
    const userText = rawText.trim();
    if (!userText) return;
    setChatMessage('');

    const textLower = userText.toLowerCase();

    // 1) Agent Connection Flow
    if (textLower === 'i want to connect to a live support agent.' || (showAgentOption && textLower.includes('agent'))) {
      try {
        const { userMsg, systemConfirmationMsg, enquiryRecord } = await connectToAgentAndCreateEnquiry(
          userText, currentUserName, currentUserEmail, currentUserPhone, activeOrderId || undefined, activeEnquiryId || undefined
        );
        setActiveEnquiryId(enquiryRecord.id);
        setIsAgentConnected(true);
        setShowAgentOption(false);
        setChatHistory((prev) => [
          ...prev,
          { id: userMsg.id, text: userMsg.message, from: 'user', time: userMsg.timestamp },
          { id: systemConfirmationMsg.id, text: systemConfirmationMsg.message, from: 'admin', time: systemConfirmationMsg.timestamp },
        ]);
      } catch (e) {
        setToast({ message: 'Failed to connect to agent.', variant: 'error' });
      }
      return;
    }

    // 1b) Live Agent is Already Connected! Send directly to Admin
    if (isAgentConnected && activeEnquiryId) {
      try {
        const liveMsg = await sendLiveCustomerMessageToAdmin(
          activeEnquiryId,
          userText,
          currentUserName,
          activeOrderId || undefined,
          currentUserEmail,
          currentUserPhone
        );
        setChatHistory(prev => [
          ...prev,
          { id: liveMsg.id, text: liveMsg.message, from: 'user', time: liveMsg.timestamp }
        ]);
      } catch (e) {
        setToast({ message: 'Failed to send message to agent.', variant: 'error' });
      }
      return;
    }

    // 2) Normal AI Chat Processing Flow
    try {
      const { userMsg, aiMsg, aiResult } = await syncSupportChatMessages(
        userText, activeEnquiryId || undefined, currentUserName, activeOrderId || undefined
      );

      setChatHistory((prev) => [
        ...prev,
        { id: userMsg.id, text: userMsg.message, from: 'user', time: userMsg.timestamp },
        { id: aiMsg.id, text: aiMsg.message, from: 'bot', time: aiMsg.timestamp, buttons: aiResult.actionButtons },
      ]);

      if (aiResult.suggestAgent) {
        setShowAgentOption(true);
      }

      if (aiResult.canResolve) {
        if (activeEnquiryId) {
          void resolveConv(activeEnquiryId).unwrap().catch(() => { });
          setActiveEnquiryId(null);
        }
        setIsAgentConnected(false);
      }

    } catch (e) {
      setToast({ message: 'Failed to process AI chat.', variant: 'error' });
    }
  };

  // Removed redundant syncChatFromStorage manually

  const zoneQuery = useDetectZoneQuery(
    { lat: userCoords?.latitude ?? 0, lng: userCoords?.longitude ?? 0 },
    { skip: !userCoords?.latitude || !userCoords?.longitude, refetchOnFocus: true }
  );
  const detectedZone = zoneQuery.data;

  const feed = useRestaurantFeed({
    cuisineType,
    sort,
    userLatitude: userCoords?.latitude,
    userLongitude: userCoords?.longitude,
    zoneId: detectedZone?.zoneId ?? undefined,
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
      void addressesQuery.refetch();
      void zoneQuery.refetch();
    }, [feed.refetch, addressesQuery.refetch, zoneQuery.refetch])
  );

  // 1. Immediately apply saved default or first address when loaded
  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      if (defAddr) {
        const prefix = defAddr.label ? `${defAddr.label} • ` : '';
        const main = defAddr.line1 || defAddr.city || 'Delivery Address';
        const cityPart = defAddr.city && !main.includes(defAddr.city) ? `, ${defAddr.city}` : '';
        const fullAddr = `${prefix}${main}${cityPart}`;
        setCurrentAddress(fullAddr);

        if (defAddr.latitude && defAddr.longitude && Number(defAddr.latitude) !== 0) {
          setUserCoords({
            latitude: Number(defAddr.latitude),
            longitude: Number(defAddr.longitude),
          });
        }
      }
    }
  }, [savedAddresses]);

  // 2. Resolve live location or fallback cleanly without hanging
  useEffect(() => {
    let isMounted = true;

    const detectLocation = async () => {
      // Browser fast geolocation on Web
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserCoords({ latitude: lat, longitude: lng });

            const resolved = await reverseGeocodeCoords(lat, lng);
            if (isMounted) {
              if (savedAddresses.length === 0 || currentAddress === 'Locating...') {
                setCurrentAddress(resolved || 'Tumkur, Karnataka');
              }
            }
          },
          () => {
            if (isMounted && currentAddress === 'Locating...') {
              if (savedAddresses.length > 0) {
                const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                setCurrentAddress(def.line1 ? `${def.line1}, ${def.city}` : def.city);
              } else {
                setCurrentAddress('Tumkur, Karnataka');
              }
            }
          },
          { timeout: 3500, maximumAge: 60000 }
        );
        return;
      }

      // Mobile Expo Location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted && currentAddress === 'Locating...') {
            if (savedAddresses.length > 0) {
              const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
              setCurrentAddress(def.line1 ? `${def.line1}, ${def.city}` : def.city);
            } else {
              setCurrentAddress('Tumkur, Karnataka');
            }
          }
          return;
        }

        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
        ]);

        if (loc && isMounted) {
          setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const resolved = await reverseGeocodeCoords(loc.coords.latitude, loc.coords.longitude);
          if (isMounted && (savedAddresses.length === 0 || currentAddress === 'Locating...')) {
            setCurrentAddress(resolved || 'Tumkur, Karnataka');
          }
        } else if (isMounted && currentAddress === 'Locating...') {
          if (savedAddresses.length > 0) {
            const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
            setCurrentAddress(def.line1 ? `${def.line1}, ${def.city}` : def.city);
          } else {
            setCurrentAddress('Tumkur, Karnataka');
          }
        }
      } catch (e) {
        if (isMounted && currentAddress === 'Locating...') {
          if (savedAddresses.length > 0) {
            const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
            setCurrentAddress(def.line1 ? `${def.line1}, ${def.city}` : def.city);
          } else {
            setCurrentAddress('Tumkur, Karnataka');
          }
        }
      }
    };

    void detectLocation();

    // Guaranteed safety timeout: under no circumstances should "Locating..." remain after 2.5s
    const safetyTimer = setTimeout(() => {
      if (isMounted && currentAddress === 'Locating...') {
        if (savedAddresses.length > 0) {
          const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
          setCurrentAddress(def.line1 ? `${def.line1}, ${def.city}` : def.city);
        } else {
          setCurrentAddress('Tumkur, Karnataka');
        }
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [savedAddresses]);

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
          <Text style={{ color: '#FCD34D', fontWeight: '900', letterSpacing: -0.5, fontSize: 34, lineHeight: 54, paddingTop: 10 }}>
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

        {/* Second Row: Operating Zone Badge & Location Selector */}
        <View style={{ marginTop: 4, gap: 5 }}>
          {detectedZone?.zoneName ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: detectedZone.serviceable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.25)',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 12,
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: detectedZone.serviceable ? '#4ADE80' : '#FCA5A5',
              gap: 6,
            }}>
              <View style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: detectedZone.serviceable ? '#4ADE80' : '#EF4444',
              }} />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 }}>
                {detectedZone.serviceable ? `${detectedZone.zoneName.toUpperCase()}` : 'OUTSIDE OPERATING ZONE'}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate('Addresses', { selectMode: true })}
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              alignSelf: 'flex-start',
            })}
          >
            <Text style={{ marginRight: 6, fontSize: 13 }}>📍</Text>
            <Text style={{ fontSize: 12, color: '#A7F3D0', fontWeight: '800', letterSpacing: 0.5 }}>
              DELIVERING TO{' '}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
              {currentAddress.length > 28 ? currentAddress.substring(0, 28) + '...' : currentAddress}
            </Text>
            <Text style={{ color: '#FCD34D', fontSize: 16, marginLeft: 6, fontWeight: '900' }}>›</Text>
          </Pressable>
        </View>
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

        {/* Promotional Banner Carousel */}
        <PromotionalBannerCarousel />

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
              {detectedZone?.zoneName && detectedZone.serviceable
                ? `Serving all restaurants in ${detectedZone.zoneName}`
                : 'Chef-crafted meals curated for you'}
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
                  {option === 'topPosition' ? '👑 Top Restaurants' : option === 'createdAt' ? '🆕 New Arrivals' : option === 'avgRating' ? '★ Top Rated' : '📍 Nearby'}
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
              ) : detectedZone && !detectedZone.serviceable ? (
                <View style={{
                  backgroundColor: '#FFFBEB',
                  borderColor: '#F59E0B',
                  borderWidth: 1.5,
                  borderRadius: 16,
                  padding: 24,
                  marginHorizontal: tokens.spacing.md,
                  alignItems: 'center',
                  marginTop: 16,
                  shadowColor: '#B45309',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📍</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#92400E', textAlign: 'center', marginBottom: 6 }}>
                    No Restaurants Available In Your Area
                  </Text>
                  <Text style={{ fontSize: 14, color: '#B45309', textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
                    {detectedZone.message || 'We currently only deliver within admin-created operating zones.'}
                  </Text>
                  {detectedZone.availableZones && detectedZone.availableZones.length > 0 && (
                    <View style={{ width: '100%', marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#78350F', marginBottom: 8, textAlign: 'center', letterSpacing: 0.5 }}>
                        ACTIVE ADMIN OPERATING ZONES
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                        {detectedZone.availableZones.map((z) => (
                          <View key={z} style={{ backgroundColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#78350F' }}>✓ {z}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  <Pressable
                    onPress={() => navigation.navigate('Addresses', { selectMode: true })}
                    style={({ pressed }) => ({
                      backgroundColor: '#14532D',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 24,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                      Change Delivery Address 📍
                    </Text>
                  </Pressable>
                </View>
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
          <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {/* Header Bar */}
            <View style={{
              backgroundColor: '#14532D',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: insets.top + 8,
              paddingBottom: 14,
              paddingHorizontal: 16,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
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

                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#166534',
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  borderWidth: 1.5,
                  borderColor: '#FCD34D',
                }}>
                  <Text style={{ fontSize: 20 }}>🎧</Text>
                </View>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>Foodie Support Desk</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' }} />
                    <Text style={{ color: '#A7F3D0', fontSize: 12, fontWeight: '600' }}>
                      {isAgentConnected ? 'Live Admin Agent Active' : 'Online • 2-Way Desk'}
                    </Text>
                  </View>
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
              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                style={{ flex: 1 }}
              >
                {/* Quick Help Card at the top */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 }}>Hi! Welcome to Foodie Support 👋</Text>
                  <Text style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
                    Recent Order: {activeOrderId ? <><Text style={{ color: '#16A34A', fontWeight: '800' }}>#{activeOrderId}</Text> • Preparing for Delivery 🚴</> : <Text style={{ color: '#64748B' }}>No active orders</Text>}
                  </Text>

                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155', letterSpacing: 0.5, marginBottom: 12 }}>QUICK HELP OPTIONS</Text>

                  {[
                    { icon: '📍', text: 'Where is my order?' },
                    { icon: '💳', text: 'Payment or refund issue' },
                    { icon: '❌', text: 'I want to cancel my order' },
                    { icon: '🏷️', text: 'Offers & Promo Codes' }
                  ].map((opt, i) => (
                    <Pressable key={i} onPress={() => void handleUserSubmitMessage(opt.text)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 })}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{opt.text}</Text>
                      </View>
                      <Text style={{ color: '#047857', fontSize: 16, fontWeight: '900' }}>›</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Chat Messages */}
                {chatHistory.map((msg) => {
                  if (!msg.text || !msg.text.trim()) return null;
                  const isAdminOrBot = msg.from === 'admin' || msg.from === 'bot';
                  const isHumanAdmin = msg.from === 'admin';
                  const isAutoBot = msg.from === 'bot';

                  return (
                    <View key={msg.id} style={{
                      alignSelf: isAdminOrBot ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      marginBottom: 14,
                    }}>
                      {/* Sender Badge */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, alignSelf: isAdminOrBot ? 'flex-start' : 'flex-end', gap: 6 }}>
                        {isHumanAdmin ? (
                          <View style={{ backgroundColor: '#14532D', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#FCD34D', fontSize: 10, fontWeight: '800' }}>🎧 Live Admin Agent</Text>
                          </View>
                        ) : isAutoBot ? (
                          <View style={{ backgroundColor: '#0284C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>🤖 Foodie Assistant</Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700' }}>You</Text>
                        )}
                        <Text style={{ color: '#94A3B8', fontSize: 10 }}>{msg.time}</Text>
                        {!isAdminOrBot && (
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>✓✓</Text>
                        )}
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

                      {/* Dynamic 2-4 Contextual Action Buttons */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <View style={{ flexDirection: 'column', gap: 8, marginTop: 8, alignSelf: 'flex-start' }}>
                          {msg.buttons.map((btn, bIdx) => (
                            <Pressable
                              key={bIdx}
                              onPress={() => void handleUserSubmitMessage(btn.actionText)}
                              style={({ pressed }) => ({
                                backgroundColor: pressed ? '#DCFCE7' : '#FFFFFF',
                                borderColor: '#14532D',
                                borderWidth: 1.5,
                                borderRadius: 20,
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                alignSelf: 'flex-start',
                                shadowColor: '#14532D',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 1,
                              })}
                            >
                              <Text style={{ color: '#14532D', fontSize: 13, fontWeight: '800' }}>
                                {btn.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Conditional Agent Escalation Banner if AI recommended agent */}
              {(showAgentOption && !isAgentConnected) && (
                <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => void handleUserSubmitMessage('I want to connect to a live support agent.')}
                    style={{
                      backgroundColor: '#14532D',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#FCD34D',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ color: '#FCD34D', fontSize: 14, fontWeight: '800' }}>
                      🎧 Connect to Live Support Agent
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Chat Input Bar */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                padding: 12,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 24,
                  minHeight: 46,
                  maxHeight: 120,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}>
                  <RNTextInput
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Type your query..."
                    multiline
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 10, maxHeight: 100 }}
                  />
                </View>
                <Pressable
                  onPress={() => void handleUserSubmitMessage(chatMessage)}
                  style={{
                    backgroundColor: chatMessage.trim() ? '#14532D' : '#94A3B8',
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}>Send</Text>
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
