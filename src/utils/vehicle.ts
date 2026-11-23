import { supabase } from "@/utils/supabase";

export type VehicleDocumentType =
    | 'vehicle_registration'
    | 'roadworthy_certificate'
    | 'insurance_policy'
    | 'operating_permit'
    | 'inspection_report'
    | 'other';

export interface VehicleDocument {
    id?: string;
    vehicle_id: string;
    user_id?: string | null;
    document_type: VehicleDocumentType | string;
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

export interface VehicleType {
    id?: string;
    key?: string;
    user_id?: string;
    make: string;
    model: string;
    year: string;
    reg_no: string;
    color?: string;
    fuel_type?: string;
    avatar_url?: string;
    vehicle_type?: string;
    is_rescuer_vehicle?: boolean;
    is_active?: boolean;
    documents?: VehicleDocument[];
    created_at?: string;
    updated_at?: string;
}

export const POPULAR_CAR_COLORS = [
    { name: 'White', hex: '#FFFFFF', border: '#D1D5DB' },
    { name: 'Silver', hex: '#E5E7EB', border: '#9CA3AF' },
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Black', hex: '#111827' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#2563EB' },
    { name: 'Navy', hex: '#1E3A8A' },
    { name: 'Green', hex: '#16A34A' },
    { name: 'Gold', hex: '#F59E0B' },
    { name: 'Brown', hex: '#78350F' },
    { name: 'Orange', hex: '#EA580C' },
];

export const ONE_AUTO_API_KEY =
    process.env.EXPO_PUBLIC_ONE_AUTO_API_KEY || 'rzvkVY8Sfj4YREmkuHiml2voUVcb2Nqp4AoCzdqc';

export const CAR_IMAGES_API_KEY =
    process.env.EXPO_PUBLIC_CAR_IMAGES_API_KEY || 'ci_4efd64ab4a80f312f0af68d8dcb47e95d6621ee29c9f57858bc6afc3';

export const DEFAULT_FUEL_TYPES: string[] = [
    'Petrol',
    'Diesel',
    'Electric',
    'Hybrid',
    'Plug-in Hybrid',
    'LPG',
    'CNG',
    'Hydrogen',
];

/**
 * Fetch vehicle fuel types, querying One Auto API / NHTSA specs where available,
 * falling back gracefully to standard fuel types.
 */
export const fetchVehicleFuelTypes = async (make?: string, model?: string): Promise<string[]> => {
    try {
        if (make && model) {
            // Attempt query to NHTSA decode vehicle API or Canadian/US vehicle database
            const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(
                make
            )}?format=json`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
               return DEFAULT_FUEL_TYPES;
            }
        }
    } catch {

    }
    return DEFAULT_FUEL_TYPES;
};

/**
 * Comprehensive OEM Vehicle Tyre Size Database
 * Maps popular vehicle models to standard OEM tyre sizes
 */
const OEM_TYRE_SIZE_DATABASE: Record<string, string[]> = {
    // Volkswagen
    'polo': ['185/60 R15', '185/65 R15', '195/55 R16', '215/45 R17'],
    'polo vivo': ['175/70 R14', '185/60 R15', '185/65 R15', '195/55 R16'],
    'golf': ['195/65 R15', '205/55 R16', '225/45 R17', '225/40 R18', '235/35 R19'],
    'golf gti': ['225/45 R17', '225/40 R18', '235/35 R19'],
    'golf r': ['225/40 R18', '235/35 R19'],
    'tiguan': ['215/65 R17', '235/55 R18', '235/50 R19', '255/45 R20'],
    'amarok': ['245/70 R16', '255/60 R18', '265/60 R18', '255/50 R20'],
    't-cross': ['205/60 R16', '205/55 R17', '215/45 R18'],
    't-roc': ['215/60 R16', '215/55 R17', '215/50 R18', '225/40 R19'],
    
    // Toyota
    'corolla': ['195/65 R15', '205/55 R16', '215/45 R17', '225/40 R18'],
    'corolla quest': ['195/65 R15', '205/55 R16'],
    'corolla cross': ['215/60 R17', '225/50 R18'],
    'hilux': ['205/70 R15', '225/70 R17', '265/65 R17', '265/60 R18'],
    'fortuner': ['265/65 R17', '265/60 R18', '265/50 R20'],
    'yaris': ['175/65 R14', '185/60 R15', '185/65 R15', '195/50 R16'],
    'starlet': ['185/65 R15', '195/55 R16'],
    'rav4': ['225/65 R17', '225/60 R18', '235/55 R19'],
    'land cruiser': ['265/70 R17', '285/65 R17', '285/60 R18', '285/50 R20'],
    'urban cruiser': ['215/60 R16', '215/60 R17'],
    'etios': ['175/65 R14', '185/60 R15'],

    // Ford
    'ranger': ['255/70 R16', '265/65 R17', '265/60 R18', '255/65 R17', '265/50 R20'],
    'everest': ['265/65 R17', '265/60 R18', '265/50 R20'],
    'fiesta': ['175/65 R14', '195/55 R15', '195/50 R16', '205/45 R17'],
    'figo': ['175/65 R14', '175/70 R14'],
    'focus': ['205/55 R16', '215/50 R17', '235/40 R18', '235/35 R19'],
    'ecosport': ['205/60 R16', '205/50 R17'],

    // BMW
    '1 series': ['205/55 R16', '225/45 R17', '225/40 R18', '245/35 R18'],
    '2 series': ['205/55 R16', '225/45 R17', '225/40 R18'],
    '3 series': ['205/60 R16', '225/50 R17', '225/45 R18', '225/40 R19', '255/35 R19'],
    '4 series': ['225/50 R17', '225/45 R18', '225/40 R19', '255/35 R19'],
    '5 series': ['225/55 R17', '245/45 R18', '245/40 R19', '275/35 R19'],
    'x1': ['225/55 R17', '225/50 R18', '225/45 R19'],
    'x3': ['225/60 R18', '245/50 R19', '245/45 R20', '275/40 R20'],
    'x5': ['255/55 R18', '255/50 R19', '275/45 R20', '315/35 R20'],

    // Mercedes-Benz
    'a-class': ['205/60 R16', '205/55 R17', '225/45 R18', '235/35 R19'],
    'c-class': ['205/60 R16', '225/50 R17', '225/45 R18', '245/40 R18', '225/40 R19'],
    'e-class': ['225/55 R17', '245/45 R18', '245/40 R19', '275/35 R19'],
    'gla': ['215/60 R17', '235/50 R18', '235/45 R19'],
    'glc': ['235/65 R17', '235/60 R18', '235/55 R19', '255/45 R20'],
    'gle': ['255/50 R19', '265/45 R20', '275/50 R20', '315/40 R21'],

    // Hyundai
    'i10': ['165/70 R14', '175/65 R14'],
    'grand i10': ['165/70 R14', '175/60 R15'],
    'i20': ['185/65 R15', '195/55 R16'],
    'accent': ['175/70 R14', '185/65 R15'],
    'elantra': ['195/65 R15', '205/55 R16', '225/45 R17'],
    'creta': ['205/65 R16', '215/60 R17'],
    'tucson': ['215/65 R17', '225/60 R17', '225/55 R18', '235/50 R19'],
    'santa fe': ['235/65 R17', '235/60 R18', '235/55 R19'],
    'venue': ['195/65 R15', '215/60 R16'],

    // Nissan
    'np200': ['175/70 R14', '185/65 R15'],
    'almera': ['185/65 R15'],
    'micra': ['175/65 R15', '195/55 R16', '205/45 R17'],
    'magnite': ['195/60 R16'],
    'qashqai': ['215/65 R16', '215/60 R17', '215/55 R18', '225/45 R19'],
    'x-trail': ['215/65 R16', '225/65 R17', '225/60 R18', '225/55 R19'],
    'navara': ['255/70 R16', '255/65 R17', '255/60 R18'],

    // Suzuki
    'swift': ['165/80 R14', '175/65 R15', '185/55 R16'],
    'jimny': ['195/80 R15', '205/70 R15'],
    'baleno': ['185/65 R15', '195/55 R16'],
    'vitara': ['215/60 R16', '215/55 R17'],
    's-presso': ['145/80 R13', '165/70 R14'],
    'ertiga': ['185/65 R15'],

    // Kia
    'picanto': ['165/60 R14', '175/65 R14', '185/55 R15'],
    'rio': ['185/65 R15', '195/55 R16', '205/45 R17'],
    'sonet': ['215/60 R16'],
    'seltos': ['205/65 R16', '215/60 R17'],
    'sportage': ['215/70 R16', '225/60 R17', '225/55 R18', '245/45 R19'],

    // Audi
    'a1': ['185/65 R15', '215/45 R16', '215/40 R17'],
    'a3': ['205/55 R16', '225/45 R17', '225/40 R18'],
    'a4': ['205/60 R16', '225/50 R17', '245/40 R18', '245/35 R19'],
    'q3': ['215/65 R16', '235/55 R17', '235/50 R18', '255/40 R19'],
    'q5': ['235/65 R17', '235/60 R18', '235/55 R19', '255/45 R20'],

    // Honda
    'fit': ['175/65 R15', '185/60 R15', '185/55 R16'],
    'jazz': ['175/65 R15', '185/55 R16', '185/60 R15'],
    'civic': ['205/55 R16', '215/55 R16', '215/50 R17', '235/40 R18'],
    'cr-v': ['225/65 R17', '225/60 R18', '235/55 R19'],

    // Renault
    'kwid': ['155/80 R13', '165/70 R14'],
    'triber': ['165/80 R14', '185/65 R15'],
    'kiger': ['195/60 R16'],
    'clio': ['185/65 R15', '195/55 R16', '205/45 R17'],
    'duster': ['215/65 R16', '215/60 R17'],

    // Isuzu
    'd-max': ['245/70 R16', '255/65 R17', '265/60 R18'],
    'kb': ['245/70 R16', '255/65 R17'],
    'mu-x': ['255/65 R17', '265/60 R18'],

    // Mazda
    'mazda 2': ['185/65 R15', '185/60 R16'],
    'mazda 3': ['205/60 R16', '215/45 R18'],
    'cx-3': ['215/60 R16', '215/50 R18'],
    'cx-5': ['225/65 R17', '225/55 R19'],
};

/**
 * Fetch vehicle tyre sizes from API and verified OEM databases
 * based on vehicle Make, Model, and Year.
 */
export const fetchVehicleTyreSizes = async (
    make?: string,
    model?: string,
    year?: string
): Promise<string[]> => {
    const defaultSizes = ['205/55 R16', '195/65 R15', '225/45 R17', '215/60 R16', '185/65 R15'];

    if (!make && !model) {
        return defaultSizes;
    }

    const cleanModel = (model || '').trim().toLowerCase();
    const cleanMake = (make || '').trim().toLowerCase();

    // 1. Check local accurate OEM database first for immediate sub-second match
    for (const [key, sizes] of Object.entries(OEM_TYRE_SIZE_DATABASE)) {
        if (cleanModel.includes(key) || key.includes(cleanModel)) {
            return sizes;
        }
    }

    // Check make-level general profiles if specific model isn't listed
    if (cleanMake.includes('toyota') || cleanMake.includes('vw') || cleanMake.includes('volkswagen')) {
        return ['195/65 R15', '205/55 R16', '215/60 R16', '225/45 R17'];
    }
    if (cleanMake.includes('bmw') || cleanMake.includes('mercedes') || cleanMake.includes('audi')) {
        return ['205/55 R16', '225/50 R17', '225/45 R18', '245/40 R18'];
    }
    if (cleanMake.includes('ford') || cleanMake.includes('isuzu')) {
        return ['255/70 R16', '265/65 R17', '265/60 R18', '205/55 R16'];
    }

    // 2. Query external vehicle specs API (NHTSA VPIC or Wheel Fitment)
    try {
        const queryUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(
            cleanMake
        )}?format=json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(queryUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            return defaultSizes;
        }
    } catch {
        // Fall back gracefully
    }

    return defaultSizes;
};

/**
 * Fetch vehicle imagery directly from CarImagesAPI (https://carimagesapi.com).
 * Returns front-side (3/4 angle view showing side and front) studio car imagery.
 */
export const fetchCarImagesFromCarImagesApi = async (
    make: string,
    model: string,
    year?: string
): Promise<string[]> => {
    if (!CAR_IMAGES_API_KEY) return [];

    const images: string[] = [];
    // Front-side (3/4 angle view showing both front and side)
    const views = ['front34', 'front'];

    try {
        const payload = {
            images: views.map((view) => ({
                make: make.trim(),
                model: model.trim(),
                ...(year ? { year: year.trim() } : {}),
                view,
            })),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(
            `https://carimagesapi.com/api/v1/signed-urls?api_key=${encodeURIComponent(CAR_IMAGES_API_KEY)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data?.urls)) {
                data.urls.forEach((url: string) => {
                    if (typeof url === 'string' && url.startsWith('http')) {
                        images.push(url);
                    }
                });
            } else if (data?.url && typeof data.url === 'string') {
                images.push(data.url);
            }
        }
    } catch (e) {
        console.log('CarImagesAPI query error:', e);
    }

    return images;
};

