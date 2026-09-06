import React from 'react';
import { View, Pressable } from 'react-native';
import { Badge, Text, useTheme } from 'foodie-shared-rn';
import type { CustomerAddress } from '../../checkout/types';

type Props = {
  address: CustomerAddress;
  onRemove: () => void;
  onSelect?: () => void;
  selectMode?: boolean;
  removing?: boolean;
  onEdit?: () => void;
};

export function AddressCard({
  address,
  onRemove,
  onSelect,
  selectMode,
  removing,
  onEdit,
}: Props) {
  const { tokens } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        padding: tokens.spacing.lg,
        borderRadius: tokens.radius.lg,
        borderWidth: 1,
        borderColor: address.isDefault ? tokens.color.accent : tokens.color.border,
        backgroundColor: tokens.color.surface,
        gap: tokens.spacing.sm,
        shadowColor: '#14532D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
        opacity: pressed ? 0.8 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Address ${address.label ?? address.line1}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" style={{ fontWeight: '800', color: tokens.color.textPrimary }}>
          {address.label?.trim() || 'Custom Location'}
        </Text>
        {address.isDefault ? (
          <Badge label="Default Address" tone="accent" accessibilityLabel="Default Address" />
        ) : null}
      </View>

      <Text variant="bodySmall" color={tokens.color.textPrimary} style={{ lineHeight: 18, fontWeight: '500' }}>
        {address.line1}
        {address.line2 ? `,\n${address.line2}` : ''}
      </Text>

      <Text variant="caption" color={tokens.color.textSecondary} style={{ fontWeight: '500' }}>
        📍 {address.city} · {address.pincode}
      </Text>

      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.xs, alignItems: 'center' }}>
        {onEdit ? (
          <Pressable
            disabled={removing}
            onPress={onEdit}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#F3F4F6' : 'transparent',
              borderRadius: tokens.radius.md,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              paddingHorizontal: tokens.spacing.md,
              paddingVertical: 8,
            })}
          >
            <Text variant="caption" style={{ color: '#4B5563', fontWeight: '600' }}>
              Edit
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={removing}
          onPress={onRemove}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#FFF1F2' : 'transparent',
            borderRadius: tokens.radius.md,
            borderWidth: 1,
            borderColor: '#FECDD3',
            paddingHorizontal: tokens.spacing.md,
            paddingVertical: 8,
          })}
        >
          <Text variant="caption" style={{ color: '#EF4444', fontWeight: '600' }}>
            {removing ? 'Removing...' : 'Delete'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

