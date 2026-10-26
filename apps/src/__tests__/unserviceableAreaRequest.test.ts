jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { hostUri: '10.18.9.80:8081', version: '0.1.0' },
  },
}));

const mockAsyncStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockAsyncStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockAsyncStorage[key];
    return Promise.resolve();
  }),
}));

import { submitCustomerUnserviceableAreaRequest } from '../features/restaurants/services/unserviceableAreaService';

describe('Customer Unserviceable Area Request Service', () => {
  beforeEach(() => {
    for (const k in mockAsyncStorage) delete mockAsyncStorage[k];
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('formats payload with customer details and broadcasts to backend', async () => {
    const res = await submitCustomerUnserviceableAreaRequest({
      customerName: 'Renuka Prasad',
      email: 'renukaprasadbs454@gmail.com',
      phone: '+91 98765 43210',
      address: 'Hassan Main Road, Hassan',
      coords: { latitude: 13.0033, longitude: 76.1004 },
      cityName: 'Hassan',
    });

    expect(res.success).toBe(true);
    expect(res.alreadyReported).toBeFalsy();

    // Verify fetch was called with formatted [Customer] restaurantName
    expect(global.fetch).toHaveBeenCalled();
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const firstBody = JSON.parse(calls[0][1].body);
    expect(firstBody.restaurantName).toBe('[Customer] Renuka Prasad');
    expect(firstBody.requesterName).toBe('Renuka Prasad');
    expect(firstBody.requestSource).toBe('CUSTOMER');
    expect(firstBody.address).toBe('Hassan Main Road, Hassan');
    expect(firstBody.latitude).toBe(13.0033);
    expect(firstBody.longitude).toBe(76.1004);
    expect(firstBody.contactEmail).toBe('renukaprasadbs454@gmail.com');
    expect(firstBody.status).toBe('PENDING');
  });

  it('deduplicates submissions for the same coordinates', async () => {
    const coords = { latitude: 13.9299, longitude: 75.5681 };

    const first = await submitCustomerUnserviceableAreaRequest({
      customerName: 'Customer One',
      coords,
      address: 'Shimoga Bus Stand',
    });
    expect(first.alreadyReported).toBeFalsy();

    const second = await submitCustomerUnserviceableAreaRequest({
      customerName: 'Customer One',
      coords,
      address: 'Shimoga Bus Stand',
    });
    expect(second.alreadyReported).toBe(true);
  });
});
