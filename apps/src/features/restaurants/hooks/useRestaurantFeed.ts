import { useMemo } from 'react';
import { useGetRestaurantsQuery } from '../../../api/endpoints/restaurantsApi';
import { MOCK_RESTAURANTS } from '../mockData';
import type { RestaurantListParams, RestaurantSummary } from '../types';
import { getDistanceKm } from '../types';

type FeedArgs = Omit<RestaurantListParams, 'page' | 'size'> & {
  size?: number;
  userLatitude?: number;
  userLongitude?: number;
};

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
      list = [...apiItems];
    } else if (queryResult.isError) {
      list = [...MOCK_RESTAURANTS];
    } else {
      list = [];
    }

    // 1. Filter by cuisineType if provided
    if (args.cuisineType && args.cuisineType.trim() !== '') {
      const targetCuisine = args.cuisineType.trim().toLowerCase();
      list = list.filter((item) => {
        if (item.cuisineTypes && Array.isArray(item.cuisineTypes)) {
          const matchCuisine = item.cuisineTypes.some((c) => {
            const cLower = c.toLowerCase();
            return cLower.includes(targetCuisine) || targetCuisine.includes(cLower);
          });
          if (matchCuisine) return true;
        }
        const nameMatch = item.name?.toLowerCase().includes(targetCuisine);
        const descMatch = item.description?.toLowerCase().includes(targetCuisine);
        return Boolean(nameMatch || descMatch);
      });
    }

    // 2. Filter by search term if provided
    if (args.search && args.search.trim() !== '') {
      const searchTerm = args.search.trim().toLowerCase();
      list = list.filter((item) => {
        const nameMatch = item.name?.toLowerCase().includes(searchTerm);
        const descMatch = item.description?.toLowerCase().includes(searchTerm);
        const cityMatch = item.city?.toLowerCase().includes(searchTerm);
        const cuisineMatch = item.cuisineTypes?.some((c) => c.toLowerCase().includes(searchTerm));
        return Boolean(nameMatch || descMatch || cityMatch || cuisineMatch);
      });
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

