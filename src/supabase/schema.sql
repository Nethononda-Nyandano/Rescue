-- RESQ SUPABASE DATABASE SCHEMA
-- Handles profiles storing Clerk User ID and Role Enum

-- 1. Create Enum for User Roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'client',
            'mobile_mechanic',
            'fleet_mechanic',
            'fleet_admin',
            'admin'

        );
    ELSE
        -- Ensure all updated role values exist
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'mobile_mechanic';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fleet_mechanic';

    END IF;
END$$;

-- 2. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- Clerk User ID (e.g. user_2xxx)
    user_id TEXT NOT NULL, -- Clerk User ID reference
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone_number TEXT,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 3. Create Index on user_id and role
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 4. Create Vehicles Table
-- Stores both client vehicles and rescuer service vehicles
-- Note: Vehicle compliance documents (registration, roadworthy, insurance) are stored in the dedicated `vehicle_documents` table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT,
    user_id TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    color TEXT,
    fuel_type TEXT DEFAULT 'Petrol',
    avatar_url TEXT,
    vehicle_type TEXT DEFAULT 'personal', -- 'personal', 'tow_truck', 'service_van', 'flatbed', 'fleet'
    is_rescuer_vehicle BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in vehicles if table was created previously
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'Petrol';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'personal';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_rescuer_vehicle BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Create Indices on vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg_no ON vehicles(reg_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_rescuer ON vehicles(is_rescuer_vehicle);

-- 6. Create Vehicle Documents Table
-- Dedicated table for vehicle compliance & verification documents (registration, roadworthy, insurance, permits)
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id TEXT, -- Clerk User ID of owner/driver
    document_type TEXT NOT NULL, -- 'vehicle_registration', 'roadworthy_certificate', 'insurance_policy', 'operating_permit', 'inspection_report', 'other'
    document_name TEXT NOT NULL, -- e.g. "Vehicle Registration (Natis / Disc)", "Fleet Insurance Policy"
    document_number TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    rejection_reason TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in vehicle_documents if table was created previously
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_user_id ON vehicle_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_type ON vehicle_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_status ON vehicle_documents(status);

-- 7. Create User Payment Cards Table
CREATE TABLE IF NOT EXISTS user_payment_cards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    card_holder_name TEXT NOT NULL,
    card_number_last4 TEXT NOT NULL,
    card_brand TEXT NOT NULL DEFAULT 'Visa',
    expiry_month TEXT NOT NULL,
    expiry_year TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON user_payment_cards(user_id);

-- 8. Create Rescuers / Drivers Table
-- Status: 'online', 'busy', 'offline'
-- Mechanic types: 'mobile_mechanic', 'fleet_mechanic'
-- Service categories: 'tow', 'tyre', 'fuel', 'battery'
-- Note: Vehicle info is referenced via `vehicle_id` (vehicles table) and vehicle documents are stored in `vehicle_documents`.
-- Rescuer personal verification documents (driver license, ID, trade certificate) are stored in `rescuer_documents`.
CREATE TABLE IF NOT EXISTS rescuers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    mechanic_type TEXT NOT NULL DEFAULT 'mobile_mechanic' CHECK (mechanic_type IN ('mobile_mechanic', 'fleet_mechanic')),
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'busy', 'offline')),
    service_types TEXT[] NOT NULL DEFAULT ARRAY['tow', 'tyre', 'fuel', 'battery'],
    vehicle_make TEXT DEFAULT 'Isuzu',
    vehicle_model TEXT DEFAULT 'NPR 400 Flatbed Tow Truck',
    vehicle_plate TEXT,
    vehicle_color TEXT DEFAULT 'White & Yellow',
    rating NUMERIC(3, 2) DEFAULT 4.90,
    total_rescues INTEGER DEFAULT 54,
    garage_name TEXT NOT NULL DEFAULT 'ResQ Central Rapid Depot',
    garage_latitude DOUBLE PRECISION DEFAULT -26.2041,
    garage_longitude DOUBLE PRECISION DEFAULT 28.0473,
    current_latitude DOUBLE PRECISION NOT NULL,
    current_longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in rescuers if table was created previously
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS mechanic_type TEXT DEFAULT 'mobile_mechanic';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS service_types TEXT[] DEFAULT ARRAY['tow', 'tyre', 'fuel', 'battery'];
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS vehicle_make TEXT DEFAULT 'Isuzu';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS vehicle_model TEXT DEFAULT 'NPR 400 Flatbed Tow Truck';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS vehicle_color TEXT DEFAULT 'White & Yellow';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.90;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS total_rescues INTEGER DEFAULT 54;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS garage_name TEXT DEFAULT 'ResQ Central Rapid Depot';
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS garage_latitude DOUBLE PRECISION DEFAULT -26.2041;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS garage_longitude DOUBLE PRECISION DEFAULT 28.0473;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION DEFAULT -26.2041;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION DEFAULT 28.0473;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION DEFAULT 0;
ALTER TABLE rescuers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_rescuers_status ON rescuers(status);
CREATE INDEX IF NOT EXISTS idx_rescuers_mechanic_type ON rescuers(mechanic_type);
CREATE INDEX IF NOT EXISTS idx_rescuers_vehicle_id ON rescuers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rescuers_coords ON rescuers(current_latitude, current_longitude);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rescuers_user_id_unique ON rescuers(user_id);

