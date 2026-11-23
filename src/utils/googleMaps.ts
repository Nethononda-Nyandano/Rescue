import * as Location from 'expo-location';
import { createDrivingRouteEstimate, type DrivingRouteEstimate } from './routeEstimate';

const GOOGLE_KEY = () => process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export function getGoogleMapsApiKey(): string {
    return GOOGLE_KEY();
}

export function decodeGooglePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte: number;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const dlat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        result = 0;
        shift = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const dlng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push([lng / 1e5, lat / 1e5]);
    }

    return points;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

export interface GooglePlaceResult {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

export interface GooglePoiResult extends GooglePlaceResult {
    category: 'gas_station' | 'mechanic' | 'place';
}

export async function reverseGeocodeGoogle(lat: number, lng: number): Promise<string> {
    const key = GOOGLE_KEY();
    if (key) {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
                return data.results[0].formatted_address;
            }
        } catch (err) {
            console.warn('Google reverse geocode error:', err);
        }
    }

    // Native Expo Location reverse geocode fallback
    try {
        const nativeReversePromise = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const geo: any = await Promise.race([nativeReversePromise, timeoutPromise]);
        if (geo && Array.isArray(geo) && geo.length > 0) {
            const place = geo[0];
            const streetPart = [place.streetNumber, place.street || place.name].filter(Boolean).join(' ');
            const areaPart = place.district || place.subregion || place.suburb || place.neighborhood;
            const cityPart = place.city || place.region;
            const parts = [streetPart, areaPart, cityPart].filter(Boolean);
            if (parts.length > 0) {
                return parts.join(', ');
            }
            if (place.formattedAddress) return place.formattedAddress;
            if (place.name) return place.name;
        }
    } catch (err) {
        console.warn('Native reverse geocode fallback error:', err);
    }

    // OpenStreetMap Nominatim reverse geocode fallback
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'ResQ-App/1.0',
                    Accept: 'application/json',
                },
            }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.address) {
                const a = data.address;
                const street = [a.house_number, a.road || a.pedestrian || a.street].filter(Boolean).join(' ');
                const area = a.suburb || a.neighbourhood || a.city_district || a.city || a.town || a.village || a.county;
                const formatted = [street, area].filter(Boolean).join(', ');
                if (formatted) return formatted;
                if (data.display_name) {
                    const parts = data.display_name.split(',').map((s: string) => s.trim());
                    return parts.slice(0, 3).join(', ');
                }
            }
        }
    } catch {
        // Silently continue
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Bolt/Uber style as-you-type search: Autocomplete biased to the user, then Place Details for coordinates.
 */
export async function searchPlacesGoogle(
    query: string,
    proximityLat: number,
    proximityLng: number
): Promise<GooglePlaceResult[]> {
    if (!query || query.trim().length < 2) return [];
    const input = query.trim();
    const key = GOOGLE_KEY();

    if (key) {
        const newApiResults = await autocompletePlacesNew(input, proximityLat, proximityLng, key);
        if (newApiResults.length > 0) return newApiResults;

        try {
            const autoUrl =
                `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
                `?input=${encodeURIComponent(input)}` +
                `&location=${proximityLat},${proximityLng}` +
                `&radius=50000` +
                `&strictbounds=false` +
                `&components=country:za` +
                `&key=${key}`;
            const autoRes = await fetch(autoUrl);
            const autoData = await autoRes.json();
            const predictions: any[] = Array.isArray(autoData.predictions) ? autoData.predictions.slice(0, 8) : [];

            if (predictions.length > 0) {
                const detailed = await Promise.all(
                    predictions.map(async (prediction) => {
                        const details = await fetchPlaceDetails(prediction.place_id, key);
                        if (!details) return null;
                        return {
                            id: prediction.place_id,
                            name: prediction.structured_formatting?.main_text || details.name || input,
                            address: details.address || prediction.description || '',
                            latitude: details.latitude,
                            longitude: details.longitude,
                            distanceKm: haversineKm(proximityLat, proximityLng, details.latitude, details.longitude),
                        } as GooglePlaceResult;
                    })
                );
                const resolved = detailed
                    .filter((item): item is GooglePlaceResult => Boolean(item))
                    .sort((a, b) => a.distanceKm - b.distanceKm);
                if (resolved.length > 0) return resolved;
            }

            const textResults = await textSearchPlaces(input, proximityLat, proximityLng, key);
            if (textResults.length > 0) return textResults;

            const geocodeResults = await geocodeSearch(input, proximityLat, proximityLng, key);
            if (geocodeResults.length > 0) return geocodeResults;
        } catch (err) {
            console.warn('Google place autocomplete error:', err);
        }
    }

    return fallbackOpenSearch(input, proximityLat, proximityLng);
}

async function geocodeSearch(
    input: string,
    lat: number,
    lng: number,
    key: string
): Promise<GooglePlaceResult[]> {
    try {
        const url =
            `https://maps.googleapis.com/maps/api/geocode/json` +
            `?address=${encodeURIComponent(input)}` +
            `&location=${lat},${lng}` +
            `&region=za` +
            `&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!Array.isArray(data.results)) return [];
        return data.results.slice(0, 8).map((item: any) => {
            const latitude = item.geometry?.location?.lat;
            const longitude = item.geometry?.location?.lng;
            const name = item.address_components?.[0]?.long_name || item.formatted_address || input;
            return {
                id: item.place_id || `${latitude},${longitude}`,
                name,
                address: item.formatted_address || '',
                latitude,
                longitude,
                distanceKm: haversineKm(lat, lng, latitude, longitude),
            } as GooglePlaceResult;
        }).filter((p: GooglePlaceResult) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    } catch {
        return [];
    }
}

async function fallbackOpenSearch(
    input: string,
    lat: number,
    lng: number
): Promise<GooglePlaceResult[]> {
    const photon = await searchPhoton(input, lat, lng);
    if (photon.length > 0) return photon;
    return searchNominatim(input, lat, lng);
}

async function searchPhoton(input: string, lat: number, lng: number): Promise<GooglePlaceResult[]> {
    try {
        const url =
            `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}` +
            `&lat=${lat}&lon=${lng}&limit=8&lang=en`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        const features: any[] = Array.isArray(data.features) ? data.features : [];
        return features
            .map((feature) => {
                const [longitude, latitude] = feature.geometry?.coordinates || [];
                const p = feature.properties || {};
                const name = p.name || p.street || input;
                const address = [p.housenumber, p.street, p.district, p.city, p.state, p.country]
                    .filter(Boolean)
                    .join(', ');
                return {
                    id: String(p.osm_id || `${latitude},${longitude}`),
                    name,
                    address: address || name,
                    latitude,
                    longitude,
                    distanceKm: haversineKm(lat, lng, latitude, longitude),
                } as GooglePlaceResult;
            })
            .filter((p: GooglePlaceResult) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .sort((a: GooglePlaceResult, b: GooglePlaceResult) => a.distanceKm - b.distanceKm);
    } catch {
        return [];
    }
}

async function searchNominatim(input: string, lat: number, lng: number): Promise<GooglePlaceResult[]> {
    try {
        const url =
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}` +
            `&limit=8&addressdetails=1&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'ResQ-Roadside/1.0',
            },
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        return data
            .map((item: any) => {
                const latitude = parseFloat(item.lat);
                const longitude = parseFloat(item.lon);
                const parts = String(item.display_name || '').split(',').map((s: string) => s.trim());
                return {
                    id: String(item.place_id || `${latitude},${longitude}`),
                    name: parts[0] || input,
                    address: item.display_name || '',
                    latitude,
                    longitude,
                    distanceKm: haversineKm(lat, lng, latitude, longitude),
                } as GooglePlaceResult;
            })
            .filter((p: GooglePlaceResult) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
            .sort((a: GooglePlaceResult, b: GooglePlaceResult) => a.distanceKm - b.distanceKm);
    } catch {
        return [];
    }
}

async function autocompletePlacesNew(
    input: string,
    lat: number,
    lng: number,
    key: string
): Promise<GooglePlaceResult[]> {
    try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': key,
            },
            body: JSON.stringify({
                input,
                locationBias: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 25000,
                    },
                },
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        const suggestions: any[] = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 6) : [];
        const detailed = await Promise.all(
            suggestions.map(async (suggestion) => {
                const placeId = suggestion.placePrediction?.placeId;
                if (!placeId) return null;
                const details = await fetchPlaceDetailsNew(placeId, key);
                if (!details) return null;
                const name =
                    suggestion.placePrediction?.structuredFormat?.mainText?.text ||
                    details.name ||
                    input;
                return {
                    id: placeId,
                    name,
                    address: details.address,
                    latitude: details.latitude,
                    longitude: details.longitude,
                    distanceKm: haversineKm(lat, lng, details.latitude, details.longitude),
                } as GooglePlaceResult;
            })
        );
        return detailed
            .filter((item): item is GooglePlaceResult => Boolean(item))
            .sort((a, b) => a.distanceKm - b.distanceKm);
    } catch {
        return [];
    }
}

async function fetchPlaceDetails(placeId: string, key: string) {
    try {
        const url =
            `https://maps.googleapis.com/maps/api/place/details/json` +
            `?place_id=${encodeURIComponent(placeId)}` +
            `&fields=name,formatted_address,geometry` +
            `&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        const result = data.result;
        const latitude = result?.geometry?.location?.lat;
        const longitude = result?.geometry?.location?.lng;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
        return {
            name: result.name || '',
            address: result.formatted_address || '',
            latitude,
            longitude,
        };
    } catch {
        return null;
    }
}

async function fetchPlaceDetailsNew(placeId: string, key: string) {
    try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
            headers: {
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
            },
        });
        if (!res.ok) return fetchPlaceDetails(placeId, key);
        const data = await res.json();
        const latitude = data.location?.latitude;
        const longitude = data.location?.longitude;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return fetchPlaceDetails(placeId, key);
        }
        return {
            name: data.displayName?.text || '',
            address: data.formattedAddress || '',
            latitude,
            longitude,
        };
    } catch {
        return fetchPlaceDetails(placeId, key);
    }
}

async function textSearchPlaces(
    query: string,
    lat: number,
    lng: number,
    key: string
): Promise<GooglePlaceResult[]> {
    try {
        const url =
            `https://maps.googleapis.com/maps/api/place/textsearch/json` +
            `?query=${encodeURIComponent(query)}` +
            `&location=${lat},${lng}` +
            `&radius=25000` +
            `&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!Array.isArray(data.results)) return [];
        return data.results
            .slice(0, 8)
            .map((item: any) => {
                const latitude = item.geometry?.location?.lat;
                const longitude = item.geometry?.location?.lng;
                return {
                    id: item.place_id,
                    name: item.name || query,
                    address: item.formatted_address || item.vicinity || '',
                    latitude,
                    longitude,
                    distanceKm: haversineKm(lat, lng, latitude, longitude),
                } as GooglePlaceResult;
            })
            .filter((p: GooglePlaceResult) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .sort((a: GooglePlaceResult, b: GooglePlaceResult) => a.distanceKm - b.distanceKm);
    } catch {
        return [];
    }
}

/**
 * Closest petrol stations / workshops, ranked by distance like Bolt/Uber (not prominence).
 */
export async function fetchNearbyGooglePOIs(
    userLat: number,
    userLng: number,
    category: 'gas_station' | 'mechanic' = 'gas_station'
): Promise<GooglePoiResult[]> {
    const key = GOOGLE_KEY();
    if (!key) return [];

    const includedType = category === 'gas_station' ? 'gas_station' : 'car_repair';

    const newResults = await nearbySearchNew(userLat, userLng, includedType, category, key);
    if (newResults.length > 0) return newResults;

    try {
        const url =
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${userLat},${userLng}` +
            `&rankby=distance` +
            `&type=${includedType}` +
            `&key=${key}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!Array.isArray(data.results) || data.results.length === 0) return [];

        return data.results
            .slice(0, 10)
            .map((item: any) => {
                const latitude = item.geometry?.location?.lat;
                const longitude = item.geometry?.location?.lng;
                return {
                    id: item.place_id,
                    name: item.name || (category === 'gas_station' ? 'Petrol Station' : 'Workshop'),
                    address: item.vicinity || '',
                    category,
                    latitude,
                    longitude,
                    distanceKm: haversineKm(userLat, userLng, latitude, longitude),
                } as GooglePoiResult;
            })
            .filter((p: GooglePoiResult) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .sort((a: GooglePoiResult, b: GooglePoiResult) => a.distanceKm - b.distanceKm);
    } catch (err) {
        console.warn('Google nearby POI error:', err);
        return [];
    }
}

async function nearbySearchNew(
    lat: number,
    lng: number,
    includedType: string,
    category: 'gas_station' | 'mechanic',
    key: string
): Promise<GooglePoiResult[]> {
    try {
        const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
            },
            body: JSON.stringify({
                includedTypes: [includedType],
                maxResultCount: 10,
                rankPreference: 'DISTANCE',
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 12000,
                    },
                },
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data.places) || data.places.length === 0) return [];
        return data.places
            .map((place: any) => {
                const latitude = place.location?.latitude;
                const longitude = place.location?.longitude;
                return {
                    id: place.id,
                    name: place.displayName?.text || (category === 'gas_station' ? 'Petrol Station' : 'Workshop'),
                    address: place.formattedAddress || '',
                    category,
                    latitude,
                    longitude,
                    distanceKm: haversineKm(lat, lng, latitude, longitude),
                } as GooglePoiResult;
            })
            .filter((p: GooglePoiResult) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .sort((a: GooglePoiResult, b: GooglePoiResult) => a.distanceKm - b.distanceKm);
    } catch {
        return [];
    }
}

export async function fetchDrivingRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<DrivingRouteEstimate | null> {
    if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return null;
    if (Math.abs(startLat) > 90 || Math.abs(endLat) > 90 || Math.abs(startLng) > 180 || Math.abs(endLng) > 180) return null;
    const key = GOOGLE_KEY();
    if (key) {
        const routesApi = await fetchRoutesApi(startLat, startLng, endLat, endLng, key);
        if (routesApi) return routesApi;

        const directionsJson = await fetchDirectionsJson(startLat, startLng, endLat, endLng, key);
        if (directionsJson) return directionsJson;
    }

    return fetchOsrmDrivingRoute(startLat, startLng, endLat, endLng);
}

async function fetchOsrmDrivingRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 4000);
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route || !route.geometry || !Array.isArray(route.geometry.coordinates)) return null;
        return createDrivingRouteEstimate({
            coordinates: route.geometry.coordinates,
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            provider: 'osrm',
            trafficAware: false,
        });
    } catch {
        return null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function fetchRoutesApi(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    key: string
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: startLat, longitude: startLng } } },
                destination: { location: { latLng: { latitude: endLat, longitude: endLng } } },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                polylineQuality: 'HIGH_QUALITY',
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const route = data.routes?.[0];
        const encoded = route?.polyline?.encodedPolyline;
        if (!encoded) return null;
        const coordinates = decodeGooglePolyline(encoded);
        return createDrivingRouteEstimate({
            coordinates,
            distanceMeters: route.distanceMeters,
            durationSeconds: parseFloat(String(route.duration || '').replace(/s$/, '')),
            provider: 'google',
            trafficAware: true,
        });
    } catch {
        return null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function fetchDirectionsJson(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    key: string
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 5000);
        const url =
            `https://maps.googleapis.com/maps/api/directions/json` +
            `?origin=${startLat},${startLng}` +
            `&destination=${endLat},${endLng}` +
            `&mode=driving` +
            `&overview=full` +
            `&departure_time=now` +
            `&traffic_model=best_guess` +
            `&key=${key}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        const route = data.routes?.[0];
        const encoded = route?.overview_polyline?.points;
        if (!encoded) return null;
        const coordinates = decodeGooglePolyline(encoded);
        const leg = route.legs?.[0];
        const trafficAware = Number.isFinite(Number(leg?.duration_in_traffic?.value));
        return createDrivingRouteEstimate({
            coordinates,
            distanceMeters: leg?.distance?.value,
            durationSeconds: trafficAware ? leg.duration_in_traffic.value : leg?.duration?.value,
            provider: 'google',
            trafficAware,
        });
    } catch {
        return null;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}
