import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'foodie-shared-rn';
import type { CartItem } from '../../menu/types';
import { formatMoney } from '../../menu/types';

type Props = {
  item: CartItem;
  name?: string;
  isVeg?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  loading?: boolean;
};

export function CartItemRow({
  item,
  name,
  isVeg = true, // default or based on lookup
  onIncrement,
  onDecrement,
  loading,
}: Props) {
  const { tokens } = useTheme();

  return (
    <View
      style={{
        padding: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
        backgroundColor: '#131F18',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
        gap: tokens.spacing.xs,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      accessibilityLabel={`Cart line quantity ${item.quantity}`}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
          <View style={{
            width: 14,
            height: 14,
            borderWidth: 1.5,
            borderColor: isVeg ? '#16A34A' : '#DC2626',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2,
          }}>
            <View style={{
              width: 6,
              height: 6,
              borderRadius: tokens.radius.full,
              backgroundColor: isVeg ? '#16A34A' : '#DC2626',
            }} />
          </View>
          <Text variant="heading3" style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 16, flexShrink: 1, paddingRight: 8 }}>
            {name || 'Unknown Item'}
          </Text>
        </View>

        {item.variantId ? (
          <Text variant="caption" style={{ color: '#FCD34D', fontWeight: '600', marginTop: 4 }}>
            Custom Variant
          </Text>
        ) : null}

        {item.notes ? (
          <Text variant="caption" style={{ color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 }}>
            Notes: "{item.notes}"
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: tokens.spacing.sm }}>
        {loading ? (
          <View style={{ width: 76, height: 32, justifyContent: 'center' }}>
            <ActivityIndicator size="small" color="#FCD34D" />
          </View>
        ) : (
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#022414',
            borderWidth: 1.5,
            borderColor: '#FCD34D',
            borderRadius: 10,
            width: 90,
            height: 34,
            justifyContent: 'space-between',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            <Pressable onPress={onDecrement} style={{ paddingHorizontal: 12, height: '100%', justifyContent: 'center' }}>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16 }}>−</Text>
            </Pressable>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 15 }}>{item.quantity}</Text>
            <Pressable onPress={onIncrement} style={{ paddingHorizontal: 12, height: '100%', justifyContent: 'center' }}>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16 }}>+</Text>
            </Pressable>
          </View>
        )}

        <Text variant="label" style={{ fontWeight: '900', color: '#FCD34D', fontSize: 16, marginTop: 4 }}>
          ₹{formatMoney(item.lineTotal)}
        </Text>
      </View>
    </View>
  );
}