-- 9. Create Rescuer Documents Table
-- Dedicated table to store personal rescuer verification & compliance documents (ID, driver license, police clearance, trade certificate)
CREATE TABLE IF NOT EXISTS rescuer_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rescuer_id TEXT REFERENCES rescuers(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    user_id TEXT, -- Clerk User ID reference
    document_type TEXT NOT NULL, -- 'driver_license', 'id_document', 'police_clearance', 'trade_certificate', 'other'
    document_name TEXT NOT NULL, -- e.g. "Driver's License (Code 10/14)", "National ID / Passport"
    document_number TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    rejection_reason TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in rescuer_documents if table was created previously
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS rescuer_id TEXT REFERENCES rescuers(id) ON DELETE CASCADE;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE rescuer_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_rescuer_docs_rescuer_id ON rescuer_documents(rescuer_id);
CREATE INDEX IF NOT EXISTS idx_rescuer_docs_vehicle_id ON rescuer_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rescuer_docs_user_id ON rescuer_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rescuer_docs_type ON rescuer_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_rescuer_docs_status ON rescuer_documents(status);

-- 10. Create Rescue Requests Table
-- Rescue types: 'tow', 'tyre', 'fuel', 'battery'
-- Payment methods: 'cash', 'card'
CREATE TABLE IF NOT EXISTS rescue_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    rescuer_id TEXT REFERENCES rescuers(id) ON DELETE SET NULL,
    vehicle_id TEXT,
    rescue_type TEXT NOT NULL, -- 'tow' | 'tyre' | 'fuel' | 'battery'
    payment_method TEXT NOT NULL, -- 'cash' | 'card'
    card_id TEXT REFERENCES user_payment_cards(id) ON DELETE SET NULL,
    card_details JSONB, -- snapshot of card info (brand, last4, holder)
    pickup_latitude DOUBLE PRECISION NOT NULL,
    pickup_longitude DOUBLE PRECISION NOT NULL,
    pickup_address TEXT,
    destination_latitude DOUBLE PRECISION,
    destination_longitude DOUBLE PRECISION,
    destination_address TEXT,
    distance_km NUMERIC(10, 2),
    garage_distance_km NUMERIC(10, 2),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'searching', 'no_driver_found', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'
    estimated_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist in rescue_requests if table was created previously
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS rescuer_id TEXT REFERENCES rescuers(id) ON DELETE SET NULL;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS vehicle_id TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS card_id TEXT REFERENCES user_payment_cards(id) ON DELETE SET NULL;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10, 2);
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS garage_distance_km NUMERIC(10, 2);
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS destination_latitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS destination_longitude DOUBLE PRECISION;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS destination_address TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS card_details JSONB;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS fuel_litres NUMERIC(5, 1);
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS fuel_price_per_litre NUMERIC(6, 2);
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS tyre_size TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS has_spare_wheel BOOLEAN DEFAULT TRUE;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS needs_new_tyre BOOLEAN DEFAULT FALSE;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS tyre_position TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS battery_action TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS nearest_poi_name TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS nearest_poi_type TEXT;
ALTER TABLE rescue_requests ADD COLUMN IF NOT EXISTS service_details JSONB;

CREATE INDEX IF NOT EXISTS idx_rescue_requests_user_id ON rescue_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_rescuer_id ON rescue_requests(rescuer_id);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_vehicle_id ON rescue_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_status ON rescue_requests(status);
CREATE INDEX IF NOT EXISTS idx_rescue_requests_type ON rescue_requests(rescue_type);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescuer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_requests ENABLE ROW LEVEL SECURITY;

-- 12. Policies for Access (Drop first to allow idempotent re-execution)
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles"
    ON profiles
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow profile upsert" ON profiles;
CREATE POLICY "Allow profile upsert"
    ON profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all vehicles operations" ON vehicles;
CREATE POLICY "Allow all vehicles operations"
    ON vehicles
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all vehicle documents operations" ON vehicle_documents;
CREATE POLICY "Allow all vehicle documents operations"
    ON vehicle_documents
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all payment cards operations" ON user_payment_cards;
CREATE POLICY "Allow all payment cards operations"
    ON user_payment_cards
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all rescuers operations" ON rescuers;
CREATE POLICY "Allow all rescuers operations"
    ON rescuers
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all rescuer documents operations" ON rescuer_documents;
CREATE POLICY "Allow all rescuer documents operations"
    ON rescuer_documents
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all rescue requests operations" ON rescue_requests;
CREATE POLICY "Allow all rescue requests operations"
    ON rescue_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);
