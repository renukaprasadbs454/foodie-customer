import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import {
  selectAuthStatus,
  selectIsNewUser,
} from '../features/auth/authSlice';
import { SplashScreen } from '../features/auth/screens/SplashScreen';
import { ProfileCompletionGateScreen } from '../features/auth/screens/ProfileCompletionGateScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { linking } from './linking';
import {
  shouldShowMainNavigator,
  shouldShowProfileCompletion,
  shouldShowSuspended,
} from './routeGuards';
import type { RootStackParamList } from './types';
import { useNotificationsSubscription } from '../features/notifications/hooks/useNotificationsSubscription';
import { useGetMyProfileQuery } from '../api/endpoints/usersApi';
import { SuspendedScreen } from '../features/auth/screens/SuspendedScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Auth-gated root — Blueprint §14.2 / System Design §5.2 / P2-AUTH-01.
 * Suspended accounts are immediately routed to dedicated SuspendedScreen with zero app access.
 */
export function RootNavigator() {
  const authStatus = useAppSelector(selectAuthStatus);
  const isNewUser = useAppSelector(selectIsNewUser);

  // Global websocket listener for customer notifications (schedules local push)
  useNotificationsSubscription();

  const profileQuery = useGetMyProfileQuery(undefined, {
    skip: authStatus !== 'authenticated',
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const isSuspended = Boolean(
    authStatus === 'authenticated' &&
      (profileQuery.data?.isSuspended || profileQuery.data?.accountStatus === 'SUSPENDED'),
  );

  // If unsuspended by admin, cleanly transition from /suspended back to /restaurants
  useEffect(() => {
    if (!isSuspended && authStatus === 'authenticated' && Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.location.pathname === '/suspended') {
        window.history.replaceState(null, '', '/restaurants');
      }
    }
  }, [isSuspended, authStatus]);

  if (authStatus === 'authenticating' || authStatus === 'idle') {
    return <SplashScreen />;
  }

  // Prevent flash of Main while initial authenticated profile check resolves
  if (authStatus === 'authenticated' && profileQuery.isLoading && !profileQuery.data) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {shouldShowSuspended(authStatus, isSuspended) ? (
          <Stack.Screen
            name="Suspended"
            component={SuspendedScreen}
            options={{ title: 'Account Suspended' }}
          />
        ) : shouldShowMainNavigator(authStatus, isNewUser, isSuspended) ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : shouldShowProfileCompletion(authStatus, isNewUser, isSuspended) ? (
          <Stack.Screen
            name="ProfileCompletion"
            component={ProfileCompletionGateScreen}
          />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
