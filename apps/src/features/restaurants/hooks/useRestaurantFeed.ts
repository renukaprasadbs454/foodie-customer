import { useMemo } from 'react';
import { useGetRestaurantsQuery } from '../../../api/endpoints/restaurantsApi';
import type { RestaurantListParams, RestaurantSummary } from '../types';
import { getDistanceKm } from '../types';

type FeedArgs = Omit<RestaurantListParams, 'page' | 'size'> & {
  size?: number;
  userLatitude?: number;
  userLongitude?: number;
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
  const queryResult = useGetRestaurantsQuery({
    cuisineType: args.cuisineType,
    search: args.search,
    sort: args.sort === 'nearby' ? undefined : args.sort,
    lat: args.userLatitude,
    lng: args.userLongitude,
  });

  const items = useMemo(() => {
    const apiItems = queryResult.data;
    let list: RestaurantSummary[] = [];

    if (Array.isArray(apiItems)) {
      list = apiItems.filter((item) => {
        const name = (item.name || '').toLowerCase();
        return name.includes('ganesh') || name.includes('royal');
      });
    } else {
      list = [];
    }

    // 1. Filter by cuisineType if provided
    if (args.cuisineType && args.cuisineType.trim() !== '') {
      list = list.filter((item) => checkRestaurantMatch(item, args.cuisineType!));
    }

    // 2. Filter by search term if provided
    if (args.search && args.search.trim() !== '') {
      list = list.filter((item) => checkRestaurantMatch(item, args.search!));
    }

    // 3. Apply sorting
    if (args.sort === 'avgRating') {
      list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    } else if (args.sort === 'createdAt') {
      list.sort((a, b) => (b.id ?? '').localeCompare(a.id ?? ''));
    } else if (args.sort === 'nearby' || (!args.sort && args.userLatitude !== undefined && args.userLongitude !== undefined)) {
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
    queryResult.isError,
    args.cuisineType,
    args.search,
    args.sort,
    args.userLatitude,
    args.userLongitude,
  ]);

  return {
    items,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isError: queryResult.isError,
    error: queryResult.error,
    refetch: queryResult.refetch,
    onLoadMore: () => { },
    hasMore: false,
  };
}

