import assert from "node:assert/strict";
import test from "node:test";
import {
  FUEL_PRICE_REFERENCE,
  getFuelOptions,
  isFuelPriceReferenceCurrent,
} from "./fuelPrices.ts";

test("uses the November 2026 official inland and coastal reference prices", () => {
  const inland = Object.fromEntries(getFuelOptions("inland").map((item) => [item.id, item.pricePerLitre]));
  const coastal = Object.fromEntries(getFuelOptions("coastal").map((item) => [item.id, item.pricePerLitre]));
  assert.deepEqual(inland, {
    petrol_93: 29.87,
    petrol_95: 30.24,
    diesel_50ppm: 31.6,
    diesel_500ppm: 30.85,
  });
  assert.deepEqual(coastal, {
    petrol_93: 29.08,
    petrol_95: 29.37,
    diesel_50ppm: 30.83,
    diesel_500ppm: 29.98,
  });
  assert.equal(FUEL_PRICE_REFERENCE.effectiveFrom, "2026-11-04");
});

test("marks the monthly prices expired after their stated validity period", () => {
  assert.equal(isFuelPriceReferenceCurrent(new Date("2026-11-20T12:00:00+02:00")), true);
  assert.equal(isFuelPriceReferenceCurrent(new Date("2026-12-02T00:00:00+02:00")), false);
});