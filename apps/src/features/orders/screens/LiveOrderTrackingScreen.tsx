import React, { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Modal,
  Text,
  TextInput,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import {
  useGetOrderQuery,
  useTransitionOrderStatusMutation,
  useGetDeliveryPartnerQuery,
} from '../../../api/endpoints/ordersApi';
import { useGetRestaurantQuery } from '../../../api/endpoints/restaurantsApi';
import { useGetAddressesQuery } from '../../../api/endpoints/addressesApi';
import { toUnwrappedApiError } from '../../auth/apiError';
import type { OrdersStackParamList } from '../../../navigation/types';
import { OrderStatusStepper } from '../components/OrderStatusStepper';
import { TrackingMap } from '../components/TrackingMap';
import { TrackingSkeleton } from '../components/TrackingSkeleton';
import { useOrderTrackingSubscription } from '../hooks/useOrderTrackingSubscription';
import {
  canCustomerCancelOrder,
  isOrderId,
  isTerminalOrderStatus,
  validateCancelReason,
} from '../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'LiveOrderTracking'>;

/**
 * P2-CUS-06 Live Order Tracking — status stepper + map shell + cancel pre-PREPARING.
 * WS `/topic/order/{orderId}` while focused & non-terminal; polling fallback.
 */
export function LiveOrderTrackingScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const validId = isOrderId(orderId);

  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const [transitionStatus, transitionState] = useTransitionOrderStatusMutation();

  const partnerQuery = useGetDeliveryPartnerQuery(validId ? orderId : '', {
    skip: !validId, // We could refine skip based on order status, but validId is fine
    pollingInterval: 10000,
  });
  const deliveryPartner = partnerQuery.data;

  const orderQuery = useGetOrderQuery(orderId, {
    skip: !validId,
    pollingInterval: 3000,
    refetchOnFocus: true,
  });

  const status = orderQuery.data?.status;
  const terminal = isTerminalOrderStatus(status);
  const { location, wsActive } = useOrderTrackingSubscription(
    validId ? orderId : '',
    status,
  );

  const [eta, setEta] = useState<number | null>(null);

  const { data: restaurant } = useGetRestaurantQuery(orderQuery.data?.restaurantId ?? '', { skip: !orderQuery.data?.restaurantId });
  const { data: addresses } = useGetAddressesQuery(undefined);
  const address = addresses?.find(a => a.addressId === orderQuery.data?.addressId) || addresses?.[0];

  const restaurantLocation = {
    latitude: restaurant?.latitude ? Number(restaurant.latitude) : 12.9352,
    longitude: restaurant?.longitude ? Number(restaurant.longitude) : 77.6245,
  };

  const customerLocation = {
    latitude: address?.latitude ? Number(address.latitude) : 12.9716,
    longitude: address?.longitude ? Number(address.longitude) : 77.5946,
  };

  // Separate subscription drives fallback polling (shared cache).
  const pollSubscription = useGetOrderQuery(orderId, {
    skip: !validId || terminal,
    pollingInterval: wsActive ? 8000 : 2500,
  });
  void pollSubscription;

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('customer_order_tracking_viewed', { orderId });
    trackAnalyticsEvent('order_status_viewed', { orderId, status });
  }, [orderId, status]);

  const onCancel = async () => {
    const validated = validateCancelReason(cancelReason);
    if (!validated.ok) {
      setToast({ message: validated.message, variant: 'error' });
      return;
    }
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to cancel this order.',
        variant: 'warning',
      });
      return;
    }
    try {
      await transitionStatus({
        orderId,
        targetStatus: 'CANCELLED',
        reason: validated.reason,
      }).unwrap();
      trackAnalyticsEvent('cancel_tapped', { orderId });
      setCancelVisible(false);
      setCancelReason('');
      setToast({ message: 'Order cancelled.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  if (!validId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.color.background,
          padding: tokens.spacing.xl,
          justifyContent: 'center',
        }}
      >
        <EmptyState
          title="Invalid order"
          description="This tracking link is not valid."
          accessibilityLabel="Invalid tracking order id"
          actionLabel="My orders"
          onAction={() => navigation.navigate('MyOrders')}
        />
      </View>
    );
  }

  const order = orderQuery.data;
  const loading = orderQuery.isLoading && !order;

  const renderHeaderUi = (currentStatus: string) => {
    let title = 'Order Placed';
    let subtitle = 'Your order has been received! Waiting for restaurant approval.';
    let icon = '📝';

    switch (currentStatus) {
      case 'PLACED':
      case 'CONFIRMED':
        title = 'Order Placed';
        subtitle = 'Your order has been placed successfully! Waiting for restaurant approval.';
        icon = '📝';
        break;
      case 'ACCEPTED':
        title = 'Restaurant Accepted Your Order';
        subtitle = 'The restaurant accepted your order & is starting preparation!';
        icon = '🧑‍🍳';
        break;
      case 'PREPARING':
        title = 'Food is Preparing';
        subtitle = 'Chef is crafting your delicious meal in the kitchen.';
        icon = '🍳';
        break;
      case 'READY_FOR_PICKUP':
        title = 'Ready for Pickup';
        subtitle = 'Freshly packed food is waiting for the delivery rider.';
        icon = '🛍️';
        break;
      case 'ASSIGNED':
        title = 'Delivery Partner Assigned';
        subtitle = 'Rider assigned & heading to restaurant.';
        icon = '🛵';
        break;
      case 'REACHED_RESTAURANT':
        title = 'Rider at Restaurant';
        subtitle = 'Delivery partner arrived at the restaurant.';
        icon = '🏬';
        break;
      case 'PICKED_UP':
        title = 'Order Picked Up';
        subtitle = 'Rider collected your food and is on the way!';
        icon = '🎒';
        break;
      case 'OUT_FOR_DELIVERY':
        title = 'Out for Delivery';
        subtitle = 'Rider is on the way to your delivery address!';
        icon = '🛵';
        break;
      case 'DELIVERED':
        title = 'Order Delivered';
        subtitle = 'Meal delivered successfully! Bon appétit!';
        icon = '🎉';
        break;
      case 'CANCELLED':
        title = 'Order Cancelled';
        subtitle = 'This order was cancelled.';
        icon = '❌';
        break;
    }

    return (
      <LinearGradient
        colors={['#0F3E22', '#14532D', '#1B6A3A']}
        style={{ padding: 24, paddingTop: 44, paddingBottom: 50, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
      >
        <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}>
          <Text style={{ color: '#FCD34D', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>ORDER STATUS UPDATE</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>{icon} {title}</Text>
        <Text style={{ color: '#D1FAE5', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 6, paddingHorizontal: 16 }}>{subtitle}</Text>

        {restaurant?.name && (
          <Text style={{ color: '#FCD34D', fontSize: 15, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 }}>
            From: {restaurant.name}
          </Text>
        )}

        {eta !== null && (
          <View style={{ backgroundColor: 'rgba(252, 211, 77, 0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 25, marginTop: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.3)' }}>
            <Text style={{ color: '#FEF3C7', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>Estimated Delivery ETA: {eta} mins</Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
        }}
        bounces={false}
      >
        {loading ? (
          <TrackingSkeleton />
        ) : orderQuery.isError && !order ? (
          <EmptyState
            title="Order not found"
            description="We could not load this order."
            accessibilityLabel="Tracking order not found"
            actionLabel="Retry"
            onAction={() => void orderQuery.refetch()}
          />
        ) : order ? (
          <>
            {renderHeaderUi(order.status)}
            <View style={{ paddingHorizontal: tokens.spacing.md, marginTop: tokens.spacing.md }}>
              <OrderStatusStepper status={order.status} />
            </View>

            {order.status === 'DELIVERED' ? (
              <View style={{ paddingHorizontal: tokens.spacing.md, marginTop: tokens.spacing.md }}>
                <View style={{
                  padding: 32,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 24,
                  alignItems: 'center',
                  elevation: 5,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
                  borderColor: '#FCD34D',
                  borderWidth: 2
                }}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>🌟</Text>
                  <Text style={{ fontSize: 20, color: '#14532D', fontWeight: '900', textAlign: 'center' }}>Enjoyed your meal?</Text>
                  <Text style={{ fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center', marginBottom: 20 }}>Rate the restaurant and your delivery partner to help us improve!</Text>

                  <Pressable
                    onPress={() => {
                      navigation.navigate('Reviews', {
                        mode: 'submit',
                        orderId: order.orderId,
                        restaurantId: order.restaurantId
                      } as never);
                    }}
                    style={{
                      backgroundColor: '#14532D',
                      paddingHorizontal: 24,
                      paddingVertical: 14,
                      borderRadius: 24,
                      width: '100%',
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: '#FCD34D', fontWeight: 'bold', fontSize: 16 }}>Rate This Order</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: tokens.spacing.md, marginTop: tokens.spacing.md }}>
                {(order.status === 'PREPARING' || order.status === 'PLACED' || order.status === 'ACCEPTED') && (
                  <View style={{
                    padding: 16,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                    elevation: 3,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
                  }}>
                    <ActivityIndicator size="small" color="#14532D" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#14532D', fontWeight: '800' }}>Preparing your order...</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Assigning the best rider nearby.</Text>
                    </View>
                  </View>
                )}

                <TrackingMap
                  location={location}
                  orderStatus={order.status}
                  restaurantLocation={restaurantLocation}
                  customerLocation={customerLocation}
                  onEtaUpdate={setEta}
                />
              </View>
            )}

            {/* Restaurant Call Block */}
            {['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.status) && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.lg,
                marginTop: tokens.spacing.md,
                marginHorizontal: tokens.spacing.md,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  <Text style={{ fontSize: 24 }}>🏬</Text>
                </View>
                <View style={{ flex: 1, marginLeft: tokens.spacing.md }}>
                  <Text variant="heading3" style={{ fontWeight: '800', color: '#14532D' }}>{restaurant?.name || 'Restaurant'}</Text>
                  <Text variant="caption" style={{ color: tokens.color.textSecondary, fontWeight: '600' }}>
                    Preparing your food
                  </Text>
                </View>
                <Button
                  label="Call"
                  accessibilityLabel="Call Restaurant"
                  variant="primary"
                  onPress={() => setToast({ message: `Calling ${restaurant?.name || 'Restaurant'}...`, variant: 'info' })}
                  style={{ borderRadius: tokens.radius.full, paddingHorizontal: 20, backgroundColor: '#14532D' }}
                />
              </View>
            )}

            {/* Live Delivery Partner Block */}
            {['ASSIGNED', 'REACHED_RESTAURANT', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && deliveryPartner && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.lg,
                marginTop: tokens.spacing.md,
                marginHorizontal: tokens.spacing.md,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  <Text style={{ fontSize: 28 }}>👨🏽‍✈️</Text>
                </View>
                <View style={{ flex: 1, marginLeft: tokens.spacing.md }}>
                  <Text variant="heading3" style={{ fontWeight: '800', color: '#14532D' }}>{deliveryPartner.fullName}</Text>
                  <Text variant="caption" style={{ color: tokens.color.textSecondary, fontWeight: '600' }}>
                    ★ {deliveryPartner.signatureRating || '4.9'} • {deliveryPartner.vehicleNumber || 'Bike'} • {deliveryPartner.completedOrders || 0} deliveries
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="Chat"
                    accessibilityLabel="Chat Delivery Partner"
                    variant="secondary"
                    onPress={() => setToast({ message: 'Opening chat...', variant: 'info' })}
                    style={{ borderRadius: tokens.radius.full, paddingHorizontal: 16 }}
                  />
                  <Button
                    label="Call"
                    accessibilityLabel="Call Delivery Partner"
                    variant="primary"
                    onPress={() => setToast({ message: `Calling ${deliveryPartner.fullName}...`, variant: 'info' })}
                    style={{ borderRadius: tokens.radius.full, paddingHorizontal: 16, backgroundColor: '#14532D' }}
                  />
                </View>
              </View>
            )}

            <View style={{ paddingHorizontal: tokens.spacing.md }}>
              {canCustomerCancelOrder(order.status) ? (
                <Button
                  label="Cancel order"
                  accessibilityLabel="Cancel order"
                  variant="secondary"
                  disabled={!isConnected || transitionState.isLoading}
                  onPress={() => {
                    trackAnalyticsEvent('cancel_tapped', {
                      orderId,
                      phase: 'open',
                    });
                    setCancelVisible(true);
                  }}
                  style={{ marginTop: tokens.spacing.md }}
                />
              ) : null}

              {order.status === 'DELIVERED' ? (
                <Button
                  label="Leave a review"
                  accessibilityLabel="Leave a review"
                  onPress={() =>
                    navigation.navigate('Reviews', {
                      mode: 'submit',
                      orderId,
                      restaurantId: order.restaurantId,
                    })
                  }
                  style={{ marginTop: tokens.spacing.md }}
                />
              ) : null}

              <Button
                label="My orders"
                accessibilityLabel="My orders"
                variant="secondary"
                onPress={() => navigation.navigate('MyOrders')}
                style={{ marginTop: tokens.spacing.md }}
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={cancelVisible}
        onRequestClose={() => setCancelVisible(false)}
        title="Cancel order"
        accessibilityLabel="Cancel order dialog"
      >
        <View style={{ gap: tokens.spacing.md }}>
          <Text variant="body">
            Tell us why you are cancelling. This cannot be undone.
          </Text>
          <TextInput
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder="Reason"
            accessibilityLabel="Cancel reason"
            maxLength={500}
          />
          <Button
            label="Confirm cancel"
            accessibilityLabel="Confirm cancel"
            disabled={transitionState.isLoading}
            onPress={() => {
              void onCancel();
            }}
          />
          <Button
            label="Keep order"
            accessibilityLabel="Keep order"
            variant="secondary"
            onPress={() => setCancelVisible(false)}
          />
        </View>
      </Modal>

      <Toast
        visible={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        accessibilityLabel={toast?.message ?? 'Toast'}
        onDismiss={() => setToast(null)}
      />
    </View >
  );
}
