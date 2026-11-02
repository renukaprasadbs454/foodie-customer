import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Text, useTheme } from 'foodie-shared-rn';
import type { CustomerAddress } from '../types';

type Props = {
  address: CustomerAddress;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
  onDisabledPress?: () => void;
};

export function AddressPickerRow({
  address,
  selected,
  onSelect,
  disabled = false,
  disabledReason,
  onDisabledPress,
}: Props) {
  const { tokens } = useTheme();
  const title = address.label?.trim() || address.line1;

  const handlePress = () => {
    if (disabled) {
      if (onDisabledPress) {
        onDisabledPress();
      }
      return;
    }
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`Address ${title}${disabled ? ' (Not deliverable)' : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: selected ? 1.5 : 1,
        borderColor: disabled
          ? 'rgba(239, 68, 68, 0.25)'
          : selected
          ? '#FCD34D'
          : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: disabled
          ? 'rgba(17, 24, 20, 0.6)'
          : selected
          ? 'rgba(252, 211, 77, 0.08)'
          : '#0F1A14',
        opacity: disabled ? 0.55 : 1,
        gap: 12,
      }}
    >
      {/* Branded Left Side Radio Indicator */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: disabled ? '#4B5563' : selected ? '#FCD34D' : '#6B7280',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: disabled ? 'rgba(75, 85, 99, 0.2)' : 'transparent',
        }}
      >
        {disabled ? (
          <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '900' }}>✕</Text>
        ) : selected ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#FCD34D',
            }}
          />
        ) : null}
      </View>

      {/* Address Details on Right Side */}
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              color: disabled ? '#9CA3AF' : '#FFFFFF',
              fontSize: 14,
            }}
          >
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {disabled ? (
              <View
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.18)',
                  borderColor: '#EF4444',
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                }}
              >
                <Text style={{ color: '#FCA5A5', fontSize: 9.5, fontWeight: '800' }}>
                  NOT DELIVERABLE
                </Text>
              </View>
            ) : address.isDefault ? (
              <Badge
                label="Default"
                tone="accent"
                accessibilityLabel="Default address"
              />
            ) : null}
          </View>
        </View>
        <Text style={{ lineHeight: 16, color: disabled ? '#6B7280' : '#9CA3AF', fontSize: 12 }}>
          {[address.line1, address.line2, address.city, address.pincode]
            .filter(Boolean)
            .join(', ')}
        </Text>
        {disabled && disabledReason ? (
          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
            ⚠️ {disabledReason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}


