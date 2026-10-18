jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import {
  globalLocation,
  setSelectedAddress,
  subscribeLocation,
  setGlobalZone,
  reverseGeocodeCoords,
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
});
