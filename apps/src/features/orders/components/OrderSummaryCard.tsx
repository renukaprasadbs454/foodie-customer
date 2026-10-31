import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import { formatMoney } from '../../menu/types';
import type { OrderDetail } from '../types';

type Props = {
  order: OrderDetail;
};

/** Order Success / tracking summary — UI-API OrderSummaryCard. */
export function OrderSummaryCard({ order }: Props) {
  const { tokens } = useTheme();
  const items = order.items ?? [];

  return (
    <View
      style={{
        gap: 10,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: '#131F18',
      }}
      accessibilityLabel={`Order summary ${order.orderNumber}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{order.orderNumber}</Text>
        <View style={{ backgroundColor: 'rgba(252, 211, 77, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FCD34D' }}>
            {order.status}
          </Text>
        </View>
      </View>
      {items.length > 0 ? (
        <View style={{ gap: 6, marginTop: 4 }}>
          {items.map((item, index) => (
            <Text
              key={`${item.menuItemId ?? 'item'}-${index}`}
              style={{ color: '#E5E7EB', fontSize: 14 }}
            >
              {item.quantity}× {item.name ?? 'Item'}
              {item.lineTotal != null ? ` · ₹${formatMoney(item.lineTotal)}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 8, gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 8 }}>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Subtotal ₹{formatMoney(order.subtotal)} · Delivery{' '}
          ₹{formatMoney(order.deliveryFee)} · Discount{' '}
          ₹{formatMoney(order.discountAmount)} · Tax ₹{formatMoney(order.taxAmount)}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FCD34D', marginTop: 2 }}>
          Total ₹{formatMoney(order.totalAmount)}
        </Text>
      </View>
    </View>
  );
}
