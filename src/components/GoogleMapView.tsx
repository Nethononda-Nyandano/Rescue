import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { fetchDrivingRoute, getGoogleMapsApiKey } from '@/utils/googleMaps';

export interface RescuerMapData {
    latitude: number;
    longitude: number;
    name?: string;
    vehiclePlate?: string;
    heading?: number;
}

export interface DestinationMapData {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
}

export interface PoiMapData {
    latitude: number;
    longitude: number;
    name?: string;
    category?: 'gas_station' | 'mechanic' | string;
}

interface GoogleMapViewProps {
    latitude: number;
    longitude: number;
    zoom?: number;
    rescuer?: RescuerMapData | null;
    destination?: DestinationMapData | null;
    poi?: PoiMapData | null;
    pois?: PoiMapData[] | null;
    showRoute?: boolean;
    followVehicle?: boolean;
    routeColor?: string;
    onLocationChange?: (lat: number, lng: number) => void;
    accessToken?: string;
}

const generateMapHtml = (apiKey: string, initialLat: number, initialLng: number, initialZoom: number) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f8fafc; }
      .missing { height: 100%; display: flex; align-items: center; justify-content: center; font-family: sans-serif; color: #334155; padding: 24px; text-align: center; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const API_KEY = ${JSON.stringify(apiKey)};
      let map = null;
      let userMarker = null;
      let rescuerMarker = null;
      let destMarker = null;
      let poiMarkers = [];
      let routeCasingLine = null;
      let routeMainLine = null;
      let directionsService = null;
      let lastRouteKey = '';
      let lastFitKey = '';

      function getCarSvg(heading, bodyColor, roofColor) {
        var h = typeof heading === 'number' && !isNaN(heading) ? heading : 0;
        var body = bodyColor || '#047857';
        var roof = roofColor || '#10b981';
        return '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
          '<defs>' +
            '<filter id="carSh" x="-30%" y="-30%" width="160%" height="160%">' +
              '<feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.45"/>' +
            '</filter>' +
          '</defs>' +
          '<g transform="rotate(' + h + ' 24 24)" filter="url(#carSh)">' +
            '<path d="M16 11 C16 6.5, 32 6.5, 32 11 L33 16 L37 18 L37 22 L33 21 L33 36 C33 42, 31 43.5, 24 43.5 C17 43.5, 15 42, 15 36 L15 21 L11 22 L11 18 L15 16 Z" fill="' + body + '" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<path d="M17.5 7.5 L21 7.5 L20 10 L17.5 10 Z" fill="#fef08a" opacity="0.95"/>' +
            '<path d="M30.5 7.5 L27 7.5 L28 10 L30.5 10 Z" fill="#fef08a" opacity="0.95"/>' +
            '<path d="M18 16 L30 16 L28 22 L20 22 Z" fill="#0f172a" opacity="0.9"/>' +
            '<path d="M18 23 L19.5 23 L19.5 33 L18 33 Z" fill="#0f172a" opacity="0.8"/>' +
            '<path d="M30 23 L28.5 23 L28.5 33 L30 33 Z" fill="#0f172a" opacity="0.8"/>' +
            '<rect x="19.5" y="22.5" width="9" height="11" rx="2" fill="' + roof + '"/>' +
            '<path d="M19.5 34 L28.5 34 L28 37.5 L20 37.5 Z" fill="#0f172a" opacity="0.9"/>' +
            '<rect x="16.5" y="42" width="3.5" height="1.4" rx="0.5" fill="#ef4444"/>' +
            '<rect x="28" y="42" width="3.5" height="1.4" rx="0.5" fill="#ef4444"/>' +
          '</g>' +
        '</svg>';
      }

      function carIcon(heading, bodyColor, roofColor) {
        var svg = getCarSvg(heading, bodyColor, roofColor);
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        };
      }

      function userPickupIcon() {
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">' +
          '<defs>' +
            '<filter id="uSh" x="-20%" y="-20%" width="140%" height="140%">' +
              '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>' +
            '</filter>' +
          '</defs>' +
          '<circle cx="18" cy="18" r="16" fill="#10b981" fill-opacity="0.22"/>' +
          '<circle cx="18" cy="18" r="10" fill="#ffffff" filter="url(#uSh)"/>' +
          '<circle cx="18" cy="18" r="7.5" fill="#0f172a"/>' +
          '<circle cx="18" cy="18" r="3.5" fill="#10b981"/>' +
        '</svg>';
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        };
      }

      function destinationIcon(color) {
        var c = color || '#2563eb';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">' +
          '<defs>' +
            '<filter id="dSh" x="-25%" y="-20%" width="150%" height="140%">' +
              '<feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.38"/>' +
            '</filter>' +
          '</defs>' +
          '<path d="M18 3 C10.27 3 4 9.27 4 17 C4 27.5 18 42 18 42 C18 42 32 27.5 32 17 C32 9.27 25.73 3 18 3 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.8" filter="url(#dSh)"/>' +
          '<rect x="13" y="12" width="10" height="10" rx="2" fill="#ffffff"/>' +
          '<rect x="15" y="14" width="6" height="6" rx="1" fill="' + c + '"/>' +
        '</svg>';
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(36, 44),
          anchor: new google.maps.Point(18, 42),
        };
      }

      function poiIcon(category) {
        var isGas = category === 'gas_station';
        var isMech = category === 'mechanic';
        var bg = isGas ? '#d97706' : (isMech ? '#047857' : '#2563eb');
        
        var iconContent = '';
        if (isGas) {
          iconContent = '<path d="M10 9 C10 8 11 7 12 7 L17 7 C18 7 19 8 19 9 L19 22 L10 22 Z" fill="#ffffff"/>' +
            '<rect x="12" y="9.5" width="5" height="4.5" rx="0.5" fill="' + bg + '"/>' +
            '<path d="M19 11 L20.5 11 C21.5 11 22 11.5 22 12.5 L22 17 C22 18 21.5 18.5 20.5 18.5 L20.5 15" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none"/>';
        } else if (isMech) {
          iconContent = '<path d="M10 13 L13 10 C14 11 15.5 11 16.5 10 C17.5 9 17.5 7.5 16.5 6.5 L19 9 L23 13 L21 15 L17 11 L10 18 C9 19 7.5 19 6.5 18 C5.5 17 5.5 15.5 6.5 14.5 Z" fill="#ffffff"/>';
        } else {
          iconContent = '<circle cx="16" cy="16" r="5" fill="#ffffff"/>';
        }

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
          '<defs>' +
            '<filter id="pSh" x="-20%" y="-20%" width="140%" height="140%">' +
              '<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000000" flood-opacity="0.32"/>' +
            '</filter>' +
          '</defs>' +
          '<circle cx="16" cy="16" r="14" fill="' + bg + '" stroke="#ffffff" stroke-width="1.6" filter="url(#pSh)"/>' +
          iconContent +
        '</svg>';

        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        };
      }

      function animateMarker(marker, lat, lng, targetHeading, duration, bodyColor, roofColor) {
        if (!marker) return;
        const start = marker.getPosition();
        if (!start) {
          marker.setPosition({ lat: lat, lng: lng });
          if (targetHeading != null) marker.setIcon(carIcon(targetHeading, bodyColor, roofColor));
          return;
        }
        const startLat = start.lat();
        const startLng = start.lng();
        const startHeading = marker._currentHeading || 0;
        const finalHeading = typeof targetHeading === 'number' && !isNaN(targetHeading) ? targetHeading : startHeading;
        const startTime = Date.now();
        const ms = duration || 900;

        function step() {
          const t = Math.min(1, (Date.now() - startTime) / ms);
          const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const curLat = startLat + (lat - startLat) * eased;
          const curLng = startLng + (lng - startLng) * eased;
          
          let diff = (finalHeading - startHeading) % 360;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;
          const curHeading = (startHeading + diff * eased + 360) % 360;

          marker.setPosition({ lat: curLat, lng: curLng });
          marker._currentHeading = curHeading;
          marker.setIcon(carIcon(curHeading, bodyColor, roofColor));

          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }

      function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
          center: { lat: ${initialLat}, lng: ${initialLng} },
          zoom: ${initialZoom},
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] }
          ]
        });

        userMarker = new google.maps.Marker({
          position: { lat: ${initialLat}, lng: ${initialLng} },
          map,
          icon: userPickupIcon(),
          title: 'You',
          zIndex: 25
        });

        directionsService = new google.maps.DirectionsService();

        routeCasingLine = new google.maps.Polyline({
          geodesic: true,
          strokeColor: '#064e3b',
          strokeOpacity: 0.65,
          strokeWeight: 8,
          map: null,
          zIndex: 5
        });

        routeMainLine = new google.maps.Polyline({
          geodesic: true,
          strokeColor: '#10b981',
          strokeOpacity: 0.98,
          strokeWeight: 5,
          map: null,
          zIndex: 6
        });

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      }
      window.initMap = initMap;

      function clearPois() {
        poiMarkers.forEach(m => m.setMap(null));
        poiMarkers = [];
      }

      function fitRoutePoints(points) {
        if (!map || !points || points.length < 2) return;
        const first = points[0];
        const last = points[points.length - 1];
        const firstLat = typeof first.lat === 'function' ? first.lat() : first.lat;
        const firstLng = typeof first.lng === 'function' ? first.lng() : first.lng;
        const lastLat = typeof last.lat === 'function' ? last.lat() : last.lat;
        const lastLng = typeof last.lng === 'function' ? last.lng() : last.lng;
        
        const fitKey = Number(firstLat).toFixed(3) + ',' + Number(firstLng).toFixed(3) + '|' + Number(lastLat).toFixed(3) + ',' + Number(lastLng).toFixed(3);
        if (lastFitKey === fitKey) return;
        lastFitKey = fitKey;

        const bounds = new google.maps.LatLngBounds();
        points.forEach(function(p) {
          bounds.extend(p);
        });
        map.fitBounds(bounds, { top: 110, bottom: 330, left: 65, right: 65 });
      }

      function updateRouteDisplay(path, color) {
        if (!path || path.length < 2) {
          if (routeCasingLine) routeCasingLine.setMap(null);
          if (routeMainLine) routeMainLine.setMap(null);
          return;
        }
        const activeColor = color || '#10b981';
        const casingColor = activeColor === '#2563eb' ? '#1e3a8a' : '#064e3b';
        
        if (routeCasingLine) {
          routeCasingLine.setOptions({ strokeColor: casingColor });
          routeCasingLine.setPath(path);
          routeCasingLine.setMap(map);
        }
        if (routeMainLine) {
          routeMainLine.setOptions({ strokeColor: activeColor });
          routeMainLine.setPath(path);
          routeMainLine.setMap(map);
        }
        fitRoutePoints(path);
      }

      window.syncMapState = function(data) {
        if (!map) return;

        if (data.latitude && data.longitude) {
          const pos = { lat: data.latitude, lng: data.longitude };
          if (userMarker) {
            userMarker.setPosition(pos);
          }
          if (data.flyToUser && !data.rescuer && !data.destination) {
            map.panTo(pos);
            if (data.zoom) map.setZoom(data.zoom);
          }
        }

        if (data.rescuer && data.rescuer.latitude && data.rescuer.longitude) {
          const pos = { lat: data.rescuer.latitude, lng: data.rescuer.longitude };
          const title = data.rescuer.vehiclePlate ? data.rescuer.name + ' (' + data.rescuer.vehiclePlate + ')' : (data.rescuer.name || 'Rescuer');
          if (!rescuerMarker) {
            rescuerMarker = new google.maps.Marker({
              position: pos,
              map,
              icon: carIcon(data.rescuer.heading || 0, '#047857', '#10b981'),
              title,
              zIndex: 35
            });
            rescuerMarker._currentHeading = data.rescuer.heading || 0;
          } else {
            animateMarker(rescuerMarker, pos.lat, pos.lng, data.rescuer.heading, 1100, '#047857', '#10b981');
            rescuerMarker.setTitle(title);
          }
          if (data.followVehicle) {
            map.panTo(pos);
          }
        } else if (rescuerMarker) {
          rescuerMarker.setMap(null);
          rescuerMarker = null;
        }

        if (data.destination && data.destination.latitude && data.destination.longitude) {
          const pos = { lat: data.destination.latitude, lng: data.destination.longitude };
          const title = data.destination.name || 'Destination';
          if (!destMarker) {
            destMarker = new google.maps.Marker({
              position: pos,
              map,
              icon: destinationIcon('#2563eb'),
              title,
              zIndex: 22
            });
          } else {
            destMarker.setPosition(pos);
            destMarker.setTitle(title);
          }
        } else if (destMarker) {
          destMarker.setMap(null);
          destMarker = null;
        }

        clearPois();
        const allPois = [];
        if (data.poi && data.poi.latitude && data.poi.longitude) allPois.push(data.poi);
        if (Array.isArray(data.pois)) {
          data.pois.forEach(p => {
            if (!p || !p.latitude || !p.longitude) return;
            const exists = allPois.some(e => Math.abs(e.latitude - p.latitude) < 0.0001 && Math.abs(e.longitude - p.longitude) < 0.0001);
            if (!exists) allPois.push(p);
          });
        }
        allPois.forEach(p => {
          const isMech = p.category === 'mechanic';
          const icon = isMech 
            ? carIcon(0, '#1e293b', '#64748b')
            : poiIcon(p.category);
          poiMarkers.push(new google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map,
            icon: icon,
            title: p.name || 'Nearby Unit',
            zIndex: isMech ? 15 : 10
          }));
        });

        var origin = null;
        var dest = null;
        if (data.showRoute) {
          if (data.rescuer && data.rescuer.latitude && data.rescuer.longitude && data.latitude && data.longitude) {
            origin = { lat: data.rescuer.latitude, lng: data.rescuer.longitude };
            dest = { lat: data.latitude, lng: data.longitude };
          } else if (data.destination && data.destination.latitude && data.destination.longitude && data.latitude && data.longitude) {
            origin = { lat: data.latitude, lng: data.longitude };
            dest = { lat: data.destination.latitude, lng: data.destination.longitude };
          }
        }

        if (origin && dest) {
          var routeKey = origin.lat.toFixed(3) + ',' + origin.lng.toFixed(3) + '->' + dest.lat.toFixed(3) + ',' + dest.lng.toFixed(3) + ':' + (data.routeColor || '');
          if (lastRouteKey !== routeKey) {
            lastRouteKey = routeKey;
            
            // First check if routeCoordinates already provided
            if (Array.isArray(data.routeCoordinates) && data.routeCoordinates.length > 1) {
              var fallbackPath = data.routeCoordinates.map(function(c) { return { lat: c[1], lng: c[0] }; });
              updateRouteDisplay(fallbackPath, data.routeColor);
            }

            if (directionsService) {
              directionsService.route({
                origin: origin,
                destination: dest,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false
              }, function(result, status) {
                if (status === 'OK' && result && result.routes && result.routes[0]) {
                  var path = result.routes[0].overview_path;
                  updateRouteDisplay(path, data.routeColor);
                } else if (Array.isArray(data.routeCoordinates) && data.routeCoordinates.length > 1) {
                  var fallbackPath = data.routeCoordinates.map(function(c) { return { lat: c[1], lng: c[0] }; });
                  updateRouteDisplay(fallbackPath, data.routeColor);
                }
              });
            }
          } else if (Array.isArray(data.routeCoordinates) && data.routeCoordinates.length > 1 && (!routeMainLine || !routeMainLine.getMap())) {
            var path = data.routeCoordinates.map(function(c) { return { lat: c[1], lng: c[0] }; });
            updateRouteDisplay(path, data.routeColor);
          }
        } else {
          lastRouteKey = '';
          lastFitKey = '';
          if (routeCasingLine) routeCasingLine.setMap(null);
          if (routeMainLine) routeMainLine.setMap(null);
        }
      };

      if (!API_KEY) {
        document.getElementById('map').innerHTML = '<div class="missing">Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable Google Maps.</div>';
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      }
    </script>
    ${apiKey ? `<script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap" async defer></script>` : ''}
  </body>
