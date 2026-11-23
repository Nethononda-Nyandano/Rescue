export type FuelPriceZone = 'inland' | 'coastal';

export interface FuelOption {
    id: string;
    name: string;
    pricePerLitre: number;
    badge: string;
}

export const FUEL_PRICE_REFERENCE = {
    effectiveFrom: '2026-11-04',
    validThrough: '2026-12-01',
    governmentNotice: 'https://www.gov.za/news/media-statements/minister-gwede-mantashe-announces-adjustment-fuel-prices-effective-4-0',
    publishedPriceTable: 'https://www.thesouthafrican.com/news/here-are-the-official-petrol-and-diesel-prices-for-november-2026',
} as const;

const fuelGrades = [
    { id: 'petrol_93', name: 'Petrol 93 ULP', badge: 'Economy', inland: 29.87, coastal: 29.08 },
    { id: 'petrol_95', name: 'Petrol 95 ULP', badge: 'Standard', inland: 30.24, coastal: 29.37 },
    { id: 'diesel_50ppm', name: 'Diesel 50ppm (0.005%, wholesale)', badge: 'Wholesale', inland: 31.60, coastal: 30.83 },
    { id: 'diesel_500ppm', name: 'Diesel 500ppm (0.05%, wholesale)', badge: 'Wholesale', inland: 30.85, coastal: 29.98 },
] as const;

export function getFuelOptions(zone: FuelPriceZone | null): FuelOption[] {
    return fuelGrades.map((grade) => ({
        id: grade.id,
        name: grade.name,
        pricePerLitre: zone ? grade[zone] : 0,
        badge: grade.badge,
    }));
}

export function isFuelPriceReferenceCurrent(now: Date = new Date()): boolean {
    const validThrough = new Date(`${FUEL_PRICE_REFERENCE.validThrough}T23:59:59+02:00`);
    return Number.isFinite(now.getTime()) && now.getTime() <= validThrough.getTime();
}