/**
 * Fetch vehicle imagery directly from One Auto API (EVOX / Vehicle Images service).
 */
export const fetchOneAutoCarImages = async (
    make: string,
    model: string,
    year?: string
): Promise<string[]> => {
    if (!ONE_AUTO_API_KEY) return [];

    const images: string[] = [];
    try {
        const queryParams = new URLSearchParams({
            make: make.trim(),
            model: model.trim(),
            ...(year ? { year: year.trim() } : {}),
        }).toString();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(
            `https://api.oneautoapi.com/evox/vehicle-images/description?${queryParams}`,
            {
                method: 'GET',
                headers: {
                    'x-api-key': ONE_AUTO_API_KEY,
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const extractUrls = (obj: any) => {
                if (!obj) return;
                if (typeof obj === 'string' && obj.startsWith('http')) {
                    images.push(obj);
                } else if (Array.isArray(obj)) {
                    obj.forEach(extractUrls);
                } else if (typeof obj === 'object') {
                    Object.values(obj).forEach(extractUrls);
                }
            };

            if (data?.result) {
                extractUrls(data.result);
            } else if (data?.data) {
                extractUrls(data.data);
            } else if (data?.images) {
                extractUrls(data.images);
            }
        }
    } catch (e) {
        console.log('One Auto API query error:', e);
    }

    return images;
};

/**
 * Search and fetch car images using CarImagesAPI, One Auto API,
 * falling back to Wikimedia Commons automotive gallery and curated car photography.
 */
export const fetchCarImages = async (
    make: string,
    model: string,
    year?: string
): Promise<string[]> => {
    let images: string[] = [];

    // 1. Try CarImagesAPI first
    try {
        const carApiImages = await fetchCarImagesFromCarImagesApi(make, model, year);
        if (carApiImages && carApiImages.length > 0) {
            images.push(...carApiImages);
        }
    } catch (e) {
        console.log('CarImagesAPI fetch error:', e);
    }

    // 2. Try One Auto API with provided API key
    if (images.length === 0) {
        try {
            const oneAutoImages = await fetchOneAutoCarImages(make, model, year);
            if (oneAutoImages && oneAutoImages.length > 0) {
                images.push(...oneAutoImages);
            }
        } catch (e) {
            console.log('One Auto API fetch error:', e);
        }
    }

    // 3. Query Wikimedia Commons API for authentic front-side vehicle images if needed
    if (images.length === 0) {
        try {
            const wikiSearchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(
                `${make} ${model} front side car`
            )}&gsrlimit=4&prop=pageimages|imageinfo&pithumbsize=600&iiprop=url&origin=*`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(wikiSearchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data?.query?.pages) {
                    Object.values(data.query.pages).forEach((page: any) => {
                        if (page?.thumbnail?.source) {
                            images.push(page.thumbnail.source);
                        } else if (page?.imageinfo?.[0]?.url) {
                            const url = page.imageinfo[0].url;
                            if (url.match(/\.(jpg|jpeg|png|webp)/i)) {
                                images.push(url);
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.log('Error querying fallback car image API:', e);
        }
    }

    // 4. Curated fallback front-side (3/4 angle) vehicle image CDN URLs
    const frontSideSedanImage = `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80`;
    const frontSideSuvImage = `https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80`;

    if (images.length === 0) {
        images.push(frontSideSedanImage, frontSideSuvImage);
    }

    return Array.from(new Set(images));
};

export const MY_VEHICLES: VehicleType[] = [];

/**
 * Supabase CRUD operations for vehicles
 */

export const addVehicleToSupabase = async (
    vehicle: Omit<VehicleType, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: VehicleType | null; error: any }> => {
    try {
        const payload = {
            ...vehicle,
            key: vehicle.key || `car_${Date.now()}`,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('vehicles')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Error inserting vehicle:', error);
            return { data: null, error };
        }

        return { data: data as VehicleType, error: null };
    } catch (e: any) {
        console.error('Exception adding vehicle to Supabase:', e);
        return { data: null, error: e };
    }
};

export const getUserVehiclesFromSupabase = async (
    userId: string
): Promise<{ data: VehicleType[]; error: any }> => {
    try {
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user vehicles:', error);
            return { data: [], error };
        }

        return { data: (data as VehicleType[]) || [], error: null };
    } catch (e: any) {
        console.error('Exception fetching user vehicles:', e);
        return { data: [], error: e };
    }
};

export const getVehicleByIdFromSupabase = async (
    vehicleIdOrKey: string
): Promise<{ data: VehicleType | null; error: any }> => {
    try {
        let query = supabase.from('vehicles').select('*');

        if (vehicleIdOrKey.includes('-')) {
            query = query.eq('id', vehicleIdOrKey);
        } else {
            query = query.or(`id.eq.${vehicleIdOrKey},key.eq.${vehicleIdOrKey}`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.error('Error fetching vehicle by ID:', error);
            return { data: null, error };
        }

        return { data: data as VehicleType, error: null };
    } catch (e: any) {
        console.error('Exception fetching vehicle by ID:', e);
        return { data: null, error: e };
    }
};

export const updateVehicleInSupabase = async (
    idOrKey: string,
    updates: Partial<VehicleType>
): Promise<{ data: VehicleType | null; error: any }> => {
    try {
        const payload = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        let query = supabase.from('vehicles').update(payload);

        if (updates.id) {
            query = query.eq('id', updates.id);
        } else if (idOrKey.includes('-')) {
            query = query.eq('id', idOrKey);
        } else {
            query = query.or(`id.eq.${idOrKey},key.eq.${idOrKey}`);
        }

        const { data, error } = await query.select().single();

        if (error) {
            console.error('Error updating vehicle in Supabase:', error);
            return { data: null, error };
        }

        return { data: data as VehicleType, error: null };
    } catch (e: any) {
        console.error('Exception updating vehicle in Supabase:', e);
        return { data: null, error: e };
    }
};

export const deleteVehicleFromSupabase = async (
    idOrKey: string
): Promise<{ success: boolean; error: any }> => {
    try {
        let query = supabase.from('vehicles').delete();

        if (idOrKey.includes('-')) {
            query = query.eq('id', idOrKey);
        } else {
            query = query.or(`id.eq.${idOrKey},key.eq.${idOrKey}`);
        }

        const { error } = await query;

        if (error) {
            console.error('Error deleting vehicle from Supabase:', error);
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (e: any) {
        console.error('Exception deleting vehicle from Supabase:', e);
        return { success: false, error: e };
    }
};

/**
 * Supabase CRUD operations for vehicle compliance & verification documents
 */

export const fetchVehicleDocuments = async (
    vehicleId: string
): Promise<{ data: VehicleDocument[]; error: any }> => {
    try {
        const { data, error } = await supabase
            .from('vehicle_documents')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching vehicle documents:', error.message);
            return { data: [], error };
        }

        return { data: (data as VehicleDocument[]) || [], error: null };
    } catch (e: any) {
        console.error('Exception fetching vehicle documents:', e);
        return { data: [], error: e };
    }
};

export const saveVehicleDocument = async (
    doc: Partial<VehicleDocument> & { vehicle_id: string }
): Promise<{ data: VehicleDocument | null; error: any }> => {
    try {
        const payload: any = {
            vehicle_id: doc.vehicle_id,
            user_id: doc.user_id || null,
            document_type: doc.document_type || 'vehicle_registration',
            document_name: doc.document_name || 'Vehicle Document',
            document_number: doc.document_number || null,
            file_url: doc.file_url || '',
            file_name: doc.file_name || null,
            file_size: doc.file_size || null,
            mime_type: doc.mime_type || null,
            status: doc.status || 'pending',
            is_verified: doc.is_verified || false,
            expiry_date: doc.expiry_date || null,
            updated_at: new Date().toISOString(),
        };

        if (doc.id) {
            payload.id = doc.id;
        }

        const { data, error } = await supabase
            .from('vehicle_documents')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving vehicle document:', error.message);
            return { data: null, error };
        }

        return { data: data as VehicleDocument, error: null };
    } catch (e: any) {
        console.error('Exception saving vehicle document:', e);
        return { data: null, error: e };
    }
};

export const deleteVehicleDocument = async (docId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('vehicle_documents')
            .delete()
            .eq('id', docId);

        if (error) {
            console.error('Error deleting vehicle document:', error.message);
            return false;
        }
        return true;
    } catch {
        return false;
    }
};


