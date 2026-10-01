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

let hostIp = '10.109.177.186';
if (Constants.expoConfig?.hostUri) {
  hostIp = Constants.expoConfig.hostUri.split(':')[0];
} else if (Platform.OS === 'android') {
  hostIp = '10.0.2.2'; // default android emulator loopback IP
}

let apiBaseUrl = 'https://api.foodie.kwiko.org';
let wsUrl = 'wss://api.foodie.kwiko.org/ws';

// The API paths are intentionally fixed to production endpoint.
// User requested to work exclusively against the online backend.

export const ENV = {
  apiBaseUrl,
  wsUrl,
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
