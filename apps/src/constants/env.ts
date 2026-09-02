import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Environment configuration — points to production online backend api.foodie.kwiko.org.
 * On Web in dev mode, routes through Metro proxy to bypass browser CORS preflight blocks.
 */
type Extra = {
  apiBaseUrl?: string;
  wsUrl?: string;
  googleWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

let apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'https://api.foodie.kwiko.org';
if (Platform.OS === 'web' && __DEV__ && typeof window !== 'undefined' && window.location?.origin) {
  apiBaseUrl = window.location.origin;
}

export const ENV = {
  apiBaseUrl,
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? extra.wsUrl ?? 'wss://api.foodie.kwiko.org/ws',
  googleWebClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    extra.googleWebClientId ??
    '',
  appName: 'foodie-customer',
  appVersion: Constants.expoConfig?.version ?? '0.1.0',
} as const;

if (__DEV__) {
  console.log('[Foodie Env] Target API Base URL:', ENV.apiBaseUrl);
}
