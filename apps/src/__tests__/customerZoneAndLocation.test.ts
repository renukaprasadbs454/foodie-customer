jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

import {
  globalLocation,
  setSelectedAddress,
  subscribeLocation,
  setGlobalZone,
  reverseGeocodeCoords,
  initGlobalLocation,
} from '../core/GlobalLocation';

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

  describe('Live location zone isolation and zero cross-zone leakage', () => {
    // Import isRestaurantInZone
    const { isRestaurantInZone } = require('../features/restaurants/utils/zoneTargeting');

    const tumkurCustomerCoords = {
      latitude: 13.3400,
      longitude: 77.1000,
      serviceable: true,
      zoneId: 'dz-tumkur',
    };

    const bangaloreCustomerCoords = {
      latitude: 12.9716,
      longitude: 77.5946,
      serviceable: true,
      zoneId: 'dz-bangalore',
    };

    const yadiyurCustomerCoords = {
      latitude: 13.0000,
      longitude: 76.8500,
      serviceable: false,
      zoneId: null,
    };

    const meghanaFoodsTumkur = {
      id: 'd3133510-5295-4753-9418-c06ecb3e962f',
      name: 'Meghana Foods (Biryani)',
      city: 'Tumkur',
      latitude: 13.347959,
      longitude: 77.124886,
    };

    const burgerAndBowlBangalore = {
      id: '1a1da690-8c45-4c01-9216-f331f17a8b8d',
      name: 'Burger & Bowl Co.',
      city: 'Bengaluru',
      latitude: 12.9756,
      longitude: 77.6067,
    };

    it('displays ONLY Tumkur restaurants when live location is in Tumkur', () => {
      expect(isRestaurantInZone(meghanaFoodsTumkur, tumkurCustomerCoords)).toBe(true);
      expect(isRestaurantInZone(burgerAndBowlBangalore, tumkurCustomerCoords)).toBe(false);
    });

    it('displays ONLY Bangalore restaurants when live location is in Bangalore', () => {
      expect(isRestaurantInZone(burgerAndBowlBangalore, bangaloreCustomerCoords)).toBe(true);
      expect(isRestaurantInZone(meghanaFoodsTumkur, bangaloreCustomerCoords)).toBe(false);
    });

    it('strictly displays ZERO restaurants when live location is unserviceable (e.g. Yadiyur)', () => {
      expect(isRestaurantInZone(meghanaFoodsTumkur, yadiyurCustomerCoords)).toBe(false);
      expect(isRestaurantInZone(burgerAndBowlBangalore, yadiyurCustomerCoords)).toBe(false);
    });

    it('blocks restaurants that are farther than 25 km away', () => {
      const farRestaurant = {
        id: 'far-resto-1',
        name: 'Distant Diner',
        city: 'Tumkur',
        latitude: 13.3400,
        longitude: 77.1000,
      };
      // Customer in Bangalore is ~70km from Tumkur
      expect(isRestaurantInZone(farRestaurant, bangaloreCustomerCoords)).toBe(false);
    });
  });
});
