import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Text, useTheme, type WebSocketLocation } from 'foodie-shared-rn';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  location?: WebSocketLocation | null;
  driverLocation?: { latitude: number; longitude: number } | null;
  orderStatus: string;
  restaurantLocation?: { latitude: number; longitude: number };
  customerLocation?: { latitude: number; longitude: number };
  onEtaUpdate?: (etaMins: number) => void;
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyBef3prJr9YvHFDYczEJ-mzZfSlLd2vHbE';

const TUMKUR_DEFAULT_REGION = {
  latitude: 13.3379,
  longitude: 77.1173,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function decodeGooglePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
}

export function TrackingMap({
  location,
  driverLocation,
  orderStatus,
  restaurantLocation,
  customerLocation,
  onEtaUpdate,
}: Props) {
  const { tokens } = useTheme();

  const normalizedStatus = (orderStatus || '').trim().toUpperCase();
  const isCollected = ['REACHED_RESTAURANT', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalizedStatus);

  const driverLiveLocation = useMemo(() => {
    if (driverLocation && driverLocation.latitude !== 0 && !isNaN(driverLocation.latitude)) {
      return driverLocation;
    }
    if (location && typeof location.lat === 'number' && location.lat !== 0 && !isNaN(location.lat)) {
      return { latitude: location.lat, longitude: location.lng };
    }
    return null;
  }, [driverLocation, location]);

  const fallbackCenter = restaurantLocation || TUMKUR_DEFAULT_REGION;

  // Once collected/picked up by delivery partner, navigation route starts from driver live location
  const startPt = (isCollected && driverLiveLocation)
    ? driverLiveLocation
    : (restaurantLocation || fallbackCenter);

  const endPt = (customerLocation && customerLocation.latitude !== 0 && !isNaN(customerLocation.latitude))
    ? customerLocation
    : fallbackCenter;

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!startPt || !endPt) return;

    let isMounted = true;
    setLoadingRoute(true);

    const fetchRoute = async () => {
      try {
        let routePoints: { latitude: number; longitude: number }[] | null = null;
        let routeEtaMins = 20;

        // 1. Try Google Directions API with provided API key
        try {
          const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${startPt.latitude},${startPt.longitude}&destination=${endPt.latitude},${endPt.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
          const gRes = await fetch(googleUrl);
          const gData = await gRes.json();
          if (gData.status === 'OK' && gData.routes && gData.routes.length > 0) {
            const overview = gData.routes[0].overview_polyline?.points;
            if (overview) {
              routePoints = decodeGooglePolyline(overview);
              const legDuration = gData.routes[0].legs?.[0]?.duration?.value;
              if (legDuration) {
                routeEtaMins = Math.max(5, Math.ceil(legDuration / 60));
              }
            }
          }
        } catch { }

        // 2. Fallback to OSRM Routing if Google Directions is restricted or failed
        if (!routePoints || routePoints.length === 0) {
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/bike/${startPt.longitude},${startPt.latitude};${endPt.longitude},${endPt.latitude}?overview=full&geometries=geojson`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
              routePoints = osrmData.routes[0].geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0],
              }));
              routeEtaMins = Math.max(10, Math.ceil(osrmData.routes[0].duration / 60));
            }
          } catch { }
        }

        // 3. Fallback to interpolated smooth polyline
        if (!routePoints || routePoints.length === 0) {
          routePoints = [
            startPt,
            {
              latitude: (startPt.latitude + endPt.latitude) / 2 + 0.0008,
              longitude: (startPt.longitude + endPt.longitude) / 2 + 0.0008,
            },
            endPt,
          ];
        }

        if (isMounted) {
          setRouteCoords(routePoints);
          if (onEtaUpdate) {
            onEtaUpdate(routeEtaMins);
          }

          if (mapRef.current) {
            const fitPoints = [startPt, endPt];
            if (restaurantLocation && !isNaN(restaurantLocation.latitude)) fitPoints.push(restaurantLocation);
            if (driverLiveLocation && !isNaN(driverLiveLocation.latitude)) fitPoints.push(driverLiveLocation);
            const validPoints = fitPoints.filter(p => p && !isNaN(p.latitude) && !isNaN(p.longitude) && p.latitude !== 0 && p.longitude !== 0);
            if (validPoints.length > 0) {
              mapRef.current.fitToCoordinates(validPoints, {
                edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                animated: true,
              });
            }
          }
        }
      } catch (e) {
        if (isMounted) {
          setRouteCoords([startPt, endPt]);
          if (onEtaUpdate) onEtaUpdate(20);
        }
      } finally {
        if (isMounted) {
          setLoadingRoute(false);
        }
      }
    };

    void fetchRoute();
    const intervalId = setInterval(() => {
      void fetchRoute();
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [
    startPt.latitude,
    startPt.longitude,
    endPt.latitude,
    endPt.longitude,
    isCollected,
    driverLiveLocation?.latitude,
    driverLiveLocation?.longitude,
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapWrapper,
          {
            borderColor: '#F59E0B',
            borderWidth: 3,
            borderRadius: 24,
            overflow: 'hidden',
            elevation: 6,
            shadowColor: '#14532D',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
          },
        ]}
      >
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          userInterfaceStyle="light"
          initialRegion={{
            latitude: startPt.latitude,
            longitude: startPt.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
        >
          {/* Restaurant Marker */}
          {restaurantLocation && (
            <Marker coordinate={restaurantLocation} title="Restaurant" zIndex={6}>
              <View style={[styles.markerBody, { backgroundColor: '#B91C1C' }]}>
                <Text style={{ fontSize: 18 }}>🏪</Text>
              </View>
            </Marker>
          )}

          {/* Customer Delivery Address Marker */}
          {customerLocation && (
            <Marker coordinate={customerLocation} title="Customer Delivery Address" zIndex={5}>
              <View style={[styles.markerBody, { backgroundColor: '#2563EB' }]}>
                <Text style={{ fontSize: 18 }}>🏠</Text>
              </View>
            </Marker>
          )}

          {/* Delivery Partner Live Marker (Motorbike Symbol - Swiggy/Zomato style) */}
          {(driverLiveLocation || (isCollected && restaurantLocation)) && (
            <Marker
              coordinate={driverLiveLocation || restaurantLocation!}
              title="Delivery Partner"
              description="Live Location"
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={20}
              flat={false}
            >
              <View style={styles.bikeMarkerWrapper}>
                <Animated.View
                  style={[
                    styles.bikePulseRing,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.45],
                        outputRange: [0.6, 0],
                      }),
                    },
                  ]}
                />
                <View style={styles.bikeIconCircle}>
                  <MaterialCommunityIcons name="motorbike" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.bikeTagPill}>
                  <Text style={styles.bikeTagText}>Rider</Text>
                </View>
              </View>
            </Marker>
          )}

          {/* Polyline Route Line */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#14532D"
              strokeWidth={5}
            />
          )}
        </MapView>

        {loadingRoute && (
          <View style={styles.loaderBadge}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -20,
    marginBottom: 8,
  },
  mapWrapper: {
    height: Dimensions.get('window').height * 0.45,
  },
  map: {
    ...(StyleSheet.absoluteFill as any),
  },
  markerBody: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bikeMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
  },
  bikePulseRing: {
    position: 'absolute',
    top: 6,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.45)',
  },
  bikeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  bikeTagPill: {
    marginTop: 2,
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bikeTagText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loaderBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(20, 83, 45, 0.8)',
    padding: 8,
    borderRadius: 20,
  },
});
