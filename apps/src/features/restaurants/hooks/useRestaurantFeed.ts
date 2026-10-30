import { useMemo } from 'react';
import { useGetRestaurantsQuery } from '../../../api/endpoints/restaurantsApi';
import type { RestaurantListParams, RestaurantSummary } from '../types';
import { getDistanceKm } from '../types';

type FeedArgs = Omit<RestaurantListParams, 'page' | 'size'> & {
  size?: number;
  userLatitude?: number;
  userLongitude?: number;
  zoneId?: string;
  isServiceable?: boolean;
};

function normalizeTerm(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/_/g, ' ')
    .replace(/bir[iaey]+ni/g, 'biryani')
    .replace(/\s+/g, ' ');
}

function checkRestaurantMatch(item: RestaurantSummary, searchStr: string): boolean {
  const normSearch = normalizeTerm(searchStr);
  if (!normSearch) return true;

  // 1. Check restaurant name
  const nameNorm = normalizeTerm(item.name || '');
  if (nameNorm.includes(normSearch) || normSearch.includes(nameNorm)) return true;

  // 2. Check restaurant description
  const descNorm = normalizeTerm(item.description || '');
  if (descNorm.includes(normSearch)) return true;

  // 3. Check city
  const cityNorm = normalizeTerm(item.city || '');
  if (cityNorm.includes(normSearch)) return true;

  // 4. Check cuisine types (handling array, comma-separated string, or backend enums like SOUTH_INDIAN)
  let cuisines: string[] = [];
  if (Array.isArray(item.cuisineTypes)) {
    cuisines = item.cuisineTypes;
  } else if (typeof item.cuisineTypes === 'string') {
    cuisines = (item.cuisineTypes as string).split(',');
  }

  const cuisineMatch = cuisines.some((c) => {
    const cNorm = normalizeTerm(c);
    return cNorm.includes(normSearch) || normSearch.includes(cNorm);
  });
  if (cuisineMatch) return true;

  return false;
}

export function useRestaurantFeed(args: FeedArgs) {
  const isUnserviceable = args.isServiceable === false;

  const queryResult = useGetRestaurantsQuery(
    {
      cuisineType: args.cuisineType,
      search: args.search,
      sort: args.sort === 'nearby' ? undefined : args.sort,
      lat: args.userLatitude,
      lng: args.userLongitude,
      zoneId: args.zoneId,
    },
    {
      skip: isUnserviceable,
    }
  );

  // If a dedicated/approved expansion zone has 0 local restaurants, fall back to nearby restaurants from neighboring zones
  const shouldFetchNearbyFallback = Boolean(
    !isUnserviceable &&
    args.zoneId &&
    !queryResult.isLoading &&
    !queryResult.isFetching &&
    Array.isArray(queryResult.data) &&
    queryResult.data.length === 0
  );

  const fallbackQuery = useGetRestaurantsQuery(
    {
      cuisineType: args.cuisineType,
      search: args.search,
      lat: args.userLatitude,
      lng: args.userLongitude,
    },
    {
      skip: !shouldFetchNearbyFallback,
    }
  );

  const isExpandedFromNearby = Boolean(
    shouldFetchNearbyFallback &&
    Array.isArray(fallbackQuery.data) &&
    fallbackQuery.data.length > 0
  );

  const items = useMemo(() => {
    if (isUnserviceable) {
      return [];
    }

    const hasPrimaryData = Array.isArray(queryResult.data) && queryResult.data.length > 0;
    const apiItems = hasPrimaryData ? queryResult.data : fallbackQuery.data;
    let list: RestaurantSummary[] = [];

    if (Array.isArray(apiItems)) {
      list = [...apiItems].filter((r) => {
        if (!r.latitude || !r.longitude) return !hasPrimaryData ? false : true;
        const nLat = Number(r.latitude);
        const nLng = Number(r.longitude);
        return !isNaN(nLat) && !isNaN(nLng) && (nLat !== 0 || nLng !== 0);
      });
      // The backend /api/v1/restaurants endpoint filters by cuisineType including all menu items (e.g. Chicken Biriyani for Biriyani)
      // and restaurant details. Do not re-filter on the client without menu data.
      if (isExpandedFromNearby && args.userLatitude !== undefined && args.userLongitude !== undefined) {
        const uLat = args.userLatitude;
        const uLng = args.userLongitude;
        list = list.filter((r) => {
          const lat = typeof r.latitude === 'number' ? r.latitude : parseFloat(String(r.latitude ?? 0));
          const lng = typeof r.longitude === 'number' ? r.longitude : parseFloat(String(r.longitude ?? 0));
          if (!lat || !lng) return false;
          const dist = getDistanceKm(uLat, uLng, lat, lng);
          return dist <= 25.0; // Strictly only restaurants from nearby zones, not all restaurants
        });
      }
    } else {
      list = [];
    }

    // Proximity sorting by distance to customer coordinates
    if (args.sort === 'avgRating') {
      list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    } else if (args.sort === 'createdAt') {
      list.sort((a, b) => (b.id ?? '').localeCompare(a.id ?? ''));
    } else if (args.sort === 'nearby' || (!args.sort && args.userLatitude !== undefined && args.userLongitude !== undefined) || isExpandedFromNearby) {
      if (args.userLatitude !== undefined && args.userLongitude !== undefined) {
        const uLat = args.userLatitude;
        const uLng = args.userLongitude;
        list.sort((a, b) => {
          const latA = typeof a.latitude === 'number' ? a.latitude : parseFloat(String(a.latitude ?? 0));
          const lngA = typeof a.longitude === 'number' ? a.longitude : parseFloat(String(a.longitude ?? 0));
          const latB = typeof b.latitude === 'number' ? b.latitude : parseFloat(String(b.latitude ?? 0));
          const lngB = typeof b.longitude === 'number' ? b.longitude : parseFloat(String(b.longitude ?? 0));

          const distA = (latA && lngA) ? getDistanceKm(uLat, uLng, latA, lngA) : 999999;
          const distB = (latB && lngB) ? getDistanceKm(uLat, uLng, latB, lngB) : 999999;
          return distA - distB;
        });
      }
    }

    return list;
  }, [
    queryResult.data,
    fallbackQuery.data,
    queryResult.isError,
    args.cuisineType,
    args.search,
    args.sort,
    args.userLatitude,
    args.userLongitude,
    isExpandedFromNearby,
  ]);

  return {
    items,
    isLoading: queryResult.isLoading || (shouldFetchNearbyFallback && fallbackQuery.isLoading),
    isFetching: queryResult.isFetching || fallbackQuery.isFetching,
    isUninitialized: queryResult.isUninitialized,
    isError: queryResult.isError && fallbackQuery.isError,
    error: queryResult.error || fallbackQuery.error,
    refetch: () => {
      void queryResult.refetch();
      if (shouldFetchNearbyFallback) void fallbackQuery.refetch();
    },
    onLoadMore: () => { },
    hasMore: false,
    isExpandedFromNearby,
  };
}

