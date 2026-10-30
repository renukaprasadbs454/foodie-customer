import React, { useEffect, useState, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Switch, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  EmptyState,
  Text,
  TextInput,
  Modal,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import * as Location from 'expo-location';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { globalLocation, setSelectedAddress } from '../../../core/GlobalLocation';
import {
  useAddAddressMutation,
  useGetAddressesQuery,
  useRemoveAddressMutation,
  useUpdateAddressMutation,
  useSetDefaultAddressMutation,
} from '../../../api/endpoints/addressesApi';
import { toUnwrappedApiError } from '../../auth/apiError';
import type {
  BrowseStackParamList,
  ProfileStackParamList,
} from '../../../navigation/types';
import { AddressCard } from '../components/AddressCard';
import { AddressListSkeleton } from '../components/AddressListSkeleton';
import { validateAddressForm } from '../types';

type ProfileProps = NativeStackScreenProps<ProfileStackParamList, 'Addresses'>;
type BrowseProps = NativeStackScreenProps<BrowseStackParamList, 'Addresses'>;
type Props = ProfileProps | BrowseProps;

/**
 * P2-CUS-07 Addresses — list/add/remove. No update endpoint (Gap).
 * selectMode from Checkout returns after create/select.
 * P2-OPT-01 — FlatList virtualization (SD §25).
 */
export function AddressesScreen({ navigation, route }: Props) {
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const selectMode = Boolean(route.params?.selectMode);
  const addressesQuery = useGetAddressesQuery();
  const [addAddress, addState] = useAddAddressMutation();
  const [removeAddress, removeState] = useRemoveAddressMutation();
  const [updateAddress, updateState] = useUpdateAddressMutation();
  const [setDefault, setDefaultState] = useSetDefaultAddressMutation();

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 13.3379,
    longitude: 77.1173, // Default Tumkur
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const mapRef = useRef<MapView>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocodeLocation = async (lat: number, lng: number) => {
    try {
      setGeocoding(true);
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        if (addr.city) setCity(addr.city);
        if (addr.postalCode) setPincode(addr.postalCode);
        const streetPart = [addr.streetNumber, addr.street].filter(Boolean).join(' ');
        if (streetPart) {
          setLine1(streetPart);
        } else if (addr.name) {
          setLine1(addr.name);
        }
        const areaPart = [addr.district, addr.subregion, addr.region].filter(Boolean).join(', ');
        if (areaPart) {
          setLine2(areaPart);
        } else if (addr.formattedAddress) {
          setLine2(addr.formattedAddress);
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    } finally {
      setGeocoding(false);
    }
  };

  const onLocationPinChanged = (lat: number, lng: number, shouldGeocode = true) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    setMapRegion(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    if (shouldGeocode) {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
      geocodeTimerRef.current = setTimeout(() => {
        void reverseGeocodeLocation(lat, lng);
      }, 400);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setMapRegion(prev => {
      const factor = direction === 'in' ? 0.5 : 2;
      const newLatDelta = Math.max(0.0008, Math.min(prev.latitudeDelta * factor, 0.4));
      const newLngDelta = Math.max(0.0008, Math.min(prev.longitudeDelta * factor, 0.4));
      const newRegion = {
        ...prev,
        latitudeDelta: newLatDelta,
        longitudeDelta: newLngDelta,
      };
      mapRef.current?.animateToRegion(newRegion, 250);
      return newRegion;
    });
  };

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) =>
      setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('customer_addresses_viewed');
  }, []);

  const resetForm = () => {
    setLabel('Home');
    setLine1('');
    setLine2('');
    setCity('');
    setPincode('');
    setLatitude('');
    setLongitude('');
    setIsDefault(true);
  };

  const fetchExactLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setToast({ message: 'Location permission denied.', variant: 'error' });
        setFetchingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude.toString());
      setLongitude(loc.coords.longitude.toString());
      setMapRegion(prev => ({ ...prev, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));

      const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geocode.length > 0) {
        const addr = geocode[0];
        if (addr.city) setCity(addr.city);
        if (addr.postalCode) setPincode(addr.postalCode);
        if (addr.street) setLine1(addr.street);
        if (addr.name && addr.name !== addr.street) setLine2(addr.name);
      }
      setToast({ message: 'Exact location fetched!', variant: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to fetch location.', variant: 'warning' });
    } finally {
      setFetchingLocation(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    resetForm();
    const initLat = globalLocation.coords?.latitude ?? mapRegion.latitude ?? 13.3379;
    const initLng = globalLocation.coords?.longitude ?? mapRegion.longitude ?? 77.1173;
    setLatitude(initLat.toString());
    setLongitude(initLng.toString());
    setMapRegion(prev => ({ ...prev, latitude: initLat, longitude: initLng }));
    setFormVisible(true);
    setTimeout(() => {
      void fetchExactLocation();
    }, 300);
  };

  const openEditForm = (address: any) => {
    setEditingId(address.addressId);
    setLabel(address.label || 'Home');
    setLine1(address.line1 || '');
    setLine2(address.line2 || '');
    setCity(address.city || '');
    setPincode(address.pincode || '');
    const validLat = address.latitude && Number(address.latitude) !== 0 ? address.latitude.toString() : '13.3379';
    const validLng = address.longitude && Number(address.longitude) !== 0 ? address.longitude.toString() : '77.1173';
    setLatitude(validLat);
    setLongitude(validLng);
    setIsDefault(!!address.isDefault);
    setMapRegion(prev => ({
      ...prev,
      latitude: Number(validLat),
      longitude: Number(validLng),
    }));
    setFormVisible(true);
  };

  const onSave = async () => {
    let finalLat = latitude;
    let finalLng = longitude;
    if (!finalLat || Number(finalLat) === 0 || isNaN(Number(finalLat))) {
      finalLat = mapRegion.latitude ? mapRegion.latitude.toString() : '13.3379';
    }
    if (!finalLng || Number(finalLng) === 0 || isNaN(Number(finalLng))) {
      finalLng = mapRegion.longitude ? mapRegion.longitude.toString() : '77.1173';
    }

    const validated = validateAddressForm({
      label,
      line1,
      line2,
      city,
      pincode,
      latitude: finalLat,
      longitude: finalLng,
      isDefault,
    });
    if (!validated.ok) {
      setToast({ message: validated.message, variant: 'error' });
      return;
    }
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to add an address.',
        variant: 'warning',
      });
      return;
    }
    try {
      if (editingId) {
        await updateAddress({ addressId: editingId, address: validated.value }).unwrap();
        trackAnalyticsEvent('address_updated', { addressId: editingId });
        setToast({ message: 'Address updated.', variant: 'success' });
      } else {
        const created = await addAddress(validated.value).unwrap();
        trackAnalyticsEvent('address_added', { addressId: created.addressId });
        setToast({ message: 'Address added.', variant: 'success' });
      }
      setFormVisible(false);
      resetForm();
      setEditingId(null);
      if (selectMode) {
        await setSelectedAddress({
          addressId: editingId || undefined,
          label: validated.value.label,
          line1: validated.value.line1,
          city: validated.value.city,
          latitude: validated.value.latitude,
          longitude: validated.value.longitude,
        });
        if (!editingId) {
          navigation.goBack();
        }
      }
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const onRemove = async (addressId: string) => {
    if (!isConnected) {
      setToast({
        message: 'Connect to the internet to remove an address.',
        variant: 'warning',
      });
      return;
    }
    setRemovingId(addressId);
    try {
      await removeAddress(addressId).unwrap();
      trackAnalyticsEvent('address_removed', { addressId });
      setToast({ message: 'Address removed.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    } finally {
      setRemovingId(null);
    }
  };

  const addresses = addressesQuery.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: '#0A120E' }}>
        <FlatList
          style={{ flex: 1 }}
          data={
            addressesQuery.isLoading && addresses.length === 0 ? [] : addresses
          }
          keyExtractor={(item) => item.addressId}
          contentContainerStyle={{
            paddingBottom: 48,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              tintColor="#FCD34D"
              refreshing={addressesQuery.isFetching}
              onRefresh={() => {
                void addressesQuery.refetch();
              }}
            />
          }
          ListHeaderComponent={
            <View style={{
              paddingTop: 14,
              paddingBottom: 22,
              paddingHorizontal: 20,
              backgroundColor: '#012B18',
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              borderBottomWidth: 1.5,
              borderColor: 'rgba(252, 211, 77, 0.25)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 8,
              marginBottom: 16,
            }}>
              <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 24, letterSpacing: -0.5 }}>
                Delivery Addresses
              </Text>
              <Text style={{ color: '#A7F3D0', fontSize: 13, marginTop: 4, fontWeight: '500' }}>
                Manage your saved home, work, and instant delivery locations
              </Text>
              {!isConnected ? (
                <Text variant="caption" color="#FCD34D" style={{ marginTop: 6 }}>
                  Offline — showing cached addresses. Changes are blocked.
                </Text>
              ) : null}

              {addressesQuery.isLoading && addresses.length === 0 ? (
                <AddressListSkeleton />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            addressesQuery.isLoading && addresses.length === 0 ? null : (
              <View style={{ paddingHorizontal: tokens.spacing.md, alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
                  No addresses saved yet
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
                  Add a delivery address to order delicious food directly to your doorstep.
                </Text>
                <Pressable
                  onPress={openAddForm}
                  style={({ pressed }) => ({
                    backgroundColor: '#0B3820',
                    borderColor: '#FCD34D',
                    borderWidth: 1.5,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 15 }}>+ Add New Address</Text>
                </Pressable>
              </View>
            )
          }
          ListFooterComponent={
            <View style={{ paddingHorizontal: tokens.spacing.md, marginTop: 16 }}>
              <Pressable
                accessibilityLabel="Add address"
                onPress={openAddForm}
                style={({ pressed }) => ({
                  backgroundColor: '#0B3820',
                  borderColor: '#FCD34D',
                  borderWidth: 1.5,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: '#FCD34D',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                })}
              >
                <Text style={{ color: '#FCD34D', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                  + Add New Address
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: address }) => (
            <View style={{ paddingHorizontal: tokens.spacing.md, marginVertical: tokens.spacing.xs }}>
              <AddressCard
                address={address}
                selectMode={selectMode}
                removing={removingId === address.addressId && removeState.isLoading}
                onRemove={() => {
                  void onRemove(address.addressId);
                }}
                onEdit={() => openEditForm(address)}
                onSelect={
                  selectMode
                    ? async () => {
                      if (!address.isDefault) {
                        try {
                          await setDefault(address.addressId).unwrap();
                        } catch (err) {
                          // continue
                        }
                      }
                      if (address.latitude && address.longitude) {
                        await setSelectedAddress({
                          addressId: address.addressId,
                          label: address.label,
                          line1: address.line1,
                          city: address.city,
                          latitude: address.latitude,
                          longitude: address.longitude,
                        });
                      }
                      trackAnalyticsEvent('address_selected', {
                        addressId: address.addressId,
                      });
                      navigation.goBack();
                    }
                    : undefined
                }
              />
            </View>
          )}
        />

        <Modal
          visible={formVisible}
          onRequestClose={() => setFormVisible(false)}
          dismissOnBackdropPress={false}
          title={editingId ? "Edit Delivery Address" : "Add Delivery Address"}
          accessibilityLabel="Delivery address dialog"
          contentStyle={{
            backgroundColor: '#0D1B13',
            borderColor: 'rgba(252, 211, 77, 0.4)',
            borderWidth: 1.5,
            borderRadius: 24,
            padding: 18,
          }}
        >
          <ScrollView
            style={{ maxHeight: 600 }}
            scrollEnabled={scrollEnabled}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: tokens.spacing.md }}>
              {/* Interactive Map with Zoom, Draggable Pin, GPS center, and touch isolation */}
              <View
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
                style={{
                  height: 200,
                  borderRadius: 14,
                  overflow: 'hidden',
                  borderColor: '#FCD34D',
                  borderWidth: 1.5,
                  backgroundColor: '#1E293B',
                  position: 'relative',
                }}
              >
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={{ flex: 1 }}
                  region={mapRegion}
                  zoomEnabled={true}
                  scrollEnabled={true}
                  zoomControlEnabled={true}
                  zoomTapEnabled={true}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  onPress={(e) => {
                    if (e.nativeEvent?.coordinate) {
                      onLocationPinChanged(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, true);
                    }
                  }}
                  onRegionChangeComplete={(r) => {
                    if (r && r.latitude && r.longitude) {
                      setMapRegion(r);
                      onLocationPinChanged(r.latitude, r.longitude, true);
                    }
                  }}
                >
                  {mapRegion?.latitude && mapRegion?.longitude ? (
                    <Marker
                      coordinate={{
                        latitude: Number(latitude) || mapRegion.latitude,
                        longitude: Number(longitude) || mapRegion.longitude,
                      }}
                      draggable={true}
                      onDragEnd={(e) => {
                        if (e.nativeEvent?.coordinate) {
                          onLocationPinChanged(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, true);
                        }
                      }}
                      pinColor="#FCD34D"
                      title="Delivery Location"
                      description="Drag pin to fine-tune address"
                    />
                  ) : null}
                </MapView>

                {/* Floating Map Controls: GPS Current Location, Zoom In, Zoom Out */}
                <View style={{ position: 'absolute', top: 8, right: 8, gap: 6, zIndex: 10 }}>
                  <Pressable
                    onPress={() => void fetchExactLocation()}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Use current location"
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: pressed ? '#0F2E1E' : '#062013',
                      borderColor: '#FCD34D',
                      borderWidth: 1.2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.35,
                      shadowRadius: 3,
                      elevation: 5,
                    })}
                  >
                    <Text style={{ fontSize: 16 }}>🎯</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleZoom('in')}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom in map"
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: pressed ? '#0F2E1E' : '#062013',
                      borderColor: '#FCD34D',
                      borderWidth: 1.2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.35,
                      shadowRadius: 3,
                      elevation: 5,
                    })}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#FCD34D', marginTop: -1 }}>+</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleZoom('out')}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Zoom out map"
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: pressed ? '#0F2E1E' : '#062013',
                      borderColor: '#FCD34D',
                      borderWidth: 1.2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.35,
                      shadowRadius: 3,
                      elevation: 5,
                    })}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#FCD34D', marginTop: -3 }}>−</Text>
                  </Pressable>
                </View>

                {/* Pin Location Reverse-Geocoding Status Indicator */}
                {geocoding && (
                  <View style={{
                    position: 'absolute',
                    bottom: 8,
                    alignSelf: 'center',
                    backgroundColor: 'rgba(2, 36, 20, 0.95)',
                    borderColor: 'rgba(252, 211, 77, 0.4)',
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}>
                    <ActivityIndicator size="small" color="#FCD34D" />
                    <Text style={{ color: '#FCD34D', fontSize: 11, fontWeight: '800' }}>
                      Updating address from pin...
                    </Text>
                  </View>
                )}

                {fetchingLocation && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FCD34D" />
                    <Text style={{ color: '#FCD34D', fontWeight: '800', marginTop: 8 }}>Pinpointing location...</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: -4 }}>
                📍 Drag pin or tap map to update address • Use + / − or pinch to zoom
              </Text>

              <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
                {['Home', 'Work', 'Other'].map(l => (
                  <Pressable
                    key={l}
                    onPress={() => setLabel(l)}
                    style={{
                      flex: 1,
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: label === l ? '#FCD34D' : 'rgba(255, 255, 255, 0.12)',
                      backgroundColor: label === l ? '#0B3820' : '#14231A',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: label === l ? '#FCD34D' : '#9CA3AF', fontWeight: '800', fontSize: 14 }}>{l}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                label="Complete Address (House No, Building, Street)"
                value={line1}
                onChangeText={setLine1}
                accessibilityLabel="Address line 1"
                placeholderTextColor="#6B7280"
                inputStyle={{
                  backgroundColor: '#14231A',
                  borderColor: 'rgba(252, 211, 77, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: 10,
                }}
              />
              <TextInput
                label="Landmark / Area (Optional)"
                value={line2}
                onChangeText={setLine2}
                accessibilityLabel="Address line 2"
                placeholderTextColor="#6B7280"
                inputStyle={{
                  backgroundColor: '#14231A',
                  borderColor: 'rgba(252, 211, 77, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: 10,
                }}
              />
              <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    accessibilityLabel="City"
                    placeholderTextColor="#6B7280"
                    inputStyle={{
                      backgroundColor: '#14231A',
                      borderColor: 'rgba(252, 211, 77, 0.3)',
                      color: '#FFFFFF',
                      borderRadius: 10,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Pincode"
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                    accessibilityLabel="Pincode"
                    placeholderTextColor="#6B7280"
                    inputStyle={{
                      backgroundColor: '#14231A',
                      borderColor: 'rgba(252, 211, 77, 0.3)',
                      color: '#FFFFFF',
                      borderRadius: 10,
                    }}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => {
                  void onSave();
                }}
                disabled={addState.isLoading || updateState.isLoading}
                accessibilityRole="button"
                accessibilityLabel="Save address"
                style={({ pressed }) => ({
                  backgroundColor: '#F59E0B',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (addState.isLoading || updateState.isLoading) ? 0.7 : pressed ? 0.9 : 1,
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                  marginTop: 6,
                })}
              >
                {addState.isLoading || updateState.isLoading ? (
                  <ActivityIndicator size="small" color="#012B18" />
                ) : (
                  <Text style={{ color: '#012B18', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                    {editingId ? "Save Changes" : "Save Address and Proceed"}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Modal>

        <Toast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          variant={toast?.variant ?? 'info'}
          accessibilityLabel={toast?.message ?? 'Toast'}
          onDismiss={() => setToast(null)}
        />
      </View>
    </SafeAreaView>
  );
}
