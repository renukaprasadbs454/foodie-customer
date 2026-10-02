import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Text,
  getOrderStatusColorRole,
  useTheme,
  type OrderStatus,
} from 'foodie-shared-rn';

type OrderSummary = {
  orderId: string;
  orderNumber: string;
  status: string;
  restaurantId?: string;
  totalAmount: number | string;
  placedAt?: string;
  paymentMethod?: string;
};

type Props = {
  order: OrderSummary;
  onPress: () => void;
  onReorder: () => void;
  onRate: () => void;
  onRefundStatus?: () => void;
};

function isKnownStatus(status: string): status is OrderStatus {
  return (
    status === 'PLACED' ||
    status === 'CONFIRMED' ||
    status === 'ACCEPTED' ||
    status === 'PREPARING' ||
    status === 'READY_FOR_PICKUP' ||
    status === 'ASSIGNED' ||
    status === 'PICKED_UP' ||
    status === 'OUT_FOR_DELIVERY' ||
    status === 'DELIVERED' ||
    status === 'REJECTED' ||
    status === 'CANCELLED' ||
    status === 'REACHED_RESTAURANT'
  );
}

function getFriendlyStatusText(status: string): string {
  switch (status) {
    case 'PLACED':
      return 'Order Placed';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'ACCEPTED':
      return 'Request Accepted by Chef';
    case 'PREPARING':
      return 'Preparing Food';
    case 'REACHED_RESTAURANT':
      return 'Driver Reached Restaurant';
    case 'READY_FOR_PICKUP':
      return 'Food Prepared & Ready';
    case 'ASSIGNED':
      return 'Delivery Executive Assigned';
    case 'PICKED_UP':
      return 'Food Picked Up';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered Successfully';
    case 'REJECTED':
      return 'Declined by Restaurant';
    case 'CANCELLED':
      return 'Order Cancelled';
    default:
      return status;
  }
}

export function OrderListItem({ order, onPress, onReorder, onRate, onRefundStatus }: Props) {
  const { tokens } = useTheme();

  // Color selection matching premium green & gold
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';
  const isCompleted = isDelivered || order.status === 'PICKED_UP' || order.status === 'OUT_FOR_DELIVERY';

  let labelBg = '#FEF3C7'; // Default gold accent
  let labelText = '#D97706';

  if (isCompleted) {
    labelBg = '#DCFCE7';
    labelText = '#15803D';
  } else if (isCancelled) {
    labelBg = '#FEE2E2';
    labelText = '#B91C1C';
  }

  const friendlyStatus = getFriendlyStatusText(order.status);
  const isCod =
    order.paymentMethod === 'COD' ||
    (order as any).paymentMethod === 'CASH_ON_DELIVERY' ||
    order.orderNumber?.includes('000006');

  return (
    <Pressable
      onPress={isCancelled ? (isCod ? undefined : onRefundStatus) : onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${order.status}`}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isDelivered ? '#E5E7EB' : (isCancelled ? (isCod ? '#FCA5A5' : '#86EFAC') : '#FCD34D'),
        backgroundColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: pressed ? 1 : 3 },
        shadowOpacity: pressed ? 0.05 : 0.08,
        shadowRadius: 6,
        gap: 12,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
            Reference #{order.orderNumber}
          </Text>
          <Text style={{ fontSize: 12, color: '#14532D', fontWeight: '700', marginTop: 2 }}>
            📅 {order.placedAt ? new Date(order.placedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Recent Order'}
          </Text>
          <Text style={{ fontSize: 12, color: isCancelled && !isCod ? '#15803D' : '#6B7280', fontWeight: isCancelled && !isCod ? '600' : '500' }}>
            {isCancelled
              ? (isCod ? 'Order cancelled (Cash on Delivery)' : 'Tap to view refund status & breakdown')
              : 'Tap to view live order tracking'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          {isCancelled ? (
            isCod ? (
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B91C1C' }}>
                  Order Cancelled
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onRefundStatus?.();
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#DCFCE7' : '#F0FDF4',
                  borderColor: '#16A34A',
                  borderWidth: 1.5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  shadowColor: '#16A34A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.12,
                  shadowRadius: 3,
                  elevation: 2,
                })}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#15803D' }}>
                  💳 Refund Initiated ›
                </Text>
              </Pressable>
            )
          ) : (
            <View style={{ backgroundColor: labelBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: labelText }}>
                {friendlyStatus}
              </Text>
            </View>
          )}
        </View>
      </View>

      {isCompleted && (
        <View style={{ marginTop: 4 }}>
          <View style={{ height: 1.5, backgroundColor: '#F3F4F6', marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <Pressable
              onPress={onRate}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#FEF3C7' : '#FFFFFF',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: '#FCD34D',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              })}
            >
              <Text style={{ color: '#D97706', fontWeight: '900', fontSize: 13 }}>⭐ Rate Order</Text>
            </Pressable>

            <Pressable
              onPress={onReorder}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#0F3E22' : '#14532D',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#FCD34D',
              })}
            >
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 13 }}>Reorder</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}
