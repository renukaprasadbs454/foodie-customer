import Constants from 'expo-constants';

/**
 * Environment configuration — points to production online backend api.foodie.kwiko.org.
 */
type Extra = {
  apiBaseUrl?: string;
  wsUrl?: string;
  googleWebClientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const ENV = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? 'https://api.foodie.kwiko.org',
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
