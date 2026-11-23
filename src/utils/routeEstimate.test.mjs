import assert from "node:assert/strict";
import test from "node:test";
import { createDrivingRouteEstimate } from "./routeEstimate.ts";

const routeCoordinates = [[28.04, -26.20], [28.05, -26.21]];

test("accepts a measured traffic-aware road route", () => {
  assert.deepEqual(
    createDrivingRouteEstimate({
      coordinates: routeCoordinates,
      distanceMeters: 2480,
      durationSeconds: 421,
      provider: "google",
      trafficAware: true,
    }),
    {
      coordinates: routeCoordinates,
      distanceKm: 2.5,
      durationMinutes: 7,
      provider: "google",
      trafficAware: true,
    },
  );
});

test("accepts a measured OSRM route without claiming live traffic", () => {
  const estimate = createDrivingRouteEstimate({
    coordinates: routeCoordinates,
    distanceMeters: 3010,
    durationSeconds: 600,
    provider: "osrm",
    trafficAware: false,
  });
  assert.equal(estimate?.distanceKm, 3);
  assert.equal(estimate?.durationMinutes, 10);
  assert.equal(estimate?.trafficAware, false);
});

test("rejects missing, invalid, or fabricated route metrics", () => {
  for (const metrics of [
    { distanceMeters: 0, durationSeconds: 60 },
    { distanceMeters: 1000, durationSeconds: 0 },
    { distanceMeters: Number.NaN, durationSeconds: 60 },
    { distanceMeters: 1000, durationSeconds: 60, coordinates: [[400, 91]] },
  ]) {
    assert.equal(
      createDrivingRouteEstimate({
        coordinates: routeCoordinates,
        provider: "osrm",
        trafficAware: false,
        ...metrics,
      }),
      null,
    );
  }
});