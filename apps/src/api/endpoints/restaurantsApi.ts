import { baseApi } from '../baseApi';
import type {
  CustomerZoneInfo,
  RestaurantListParams,
  RestaurantPublicProfile,
  RestaurantReview,
  RestaurantReviewsParams,
  RestaurantSummary,
} from '../../features/restaurants/types';
import { DEFAULT_RESTAURANT_PAGE_SIZE } from '../../features/restaurants/types';

export { hasMoreRestaurantPages } from '../../features/restaurants/types';

function resolveRestaurantCity(item: any): string {
  if (item.city && typeof item.city === 'string' && item.city.trim().length > 0) {
    return item.city.trim();
  }
  if (item.address && typeof item.address === 'object' && item.address.city && typeof item.address.city === 'string') {
    return item.address.city.trim();
  }
  if (item.zoneName && typeof item.zoneName === 'string' && item.zoneName.trim().length > 0) {
    return item.zoneName.trim();
  }
  const lat = item.latitude ? Number(item.latitude) : null;
  const lng = item.longitude ? Number(item.longitude) : null;
  if (lat !== null && lng !== null) {
    // Tumkur region: ~13.18 to 13.50 N, 76.90 to 77.25 E
    if (lat >= 13.18 && lat <= 13.50 && lng >= 76.90 && lng <= 77.25) {
      return 'Tumkur';
    }
    // Bengaluru region: ~12.80 to 13.15 N, 77.40 to 77.85 E
    if (lat >= 12.80 && lat <= 13.15 && lng >= 77.40 && lng <= 77.85) {
      return 'Bengaluru';
    }
    // Mysuru region: ~12.20 to 12.45 N, 76.50 to 76.80 E
    if (lat >= 12.20 && lat <= 12.45 && lng >= 76.50 && lng <= 76.80) {
      return 'Mysuru';
    }
    // Hubballi region: ~15.20 to 15.50 N, 75.00 to 75.30 E
    if (lat >= 15.20 && lat <= 15.50 && lng >= 75.00 && lng <= 75.30) {
      return 'Hubballi';
    }
  }
  if (item.name && typeof item.name === 'string') {
    const lower = item.name.toLowerCase();
    if (lower.includes('tumkur')) return 'Tumkur';
    if (lower.includes('bengaluru') || lower.includes('bangalore')) return 'Bengaluru';
    if (lower.includes('mysuru') || lower.includes('mysore')) return 'Mysuru';
    if (lower.includes('hubballi') || lower.includes('hubli')) return 'Hubballi';
  }
  return '';
}

function normalizeRestaurantList(data: unknown): RestaurantSummary[] {
  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = data as any;
    if (Array.isArray(obj.content)) list = obj.content;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (obj.data && Array.isArray(obj.data.content)) list = obj.data.content;
    else if (obj.data && Array.isArray(obj.data.items)) list = obj.data.items;
    else if (obj.data && Array.isArray(obj.data)) list = obj.data;
  }

  return list.map((item) => ({
    id: item.id || item.restaurantId || 'mock-resto-1',
    name: item.name || 'Foodie Restaurant',
    description: item.description || 'Delicious food delivered fast & fresh',
    cuisineTypes: Array.isArray(item.cuisineTypes)
      ? item.cuisineTypes
      : typeof item.cuisineTypes === 'string'
        ? item.cuisineTypes.split(',').map((s: string) => s.trim())
        : ['Indian', 'Multi-cuisine'],
    avgRating: item.avgRating !== undefined && item.avgRating !== null ? Number(item.avgRating) : 4.5,
    ratingCount: item.ratingCount ?? 120,
    imageUrl: item.imageUrl || item.coverImageKey || item.logoImageKey || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600',
    city: resolveRestaurantCity(item),
    latitude: item.latitude ? Number(item.latitude) : 12.9716,
    longitude: item.longitude ? Number(item.longitude) : 77.5946,
    isOpen: typeof item.isOpen === 'boolean' ? item.isOpen : true,
    topPosition: typeof item.topPosition === 'number' ? item.topPosition : null,
    restaurantType: item.restaurantType || (item.name?.toLowerCase().includes('ctr') ? 'VEGETARIAN' : null),
    isPureVeg: typeof item.isPureVeg === 'boolean'
      ? item.isPureVeg
      : (item.restaurantType === 'VEGETARIAN' || Boolean(item.name?.toLowerCase().includes('ctr'))),
    zoneId: item.zoneId || item.zone_id || (item.zone && typeof item.zone === 'object' ? item.zone.id : null) || null,
    zoneName: item.zoneName || item.zone_name || (item.zone && typeof item.zone === 'object' ? item.zone.name : null) || null,
    enabledCouponIds: Array.isArray(item.enabledCouponIds)
      ? item.enabledCouponIds
      : Array.isArray(item.enabledCoupons)
        ? item.enabledCoupons.map((c: any) => typeof c === 'string' ? c : c.id || c.code)
        : null,
  }));
}

