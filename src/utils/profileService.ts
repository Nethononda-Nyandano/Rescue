import { supabase } from './supabase';

export type UserRole =
  | 'client'
  | 'mobile_mechanic'
  | 'fleet_mechanic'
  | 'fleet_admin'
  | 'fleet_driver'
  | 'fleet driver'
  | 'admin'
  | 'serviceprovider';

export interface UserRoleOption {
  key: UserRole;
  label: string;
  description: string;
  icon: string;
}

export const USER_ROLES: UserRoleOption[] = [
  {
    key: 'client',
    label: 'Client / Customer',
    description: 'Request emergency roadside assistance, towing, tyre, battery, and fuel refill',
    icon: 'person-outline',
  },
  {
    key: 'mobile_mechanic',
    label: 'Mobile Mechanic',
    description: 'On-demand roadside responder offering towing, tyres, fuel delivery, and battery rescues',
    icon: 'construct-outline',
  },
  {
    key: 'fleet_mechanic',
    label: 'Fleet Mechanic',
    description: 'Dedicated corporate mechanic handling fleet maintenance, emergency rescues, and repairs',
    icon: 'build-outline',
  },
  {
    key: 'fleet_admin',
    label: 'Fleet Admin',
    description: 'Manage corporate fleets, company vehicles, and drivers',
    icon: 'business-outline',
  },
  {
    key: 'fleet_driver',
    label: 'Fleet Driver',
    description: 'Drive fleet vehicles and handle assigned emergency tasks',
    icon: 'car-outline',
  },
];

export interface ProfileRecord {
  id: string; // Clerk user id
  user_id: string; // Clerk user id
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveProfileInput {
  userId: string;
  email?: string | null;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber: string;
  role: UserRole;
  avatarUrl?: string | null;
}

/**
 * Creates or updates user profile in Supabase db using Clerk user ID
 */
export async function saveUserProfileToSupabase(
  input: SaveProfileInput
): Promise<{ data: ProfileRecord | null; error: any }> {
  try {
    const payload: Partial<ProfileRecord> = {
      id: input.userId,
      user_id: input.userId,
      email: input.email || null,
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: input.fullName || `${input.firstName} ${input.lastName}`.trim(),
      phone_number: input.phoneNumber,
      role: input.role,
      avatar_url: input.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase profile upsert warning:', error.message || error);
      return { data: null, error };
    }

    return { data: data as ProfileRecord, error: null };
  } catch (err: any) {
    console.error('saveUserProfileToSupabase exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetch profile from Supabase using Clerk User ID
 */
export async function getUserProfileFromSupabase(
  userId: string
): Promise<{ data: ProfileRecord | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch profile warning:', error.message || error);
      return { data: null, error };
    }

    return { data: data as ProfileRecord | null, error: null };
  } catch (err: any) {
    console.error('getUserProfileFromSupabase exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Get human-friendly label for a role
 */
export function getRoleLabel(role?: string | null): string {
  if (!role) return 'Client';
  const matched = USER_ROLES.find(
    (r) => r.key.toLowerCase() === role.toLowerCase()
  );
  if (matched) return matched.label;
  if (role === 'fleet_driver') return 'Fleet Driver';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
