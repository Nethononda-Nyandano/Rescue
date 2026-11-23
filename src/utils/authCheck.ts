import { UserRole } from './profileService';

export type ClerkUserType = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryPhoneNumber?: { phoneNumber?: string | null } | null;
  phoneNumbers?: { phoneNumber?: string | null }[] | null;
  unsafeMetadata?: Record<string, any>;
  publicMetadata?: Record<string, any>;
};

export function isProfileComplete(user: ClerkUserType | null | undefined): boolean {
  if (!user) return false;

  const hasPhone = Boolean(
    user.primaryPhoneNumber?.phoneNumber ||
    (user.phoneNumbers && user.phoneNumbers.length > 0) ||
    (user.unsafeMetadata as Record<string, any>)?.phoneNumber
  );

  const hasFirstName = Boolean(
    user.firstName?.trim() ||
    (user.unsafeMetadata as Record<string, any>)?.firstName
  );

  const hasLastName = Boolean(
    user.lastName?.trim() ||
    (user.unsafeMetadata as Record<string, any>)?.lastName
  );

  return hasPhone && hasFirstName && hasLastName;
}

export function getUserRole(user: ClerkUserType | null | undefined): UserRole | null {
  if (!user) return null;
  return (
    (user.unsafeMetadata as Record<string, any>)?.role ||
    (user.publicMetadata as Record<string, any>)?.role ||
    null
  );
}
