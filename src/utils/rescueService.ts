import { supabase } from '@/utils/supabase';
import {
    fetchNearbyGooglePOIs,
    reverseGeocodeGoogle,
    searchPlacesGoogle,
} from '@/utils/googleMaps';
export { getFuelOptions } from './fuelPrices';
export type { FuelOption, FuelPriceZone } from './fuelPrices';

export type RescueType = 'tow' | 'tyre' | 'fuel' | 'battery' | 'diagnostics';
export type PaymentMethod = 'cash' | 'card';
export type RescuerStatus = 'online' | 'busy' | 'offline';
export type MechanicType = 'mobile_mechanic' | 'fleet_mechanic';

export type RescuerDocumentType =
    | 'driver_license'
    | 'id_document'
    | 'police_clearance'
    | 'trade_certificate'
    | 'other';

export interface RescuerDocument {
    id?: string;
    rescuer_id?: string;
    vehicle_id?: string | null;
    user_id?: string;
    document_type: RescuerDocumentType | string;
    document_name: string;
    document_number?: string | null;
    file_url: string;
    file_name?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    status?: 'pending' | 'approved' | 'rejected' | 'expired';
    is_verified?: boolean;
    verified_at?: string | null;
    verified_by?: string | null;
    rejection_reason?: string | null;
    expiry_date?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface RescueCategoryOption {
    id: RescueType;
    title: string;
    subtitle: string;
    iconName: string;
    description: string;
}

export const RESCUE_CATEGORIES: RescueCategoryOption[] = [
    {
        id: 'tow',
        title: 'Towing & Recovery',
        subtitle: 'Flatbed & breakdown transport',
        iconName: 'car-sport-outline',
        description: 'Provide flatbed towing and emergency vehicle breakdown recovery',
    },
    {
        id: 'tyre',
        title: 'Tyre Assist',
        subtitle: 'Puncture repair & wheel change',
        iconName: 'disc-outline',
        description: 'Provide on-site puncture repairs, wheel fitment, and new tyre units',
    },
    {
        id: 'fuel',
        title: 'Fuel Delivery',
        subtitle: 'Petrol & Diesel refills',
        iconName: 'water-outline',
        description: 'Deliver emergency petrol or diesel directly to stranded drivers',
    },
    {
        id: 'battery',
        title: 'Battery Rescue',
        subtitle: 'Jump start & battery replacement',
        iconName: 'flash-outline',
        description: 'Provide on-site battery jump starts, battery replacements, and health diagnostics',
    },
];

export const FUEL_LITRE_PRESETS = [5, 10, 15, 20];

export interface NearbyPOI {
    id: string;
    name: string;
    address: string;
    category: 'gas_station' | 'mechanic' | 'place';
    latitude: number;
    longitude: number;
    distanceKm: number;
}

export interface PaymentCard {
    id?: string;
    user_id: string;
    card_holder_name: string;
    card_number_last4: string;
    card_brand: string;
    expiry_month: string;
    expiry_year: string;
    is_default?: boolean;
    created_at?: string;
}

export interface RescuerDocuments {
    driver_license_number?: string;
    driver_license_url?: string;
    id_document_url?: string;
    vehicle_registration_url?: string;
    insurance_policy_url?: string;
    police_clearance_url?: string;
    documents_verified?: boolean;
}

export interface Rescuer {
    id: string;
    user_id?: string;
    vehicle_id?: string | null;
    mechanic_type?: MechanicType;
    full_name: string;
    phone_number: string;
    avatar_url?: string;
    status: RescuerStatus;
    service_types: RescueType[];
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_plate?: string;
    vehicle_color?: string;
    rating: number;
    total_rescues: number;
    garage_name: string;
    garage_latitude: number;
    garage_longitude: number;
    current_latitude: number;
    current_longitude: number;
    heading?: number;
    is_verified?: boolean;
    documents?: RescuerDocument[];
    // Calculated runtime fields
    distance_km?: number;
    garage_distance_km?: number;
    eta_minutes?: number;
    calculated_price?: number;
}

export interface RescueRequest {
    id?: string;
    user_id: string;
    rescuer_id?: string | null;
    vehicle_id?: string;
    rescue_type: RescueType;
    payment_method: PaymentMethod;
    card_id?: string | null;
    card_details?: {
        card_holder_name: string;
        card_number_last4: string;
        card_brand: string;
    } | null;
    pickup_latitude: number;
    pickup_longitude: number;
    pickup_address?: string;
    destination_latitude?: number | null;
    destination_longitude?: number | null;
    destination_address?: string | null;
    distance_km?: number;
    garage_distance_km?: number;
    notes?: string;
    // Fuel Specific
    fuel_type?: string | null;
    fuel_litres?: number | null;
    fuel_price_per_litre?: number | null;
    // Tyre Specific
    tyre_size?: string | null;
    has_spare_wheel?: boolean;
    needs_new_tyre?: boolean;
    tyre_position?: string | null;
    // Battery Specific
    battery_action?: 'jump_start' | 'replace' | 'diagnostics' | string | null;
    // POI info
    nearest_poi_name?: string | null;
    nearest_poi_type?: string | null;
    service_details?: Record<string, any> | null;
    status?: 'pending' | 'searching' | 'no_driver_found' | 'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
    estimated_price?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ServiceOption {
    id: RescueType;
    title: string;
    subtitle: string;
    icon: any;
    basePrice: number;
    ratePerKm: number;
    garageRatePerKm: number;
}

export type RescueService = ServiceOption;

export const RESCUE_SERVICES: ServiceOption[] = [
    {
        id: 'tow',
        title: 'Tow Truck',
        subtitle: 'Flatbed & recovery',
        icon: require('@/assets/images/truck.png'),
        basePrice: 650,
        ratePerKm: 18,
        garageRatePerKm: 8,
    },
    {
        id: 'tyre',
        title: 'Tyre Assist',
        subtitle: 'Puncture & wheel change',
        icon: require('@/assets/images/tyre.png'),
        basePrice: 350,
        ratePerKm: 12,
        garageRatePerKm: 5,
    },
    {
        id: 'fuel',
        title: 'Fuel Delivery',
        subtitle: 'Emergency fuel refill',
        icon: require('@/assets/images/fuel.png'),
        basePrice: 280,
        ratePerKm: 10,
        garageRatePerKm: 4,
    },
    {
        id: 'battery',
        title: 'Battery Assist',
        subtitle: 'Jump start & battery replacement',
        icon: require('@/assets/images/batery.png'),
        basePrice: 320,
        ratePerKm: 12,
        garageRatePerKm: 5,
    },
    {
        id: 'diagnostics',
        title: 'All-rounder Mechanic',
        subtitle: 'Engine, gears, lights & electrical',
        icon: require('@/assets/images/batery.png'),
        basePrice: 420,
        ratePerKm: 12,
        garageRatePerKm: 5,
    },
];

/**
 * Calculate distance in Kilometers between two coordinates using Haversine formula
 */
export function calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10;
}

/**
 * Calculate dynamic price depending on a rescue type, distance to rescuer, and distance to garage/petrol station or dropoff
 */
export function calculateDynamicRescuePrice(
    rescueType: RescueType,
    rescuerDistanceKm: number = 3.5,
    poiDistanceKm: number = 5.0,
    additionalParams?: {
        towDropoffDistanceKm?: number;
        fuelLitres?: number;
        fuelPricePerLitre?: number;
        needsNewTyre?: boolean;
        needsNewBattery?: boolean;
        batteryAction?: 'jump_start' | 'replace' | 'diagnostics' | string;
    }
): {
    basePrice: number;
    rescuerDistanceKm: number;
    garageDistanceKm: number;
    distanceFee: number;
    garageFee: number;
    fuelCost?: number;
    towDropoffFee?: number;
    tyreSupplyFee?: number;
    batterySupplyFee?: number;
    totalPrice: number;
} {
    const service = RESCUE_SERVICES.find((s) => s.id === rescueType) || RESCUE_SERVICES[0];
    
    // Calculate distance-based increments
    const safeRescuerDist = Math.max(0.5, rescuerDistanceKm);
    const safePoiDist = Math.max(0.5, poiDistanceKm);

    const distanceFee = Math.round(safeRescuerDist * service.ratePerKm);
    
    // For tow, garageFee is based on petrol station depot or dropoff distance
    let garageFee = 0;
    let towDropoffFee = 0;
    let fuelCost = 0;
    let tyreSupplyFee = 0;
    let batterySupplyFee = 0;

    if (rescueType === 'tow') {
        const dropoffDist = additionalParams?.towDropoffDistanceKm || 0;
        if (dropoffDist > 0) {
            towDropoffFee = Math.round(dropoffDist * service.ratePerKm);
        } else {
            garageFee = Math.round(safePoiDist * service.garageRatePerKm);
        }
    } else if (rescueType === 'fuel') {
        garageFee = Math.round(safePoiDist * service.garageRatePerKm);
        const litres = additionalParams?.fuelLitres || 10;
        const pricePerLitre = additionalParams?.fuelPricePerLitre;
        fuelCost = Number.isFinite(pricePerLitre)
            ? Math.round(litres * Number(pricePerLitre) * 100) / 100
            : 0;
    } else if (rescueType === 'tyre') {
        // Tyre assist goes directly to mechanic / rescuer (no depot fee needed)
        garageFee = 0;
        if (additionalParams?.needsNewTyre) {
            // Standard replacement tyre unit cost
            tyreSupplyFee = 950;
        }
    } else if (rescueType === 'battery') {
        // Battery assist: jump start is standard, replacement includes unit fee
        garageFee = 0;
        if (additionalParams?.needsNewBattery || additionalParams?.batteryAction === 'replace') {
            batterySupplyFee = 1250;
        }
    }

    const totalPrice = Math.round((service.basePrice + distanceFee + garageFee + towDropoffFee + fuelCost + tyreSupplyFee + batterySupplyFee) * 100) / 100;

    return {
        basePrice: service.basePrice,
        rescuerDistanceKm: safeRescuerDist,
        garageDistanceKm: safePoiDist,
        distanceFee,
        garageFee,
        fuelCost: fuelCost > 0 ? fuelCost : undefined,
        towDropoffFee: towDropoffFee > 0 ? towDropoffFee : undefined,
        tyreSupplyFee: tyreSupplyFee > 0 ? tyreSupplyFee : undefined,
        batterySupplyFee: batterySupplyFee > 0 ? batterySupplyFee : undefined,
        totalPrice,
    };
}

/**
 * Closest Google Places for petrol stations / workshops.
 * Ranked by distance (Bolt/Uber style). Fake stations are never used.
 */
export async function fetchNearbyPOIs(
    userLat: number,
    userLng: number,
    category: 'gas_station' | 'mechanic' = 'gas_station',
    _accessToken?: string
): Promise<NearbyPOI[]> {
    try {
        const googlePois = await fetchNearbyGooglePOIs(userLat, userLng, category);
        if (googlePois.length > 0) {
            return googlePois
                .map((poi) => ({
                    id: poi.id,
                    name: poi.name,
                    address: poi.address,
                    category: poi.category,
                    latitude: poi.latitude,
                    longitude: poi.longitude,
                    distanceKm: poi.distanceKm,
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);
        }
    } catch (err) {
        console.warn(`Google POI search note for ${category}:`, err);
    }

    return [];
}

/**
 * Fetch closest registered mechanics / rescuers with registered address from Supabase database.
 * If no rescuer with registered address exists, returns an empty array (no mock data, no fallback).
 */
export async function fetchNearbyRegisteredMechanics(
    userLat: number,
    userLng: number
): Promise<NearbyPOI[]> {
    try {
        const { data, error } = await supabase
            .from('rescuers')
            .select('*');

        if (!error && data && data.length > 0) {
            // Filter only rescuers who have registered coordinates and address / garage details
            const validRescuers = data.filter((r: any) => {
                const hasCoordinates =
                    (typeof r.garage_latitude === 'number' && typeof r.garage_longitude === 'number') ||
                    (typeof r.current_latitude === 'number' && typeof r.current_longitude === 'number');
                const hasDetails = Boolean(r.garage_name || r.full_name);
                return hasCoordinates && hasDetails;
            });

            if (validRescuers.length === 0) {
                return [];
            }

            // Filter rescuers who support tyre/mechanical/battery service or all valid rescuers
            const mechanics = validRescuers.filter((r: any) => {
                if (!r.service_types) return true;
                return Array.isArray(r.service_types) && (
                    r.service_types.includes('tyre') ||
                    r.service_types.includes('battery') ||
                    r.service_types.includes('tow')
                );
            });

            const candidateList = mechanics.length > 0 ? mechanics : validRescuers;

            const enriched: NearbyPOI[] = candidateList.map((r: any) => {
                const rLat = typeof r.garage_latitude === 'number' ? r.garage_latitude : r.current_latitude;
                const rLng = typeof r.garage_longitude === 'number' ? r.garage_longitude : r.current_longitude;
                const dist = calculateDistanceKm(userLat, userLng, rLat, rLng);
                const mechName = r.full_name || r.garage_name || 'Registered Mechanic';
                const mechGarage = r.garage_name || 'Registered Workshop';
                const vehicleInfo = r.vehicle_make && r.vehicle_model ? `${r.vehicle_make} ${r.vehicle_model}` : '';
                const plateInfo = r.vehicle_plate ? `[${r.vehicle_plate}]` : '';

                return {
                    id: r.id,
                    name: `${mechName} (${mechGarage})`,
                    address: [mechGarage, vehicleInfo, plateInfo].filter(Boolean).join(' • ') || 'Registered Rescuer',
                    category: 'mechanic' as const,
                    latitude: rLat,
                    longitude: rLng,
                    distanceKm: dist,
                };
            });

            enriched.sort((a, b) => a.distanceKm - b.distanceKm);
            return enriched;
        }
    } catch (e) {
        console.warn('Error fetching registered mechanics from Supabase:', e);
    }

    // Do NOT show mock mechanics if no registered rescuer exists
    return [];
}

/**
 * Search places (destinations) using Google Places Text Search
 */
export async function searchPlacesMapbox(
    query: string,
    proximityLat: number,
    proximityLng: number,
    _accessToken?: string
): Promise<{ id: string; name: string; address: string; latitude: number; longitude: number; distanceKm: number }[]> {
    return searchPlacesGoogle(query, proximityLat, proximityLng);
}

/**
 * Find nearest garage / real station for given user coordinates from real POIs list.
 * Returns null if no real POI is found.
 */
export function findNearestGarage(userLat: number, userLng: number, realPOIs?: NearbyPOI[]): NearbyPOI | null {
    if (realPOIs && realPOIs.length > 0) {
        return realPOIs[0];
    }
    return null;
}

/**
 * Fetch available nearby online or busy rescuers from Supabase
 */
export async function fetchNearbyRescuers(
    userLat: number,
    userLng: number,
    rescueType: RescueType,
    allowBusy: boolean = true
): Promise<{ data: Rescuer[]; error: any }> {
    try {
        const statuses = allowBusy ? ['online', 'busy'] : ['online'];
        
        const { data, error } = await supabase
            .from('rescuers')
            .select('*')
            .in('status', statuses);

        if (error) {
            console.error('Error fetching rescuers from Supabase:', error.message);
            return { data: [], error };
        }

        let rescuersList: Rescuer[] = [];

        if (data && data.length > 0) {
            // Filter rescuers who support the requested service type
            rescuersList = data.filter((r: any) => {
                if (!r.service_types) return true;
                return Array.isArray(r.service_types) && r.service_types.includes(rescueType);
            });
        }

        // If no rescuers in Supabase table match, return empty array
        if (rescuersList.length === 0) {
            return { data: [], error: null };
        }

        // Calculate dynamic distances, ETA, and pricing for each rescuer
        const enrichedRescuers: Rescuer[] = rescuersList.map((rescuer) => {
            const distance_km = calculateDistanceKm(
                userLat,
                userLng,
                rescuer.current_latitude,
                rescuer.current_longitude
            );
            
            const garage_distance_km = calculateDistanceKm(
                userLat,
                userLng,
                rescuer.garage_latitude || -26.2041,
                rescuer.garage_longitude || 28.0473
            );

            const pricing = calculateDynamicRescuePrice(rescueType, distance_km, garage_distance_km);

            return {
                ...rescuer,
                distance_km,
                garage_distance_km,
                calculated_price: pricing.totalPrice,
            };
        });

        // Sort: online first, then by closest distance
        enrichedRescuers.sort((a, b) => {
            if (a.status === 'online' && b.status !== 'online') return -1;
            if (a.status !== 'online' && b.status === 'online') return 1;
            return (a.distance_km || 999) - (b.distance_km || 999);
        });

        return { data: enrichedRescuers, error: null };
    } catch (err) {
        console.error('Exception in fetchNearbyRescuers:', err);
        return { data: [], error: err };
    }
}

/**
 * Fetch saved payment cards for the current user
 */
export async function getUserPaymentCards(userId: string): Promise<{ data: PaymentCard[] | null; error: any }> {
    try {
        const { data, error } = await supabase
            .from('user_payment_cards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Error fetching payment cards:', error.message);
            return { data: [], error };
        }
        return { data: data || [], error: null };
    } catch (err) {
        console.error('Exception fetching payment cards:', err);
        return { data: [], error: err };
    }
}

/**
 * Add a new payment card for the user
 */
export async function addPaymentCard(card: Omit<PaymentCard, 'id' | 'created_at'>): Promise<{ data: PaymentCard | null; error: any }> {
    try {
        const { data, error } = await supabase
            .from('user_payment_cards')
            .insert({
                user_id: card.user_id,
                card_holder_name: card.card_holder_name,
                card_number_last4: card.card_number_last4,
                card_brand: card.card_brand || 'Visa',
                expiry_month: card.expiry_month,
                expiry_year: card.expiry_year,
                is_default: card.is_default || false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error inserting card to Supabase:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception inserting card:', err);
        return { data: null, error: err };
    }
}

/**
 * Create a new rescue request
 */
export async function createRescueRequest(request: Omit<RescueRequest, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: RescueRequest | null; error: any }> {
    try {
        const { data, error } = await supabase
            .from('rescue_requests')
            .insert({
                user_id: request.user_id,
                rescuer_id: request.rescuer_id || null,
                vehicle_id: request.vehicle_id || null,
                rescue_type: request.rescue_type,
                payment_method: request.payment_method,
                card_id: request.card_id || null,
                card_details: request.card_details || null,
                pickup_latitude: request.pickup_latitude,
                pickup_longitude: request.pickup_longitude,
                pickup_address: request.pickup_address || '',
                destination_latitude: request.destination_latitude || null,
                destination_longitude: request.destination_longitude || null,
                destination_address: request.destination_address || null,
                distance_km: request.distance_km || null,
                garage_distance_km: request.garage_distance_km || null,
                fuel_type: request.fuel_type || null,
                fuel_litres: request.fuel_litres || null,
                fuel_price_per_litre: request.fuel_price_per_litre || null,
                tyre_size: request.tyre_size || null,
                has_spare_wheel: request.has_spare_wheel !== undefined ? request.has_spare_wheel : true,
                needs_new_tyre: request.needs_new_tyre !== undefined ? request.needs_new_tyre : false,
                tyre_position: request.tyre_position || null,
                battery_action: request.battery_action || null,
                nearest_poi_name: request.nearest_poi_name || null,
                nearest_poi_type: request.nearest_poi_type || null,
                service_details: request.service_details || null,
                notes: request.notes || null,
                status: request.status || 'pending',
                estimated_price: request.estimated_price || null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating rescue request:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating rescue request:', err);
        return { data: null, error: err };
    }
}

/**
 * Fetch verification documents for a rescuer
 */
export async function fetchRescuerDocuments(
    rescuerIdOrUserId: string
): Promise<{ data: RescuerDocument[] | null; error: any }> {
    try {
        const { data, error } = await supabase
            .from('rescuer_documents')
            .select('*')
            .or(`rescuer_id.eq.${rescuerIdOrUserId},user_id.eq.${rescuerIdOrUserId}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Error fetching rescuer documents:', error.message);
            return { data: [], error };
        }
        return { data: data || [], error: null };
    } catch (err) {
        console.error('Exception fetching rescuer documents:', err);
        return { data: [], error: err };
    }
}

/**
 * Save / upload a rescuer verification document
 */
export async function saveRescuerDocument(
    doc: Partial<RescuerDocument>
): Promise<{ data: RescuerDocument | null; error: any }> {
    try {
        const payload: any = {
            rescuer_id: doc.rescuer_id || null,
            vehicle_id: doc.vehicle_id || null,
            user_id: doc.user_id || null,
            document_type: doc.document_type || 'other',
            document_name: doc.document_name || 'Verification Document',
            document_number: doc.document_number || null,
            file_url: doc.file_url || '',
            file_name: doc.file_name || null,
            file_size: doc.file_size || null,
            mime_type: doc.mime_type || null,
            status: doc.status || 'pending',
            is_verified: doc.is_verified || false,
            updated_at: new Date().toISOString(),
        };

        if (doc.id) {
            payload.id = doc.id;
        }

        const { data, error } = await supabase
            .from('rescuer_documents')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving rescuer document:', error.message);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception saving rescuer document:', err);
        return { data: null, error: err };
    }
}

/**
 * Delete a rescuer verification document
 */
export async function deleteRescuerDocument(docId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('rescuer_documents')
            .delete()
            .eq('id', docId);
        return !error;
    } catch {
        return false;
    }
}

/**
 * Register or update rescuer profile with chosen categories and details
 */
export async function registerOrUpdateRescuer(
    rescuer: {
        userId: string;
        fullName: string;
        phoneNumber: string;
        mechanicType?: MechanicType;
        serviceTypes: RescueType[];
        garageName?: string;
        vehicleId?: string;
        vehicleMake?: string;
        vehicleModel?: string;
        vehiclePlate?: string;
        avatarUrl?: string;
        latitude?: number;
        longitude?: number;
    }
): Promise<{ data: Rescuer | null; error: any }> {
    try {
        const payload: any = {
            user_id: rescuer.userId,
            mechanic_type: rescuer.mechanicType || 'mobile_mechanic',
            full_name: rescuer.fullName,
            phone_number: rescuer.phoneNumber,
            service_types: rescuer.serviceTypes.length > 0 ? rescuer.serviceTypes : ['tow', 'tyre', 'fuel', 'battery'],
            garage_name: rescuer.garageName || 'ResQ Rapid Fleet Hub',
            vehicle_id: rescuer.vehicleId || null,
            vehicle_make: rescuer.vehicleMake || 'Isuzu',
            vehicle_model: rescuer.vehicleModel || 'NPR 400 Mobile Service Unit',
            vehicle_plate: rescuer.vehiclePlate || 'RQ 2026 GP',
            avatar_url: rescuer.avatarUrl || null,
            current_latitude: rescuer.latitude || -26.2041,
            current_longitude: rescuer.longitude || 28.0473,
            garage_latitude: rescuer.latitude || -26.2041,
            garage_longitude: rescuer.longitude || 28.0473,
            status: 'online',
            is_verified: true,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('rescuers')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Error registering rescuer:', error.message);
            return { data: null, error };
        }
        return { data: data as Rescuer, error: null };
    } catch (err) {
        console.error('Exception registering rescuer:', err);
        return { data: null, error: err };
    }
}

/**
 * Update rescue request status in Supabase
 */
export async function updateRescueRequestStatus(
    requestId: string,
    status: RescueRequest['status'],
    rescuerId?: string | null
): Promise<boolean> {
    try {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (rescuerId !== undefined) {
            updates.rescuer_id = rescuerId;
        }
        const { error } = await supabase
            .from('rescue_requests')
            .update(updates)
            .eq('id', requestId);

        return !error;
    } catch {
        return false;
    }
}

/**
 * Reverse geocode latitude and longitude using Google Geocoding API
 */
export async function reverseGeocodeMapbox(lat: number, lng: number, _accessToken?: string): Promise<string> {
    return reverseGeocodeGoogle(lat, lng);
}

export async function fetchRescuerById(rescuerId: string): Promise<Rescuer | null> {
    try {
        const { data, error } = await supabase.from('rescuers').select('*').eq('id', rescuerId).maybeSingle();
        if (error || !data) return null;
        return data as Rescuer;
    } catch {
        return null;
    }
}

export async function getRescueRequestById(id: string): Promise<RescueRequest | null> {
    try {
        const { data, error } = await supabase.from('rescue_requests').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return data as RescueRequest;
    } catch {
        return null;
    }
}

export async function getActiveClientRequest(userId: string): Promise<RescueRequest | null> {
    try {
        const { data, error } = await supabase
            .from('rescue_requests')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['pending', 'searching', 'assigned', 'en_route', 'arrived', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error || !data) return null;
        return data as RescueRequest;
    } catch {
        return null;
    }
}

export function subscribeToRescueRequest(
    requestId: string,
    onUpdate: (request: RescueRequest) => void
): () => void {
    const channel = supabase
        .channel(`rescue-request-${requestId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rescue_requests', filter: `id=eq.${requestId}` },
            (payload) => {
                if (payload.new) onUpdate(payload.new as RescueRequest);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

export function subscribeToRescuerLocation(
    rescuerId: string,
    onUpdate: (rescuer: Rescuer) => void
): () => void {
    const channel = supabase
        .channel(`rescuer-location-${rescuerId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rescuers', filter: `id=eq.${rescuerId}` },
            (payload) => {
                if (payload.new) onUpdate(payload.new as Rescuer);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