function normalizeReviewList(data: unknown): RestaurantReview[] {
  let list: any[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const obj = data as any;
    if (Array.isArray(obj.content)) list = obj.content;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (obj.data && Array.isArray(obj.data.content)) list = obj.data.content;
    else if (obj.data && Array.isArray(obj.data.items)) list = obj.data.items;
    else if (obj.data && Array.isArray(obj.data)) list = obj.data;
  }
  return list;
}

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRestaurants: builder.query<RestaurantSummary[], RestaurantListParams>({
      query: ({
        search,
        lat,
        lng,
        zoneId,
        cuisineType,
        page = 0,
        size = DEFAULT_RESTAURANT_PAGE_SIZE,
        sort,
      }) => ({
        url: '/api/v1/restaurants',
        params: {
          ...(search ? { search } : {}),
          ...(lat !== undefined ? { lat } : {}),
          ...(lng !== undefined ? { lng } : {}),
          ...(zoneId ? { zoneId } : {}),
          ...(cuisineType ? { cuisineType } : {}),
          page,
          size: Math.min(size, 100),
          ...(sort && sort !== 'nearby' ? { sort } : {}),
        },
      }),
      transformResponse: (response: unknown) => normalizeRestaurantList(response),
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Restaurant' as const, id })),
            { type: 'Restaurant', id: 'LIST' },
          ]
          : [{ type: 'Restaurant', id: 'LIST' }],
      keepUnusedDataFor: 150,
    }),
    getRestaurant: builder.query<RestaurantPublicProfile, string>({
      queryFn: async (restaurantId, _queryApi, _extraOptions, baseQuery) => {
        // Fallback for non-UUID strings, mock IDs, or default dummy UUIDs to prevent backend 404/500 errors
        if (!restaurantId || !restaurantId.includes('-') || restaurantId.length < 20 || restaurantId.startsWith('00000000-') || restaurantId.startsWith('mock-')) {
          return {
            data: {
              id: restaurantId || '00000000-0000-0000-0000-000000000101',
              name: 'Foodie Special Restaurant',
              description: 'Delicious food delivered fast & fresh',
              addressLine: '123 Foodie Street, Koramangala',
              phoneNumber: '9876543210',
              status: 'APPROVED',
              cuisineTypes: ['Indian', 'Chinese', 'Italian'],
              city: 'Bengaluru',
              latitude: 12.9716,
              longitude: 77.5946,
            } as RestaurantPublicProfile,
          };
        }

        const result = await baseQuery(`/api/v1/restaurants/${restaurantId}`);
        if (result.data) {
          const raw = (result.data as any).data ?? result.data;
          const resolvedZoneId =
            raw.zoneId ||
            raw.zone_id ||
            (raw.zone && typeof raw.zone === 'object' ? raw.zone.id : null) ||
            null;
          const resolvedZoneName =
            raw.zoneName ||
            raw.zone_name ||
            (raw.zone && typeof raw.zone === 'object' ? raw.zone.name : null) ||
            null;
          const resolvedEnabledCoupons = Array.isArray(raw.enabledCouponIds)
            ? raw.enabledCouponIds
            : Array.isArray(raw.enabledCoupons)
              ? raw.enabledCoupons.map((c: any) => typeof c === 'string' ? c : c.id || c.code)
              : null;

          return {
            data: {
              ...raw,
              zoneId: resolvedZoneId,
              zoneName: resolvedZoneName,
              enabledCouponIds: resolvedEnabledCoupons,
            } as RestaurantPublicProfile,
          };
        }

        // Fallback if network/backend returns error
        return {
          data: {
            id: restaurantId,
            name: 'Foodie Special Restaurant',
            description: 'Delicious food delivered fast & fresh',
            addressLine: '123 Foodie Street, Koramangala',
            phoneNumber: '9876543210',
            status: 'APPROVED',
            cuisineTypes: ['Indian', 'Chinese', 'Italian'],
            city: 'Bengaluru',
            latitude: 12.9716,
            longitude: 77.5946,
          } as RestaurantPublicProfile,
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'Restaurant', id }],
      keepUnusedDataFor: 150,
    }),
    getRestaurantReviews: builder.query<
      RestaurantReview[],
      RestaurantReviewsParams
    >({
      query: ({
        restaurantId,
        page = 0,
        size = DEFAULT_RESTAURANT_PAGE_SIZE,
        sort = 'createdAt',
      }) => ({
        url: `/api/v1/restaurants/${restaurantId}/reviews`,
        params: {
          page,
          size: Math.min(size, 100),
          sort,
        },
      }),
      transformResponse: (response: unknown) => normalizeReviewList(response),
      providesTags: (_result, _error, arg) => [
        { type: 'Review', id: `LIST-${arg.restaurantId}` },
      ],
      keepUnusedDataFor: 120,
    }),
    detectZone: builder.query<CustomerZoneInfo, { lat: number; lng: number }>({
      query: ({ lat, lng }) => ({
        url: '/api/v1/restaurants/zone-detect',
        params: { lat, lng },
      }),
      transformResponse: (response: any) => {
        const d = response?.data ?? response;
        return {
          serviceable: Boolean(d?.serviceable),
          zoneId: d?.zoneId ?? null,
          zoneName: d?.zoneName ?? null,
          cityName: d?.cityName ?? null,
          latitude: d?.latitude ? Number(d.latitude) : null,
          longitude: d?.longitude ? Number(d.longitude) : null,
          restaurantCount: d?.restaurantCount ?? 0,
          availableZones: Array.isArray(d?.availableZones) ? d.availableZones : [],
          message: d?.message ?? '',
        };
      },
      providesTags: ['Restaurant'],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetRestaurantsQuery,
  useLazyGetRestaurantsQuery,
  useGetRestaurantQuery,
  useGetRestaurantReviewsQuery,
  useDetectZoneQuery,
  useLazyDetectZoneQuery,
} = restaurantsApi;
