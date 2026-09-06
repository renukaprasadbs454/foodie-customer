import * as Location from 'expo-location';

type GlobalLocationData = {
    address: string | null;
    coords: { latitude: number; longitude: number } | null;
};

export const globalLocation: GlobalLocationData = {
    address: null,
    coords: null
};

export async function initGlobalLocation() {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            globalLocation.coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            const reverse = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            if (reverse.length > 0) {
                globalLocation.address = reverse[0].city || reverse[0].subregion || reverse[0].district || 'Bengaluru';
            }
        }
    } catch (e) { }
}
