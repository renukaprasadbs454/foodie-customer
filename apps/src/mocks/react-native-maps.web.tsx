import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text } from 'react-native';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export const Marker = ({ children, title, coordinate, pinColor }: any) => {
  return (
    <View style={styles.markerContainer}>
      {children ? (
        children
      ) : (
        <View style={[styles.defaultPin, pinColor ? { backgroundColor: pinColor } : null]}>
          <Text style={styles.pinText}>📍</Text>
        </View>
      )}
      {title ? <Text style={styles.pinLabel}>{title}</Text> : null}
    </View>
  );
};

export const Polyline = (_props: any) => null;
export const Polygon = (_props: any) => null;
export const Circle = (_props: any) => null;
export const Callout = ({ children }: any) => <View>{children}</View>;

export interface MapViewProps {
  style?: any;
  region?: Region;
  initialRegion?: Region;
  children?: React.ReactNode;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  [key: string]: any;
}

export interface MapViewRef {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (coordinates: Array<{ latitude: number; longitude: number }>, options?: any) => void;
  animateCamera: (camera: any, options?: any) => void;
}

const MapView = forwardRef<MapViewRef, MapViewProps>((props, ref) => {
  const { style, children, region, initialRegion } = props;

  useImperativeHandle(ref, () => ({
    animateToRegion: (_r: Region, _duration?: number) => {},
    fitToCoordinates: (_coords: Array<{ latitude: number; longitude: number }>, _options?: any) => {},
    animateCamera: (_camera: any, _options?: any) => {},
  }));

  const activeRegion = region || initialRegion || { latitude: 12.9716, longitude: 77.5946 };

  return (
    <View style={[styles.mapContainer, style]}>
      <View style={styles.gridOverlay}>
        <Text style={styles.mapWatermark}>🗺️ Live Map</Text>
        <Text style={styles.coordsText}>
          {activeRegion.latitude.toFixed(4)}, {activeRegion.longitude.toFixed(4)}
        </Text>
      </View>
      <View style={styles.contentOverlay}>{children}</View>
    </View>
  );
});

MapView.displayName = 'MapViewWebMock';

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: '#E2E8F0',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 8,
  },
  mapWatermark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  coordsText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  contentOverlay: {
    ...(StyleSheet.absoluteFill as any),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    fontSize: 16,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
});

export default MapView;
