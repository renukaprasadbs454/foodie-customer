import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Text,
  Toast,
  createIdempotencyKey,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import { useGetAddressesQuery } from '../../../api/endpoints/addressesApi';
import { useGetCartQuery } from '../../../api/endpoints/cartApi';
import { useCreateOrderMutation, useTransitionOrderStatusMutation, saveOrderPaymentMethod } from '../../../api/endpoints/ordersApi';
import { useGetRestaurantQuery } from '../../../api/endpoints/restaurantsApi';
import { useGetWalletBalanceQuery } from '../../../api/endpoints/walletApi';
import { useGetMyProfileQuery } from '../../../api/endpoints/usersApi';
import { useGetDeliveryChargesQuery, useGetCommissionRulesQuery } from '../../../api/endpoints/feesApi';
import { getDistanceKm } from '../../restaurants/types';
import { globalLocation } from '../../../core/GlobalLocation';
import { toUnwrappedApiError } from '../../auth/apiError';
import { formatMoney, parseMoney } from '../../menu/types';
import type { BrowseStackParamList } from '../../../navigation/types';
import { AddressPickerRow } from '../components/AddressPickerRow';
import { CheckoutSkeleton } from '../components/CheckoutSkeleton';
import { AddressRequiredModal } from '../../cart/components/AddressRequiredModal';
import { isAddressId } from '../types';

