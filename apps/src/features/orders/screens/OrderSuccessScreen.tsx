import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Text,
  trackAnalyticsEvent,
  useTheme,
} from 'foodie-shared-rn';
import { useGetOrderQuery } from '../../../api/endpoints/ordersApi';
import type { OrdersStackParamList } from '../../../navigation/types';
import { OrderSummaryCard } from '../components/OrderSummaryCard';
import { OrderSummarySkeleton } from '../components/OrderSummarySkeleton';
import { isOrderId } from '../types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'OrderSuccess'>;

export function OrderSuccessScreen({ navigation, route }: Props) {

  const { orderId } = route.params;
  const isDarkStoreMock = orderId.startsWith('ds-mock-');
  const { tokens } = useTheme();
  const validId = isDarkStoreMock ? true : isOrderId(orderId);
  const orderQuery = useGetOrderQuery(orderId, { skip: !validId || isDarkStoreMock });

  useEffect(() => {
    trackAnalyticsEvent('customer_order_success_viewed', { orderId });
    trackAnalyticsEvent('order_confirmed', { orderId });
  }, [orderId]);

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
          description="This order link is not valid."
          accessibilityLabel="Invalid order id"
          actionLabel="Home"
          onAction={() => {
            const parent = navigation.getParent();
            parent?.navigate('BrowseTab' as never);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0A120E' }}
      contentContainerStyle={{
        padding: 20,
        gap: 16,
        paddingBottom: 48,
        alignItems: 'stretch',
      }}
    >
      {/* Celebration Header Animation / Icon */}
      <View style={{ alignItems: 'center', marginVertical: 20, gap: 10 }}>
        <View style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: '#131F18',
          borderWidth: 2,
          borderColor: '#FCD34D',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#FCD34D',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
        }}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
        </View>

        <Text style={{ fontWeight: '900', color: '#FFFFFF', textAlign: 'center', fontSize: 28, letterSpacing: -0.5 }}>
          Order Confirmed!
        </Text>
        <Text style={{ textAlign: 'center', paddingHorizontal: 16, color: '#9CA3AF', fontSize: 14, lineHeight: 20 }}>
          Your payment succeeded. Relax while your preparation starts!
        </Text>
      </View>

      {orderQuery.isLoading && !orderQuery.data ? (
        <OrderSummarySkeleton />
      ) : orderQuery.isError && !orderQuery.data ? (
        <EmptyState
          title="Order not found"
          description="We could not load this order details."
          accessibilityLabel="Order not found"
          actionLabel="Retry"
          onAction={() => {
            void orderQuery.refetch();
          }}
        />
      ) : orderQuery.data ? (
        <OrderSummaryCard order={orderQuery.data} />
      ) : null}

      <View style={{ gap: 12, marginTop: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track order"
          onPress={() => {
            trackAnalyticsEvent('track_order_tapped', { orderId });
            navigation.replace('LiveOrderTracking', { orderId });
          }}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: 14,
            backgroundColor: pressed ? '#EAB308' : '#FCD34D',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#FCD34D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          })}
        >
          <Text style={{ color: '#022414', fontWeight: '900', fontSize: 16 }}>
            Live Track Your Delivery ➔
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          onPress={() => {
            const parent = navigation.getParent();
            parent?.navigate('BrowseTab' as never);
          }}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: 14,
            borderWidth: 1.2,
            borderColor: 'rgba(252, 211, 77, 0.3)',
            backgroundColor: pressed ? 'rgba(252, 211, 77, 0.1)' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 15 }}>
            Back to Home
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

