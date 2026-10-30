import React, { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { useConnectivity } from 'foodie-shared-rn';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setConnectivity } from '../../store/connectivitySlice';
import { selectAuthStatus, setAuthStatus } from '../../features/auth/authSlice';
import { runBootstrap } from './bootstrap';

export function BootstrapGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const authStatus = useAppSelector(selectAuthStatus);
  const [ready, setReady] = useState(false);
  const connectivity = useConnectivity();

  useEffect(() => {
    dispatch(
      setConnectivity({
        isConnected: connectivity.isConnected,
        isInternetReachable: connectivity.isInternetReachable,
      }),
    );
  }, [
    connectivity.isConnected,
    connectivity.isInternetReachable,
    dispatch,
  ]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await Promise.race([
          Promise.allSettled([
            runBootstrap(dispatch),
            (async () => {
              try {
                if (Feather?.font) {
                  await Font.loadAsync(Feather.font);
                }
              } catch {
                // Ignore font load errors
              }
            })(),
          ]),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch {
        // Fallback
      }
      if (mounted) {
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (ready && (authStatus === 'idle' || authStatus === 'authenticating')) {
      dispatch(setAuthStatus('unauthenticated'));
    }
  }, [ready, authStatus, dispatch]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF5252" />
      </View>
    );
  }

  return <>{children}</>;
}

