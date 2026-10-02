import React from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Text } from 'foodie-shared-rn';
import { Feather } from '@expo/vector-icons';
import type { CustomerAddress } from '../../checkout/types';

interface AddressRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onAddAddress: () => void;
  addresses?: CustomerAddress[];
  selectedAddressId?: string | null;
  onSelectAddress?: (addressId: string) => void;
  title?: string;
  message?: string;
}

export function AddressRequiredModal({
  visible,
  onClose,
  onAddAddress,
  addresses = [],
  selectedAddressId,
  onSelectAddress,
  title = 'Delivery Address Required',
  message = 'Please add or select a delivery address before placing your order. Without an address, we cannot deliver your food!',
}: AddressRequiredModalProps) {
  const hasSavedAddresses = addresses && addresses.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
      }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={onClose}
        />

        <View style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 10,
          zIndex: 1,
        }}>
          {/* Animated/Glowing Pin Icon Badge */}
          <View style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: '#FEF3C7',
            borderWidth: 3,
            borderColor: '#FDE68A',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#F59E0B',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Feather name="map-pin" size={26} color="#FFFFFF" />
            </View>
          </View>

          {/* Alert Title */}
          <Text style={{
            fontSize: 20,
            fontWeight: '900',
            color: '#111827',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            {title}
          </Text>

          {/* Alert Description */}
          <Text style={{
            fontSize: 14,
            color: '#4B5563',
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 20,
          }}>
            {message}
          </Text>

          {/* Saved Addresses quick-picker if available */}
          {hasSavedAddresses && onSelectAddress && (
            <View style={{ width: '100%', marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}>
                Choose a saved address:
              </Text>
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                <View style={{ gap: 8 }}>
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.addressId;
                    return (
                      <Pressable
                        key={addr.addressId}
                        onPress={() => {
                          onSelectAddress(addr.addressId);
                          onClose();
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#15803D' : '#E5E7EB',
                          backgroundColor: isSelected ? '#F0FDF4' : (pressed ? '#F9FAFB' : '#FFFFFF'),
                          gap: 10,
                        })}
                      >
                        <Feather
                          name={isSelected ? 'check-circle' : 'map-pin'}
                          size={18}
                          color={isSelected ? '#15803D' : '#9CA3AF'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: '#111827',
                          }}>
                            {addr.label || addr.line1}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              color: '#6B7280',
                              marginTop: 2,
                            }}
                          >
                            {addr.line1} {addr.city ? `, ${addr.city}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: 10 }}>
            <Pressable
              onPress={() => {
                onClose();
                onAddAddress();
              }}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#0F3E22' : '#14532D',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                shadowColor: '#14532D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              })}
            >
              <Feather name="plus-circle" size={18} color="#FCD34D" />
              <Text style={{
                color: '#FCD34D',
                fontSize: 15,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}>
                {hasSavedAddresses ? 'Add New Address' : 'Add Delivery Address'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#F3F4F6' : '#FFFFFF',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              })}
            >
              <Text style={{
                color: '#6B7280',
                fontSize: 14,
                fontWeight: '700',
              }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
