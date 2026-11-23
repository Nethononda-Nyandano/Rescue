export type RouteProvider = 'google' | 'osrm';

export interface DrivingRouteEstimate {
    coordinates: [number, number][];
    distanceKm: number;
    durationMinutes: number;
    provider: RouteProvider;
    trafficAware: boolean;
}

interface DrivingRouteEstimateInput {
    coordinates?: unknown;
    distanceMeters?: unknown;
    durationSeconds?: unknown;
    provider: RouteProvider;
    trafficAware: boolean;
}

export function createDrivingRouteEstimate({
    coordinates,
    distanceMeters,
    durationSeconds,
    provider,
    trafficAware,
}: DrivingRouteEstimateInput): DrivingRouteEstimate | null {
    const distance = Number(distanceMeters);
    const duration = Number(durationSeconds);
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(duration) || duration <= 0) return null;

    const validCoordinates: [number, number][] = [];
    for (const point of coordinates) {
        if (!Array.isArray(point) || point.length < 2) return null;
        const longitude = Number(point[0]);
        const latitude = Number(point[1]);
        if (
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
            !Number.isFinite(latitude) || latitude < -90 || latitude > 90
        ) return null;
        validCoordinates.push([longitude, latitude]);
    }

    return {
        coordinates: validCoordinates,
        distanceKm: Math.round(distance / 100) / 10,
        durationMinutes: Math.max(1, Math.round(duration / 60)),
        provider,
        trafficAware,
    };
}