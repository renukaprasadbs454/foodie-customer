import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Text, Toast } from 'foodie-shared-rn';
import { useGetMyProfileQuery } from '../../../api/endpoints/usersApi';
import { logoutCustomer } from '../session';
import { useAppDispatch } from '../../../store/hooks';
import { store } from '../../../store/store';
import { CustomerSupportModal } from '../../profile/components/CustomerSupportModal';

/**
 * Dedicated Account Suspended Screen.
 * Completely blocks access to operate the application when a customer's account is suspended.
 */
export function SuspendedScreen() {
  const dispatch = useAppDispatch();
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const {
    data: profile,
    refetch,
    isFetching,
  } = useGetMyProfileQuery(undefined, {
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for the suspended badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sync web browser URL to /suspended
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (window.location.pathname !== '/suspended') {
          window.history.replaceState(null, '', '/suspended');
        }
      } catch {
        // Safe fallback
      }
    }
  }, []);

  const isSuspended = Boolean(
    profile?.isSuspended || profile?.accountStatus === 'SUSPENDED'
  );

  // When admin lifts the suspension, immediately unlock and redirect back to customer app
  useEffect(() => {
    if (profile && !isSuspended) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/restaurants';
      }
    }
  }, [profile, isSuspended]);

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await refetch();
      const updatedProfile = res.data;
      const stillSuspended = Boolean(
        updatedProfile?.isSuspended || updatedProfile?.accountStatus === 'SUSPENDED'
      );
      if (stillSuspended) {
        setToast({
          message: `Account is still suspended: "${updatedProfile?.suspensionReason || 'Security policy review'}". Please submit an appeal or contact support.`,
          variant: 'error',
        });
      } else {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = '/restaurants';
        }
      }
    } catch {
      setToast({
        message: 'Could not connect to server. Please check your network and try again.',
        variant: 'error',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutCustomer(dispatch, store.getState);
    } catch {
      setToast({
        message: 'Error during sign out. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const reason = profile?.suspensionReason || 'Security policy review';
  const customerName = profile?.fullName || 'Customer User';
  const customerEmail = profile?.email || 'customer@foodie.com';
  const customerPhone = profile?.phoneNumber || '+91 98765 43210';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#080E0B" barStyle="light-content" />

      {Boolean(toast) && (
        <View style={styles.toastContainer}>
          <Toast
            visible={Boolean(toast)}
            message={toast?.message ?? ''}
            variant={toast?.variant ?? 'info'}
            accessibilityLabel={toast?.message ?? 'Toast'}
            onDismiss={() => setToast(null)}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Glowing Alert Header Visual */}
          <View style={styles.iconWrapper}>
            <Animated.View
              style={[
                styles.iconGlowRing,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <LinearGradient
              colors={['#7F1D1D', '#991B1B', '#DC2626']}
              style={styles.iconCircle}
            >
              <Feather name="slash" size={38} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Status Badge */}
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>ACCOUNT SUSPENDED</Text>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.titleText}>Access Restricted</Text>
          <Text style={styles.subtitleText}>
            Your customer account has been suspended by administration. All operations, ordering, checkout, and app access are currently disabled.
          </Text>

          {/* Suspension Reason Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="alert-triangle" size={16} color="#EF4444" />
              <Text style={styles.cardHeaderTitle}>REASON FOR SUSPENSION</Text>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>"{reason}"</Text>
            </View>
            <Text style={styles.cardExplanation}>
              This restriction was placed by the platform security administration. While your account is suspended, you cannot browse restaurants, view menus, add items to cart, or place orders.
            </Text>
          </View>

          {/* Account Details Card */}
          <View style={styles.accountCard}>
            <Text style={styles.accountCardTitle}>ACCOUNT DETAILS</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountRowLabel}>Name</Text>
              <Text style={styles.accountRowValue}>{customerName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.accountRow}>
              <Text style={styles.accountRowLabel}>Phone</Text>
              <Text style={styles.accountRowValue}>{customerPhone}</Text>
            </View>
            {Boolean(profile?.email) && (
              <>
                <View style={styles.divider} />
                <View style={styles.accountRow}>
                  <Text style={styles.accountRowLabel}>Email</Text>
                  <Text style={styles.accountRowValue}>{customerEmail}</Text>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.accountRow}>
              <Text style={styles.accountRowLabel}>Status</Text>
              <View style={styles.accountStatusTag}>
                <Text style={styles.accountStatusTagText}>SUSPENDED</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Contact Support / Appeal Button */}
            <Pressable
              accessibilityLabel="Contact Support and Submit Appeal"
              onPress={() => setSupportModalVisible(true)}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButtonContent}
              >
                <Feather name="headphones" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  Contact Support & Appeal
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Check Account Status Button */}
            <Pressable
              accessibilityLabel="Check Account Status"
              disabled={isCheckingStatus || isFetching}
              onPress={() => void handleCheckStatus()}
              style={({ pressed }) => [
                styles.secondaryButton,
                (isCheckingStatus || isFetching) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {isCheckingStatus || isFetching ? (
                <ActivityIndicator size="small" color="#FCD34D" />
              ) : (
                <Feather name="refresh-cw" size={16} color="#FCD34D" />
              )}
              <Text style={styles.secondaryButtonText}>
                {isCheckingStatus || isFetching ? 'Checking Status...' : 'Check Account Status'}
              </Text>
            </Pressable>

            {/* Sign Out Button */}
            <Pressable
              accessibilityLabel="Sign Out of Suspended Account"
              disabled={isLoggingOut}
              onPress={() => void handleLogout()}
              style={({ pressed }) => [
                styles.logoutButton,
                isLoggingOut && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Feather name="log-out" size={16} color="#EF4444" />
              )}
              <Text style={styles.logoutButtonText}>
                {isLoggingOut ? 'Signing out...' : 'Sign Out / Switch Account'}
              </Text>
            </Pressable>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerHelpText}>
            Need immediate help? You can also email us directly at{' '}
            <Text style={styles.footerLink}>support@foodie.com</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Integrated Customer Support Modal */}
      <CustomerSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        customerName={customerName}
        customerEmail={customerEmail}
        customerPhone={customerPhone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080E0B',
  },
  toastContainer: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  container: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  iconGlowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1.2,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 7,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  statusPillText: {
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F1813',
    borderWidth: 1.2,
    borderColor: '#EF4444',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardHeaderTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  reasonBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasonText: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardExplanation: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  accountCard: {
    width: '100%',
    backgroundColor: '#0F1813',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  accountCardTitle: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  accountRowLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  accountRowValue: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 4,
  },
  accountStatusTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accountStatusTagText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#122019',
    borderWidth: 1.2,
    borderColor: 'rgba(252, 211, 77, 0.4)',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FCD34D',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  logoutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerHelpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FCD34D',
    fontWeight: '700',
  },
});