</html>
`;

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
    latitude,
    longitude,
    zoom = 14.5,
    rescuer = null,
    destination = null,
    poi = null,
    pois = null,
    showRoute = false,
    followVehicle = false,
    routeColor,
    onLocationChange,
    accessToken,
}) => {
    const webViewRef = useRef<any>(null);
    const isMapReadyRef = useRef(false);
    const lastSentPayloadRef = useRef('');
    const apiKey = accessToken || getGoogleMapsApiKey();
    const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

    const [initialCoords] = useState(() => ({
        lat: latitude || -26.2041,
        lng: longitude || 28.0473,
        zoom: zoom || 14.5,
    }));

    const htmlContent = useMemo(
        () => generateMapHtml(apiKey, initialCoords.lat, initialCoords.lng, initialCoords.zoom),
        [apiKey, initialCoords]
    );
    const source = useMemo(() => ({ html: htmlContent }), [htmlContent]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!showRoute) {
                setRouteCoordinates(null);
                return;
            }
            let start: { lat: number; lng: number } | null = null;
            let end: { lat: number; lng: number } | null = null;
            if (rescuer?.latitude && rescuer?.longitude) {
                start = { lat: rescuer.latitude, lng: rescuer.longitude };
                end = { lat: latitude, lng: longitude };
            } else if (destination?.latitude && destination?.longitude) {
                start = { lat: latitude, lng: longitude };
                end = { lat: destination.latitude, lng: destination.longitude };
            }
            if (!start || !end) {
                setRouteCoordinates(null);
                return;
            }
            const route = await fetchDrivingRoute(start.lat, start.lng, end.lat, end.lng);
            if (!cancelled) {
                setRouteCoordinates(route && route.coordinates.length > 1 ? route.coordinates : null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showRoute, rescuer?.latitude, rescuer?.longitude, destination?.latitude, destination?.longitude, latitude, longitude]);

    const sendSync = useCallback(
        (flyToUser: boolean = false, force: boolean = false) => {
            if (!isMapReadyRef.current || !webViewRef.current) return;
            const payload = JSON.stringify({
                latitude,
                longitude,
                zoom,
                rescuer,
                destination,
                poi,
                pois,
                showRoute,
                followVehicle,
                routeColor,
                routeCoordinates,
                flyToUser,
            });
            if (!force && lastSentPayloadRef.current === payload) return;
            lastSentPayloadRef.current = payload;
            webViewRef.current.injectJavaScript(`if (window.syncMapState) { window.syncMapState(${payload}); } true;`);
        },
        [latitude, longitude, zoom, rescuer, destination, poi, pois, showRoute, followVehicle, routeColor, routeCoordinates]
    );

    useEffect(() => {
        sendSync(false);
    }, [sendSync]);

    const prevCoordsRef = useRef({ lat: latitude, lng: longitude });
    useEffect(() => {
        if (prevCoordsRef.current.lat !== latitude || prevCoordsRef.current.lng !== longitude) {
            prevCoordsRef.current = { lat: latitude, lng: longitude };
            sendSync(!rescuer && !destination, true);
        }
    }, [latitude, longitude, rescuer, destination, sendSync]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'MAP_READY') {
                isMapReadyRef.current = true;
                sendSync(true, true);
            } else if (data.type === 'LOCATION_CHANGE' && onLocationChange) {
                onLocationChange(data.latitude, data.longitude);
            }
        } catch {
            // Ignore parse errors from webview messages
        }
    };

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <iframe
                    title="Google Map"
                    srcDoc={htmlContent}
                    style={{ width: '100%', height: '100%' }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={source}
                style={styles.webview}
                onMessage={handleMessage}
                javaScriptEnabled
                domStorageEnabled
                geolocationEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
                allowsInlineMediaPlayback
                scrollEnabled={false}
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export const MapboxMapView = GoogleMapView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#f8fafc',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});
