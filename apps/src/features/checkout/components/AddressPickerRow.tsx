import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Text, useTheme } from 'foodie-shared-rn';
import type { CustomerAddress } from '../types';

type Props = {
  address: CustomerAddress;
  selected: boolean;
  onSelect: () => void;
};

export function AddressPickerRow({ address, selected, onSelect }: Props) {
  const { tokens } = useTheme();
  const title = address.label?.trim() || address.line1;

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Address ${title}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? '#FCD34D' : 'rgba(255, 255, 255, 0.1)',
        backgroundColor: selected ? 'rgba(252, 211, 77, 0.08)' : '#0F1A14',
        gap: 12,
      }}
    >
      {/* Branded Left Side Radio Indicator */}
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: selected ? '#FCD34D' : '#6B7280',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {selected ? (
          <View style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#FCD34D',
          }} />
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
          <Text style={{ fontWeight: '700', color: '#FFFFFF', fontSize: 14 }}>
            {title}
          </Text>
          {address.isDefault ? (
            <Badge
              label="Default"
              tone="accent"
              accessibilityLabel="Default address"
            />
          ) : null}
        </View>
        <Text style={{ lineHeight: 16, color: '#9CA3AF', fontSize: 12 }}>
          {[address.line1, address.line2, address.city, address.pincode]
            .filter(Boolean)
            .join(', ')}
        </Text>
      </View>
    </Pressable>
  );
}

