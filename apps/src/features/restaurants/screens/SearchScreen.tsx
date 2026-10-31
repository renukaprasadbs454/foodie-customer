import React, { useEffect, useState, useRef } from 'react';
import { FlatList, View, StatusBar, Animated, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EmptyState,
  Text,
  TextInput,
  trackAnalyticsEvent,
  useDebouncedValue,
  useTheme,
} from 'foodie-shared-rn';
import type { BrowseStackParamList } from '../../../navigation/types';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantListSkeleton } from '../components/RestaurantListSkeleton';
import { useRestaurantFeed } from '../hooks/useRestaurantFeed';
import { GlobalCartBanner } from '../../cart/components/GlobalCartBanner';
import { useGlobalLocation } from '../../../core/GlobalLocation';
import { useDetectZoneQuery } from '../../../api/endpoints/restaurantsApi';

const ALL_FOODS_SUGGESTIONS = [
  { name: 'Biriyani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120&q=80' },
  { name: 'Dosa', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=120&q=80' },
  { name: 'Burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&q=80' },
  { name: 'Chicken', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=120&q=80' },
  { name: 'North Indian', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=120&q=80' },
  { name: 'South Indian', image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=120&q=80' },
  { name: 'Rice', image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=120&q=80' },
  { name: 'Sweets', image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=120&q=80' },
];

type Props = NativeStackScreenProps<BrowseStackParamList, 'Search'>;

export function SearchScreen({ navigation, route }: Props) {
  const { tokens } = useTheme();
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const debounced = useDebouncedValue(query.trim(), 350);

  const { coords, zone: globalZone } = useGlobalLocation();
  const zoneQuery = useDetectZoneQuery(
    { lat: coords?.latitude ?? 0, lng: coords?.longitude ?? 0 },
    { skip: !coords?.latitude || !coords?.longitude }
  );
  const activeZone = zoneQuery.data || globalZone;

  const feed = useRestaurantFeed({
    search: debounced.length > 0 ? debounced : undefined,
    sort: 'avgRating',
    userLatitude: coords?.latitude,
    userLongitude: coords?.longitude,
    zoneId: activeZone?.zoneId ?? undefined,
  });

  const matchingFoods = query.trim().length > 0
    ? ALL_FOODS_SUGGESTIONS.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : ALL_FOODS_SUGGESTIONS;

  const scaleValue = useRef(new Animated.Value(0.95)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    trackAnalyticsEvent('customer_search_viewed');
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (debounced.length > 0) {
      trackAnalyticsEvent('restaurant_search_performed', {
        queryLength: debounced.length,
      });
    }
  }, [debounced]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#012B18' }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#012B18" barStyle="light-content" />
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: '#0A120E',
          opacity: fadeValue,
          transform: [{ scale: scaleValue }],
        }}
      >
        {/* Luxury Curved Header matching HomeScreen */}
        <LinearGradient
          colors={['#012B18', '#053E23', '#0A4D2E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            paddingTop: 24,
            paddingBottom: 22,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#FCD34D', letterSpacing: -0.5 }}>
                Search
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Home')}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(252, 211, 77, 0.15)',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#FCD34D',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text style={{ color: '#FCD34D', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 24,
              height: 48,
              borderWidth: 1.5,
              borderColor: '#FCD34D',
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 8, color: '#FCD34D' }}>🔍</Text>
            <TextInput
              label=""
              accessibilityLabel="Search restaurants"
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
              placeholder="Search restaurants by name or dish..."
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() =>
                trackAnalyticsEvent('search_submitted', {
                  queryLength: query.trim().length,
                })
              }
              containerStyle={{
                backgroundColor: 'transparent',
                borderWidth: 0,
                flex: 1,
                height: 44,
              }}
              inputStyle={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '600',
              }}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Text style={{ color: '#9CA3AF', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        <View style={{ flex: 1, paddingHorizontal: tokens.spacing.md, paddingTop: 16 }}>
          {feed.isLoading ? (
            <RestaurantListSkeleton />
          ) : (
            <FlatList
              data={feed.items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: tokens.spacing.md, paddingBottom: 48 }}
              onEndReached={() => feed.onLoadMore()}
              onEndReachedThreshold={0.4}
              ListHeaderComponent={
                <View style={{ marginBottom: tokens.spacing.md }}>
                  {debounced.length === 0 ? (
                    <View style={{ marginBottom: tokens.spacing.sm }}>
                      <Text style={{ fontWeight: '900', color: '#FCD34D', fontSize: 18, letterSpacing: -0.2 }}>
                        WHAT'S ON YOUR MIND?
                      </Text>
                      <Text style={{ color: '#9CA3AF', marginBottom: 12, fontWeight: '500', fontSize: 13 }}>
                        Explore popular items before you search
                      </Text>
                    </View>
                  ) : (
                    matchingFoods.length > 0 ? (
                      <View style={{ marginBottom: tokens.spacing.xs }}>
                        <Text style={{ fontWeight: '800', color: '#FCD34D', fontSize: 15 }}>
                          Matching Foods & Cuisines
                        </Text>
                      </View>
                    ) : null
                  )}

                  {matchingFoods.length > 0 ? (
                    <View style={{ marginBottom: 20, gap: 12 }}>
                      {/* Row 1 */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                        {matchingFoods.slice(0, Math.ceil(matchingFoods.length / 2)).map((food) => (
                          <Pressable
                            key={food.name}
                            onPress={() => {
                              setQuery(food.name);
                              trackAnalyticsEvent('search_suggestion_tapped', { food: food.name });
                            }}
                            style={{ alignItems: 'center', width: 84 }}
                          >
                            <View style={{
                              width: 76,
                              height: 76,
                              borderRadius: 38,
                              borderWidth: 2,
                              borderColor: '#FCD34D',
                              overflow: 'hidden',
                              backgroundColor: '#131F18',
                              shadowColor: '#000000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              elevation: 3,
                            }}>
                              <Image
                                source={{ uri: food.image }}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </View>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 6 }}>
                              {food.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      {/* Row 2 */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                        {matchingFoods.slice(Math.ceil(matchingFoods.length / 2)).map((food) => (
                          <Pressable
                            key={food.name}
                            onPress={() => {
                              setQuery(food.name);
                              trackAnalyticsEvent('search_suggestion_tapped', { food: food.name });
                            }}
                            style={{ alignItems: 'center', width: 84 }}
                          >
                            <View style={{
                              width: 76,
                              height: 76,
                              borderRadius: 38,
                              borderWidth: 2,
                              borderColor: '#FCD34D',
                              overflow: 'hidden',
                              backgroundColor: '#131F18',
                              shadowColor: '#000000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              elevation: 3,
                            }}>
                              <Image
                                source={{ uri: food.image }}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </View>
                            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 6 }}>
                              {food.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {debounced.length === 0 ? (
                    <View style={{ marginTop: 8, marginBottom: 8 }}>
                      <Text style={{ fontWeight: '900', color: '#FCD34D', fontSize: 18, letterSpacing: -0.2 }}>
                        Recommended For You
                      </Text>
                      <Text style={{ color: '#9CA3AF', fontWeight: '500', fontSize: 13, marginTop: 2 }}>
                        Top dining spots around your location
                      </Text>
                    </View>
                  ) : (
                    feed.items.length > 0 ? (
                      <View style={{ marginTop: 8, marginBottom: 8 }}>
                        <Text style={{ fontWeight: '900', color: '#FCD34D', fontSize: 18, letterSpacing: -0.2 }}>
                          Matching Restaurants ({feed.items.length})
                        </Text>
                      </View>
                    ) : null
                  )}
                </View>
              }
              ListEmptyComponent={
                activeZone && !activeZone.serviceable ? (
                  <View style={{
                    marginTop: 30,
                    alignItems: 'center',
                    padding: 24,
                    backgroundColor: '#131F18',
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                  }}>
                    <Text style={{ fontSize: 40, marginBottom: 10 }}>📍</Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#FCD34D', marginBottom: 6, textAlign: 'center' }}>
                      Location Outside Delivery Coverage
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginBottom: 14 }}>
                      We do not deliver to this location yet. Request has been reported to administration. Please change your delivery address to order.
                    </Text>
                    <Pressable
                      onPress={() => navigation.navigate('Addresses', { selectMode: true })}
                      style={{
                        backgroundColor: '#FCD34D',
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ color: '#022414', fontWeight: '800', fontSize: 13 }}>Change Delivery Address</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ marginTop: 40, alignItems: 'center', padding: 24, backgroundColor: '#131F18', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽️</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#FCD34D', marginBottom: 6 }}>No Results Found</Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginHorizontal: 20, lineHeight: 18 }}>
                      Try checking spelling or type another dish or restaurant name.
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <RestaurantCard
                  restaurant={item}
                  userLat={coords?.latitude}
                  userLng={coords?.longitude}
                  onPress={() => {
                    trackAnalyticsEvent('result_tapped', {
                      restaurantId: item.id,
                    });
                    navigation.navigate('Menu', {
                      restaurantId: item.id,
                    });
                  }}
                />
              )}
            />
          )}
        </View>
        <GlobalCartBanner />
      </Animated.View>
    </SafeAreaView>
  );
}
