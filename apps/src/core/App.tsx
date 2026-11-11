import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  ErrorBoundaryFallback,
  captureCrashException,
} from 'foodie-shared-rn';
import { StyleSheet, View } from 'react-native';
import { RootNavigator } from '../navigation/RootNavigator';
import { BootstrapGate } from './bootstrap/BootstrapGate';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { PushRegistrationBridge } from './push/PushRegistrationBridge';
import { NavigationProvider } from './providers/NavigationProvider';
import { ReduxProvider } from './providers/ReduxProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import * as Notifications from 'expo-notifications';
import { initGlobalLocation } from './GlobalLocation';
import { isExpoGo } from '../features/notifications/pushRegistration';
import { useAppStateChange } from 'foodie-shared-rn';
import { useAppDispatch } from '../store/hooks';
import { baseApi } from '../api/baseApi';

function ForegroundSyncBridge() {
  const dispatch = useAppDispatch();
  useAppStateChange((next, previous) => {
    if (previous?.match(/inactive|background/) && next === 'active') {
      try {
        dispatch(baseApi.util.invalidateTags(['Order', 'Cart', 'Restaurant']));
      } catch {}
    }
  });
  return null;
}

if (!isExpoGo()) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

type BoundaryState = { hasError: boolean };

class RootErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  override state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    captureCrashException(error, { screenName: 'RootErrorBoundary' });
    console.error("🔥 FATAL ERROR BOUNDARY CRASH 🔥");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component details:", info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          variant="root"
          onAction={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * Root composition — Blueprint §2.1.
 * Providers only + navigation; no business screens.
 */
export default function App() {
  React.useEffect(() => {
    void (async () => {
      if (!isExpoGo()) {
        try {
          await Notifications.requestPermissionsAsync();
        } catch { }
      }
      try {
        await initGlobalLocation(true);
      } catch { }
    })();
  }, []);

  return (
    <ThemeProvider>
      <RootErrorBoundary>
        <ReduxProvider>
          <NavigationProvider>
            <BootstrapGate>
              <View style={styles.shell}>
                <ConnectivityBanner />
                <PushRegistrationBridge />
                <ForegroundSyncBridge />
                <View style={styles.content}>
                  <RootNavigator />
                </View>
              </View>
            </BootstrapGate>
          </NavigationProvider>
        </ReduxProvider>
      </RootErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
