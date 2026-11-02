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
  disabled?: boolean;
  disabledReason?: string;
  onDisabledPress?: () => void;
};

export function AddressCard({
  address,
  onRemove,
  onSelect,
  selectMode,
  removing,
  onEdit,
  disabled = false,
  disabledReason,
  onDisabledPress,
}: Props) {
  const { tokens } = useTheme();

  const handlePress = () => {
    if (disabled) {
      if (onDisabledPress) onDisabledPress();
      return;
    }
    if (onSelect) onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.2,
        borderColor: disabled
          ? 'rgba(239, 68, 68, 0.25)'
          : address.isDefault
          ? '#F59E0B'
          : 'rgba(255, 255, 255, 0.08)',
        backgroundColor: disabled ? 'rgba(19, 31, 24, 0.6)' : '#131F18',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`Address ${address.label ?? address.line1}${disabled ? ' (Not deliverable)' : ''}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="label" style={{ fontWeight: '800', color: disabled ? '#9CA3AF' : '#FFFFFF', fontSize: 15 }}>
          {address.label?.trim() || 'Custom Location'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {disabled ? (
            <View style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderColor: '#EF4444',
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2.5,
            }}>
              <Text style={{ color: '#FCA5A5', fontSize: 10, fontWeight: '800' }}>NOT DELIVERABLE</Text>
            </View>
          ) : address.isDefault ? (
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
      </View>

      {disabled && disabledReason ? (
        <View style={{
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}>
          <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '700' }}>
            ⚠️ {disabledReason}
          </Text>
        </View>
      ) : null}


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

