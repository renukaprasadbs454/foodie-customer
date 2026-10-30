import React from 'react';
import { Pressable, View, Image } from 'react-native';
import { Badge, Text, useTheme } from 'foodie-shared-rn';
import type { MenuItem } from '../types';
import { formatMoney } from '../types';
import { ENV } from '../../../constants/env';

type Props = {
  item: MenuItem;
  quantity?: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

// Curated high-resolution Unsplash food images for menu item fallbacks
const FALLBACK_DISH_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300', // Pasta Salad
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=300', // Pizza slice
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=300', // Sandwich
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=300', // French Toast
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=300', // Pancakes
];

function getDishImage(item: MenuItem): string {
  if (item.imageUrl) {
    if (item.imageUrl.startsWith('http')) return item.imageUrl;
    // Bind local backend Storage URI
    if (item.imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${item.imageUrl}`;
    return item.imageUrl;
  }
  // Dynamic fallback based on item id or name hashing
  let hash = 0;
  const name = item.name || '';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_DISH_IMAGES.length;
  return FALLBACK_DISH_IMAGES[index]!;
}

export function MenuItemRow({ item, quantity = 0, onAdd, onIncrement, onDecrement }: Props) {
  const { tokens } = useTheme();
  const disabled = !item.isAvailable;
  const primary = disabled
    ? tokens.color.textSecondary
    : tokens.color.textPrimary;

  const imageUrl = getDishImage(item);

  return (
    <Pressable
      onPress={quantity > 0 ? undefined : onAdd}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${item.name}${disabled ? ', unavailable' : ''}`}
      style={{
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
        opacity: disabled ? 0.6 : 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      {/* Details Container on Left */}
      <View style={{ flex: 1, gap: 5 }}>
        {/* Vegetarian / Non-Vegetarian Authentic FSSAI Indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{
            width: 15,
            height: 15,
            borderWidth: 1.5,
            borderColor: item.isVeg ? '#16A34A' : '#DC2626',
            borderRadius: 3,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}>
            <View style={{
              width: item.isVeg ? 7 : 0,
              height: item.isVeg ? 7 : 0,
              borderRadius: item.isVeg ? 3.5 : 0,
              backgroundColor: item.isVeg ? '#16A34A' : 'transparent',
              borderLeftWidth: item.isVeg ? 0 : 4,
              borderRightWidth: item.isVeg ? 0 : 4,
              borderBottomWidth: item.isVeg ? 0 : 7,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: item.isVeg ? 'transparent' : '#DC2626',
            }} />
          </View>

          <Text variant="caption" style={{
            color: item.isVeg ? '#16A34A' : '#DC2626',
            fontWeight: '800',
            fontSize: 10.5,
            letterSpacing: 0.5,
          }}>
            {item.isVeg ? 'VEG' : 'NON-VEG'}
          </Text>

          {item.name.toLowerCase().includes('biriyani') || item.name.toLowerCase().includes('biryani') ? (
            <View style={{
              backgroundColor: '#FEF3C7',
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 4,
            }}>
              <Text style={{ color: '#D97706', fontSize: 9.5, fontWeight: '800' }}>★ BESTSELLER</Text>
            </View>
          ) : null}
        </View>

        {/* Dish Name */}
        <Text variant="heading3" color={primary} style={{
          fontWeight: '800',
          fontSize: 16,
          letterSpacing: -0.2,
          marginTop: 2,
        }}>
          {item.name}
        </Text>

        {/* Price */}
        <Text style={{
          color: '#14532D',
          fontWeight: '900',
          fontSize: 15,
          letterSpacing: 0.2,
        }}>
          ₹{formatMoney(item.basePrice)}
        </Text>

        {/* Description */}
        {item.description ? (
          <Text
            variant="caption"
            color={tokens.color.textSecondary}
            numberOfLines={2}
            style={{
              marginTop: 2,
              lineHeight: 17,
              fontSize: 12.5,
              color: '#6B7280',
            }}
          >
            {item.description}
          </Text>
        ) : null}

        {disabled ? (
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Badge
              label="Currently Unavailable"
              tone="warning"
              accessibilityLabel="Item unavailable"
            />
          </View>
        ) : null}
      </View>

      {/* Styled Image & Overlap ADD button on Right */}
      <View style={{ width: 110, height: 120, alignItems: 'center', position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 105,
            height: 95,
            borderRadius: 16,
            backgroundColor: '#F5EFE6',
          }}
          resizeMode="cover"
        />

        {!disabled ? (
          quantity > 0 ? (
            <View style={{
              position: 'absolute',
              bottom: 4,
              flexDirection: 'row',
              backgroundColor: '#14532D', // Active Dark Green capsule
              borderWidth: 1.5,
              borderColor: '#FCD34D',
              borderRadius: 10,
              width: 86,
              height: 34,
              justifyContent: 'space-between',
              alignItems: 'center',
              shadowColor: '#14532D',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 5,
            }}>
              <Pressable onPress={onDecrement} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16 }}>−</Text>
              </Pressable>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 14 }}>{quantity}</Text>
              <Pressable onPress={onIncrement} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16 }}>+</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onAdd}
              style={({ pressed }) => ({
                position: 'absolute',
                bottom: 4,
                backgroundColor: pressed ? '#F5EFE0' : '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#14532D', // Brand dark green border
                borderRadius: 10,
                width: 86,
                height: 34,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#14532D',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 5,
                elevation: 4,
              })}
            >
              <Text variant="label" style={{
                color: '#14532D',
                fontWeight: '900',
                fontSize: 13.5,
                letterSpacing: 0.5,
              }}>
                ADD +
              </Text>
            </Pressable>
          )
        ) : null}
      </View>
    </Pressable>
  );
}
