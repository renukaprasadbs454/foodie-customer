import React from 'react';
import { View } from 'react-native';
import {
  Text,
  getOrderStatusColorRole,
  useTheme,
  type OrderStatus,
} from 'foodie-shared-rn';
import { TRACKING_STEPPER_STATUSES, isTerminalOrderStatus } from '../types';

type Props = {
  status: string;
};

const STATUS_TITLES: Record<string, string> = {
  PLACED: 'Order Placed',
  CONFIRMED: 'Order Confirmed',
  ACCEPTED: 'Restaurant Accepted',
  PREPARING: 'Food is Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  ASSIGNED: 'Delivery Partner Assigned',
  REACHED_RESTAURANT: 'Rider at Restaurant',
  PICKED_UP: 'Order Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Order Delivered',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  PLACED: 'Your order has been received by the merchant',
  CONFIRMED: 'Payment confirmed & sent to restaurant',
  ACCEPTED: 'Restaurant accepted your order',
  PREPARING: 'Chef is crafting your delicious meal',
  READY_FOR_PICKUP: 'Freshly packed food waiting for delivery rider',
  ASSIGNED: 'Delivery partner assigned & heading to restaurant',
  REACHED_RESTAURANT: 'Delivery partner arrived at restaurant',
  PICKED_UP: 'Order collected by delivery partner',
  OUT_FOR_DELIVERY: 'Rider is on the way to your delivery address',
  DELIVERED: 'Meal delivered successfully! Bon appétit!',
};

function statusIndex(status: string): number {
  return TRACKING_STEPPER_STATUSES.indexOf(status as OrderStatus);
}

export function OrderStatusStepper({ status }: Props) {
  const { tokens } = useTheme();
  const effectiveStatus = status === 'ACCEPTED' ? 'PREPARING' : status;
  const current = statusIndex(effectiveStatus);
  const terminalFail = effectiveStatus === 'CANCELLED' || effectiveStatus === 'REJECTED';

  if (terminalFail || (isTerminalOrderStatus(status) && status !== 'DELIVERED')) {
    const role =
      status === 'CANCELLED' || status === 'REJECTED'
        ? getOrderStatusColorRole(status as OrderStatus)
        : 'textSecondary';
    return (
      <View
        style={{
          padding: tokens.spacing.lg,
          borderRadius: tokens.radius.lg,
          backgroundColor: '#FFF1F2', // Soft red bg
          borderWidth: 1,
          borderColor: '#FECDD3',
        }}
        accessibilityLabel={`Order status ${status}`}
      >
        <Text variant="heading2" style={{ color: '#E11D48', fontWeight: '900' }}>
          {status}
        </Text>
        <Text variant="bodySmall" color={tokens.color.textSecondary} style={{ marginTop: 4 }}>
          This order was cancelled or rejected. Please browse other menus.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: '#131F18',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      }}
      accessibilityLabel={`Order status stepper, current ${status}`}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ alignItems: 'center', width: 20 }}>
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#FCD34D',
              borderWidth: 3,
              borderColor: 'rgba(252, 211, 77, 0.3)',
              zIndex: 2,
            }}
          />
        </View>

        <View style={{ flex: 1, marginTop: -2 }}>
          <Text
            style={{
              fontWeight: '900',
              color: '#FCD34D',
              fontSize: 16,
            }}
          >
            {STATUS_TITLES[effectiveStatus] || effectiveStatus.replace(/_/g, ' ')}
          </Text>
          {STATUS_DESCRIPTIONS[effectiveStatus] ? (
            <Text
              style={{ marginTop: 4, lineHeight: 18, color: '#9CA3AF', fontSize: 13 }}
            >
              {STATUS_DESCRIPTIONS[effectiveStatus]}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

