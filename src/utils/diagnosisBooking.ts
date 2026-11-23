import type { RescueType } from '@/utils/rescueService';

export const MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH = 500;
const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000;

export interface VehicleChoice {
  id?: string | null;
  key?: string | null;
}

export interface DiagnosisBookingMessage {
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string | null;
}

export interface DiagnosisBookingHandoff {
  service: RescueType;
  problemDescription: string;
  createdAt: number;
}

const pendingHandoffs = new Map<string, DiagnosisBookingHandoff>();

export function shouldPromptForVehicleSelection(vehicleCount: number): boolean {
  return Number.isFinite(vehicleCount) && vehicleCount > 1;
}

export function chooseActiveVehicle<T extends VehicleChoice>(
  vehicles: T[],
  savedVehicleId: string | null,
): T | null {
  if (vehicles.length === 0) return null;
  if (savedVehicleId) {
    const savedVehicle = vehicles.find(
      (vehicle) => vehicle.id === savedVehicleId || vehicle.key === savedVehicleId,
    );
    if (savedVehicle) return savedVehicle;
  }
  return vehicles[0];
}

export function mapRecommendedDiagnosisService(
  recommendation?: string | null,
): RescueType | null {
  switch (recommendation?.toLowerCase()) {
    case 'tow':
      return 'tow';
    case 'tyre':
      return 'tyre';
    case 'fuel':
      return 'fuel';
    case 'battery':
      return 'battery';
    case 'mechanic':
    case 'diagnostics':
      return 'diagnostics';
    default:
      return null;
  }
}

export function collectDiagnosisSymptoms(
  messages: DiagnosisBookingMessage[],
  throughIndex: number,
): string {
  if (!Number.isInteger(throughIndex) || throughIndex < 0) return '';

  const text = messages
    .slice(0, throughIndex + 1)
    .filter((message) => message.role === 'user')
    .map((message) => message.text.trim())
    .filter(Boolean)
    .join('\n');

  return text.length > MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH
    ? text.slice(-MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH).trim()
    : text;
}

export function storeDiagnosisBookingHandoff(
  accountId: string,
  service: RescueType,
  problemDescription: string,
): boolean {
  const scopedAccountId = accountId.trim();
  if (!scopedAccountId) return false;

  pendingHandoffs.set(scopedAccountId, {
    service,
    problemDescription: problemDescription
      .trim()
      .slice(0, MAX_DIAGNOSIS_BOOKING_DESCRIPTION_LENGTH),
    createdAt: Date.now(),
  });
  return true;
}

export function consumeDiagnosisBookingHandoff(
  accountId: string,
): DiagnosisBookingHandoff | null {
  const scopedAccountId = accountId.trim();
  const handoff = pendingHandoffs.get(scopedAccountId);
  if (!handoff) return null;

  pendingHandoffs.delete(scopedAccountId);
  if (Date.now() - handoff.createdAt > HANDOFF_MAX_AGE_MS) return null;
  return handoff;
}