import React from 'react';
import { Pressable, View, Image, StyleSheet } from 'react-native';
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
  isRestaurantClosed?: boolean;
};

function resolveDishImage(imageUrl?: string | null): string | null {
  if (!imageUrl || imageUrl.trim().length === 0) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/api')) return `${ENV.apiBaseUrl}${imageUrl}`;
  return imageUrl;
}

export function MenuItemRow({
  item,
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  isRestaurantClosed = false,
}: Props) {
  const { tokens } = useTheme();
  const disabled = !item.isAvailable || isRestaurantClosed;
  const primary = disabled ? '#6B7280' : '#FFFFFF';
  const imageUrl = resolveDishImage(item.imageUrl);

  return (
    <View
      style={[
        styles.rowContainer,
        disabled && styles.rowDisabled,
      ]}
    >
      {/* Details Container on Left */}
      <View style={styles.leftDetails}>
        {/* FSSAI Veg / Non-Veg Authentic Indicator */}
        <View style={styles.fssaiRow}>
          <View
            style={[
              styles.fssaiBox,
              { borderColor: item.isVeg ? '#16A34A' : '#DC2626' },
            ]}
          >
            <View
              style={
                item.isVeg ? styles.vegDot : styles.nonVegTriangle
              }
            />
          </View>

          <Text
            variant="caption"
            style={[
              styles.fssaiLabel,
              { color: item.isVeg ? '#16A34A' : '#DC2626' },
            ]}
          >
            {item.isVeg ? 'VEG' : 'NON-VEG'}
          </Text>
        </View>

        {/* Dish Name */}
        <Text
          variant="heading3"
          color={primary}
          style={styles.dishName}
        >
          {item.name}
        </Text>

        {/* Real Price */}
        <Text style={[styles.dishPrice, disabled && { color: '#6B7280' }]}>
          ₹{formatMoney(item.basePrice)}
        </Text>

        {/* Description if added by restaurant */}
        {item.description ? (
          <Text
            variant="caption"
            color={tokens.color.textSecondary}
            numberOfLines={2}
            style={styles.dishDescription}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Unavailable badge */}
        {!item.isAvailable ? (
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <Badge
              label="Currently Unavailable"
              tone="warning"
              accessibilityLabel="Item unavailable"
            />
          </View>
        ) : null}
      </View>

      {/* Right Column: Genuine Image OR Clean Add Button */}
      {imageUrl ? (
        <View style={styles.rightImageColumn}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.dishImage}
            resizeMode="cover"
          />

          {!disabled && (
            <View style={styles.floatingButtonWrap}>
              {quantity > 0 ? (
                <View style={styles.stepperContainer}>
                  <Pressable
                    onPress={onDecrement}
                    style={styles.stepperButton}
                  >
                    <Text style={styles.stepperButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperCountText}>{quantity}</Text>
                  <Pressable
                    onPress={onIncrement}
                    style={styles.stepperButton}
                  >
                    <Text style={styles.stepperButtonText}>+</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={onAdd}
                  style={({ pressed }) => [
                    styles.addButton,
                    { backgroundColor: pressed ? '#F5EFE0' : '#FFFFFF' },
                  ]}
                >
                  <Text variant="label" style={styles.addButtonText}>
                    ADD +
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.rightNoImageColumn}>
          {!disabled && (
            quantity > 0 ? (
              <View style={styles.stepperContainerInline}>
                <Pressable
                  onPress={onDecrement}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <Text style={styles.stepperCountText}>{quantity}</Text>
                <Pressable
                  onPress={onIncrement}
                  style={styles.stepperButton}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onAdd}
                style={({ pressed }) => [
                  styles.addInlineButton,
                  { backgroundColor: pressed ? '#0F3E22' : '#14532D' },
                ]}
              >
                <Text variant="label" style={styles.addInlineButtonText}>
                  ADD +
                </Text>
              </Pressable>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  leftDetails: {
    flex: 1,
    gap: 4,
  },
  fssaiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fssaiBox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#DC2626',
  },
  fssaiLabel: {
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dishName: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
    marginTop: 2,
    color: '#FFFFFF',
  },
  dishPrice: {
    color: '#FCD34D',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  dishDescription: {
    marginTop: 2,
    lineHeight: 17,
    fontSize: 12.5,
    color: '#9CA3AF',
  },
  rightImageColumn: {
    width: 108,
    height: 114,
    alignItems: 'center',
    position: 'relative',
  },
  dishImage: {
    width: 105,
    height: 92,
    borderRadius: 16,
    backgroundColor: '#131F18',
  },
  floatingButtonWrap: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
  },
  rightNoImageColumn: {
    width: 86,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#022414',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 10,
    width: 86,
    height: 32,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stepperContainerInline: {
    flexDirection: 'row',
    backgroundColor: '#022414',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 10,
    width: 86,
    height: 34,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepperButton: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stepperButtonText: {
    color: '#FCD34D',
    fontWeight: '900',
    fontSize: 16,
  },
  stepperCountText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13.5,
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    backgroundColor: '#022414',
    borderRadius: 10,
    width: 86,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FCD34D',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  addInlineButton: {
    backgroundColor: '#022414',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 10,
    width: 86,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addInlineButtonText: {
    color: '#FCD34D',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