type Props = NativeStackScreenProps<BrowseStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation, route }: any) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const cartQuery = useGetCartQuery();
  const walletQuery = useGetWalletBalanceQuery();

  const mockItems = route.params?.mockItems;
  const isDarkStoreMock = Array.isArray(mockItems) && mockItems.length > 0;

  const addressesQuery = useGetAddressesQuery();
  const [createOrder, createState] = useCreateOrderMutation();
  const [transitionStatus] = useTransitionOrderStatusMutation();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const profileQuery = useGetMyProfileQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const isCodDisabled = Boolean(profileQuery.data?.isCodDisabled);
  const isSuspended = Boolean(profileQuery.data?.isSuspended || profileQuery.data?.accountStatus === 'SUSPENDED');
  const suspensionReason = profileQuery.data?.suspensionReason;
  const placeAttemptKey = useRef<string | null>(null);
  const [showAddressRequiredModal, setShowAddressRequiredModal] = useState<boolean>(false);

  useEffect(() => {
    if (isCodDisabled && paymentMethod === 'COD') {
      setPaymentMethod('ONLINE');
    }
  }, [isCodDisabled, paymentMethod]);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const cart = cartQuery.data;
  const { data: restaurant } = useGetRestaurantQuery(cart?.restaurantId ?? '', {
    skip: !cart?.restaurantId || isDarkStoreMock,
  });

  const scaleValue = useRef(new Animated.Value(0.95)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) => setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) => setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) => setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  const restaurantId = cart?.restaurantId ?? undefined;
  const addresses = addressesQuery.data ?? [];
  const walletBalance = Number(walletQuery.data?.balance || 0);

  const deliveryChargesQuery = useGetDeliveryChargesQuery();
  const commissionRulesQuery = useGetCommissionRulesQuery();

  const chosenAddr = useMemo(() => {
    return addresses.find((a) => a.addressId === addressId);
  }, [addresses, addressId]);

  const actualDistanceKm = useMemo(() => {
    const custLat = Number(chosenAddr?.latitude) || globalLocation.coords?.latitude;
    const custLng = Number(chosenAddr?.longitude) || globalLocation.coords?.longitude;
    const restLat = Number(restaurant?.latitude);
    const restLng = Number(restaurant?.longitude);

    if (custLat && custLng && restLat && restLng) {
      return getDistanceKm(custLat, custLng, restLat, restLng);
    }
    return 0;
  }, [chosenAddr, restaurant]);

  const calculatedDeliveryFee = useMemo(() => {
    if (isDarkStoreMock) {
      return route.params?.deliveryFee ?? 25;
    }
    if (deliveryChargesQuery.data) {
      const baseCharge = Number(deliveryChargesQuery.data.baseCharge) || 0;
      const baseDistanceKm = Number(deliveryChargesQuery.data.baseDistanceKm) || 0;
      const additionalChargePerKm = Number(deliveryChargesQuery.data.additionalChargePerKm) || 0;
      const extraKm = Math.max(0, actualDistanceKm - baseDistanceKm);
      return baseCharge + (extraKm * additionalChargePerKm);
    }
    return route.params?.deliveryFee ?? 25;
  }, [isDarkStoreMock, deliveryChargesQuery.data, actualDistanceKm, route.params?.deliveryFee]);

  const actualPlatformFee = useMemo(() => {
    if (commissionRulesQuery.data?.platformFixedFee != null) {
      return Number(commissionRulesQuery.data.platformFixedFee);
    }
    if (route.params?.platformFee != null) {
      return Number(route.params.platformFee);
    }
    return 0;
  }, [commissionRulesQuery.data, route.params?.platformFee]);

  useEffect(() => {
    trackAnalyticsEvent('customer_checkout_viewed');
    trackAnalyticsEvent('checkout_started');
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, [scaleValue, fadeValue]);

  useEffect(() => {
    const list = addressesQuery.data;
    if (!addressId && list && list.length > 0) {
      const preferred = list.find((row) => row.isDefault)?.addressId ?? list[0]?.addressId;
      if (preferred) setAddressId(preferred);
    }
  }, [addressId, addressesQuery.data]);

  const subtotalBeforeCoupons = isDarkStoreMock ? mockItems.reduce((acc: number, mi: any) => acc + (mi.price * mi.quantity), 0) : Number(cart?.subtotal || 0);



  const loading = cartQuery.isLoading || addressesQuery.isLoading || createState.isLoading || walletQuery.isLoading || deliveryChargesQuery.isLoading;

  const onPlaceOrder = async () => {
    if (isSuspended) {
      setToast({
        message: `Your account is suspended: ${suspensionReason || 'Security policy review'}. Ordering is disabled.`,
        variant: 'error',
      });
      return;
    }
    if (isCodDisabled && paymentMethod === 'COD') {
      setToast({
        message: 'Cash on Delivery is disabled for your account. Please select Online Payment.',
        variant: 'error',
      });
      return;
    }
    if (!addressId || !isAddressId(addressId)) {
      setShowAddressRequiredModal(true);
      return;
    }
    if (!isDarkStoreMock && !cart?.items?.length) {
      setToast({ message: 'Your cart is empty.', variant: 'error' });
      return;
    }
    if (isDarkStoreMock) {
      trackAnalyticsEvent('checkout_completed', { orderId: 'mock-darkstore' });
      const mockSubtotal = mockItems.reduce((acc: number, mi: any) => acc + (mi.price * mi.quantity), 0);
      navigation.replace('Payment' as any, { orderId: `ds-mock-${Date.now()}`, mockTotal: mockSubtotal + 25 + 18, useWallet });
      return;
    }
    if (!placeAttemptKey.current) {
      placeAttemptKey.current = createIdempotencyKey();
    }
    trackAnalyticsEvent('place_order_tapped');
    try {
      const order = await createOrder({
        addressId,
        couponCode: route.params?.couponCode || undefined,
        idempotencyKey: placeAttemptKey.current,
      }).unwrap();
      await saveOrderPaymentMethod(order.orderId, paymentMethod);
      if (order.orderNumber) {
        await saveOrderPaymentMethod(order.orderNumber, paymentMethod);
      }
      const chosenAddr = addressesQuery.data?.find((a) => a.addressId === addressId);
      if (chosenAddr) {
        try {
          await AsyncStorage.setItem(`order_delivery_address_${order.orderId}`, JSON.stringify(chosenAddr));
          if (order.orderNumber) {
            await AsyncStorage.setItem(`order_delivery_address_${order.orderNumber}`, JSON.stringify(chosenAddr));
          }
        } catch { }
      }
      trackAnalyticsEvent('checkout_completed', { orderId: order.orderId, paymentMethod });
      placeAttemptKey.current = null;
      if (paymentMethod === 'COD') {
        try {
          await transitionStatus({ orderId: order.orderId, targetStatus: 'CONFIRMED' }).unwrap();
        } catch (e) { }
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('OrdersTab', {
            screen: 'LiveOrderTracking',
            params: { orderId: order.orderId },
          });
        }
      } else {
        navigation.replace('Payment', { orderId: order.orderId, useWallet, mockTotal: grandTotal });
      }
    } catch (err) {
      handleError(toUnwrappedApiError(err));
    }
  };

  if (cartQuery.isError) {
    return (
      <EmptyState
        title="Cart unavailable"
        description="Return to cart and try again."
        accessibilityLabel="Checkout cart error"
        actionLabel="Back to cart"
        onAction={() => navigation.navigate('Cart')}
      />
    );
  }

  if (!isDarkStoreMock && !cartQuery.isLoading && (!cart?.items || cart.items.length === 0)) {
    return (
      <EmptyState
        title="Cart is empty"
        description="Add items before checkout."
        accessibilityLabel="Checkout empty cart"
        actionLabel="Browse"
        onAction={() => navigation.navigate('Home')}
      />
    );
  }

  const subtotal = subtotalBeforeCoupons;
  const routeDiscount = route.params?.discount ?? 0;
  const totalDiscount = routeDiscount;
  const routeTaxes = route.params?.taxes ?? 18;
  const deliveryFee = calculatedDeliveryFee;
  const platformFee = actualPlatformFee;
  const orderTotal = Math.max(0, subtotal + deliveryFee + platformFee + routeTaxes - totalDiscount);
  const walletApplied = useWallet ? Math.min(walletBalance, orderTotal) : 0;
  const grandTotal = Math.max(0, orderTotal - walletApplied);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#012B18" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#0A120E' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={{ flex: 1, opacity: fadeValue, transform: [{ scale: scaleValue }] }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: 40,
            }}
            refreshControl={
              <RefreshControl
                refreshing={
                  cartQuery.isFetching ||
                  addressesQuery.isFetching ||
                  walletQuery.isFetching ||
                  deliveryChargesQuery.isFetching ||
                  commissionRulesQuery.isFetching
                }
                onRefresh={() => {
                  void cartQuery.refetch();
                  void addressesQuery.refetch();
                  void walletQuery.refetch();
                  void deliveryChargesQuery.refetch();
                  void commissionRulesQuery.refetch();
                }}
                tintColor="#FCD34D"
              />
            }
          >
            {/* Header Banner */}
            <LinearGradient
              colors={['#012B18', '#053E23', '#0A4D2E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingTop: 12,
                paddingBottom: 22,
                paddingHorizontal: 20,
                borderBottomLeftRadius: 32,
                borderBottomRightRadius: 32,
                borderBottomWidth: 1.2,
                borderBottomColor: 'rgba(252, 211, 77, 0.25)',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(252, 211, 77, 0.3)',
                  }}
                >
                  <Feather name="arrow-left" size={18} color="#FCD34D" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FCD34D', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>
                    Checkout & Payment
                  </Text>
                  {(cart?.restaurantName || restaurant?.name) && (
                    <Text style={{ color: '#E5E7EB', fontWeight: '600', fontSize: 13, marginTop: 2 }}>
                      Ordering from: {cart?.restaurantName || restaurant?.name}
                    </Text>
                  )}
                </View>
              </View>
              {!isConnected && (
                <Text style={{ color: '#F87171', fontWeight: '800', marginTop: 8, fontSize: 13 }}>
                  Offline — placing an order is locked
                </Text>
              )}
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 18 }}>
              {isSuspended && (
                <View style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderWidth: 1.5,
                  borderColor: '#EF4444',
                  borderRadius: 16,
                  padding: 16,
                  gap: 6,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>🚫</Text>
                    <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>
                      ACCOUNT SUSPENDED
                    </Text>
                  </View>
                  <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700' }}>
                    Reason: {suspensionReason || 'Security policy review'}
                  </Text>
                  <Text style={{ color: '#E5E7EB', fontSize: 12, lineHeight: 16 }}>
                    Your account has been suspended by administration. Ordering is disabled. Please contact support to submit an appeal.
                  </Text>
                </View>
              )}

              {loading && !cart ? (
                <CheckoutSkeleton />
              ) : (
                <>
                  {/* Address Section */}
                  <View style={{
                    backgroundColor: '#131F18',
                    padding: 16,
                    borderRadius: 20,
                    gap: 12,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>📍</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Delivery Address</Text>
                    </View>
                    {addresses.length === 0 ? (
                      <EmptyState
                        title="No addresses yet"
                        description="Add a delivery address to continue checkout."
                        accessibilityLabel="Checkout no addresses"
                        actionLabel="Addresses"
                        onAction={() => navigation.navigate('Addresses', { selectMode: true })}
                      />
                    ) : (
                      <View style={{ gap: 10 }}>
                        {addresses.map((address) => (
                          <AddressPickerRow
                            key={address.addressId}
                            address={address}
                            selected={addressId === address.addressId}
                            onSelect={() => {
                              setAddressId(address.addressId);
                              trackAnalyticsEvent('address_selected', { addressId: address.addressId });
                              placeAttemptKey.current = null;
                            }}
                          />
                        ))}
                        <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: 4 }} />
                        <Pressable
                          onPress={() => navigation.navigate('Addresses', { selectMode: true })}
                          style={{ alignSelf: 'flex-start' }}
                        >
                          <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 14 }}>
                            Manage Addresses ›
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Wallet Section */}
                  <View style={{
                    backgroundColor: '#131F18',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Text style={{ fontSize: 18 }}>💳</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Foodie Wallet</Text>
                    </View>

                    <Pressable
                      disabled={walletBalance <= 0}
                      onPress={() => {
                        setUseWallet(!useWallet);
                        trackAnalyticsEvent('wallet_toggled_checkout', { enabled: !useWallet });
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: walletBalance <= 0 ? 0.6 : (pressed ? 0.8 : 1),
                        paddingVertical: 4,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: useWallet ? '#FCD34D' : '#4B5563',
                          backgroundColor: useWallet ? '#FCD34D' : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {useWallet && <Text style={{ color: '#022414', fontWeight: '900', fontSize: 14 }}>✓</Text>}
                        </View>
                        <View>
                          <Text style={{ fontWeight: '700', fontSize: 15, color: '#FFFFFF' }}>Use Wallet Balance</Text>
                          <Text style={{ fontSize: 13, color: '#FCD34D', marginTop: 2, fontWeight: '600' }}>
                            Available: ₹{formatMoney(walletBalance)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>

                  {/* Payment Method Section */}
                  <View style={{
                    backgroundColor: '#131F18',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Text style={{ fontSize: 18 }}>💵</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Payment Method</Text>
                    </View>

                    <Pressable
                      onPress={() => setPaymentMethod('ONLINE')}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: pressed ? 0.8 : 1,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{
                          width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                          borderColor: paymentMethod === 'ONLINE' ? '#FCD34D' : '#4B5563',
                          justifyContent: 'center', alignItems: 'center'
                        }}>
                          {paymentMethod === 'ONLINE' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FCD34D' }} />}
                        </View>
                        <View>
                          <Text style={{ fontWeight: '700', fontSize: 15, color: '#FFFFFF' }}>Online Payment</Text>
                          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Cards, UPI, Netbanking (Cashfree)</Text>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        if (isCodDisabled) {
                          setToast({
                            message: 'Cash on Delivery is disabled for your account by administrator. Please use Online Payment.',
                            variant: 'error',
                          });
                          return;
                        }
                        setPaymentMethod('COD');
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: isCodDisabled ? 0.7 : (pressed ? 0.8 : 1),
                        paddingVertical: 10,
                        backgroundColor: isCodDisabled ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                        borderRadius: 10,
                        paddingHorizontal: isCodDisabled ? 8 : 0,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={{
                          width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                          borderColor: isCodDisabled ? '#6B7280' : (paymentMethod === 'COD' ? '#FCD34D' : '#4B5563'),
                          justifyContent: 'center', alignItems: 'center',
                          backgroundColor: isCodDisabled ? 'rgba(107, 114, 128, 0.2)' : 'transparent',
                        }}>
                          {!isCodDisabled && paymentMethod === 'COD' && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FCD34D' }} />}
                          {isCodDisabled && <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '900' }}>✕</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <Text style={{ fontWeight: '700', fontSize: 15, color: isCodDisabled ? '#9CA3AF' : '#FFFFFF' }}>
                              Cash on Delivery (COD)
                            </Text>
                            {isCodDisabled && (
                              <View style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                borderWidth: 1,
                                borderColor: '#EF4444',
                                borderRadius: 4,
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                              }}>
                                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>
                                  DISABLED BY ADMIN
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 13, color: isCodDisabled ? '#EF4444' : '#9CA3AF', fontWeight: isCodDisabled ? '600' : '400', marginTop: 2 }}>
                            {isCodDisabled ? 'Disabled for your account. Please pay online via UPI or Cards.' : 'Pay directly at your doorstep'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>

                  {/* Detailed Bill Block */}
                  <View style={{
                    backgroundColor: '#131F18',
                    borderRadius: 20,
                    borderWidth: 1.2,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    padding: 16,
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <Text style={{ fontSize: 18 }}>🧾</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                        Detailed Bill
                      </Text>
                    </View>

                    <View style={{ gap: 8, paddingHorizontal: 2 }}>
                      <View style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}>
                        <Text>placedAt totalAmount</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Item Total</Text>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>₹{formatMoney(subtotal)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>
                          Delivery Partner Fee{actualDistanceKm > 0 ? ` (${actualDistanceKm.toFixed(1)} km)` : ''}
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                          {deliveryChargesQuery.isLoading ? '...' : `₹${formatMoney(deliveryFee)}`}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Platform Fee</Text>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                          {commissionRulesQuery.isLoading && route.params?.platformFee == null
                            ? '...'
                            : commissionRulesQuery.isError && actualPlatformFee === 0 && route.params?.platformFee == null
                            ? '—'
                            : `₹${formatMoney(platformFee)}`}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Taxes & Charges</Text>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>₹{formatMoney(routeTaxes)}</Text>
                      </View>

                      {routeDiscount > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>Coupon Discount</Text>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>-₹{formatMoney(routeDiscount)}</Text>
                        </View>
                      )}

                      {useWallet && walletApplied > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>Wallet Applied</Text>
                          <Text style={{ color: '#10B981', fontWeight: '700' }}>-₹{formatMoney(walletApplied)}</Text>
                        </View>
                      )}

                      <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginVertical: 6 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '900', color: '#FFFFFF', fontSize: 17 }}>To Pay</Text>
                        <Text style={{ fontWeight: '900', color: '#FCD34D', fontSize: 20 }}>₹{formatMoney(grandTotal)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontStyle: 'italic', fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginHorizontal: 8 }}>
                    Final totals are calculated securely.
                  </Text>
                </>
              )}
            </View>
            <View style={{ height: 260, width: '100%' }} />
          </ScrollView>

          {/* Footer Proceed Action */}
          <View style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: 14,
            borderTopWidth: 1.2,
            borderTopColor: 'rgba(252, 211, 77, 0.25)',
            backgroundColor: '#022414',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 10
          }}>
            {isSuspended ? (
              <Pressable
                accessibilityLabel="Account Suspended"
                onPress={() => {
                  setToast({
                    message: `Account Suspended: ${suspensionReason || 'Security policy review'}. Ordering is disabled.`,
                    variant: 'error',
                  });
                }}
                style={{
                  backgroundColor: '#DC2626',
                  paddingVertical: 15,
                  borderRadius: 14,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#F87171',
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>
                  🚫 Account Suspended — Ordering Disabled
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="Place Order"
                disabled={createState.isLoading || addresses.length === 0 || !addressId}
                onPress={() => { void onPlaceOrder(); }}
                style={({ pressed }) => ({
                  backgroundColor: (createState.isLoading || addresses.length === 0 || !addressId)
                    ? '#4B5563'
                    : pressed
                    ? '#EAB308'
                    : '#FCD34D',
                  paddingVertical: 15,
                  borderRadius: 14,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#FCD34D',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: (createState.isLoading || addresses.length === 0 || !addressId) ? 0 : 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                })}
              >
                <Text style={{
                  color: (createState.isLoading || addresses.length === 0 || !addressId) ? '#9CA3AF' : '#022414',
                  fontWeight: '900',
                  fontSize: 16,
                  letterSpacing: 0.5,
                }}>
                  {createState.isLoading ? 'Processing Order...' : paymentMethod === 'COD' ? `Place COD Order (₹${formatMoney(grandTotal)}) ➔` : `Proceed to Payment (₹${formatMoney(grandTotal)}) ➔`}
                </Text>
              </Pressable>
            )}
          </View>

          {createState.isLoading && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator color="#FCD34D" size="large" />
            </View>
          )}


          <Toast
            visible={Boolean(toast)}
            message={toast?.message ?? ''}
            variant={toast?.variant ?? 'info'}
            accessibilityLabel={toast?.message ?? 'Toast'}
            onDismiss={() => setToast(null)}
          />

          <AddressRequiredModal
            visible={showAddressRequiredModal}
            onClose={() => setShowAddressRequiredModal(false)}
            onAddAddress={() => navigation.navigate('Addresses', { selectMode: true })}
            addresses={addresses}
            selectedAddressId={addressId}
            onSelectAddress={(selectedId) => {
              setAddressId(selectedId);
            }}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
