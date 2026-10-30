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
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.2,
        borderColor: address.isDefault ? '#F59E0B' : 'rgba(255, 255, 255, 0.08)',
        backgroundColor: '#131F18',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Address ${address.label ?? address.line1}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 15 }}>
          {address.label?.trim() || 'Custom Location'}
        </Text>
        {address.isDefault ? (
          <View style={{
            backgroundColor: 'rgba(252, 211, 77, 0.15)',
            borderColor: '#F59E0B',
            borderWidth: 1,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 2.5,
          }}>
            <Text style={{ color: '#FCD34D', fontSize: 10, fontWeight: '800' }}>DEFAULT</Text>
          </View>
        ) : null}
      </View>

      <Text variant="bodySmall" style={{ lineHeight: 18, fontWeight: '500', color: '#E5E7EB' }}>
        {address.line1}
        {address.line2 ? `,\n${address.line2}` : ''}
      </Text>

      <Text variant="caption" style={{ fontWeight: '500', color: '#9CA3AF' }}>
        📍 {address.city} · {address.pincode}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' }}>
        {onEdit ? (
          <Pressable
            disabled={removing}
            onPress={onEdit}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1E2922' : 'transparent',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#374151',
              paddingHorizontal: 12,
              paddingVertical: 6,
            })}
          >
            <Text variant="caption" style={{ color: '#D1D5DB', fontWeight: '700' }}>
              Edit
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          disabled={removing}
          onPress={onRemove}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#2E1014' : 'transparent',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.35)',
            paddingHorizontal: 12,
            paddingVertical: 6,
          })}
        >
          <Text variant="caption" style={{ color: '#EF4444', fontWeight: '700' }}>
            {removing ? 'Removing...' : 'Delete'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

