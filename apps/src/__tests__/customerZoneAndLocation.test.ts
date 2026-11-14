jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { hostUri: '10.18.9.80:8081', version: '0.1.0' },
  },
}));

import {
  globalLocation,
  setSelectedAddress,
  subscribeLocation,
  setGlobalZone,
  reverseGeocodeCoords,
  initGlobalLocation,
  detectZoneFromCoords,
} from '../core/GlobalLocation';
import { isRestaurantInZone } from '../features/restaurants/utils/zoneTargeting';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 13.3379, longitude: 77.1173 },
  }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 13.3379, longitude: 77.1173 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([
    {
      street: 'Siddaganga Extension',
      district: 'Tumkur',
      city: 'Tumkur',
      region: 'Karnataka',
    },
  ]),
  Accuracy: {
    High: 4,
    Balanced: 3,
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe('Customer Zone and Location Engine', () => {
  it('subscribes to location changes and updates state', () => {
    let capturedData: any = null;
    const unsubscribe = subscribeLocation((data) => {
      capturedData = data;
    });

    expect(capturedData).toBeDefined();

    setGlobalZone({
      serviceable: true,
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
      cityName: 'Tumkur',
      restaurantCount: 12,
      availableZones: ['Tumkur Zone', 'Bangalore Zone'],
    });

    expect(globalLocation.zone?.zoneId).toBe('dz-tumkur');
    expect(globalLocation.zone?.serviceable).toBe(true);

    unsubscribe();
  });

  it('updates selected address with exact coordinates and sets source to SELECTED_ADDRESS', async () => {
    await setSelectedAddress({
      addressId: 'addr-bgl-001',
      label: 'Office',
      line1: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
    });

    expect(globalLocation.coords).toEqual({
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(globalLocation.source).toBe('SELECTED_ADDRESS');
    expect(globalLocation.address).toContain('Office');
    expect(globalLocation.address).toContain('100 Feet Road');
    expect(globalLocation.address).toContain('Bengaluru');
  });

  it('resolves reverse geocoding into clean address string', async () => {
    const addr = await reverseGeocodeCoords(13.3379, 77.1173);
    expect(typeof addr).toBe('string');
    expect(addr.length).toBeGreaterThan(0);
    expect(addr).toContain('Tumkur');
  });

  it('fetches fresh GPS location and clears manual address override on every app open', async () => {
    // First simulate manual address selection during session
    await setSelectedAddress({
      addressId: 'manual-addr',
      label: 'Old Address',
      line1: 'MG Road',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(globalLocation.source).toBe('SELECTED_ADDRESS');

    // Simulate closing and reopening the app (forceGps: true)
    await initGlobalLocation(true);

    // Must reset back to live GPS source and fresh live coordinates
    expect(globalLocation.source).toBe('GPS');
    expect(globalLocation.coords).toEqual({
      latitude: 13.3379,
      longitude: 77.1173,
    });
    expect(globalLocation.address).toContain('Tumkur');
  });

  it('preserves selected address across in-session page refresh', async () => {
    await setSelectedAddress({
      addressId: 'manual-addr-2',
      label: 'Home',
      line1: 'Indiranagar 100ft Rd',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(globalLocation.source).toBe('SELECTED_ADDRESS');

    // Simulate page refresh (calling initGlobalLocation without forceGps)
    await initGlobalLocation(false);

    // Selected address MUST be preserved!
    expect(globalLocation.source).toBe('SELECTED_ADDRESS');
    expect(globalLocation.address).toContain('Indiranagar');
  });

  describe('Zone-based restaurant display and zero cross-city leakage', () => {
    const bangaloreZone = {
      zoneId: 'dz-bangalore',
      zoneName: 'Bangalore Zone',
      cityName: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      serviceable: true,
    };

    const tumkurZone = {
      zoneId: 'dz-tumkur',
      zoneName: 'Tumkur Zone',
      cityName: 'Tumkur',
      latitude: 13.3400,
      longitude: 77.1000,
      serviceable: true,
    };

    const yadiyurUnserviceableZone = {
      zoneId: null,
      zoneName: null,
      cityName: null,
      latitude: 13.0000,
      longitude: 76.8500,
      serviceable: false,
    };

    const shettyBiriyaniTumkur = {
      id: 'ebef972f-8a30-4a57-a2a6-66e3d31d4389',
      name: 'Shetty biriyani house',
      city: 'Tumkuru',
      latitude: 13.162259,
      longitude: 77.560198,
    };

    const madhuvanTumkur = {
      id: '5d938f03-719b-48c3-9c57-99b94d14374f',
      name: 'Madhuvan',
      city: 'Tumkur',
      latitude: 13.334000,
      longitude: 77.112000,
    };

    const burgerAndBowlBangalore = {
      id: '1a1da690-8c45-4c01-9216-f331f17a8b8d',
      name: 'Burger & Bowl Co.',
      city: 'Bengaluru',
      latitude: 12.9756,
      longitude: 77.6067,
    };

    it('displays ONLY Bangalore restaurants when customer is in Bangalore Zone', () => {
      // In Bangalore, Bangalore restaurants MUST return true
      expect(isRestaurantInZone(burgerAndBowlBangalore, bangaloreZone)).toBe(true);

      // In Bangalore, Tumkur restaurants MUST return false (never display!)
      expect(isRestaurantInZone(shettyBiriyaniTumkur, bangaloreZone)).toBe(false);
      expect(isRestaurantInZone(madhuvanTumkur, bangaloreZone)).toBe(false);
    });

    it('displays ONLY Tumkur restaurants when customer is in Tumkur Zone', () => {
      // In Tumkur, Tumkur restaurants MUST return true
      expect(isRestaurantInZone(shettyBiriyaniTumkur, tumkurZone)).toBe(true);
      expect(isRestaurantInZone(madhuvanTumkur, tumkurZone)).toBe(true);

      // In Tumkur, Bangalore restaurants MUST return false (never display!)
      expect(isRestaurantInZone(burgerAndBowlBangalore, tumkurZone)).toBe(false);
    });

    it('strictly displays ZERO restaurants when location is unserviceable (e.g. Yadiyur)', () => {
      expect(isRestaurantInZone(burgerAndBowlBangalore, yadiyurUnserviceableZone)).toBe(false);
      expect(isRestaurantInZone(shettyBiriyaniTumkur, yadiyurUnserviceableZone)).toBe(false);
      expect(isRestaurantInZone(madhuvanTumkur, yadiyurUnserviceableZone)).toBe(false);
    });

    it('grounds coordinates to correct zones in detectZoneFromCoords', async () => {
      // Bangalore coordinates
      const blrDetect = await detectZoneFromCoords(12.9716, 77.5946);
      expect(blrDetect?.serviceable).toBe(true);
      expect(blrDetect?.zoneId).toBe('dz-bangalore');
      expect(blrDetect?.zoneName).toBe('Bangalore Zone');

      // Tumkur coordinates
      const tmkDetect = await detectZoneFromCoords(13.3400, 77.1000);
      expect(tmkDetect?.serviceable).toBe(true);
      expect(tmkDetect?.zoneId).toBe('dz-tumkur');
      expect(tmkDetect?.zoneName).toBe('Tumkur Zone');

      // Yadiyur coordinates (outside serviceable area)
      const yadiyurDetect = await detectZoneFromCoords(13.0000, 76.8500);
      expect(yadiyurDetect?.serviceable).toBe(false);
      expect(yadiyurDetect?.zoneId).toBeNull();
    });
  });
});
