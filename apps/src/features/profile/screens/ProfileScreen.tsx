import React, { useEffect, useState, useRef } from 'react';
import { RefreshControl, ScrollView, View, Pressable, Animated, TextInput as RNTextInput, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Avatar,
  Text,
  Toast,
  trackAnalyticsEvent,
  useApiErrorHandler,
  useConnectivity,
  useTheme,
} from 'foodie-shared-rn';
import {
  useGetMyProfileQuery,
  useUploadProfileImageMutation,
  useUpdateMyProfileMutation,
} from '../../../api/endpoints/usersApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toUnwrappedApiError } from '../../auth/apiError';
import type { ProfileStackParamList } from '../../../navigation/types';
import { ProfileSkeleton } from '../components/ProfileSkeleton';
import { CustomerSupportModal } from '../components/CustomerSupportModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { initialsFromName } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAppDispatch } from '../../../store/hooks';
import { clearCredentials } from '../../auth/authSlice';
import { logoutCustomer } from '../../auth/session';
import { store } from '../../../store/store';

const PRESET_AVATARS = [
  'https://img.icons8.com/color/150/user-male-circle.png',
  'https://img.icons8.com/color/150/user-female-circle.png',
  'https://img.icons8.com/color/150/gender-neutral-user.png',
  'https://img.icons8.com/color/150/circled-user-male-skin-type-1-2.png',
  'https://img.icons8.com/color/150/circled-user-female-skin-type-4.png',
  'https://img.icons8.com/color/150/circled-user-male-skin-type-6.png',
  'https://img.icons8.com/color/150/businessman.png',
  'https://img.icons8.com/color/150/businesswoman.png',
  'https://img.icons8.com/color/150/student-male.png',
  'https://img.icons8.com/color/150/user-female-skin-type-7.png',
];

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { isConnected } = useConnectivity();
  const profileQuery = useGetMyProfileQuery(undefined, { pollingInterval: 3000, refetchOnFocus: true });
  const isSuspended = Boolean(profileQuery.data?.isSuspended || profileQuery.data?.accountStatus === 'SUSPENDED');
  const suspensionReason = profileQuery.data?.suspensionReason;
  const [uploadImage, uploadState] = useUploadProfileImageMutation();
  const [updateProfile, updateState] = useUpdateMyProfileMutation();
  const dispatch = useAppDispatch();

  const fullNameVal = profileQuery.data?.fullName || 'Foodie User';
  const phoneVal = profileQuery.data?.phoneNumber || '—';

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  const handleError = useApiErrorHandler({
    onToast: (error) => setToast({ message: error.message, variant: 'error' }),
    onModalBlocking: (error) => setToast({ message: error.message, variant: 'error' }),
    onInlineField: (error) => setToast({ message: error.message, variant: 'error' }),
    onFullScreen: (error) => setToast({ message: error.message, variant: 'error' }),
    onGeneric: (error) => setToast({ message: error.message, variant: 'error' }),
  });

  useEffect(() => {
    trackAnalyticsEvent('customer_profile_viewed');
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (profileQuery.data) {
      setNameVal(profileQuery.data.fullName || '');
      setEmailVal(profileQuery.data.email || '');
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (phoneVal && phoneVal !== '—') {
      AsyncStorage.getItem('user_avatar_' + phoneVal).then((val) => {
        if (val) {
          setAvatarUri(val);
        }
      }).catch(() => { });
    }
  }, [phoneVal]);

  const onSelectPresetAvatar = async (imageUrl: string) => {
    try {
      setAvatarUri(imageUrl);
      if (phoneVal && phoneVal !== '—') {
        await AsyncStorage.setItem('user_avatar_' + phoneVal, imageUrl);
      }
      trackAnalyticsEvent('preset_avatar_selected');
      setToast({ message: 'Avatar updated.', variant: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to save avatar.', variant: 'error' });
    }
  };

  const handleAvatarTap = () => {
    const currentAvatar = avatarUri || profileQuery.data?.profileImageUrl || PRESET_AVATARS[0];
    const currentIndex = PRESET_AVATARS.findIndex((url) => url === currentAvatar);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % PRESET_AVATARS.length;
    void onSelectPresetAvatar(PRESET_AVATARS[nextIndex]);
  };

  const handleSave = async () => {
    if (!isConnected) {
      setToast({ message: 'Connect to the internet to save changes.', variant: 'warning' });
      return;
    }
    if (!nameVal.trim()) {
      setToast({ message: 'Full name cannot be empty.', variant: 'error' });
      return;
    }
    try {
      await updateProfile({
        fullName: nameVal.trim(),
        email: emailVal.trim(),
      }).unwrap();
      setIsEditing(false);
      setToast({ message: 'Profile updated successfully.', variant: 'success' });
    } catch (error) {
      handleError(toUnwrappedApiError(error));
    }
  };

  const handleLogout = async () => {
    trackAnalyticsEvent('customer_logout');
    await logoutCustomer(dispatch, store.getState.bind(store));
    setToast({ message: 'Logged out successfully.', variant: 'success' });
  };



  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0A120E' }}
      contentContainerStyle={{ minHeight: '100%', paddingBottom: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={profileQuery.isFetching}
          onRefresh={() => { void profileQuery.refetch(); }}
          tintColor="#FCD34D"
        />
      }
    >
      {/* Curved Dark Green brand banner top arch with smooth gradient matching HomeScreen */}
      <LinearGradient
        colors={['#012B18', '#053E23', '#0A4D2E']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 266 + (insets.top || 24),
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
        }}
      />

      {/* Inline floating edit button */}
      <View style={{ position: 'absolute', top: (insets.top || 24) + 8, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center' }}>
        {isEditing && (
          <Pressable
            onPress={() => {
              setIsEditing(false);
              if (profileQuery.data) {
                setNameVal(profileQuery.data.fullName || '');
                setEmailVal(profileQuery.data.email || '');
              }
            }}
            style={{ marginRight: 8, backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            if (isEditing) {
              void handleSave();
            } else {
              setIsEditing(true);
            }
          }}
          disabled={updateState.isLoading}
          style={({ pressed }) => ({
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#FCD34D',
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Feather name={isEditing ? "check" : "edit-2"} size={14} color="#FCD34D" style={{ marginRight: 6 }} />
          <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 13 }}>
            {isEditing ? (updateState.isLoading ? 'Saving...' : 'Save') : 'Edit'}
          </Text>
        </Pressable>
      </View>

      <View style={{ paddingTop: (insets.top || 24) + 8, zIndex: 5, elevation: 5 }}>
        <Animated.View style={{ opacity: fadeValue, transform: [{ scale: scaleValue }], paddingHorizontal: tokens.spacing.lg }}>
          <View style={{ paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ fontSize: 34, lineHeight: 54, paddingTop: 10, fontWeight: '900', color: '#FCD34D', letterSpacing: 0.5 }}>Profile</Text>
          </View>

          {/* iOS Profile Avatar header inside the dark green arch */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Pressable
              disabled={uploadState.isLoading}
              onPress={handleAvatarTap}
              style={({ pressed }) => ({
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: '#FFFFFF',
                borderWidth: 3,
                borderColor: '#FCD34D', // Premium gold accent border
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
                position: 'relative',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Avatar
                uri={avatarUri || profileQuery.data?.profileImageUrl}
                initials={initialsFromName(fullNameVal)}
                size={94}
                accessibilityLabel="Profile avatar"
              />
              {/* Subtle tap-to-swap icon layout */}
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: '#FCD34D',
                width: 30,
                height: 30,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: '#14532D',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 3,
              }}>
                <Feather name="refresh-cw" size={13} color="#14532D" />
              </View>
            </Pressable>

            <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }}>
              {fullNameVal}
            </Text>
            <Text style={{ fontSize: 15, color: '#A7F3D0', fontWeight: '600' }}>
              {phoneVal}
            </Text>
          </View>

          {!isConnected && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="caption" color={tokens.color.warning}>
                Offline — showing cached profile.
              </Text>
            </View>
          )}

          {profileQuery.isLoading && !profileQuery.data ? (
            <View style={{ paddingVertical: tokens.spacing.lg }}>
              <ProfileSkeleton />
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              {/* Account Suspended Alert Card */}
              {isSuspended && (
                <View style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderColor: '#EF4444',
                  borderWidth: 1.5,
                  borderRadius: 16,
                  padding: 18,
                  marginBottom: 20,
                  shadowColor: '#EF4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 4,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{
                      backgroundColor: '#DC2626',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginRight: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Feather name="alert-octagon" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
                        ACCOUNT SUSPENDED
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 16, marginBottom: 4 }}>
                    Your account has been suspended by administration
                  </Text>
                  <Text style={{ color: '#FCA5A5', fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
                    Reason: <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{suspensionReason || 'Security policy review'}</Text>
                  </Text>
                  <Text style={{ color: '#D1D5DB', fontSize: 12, lineHeight: 16, marginBottom: 14 }}>
                    Placing new orders and checkout are currently disabled on your profile. If you believe this is an error or would like to submit an appeal, please contact support.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setIsSupportModalVisible(true)}
                      style={{
                        backgroundColor: '#DC2626',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                        Contact Support / Appeal
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void profileQuery.refetch();
                        setToast({ message: 'Refreshing account status...', variant: 'info' });
                      }}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#374151', fontWeight: '700', fontSize: 13 }}>
                        ↻ Refresh
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Grouped Info Item Details */}
              <Text style={{ fontSize: 13, textTransform: 'uppercase', color: '#FCD34D', fontWeight: '900', letterSpacing: 0.8, marginLeft: 16, marginBottom: 8 }}>
                Account Information
              </Text>

              <View style={{
                backgroundColor: '#131F18',
                borderRadius: 16,
                marginBottom: 24,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}>
                {/* Full name editable row */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="user" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600', flex: 1 }}>Name</Text>
                  {isEditing ? (
                    <RNTextInput
                      value={nameVal}
                      onChangeText={setNameVal}
                      style={{
                        fontSize: 16,
                        color: '#FFFFFF',
                        fontWeight: '700',
                        textAlign: 'right',
                        borderBottomWidth: 1,
                        borderBottomColor: '#FCD34D',
                        paddingVertical: 2,
                        minWidth: 150,
                      }}
                      placeholder="Name"
                      placeholderTextColor="#9CA3AF"
                      accessibilityLabel="Edit Name input"
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }}>{fullNameVal}</Text>
                  )}
                </View>
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />

                {/* Email address editable row */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="mail" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600', flex: 1 }}>Email</Text>
                  {isEditing ? (
                    <RNTextInput
                      value={emailVal}
                      onChangeText={setEmailVal}
                      style={{
                        fontSize: 16,
                        color: '#FFFFFF',
                        fontWeight: '700',
                        textAlign: 'right',
                        borderBottomWidth: 1,
                        borderBottomColor: '#FCD34D',
                        paddingVertical: 2,
                        minWidth: 150,
                      }}
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      accessibilityLabel="Edit Email input"
                    />
                  ) : (
                    <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }}>{emailVal}</Text>
                  )}
                </View>
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />

                {/* READ-ONLY mobile number is NEVER editable */}
                <View style={{ paddingHorizontal: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', opacity: 0.85 }}>
                  <Feather name="phone" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600', flex: 1 }}>Mobile (Locked)</Text>
                  <Text style={{ fontSize: 16, color: '#E5E7EB', fontWeight: '700' }}>{phoneVal}</Text>
                </View>

                {/* Account Status row */}
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />
                <View style={{ paddingHorizontal: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name={isSuspended ? "alert-triangle" : "shield"} size={20} color={isSuspended ? "#EF4444" : "#10B981"} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600', flex: 1 }}>Account Status</Text>
                  <View style={{
                    backgroundColor: isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSuspended ? '#EF4444' : '#10B981',
                  }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: isSuspended ? '#EF4444' : '#10B981',
                      letterSpacing: 0.5,
                    }}>
                      {isSuspended ? '● SUSPENDED' : '● ACTIVE'}
                    </Text>
                  </View>
                </View>
                {isSuspended && suspensionReason && (
                  <>
                    <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />
                    <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'column' }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>
                        Suspension Reason
                      </Text>
                      <Text style={{ fontSize: 14, color: '#EF4444', fontWeight: '600', lineHeight: 20 }}>
                        {suspensionReason}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Grouped Links */}
              <Text style={{ fontSize: 13, textTransform: 'uppercase', color: '#FCD34D', fontWeight: '900', letterSpacing: 0.8, marginLeft: 16, marginBottom: 8 }}>
                Preferences
              </Text>

              <View style={{
                backgroundColor: '#131F18',
                borderRadius: 16,
                marginBottom: 24,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}>
                <Pressable
                  onPress={() => navigation.navigate('Addresses', {})}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(252, 211, 77, 0.08)' : '#131F18',
                  })}
                >
                  <Feather name="map-pin" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>Delivery Addresses</Text>
                  <Text style={{ fontSize: 20, color: '#FCD34D', fontWeight: 'bold' }}>›</Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />

                <Pressable
                  onPress={() => navigation.navigate('Wallet')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(252, 211, 77, 0.08)' : '#131F18',
                  })}
                >
                  <Feather name="credit-card" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>My Wallet</Text>
                  <Text style={{ fontSize: 20, color: '#FCD34D', fontWeight: 'bold' }}>›</Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />

                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(252, 211, 77, 0.08)' : '#131F18',
                  })}
                >
                  <Feather name="settings" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>App Settings</Text>
                  <Text style={{ fontSize: 20, color: '#FCD34D', fontWeight: 'bold' }}>›</Text>
                </Pressable>
              </View>

              {/* Grouped Legal & Policies Links */}
              <Text style={{ fontSize: 13, textTransform: 'uppercase', color: '#FCD34D', fontWeight: '900', letterSpacing: 0.8, marginLeft: 16, marginBottom: 8 }}>
                Legal & Policies
              </Text>

              <View style={{
                backgroundColor: '#131F18',
                borderRadius: 16,
                marginBottom: 24,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}>
                <Pressable
                  onPress={() => setIsTermsModalVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(252, 211, 77, 0.08)' : '#131F18',
                  })}
                >
                  <Feather name="file-text" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>Terms & Conditions</Text>
                  <Text style={{ fontSize: 20, color: '#FCD34D', fontWeight: 'bold' }}>›</Text>
                </Pressable>
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 48 }} />

                <Pressable
                  onPress={() => setIsPrivacyModalVisible(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(252, 211, 77, 0.08)' : '#131F18',
                  })}
                >
                  <Feather name="shield" size={20} color="#FCD34D" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#FFFFFF', fontWeight: '600', flex: 1 }}>Privacy Policy</Text>
                  <Text style={{ fontSize: 20, color: '#FCD34D', fontWeight: 'bold' }}>›</Text>
                </Pressable>
              </View>

              {/* Log Out */}
              <View style={{
                backgroundColor: '#131F18',
                borderRadius: 16,
                marginBottom: 40,
                overflow: 'hidden',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.3)',
              }}>
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                    backgroundColor: pressed ? 'rgba(220, 38, 38, 0.15)' : '#131F18',
                  })}
                >
                  <Feather name="log-out" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 17, color: '#EF4444', fontWeight: '700', flex: 1 }}>Log Out</Text>
                  <Text style={{ fontSize: 20, color: '#EF4444', fontWeight: 'bold' }}>›</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      <Toast
        visible={Boolean(toast)}
        message={toast?.message ?? ''}
        variant={toast?.variant ?? 'info'}
        accessibilityLabel={toast?.message ?? 'Toast'}
        onDismiss={() => setToast(null)}
      />

      <PrivacyPolicyModal
        visible={isPrivacyModalVisible}
        onClose={() => setIsPrivacyModalVisible(false)}
      />

      <TermsAndConditionsModal
        visible={isTermsModalVisible}
        onClose={() => setIsTermsModalVisible(false)}
      />
    </ScrollView>
  );
}
