import assert from "node:assert/strict";
import test from "node:test";
import { validateProblemDescription } from "./rescueRequestRules.ts";

test("requires a description only for the all-rounder service", () => {
  assert.match(validateProblemDescription("diagnostics", "  "), /describe/i);
  assert.equal(validateProblemDescription("fuel", ""), null);
});

test("accepts a description within the maximum length", () => {
  assert.equal(validateProblemDescription("diagnostics", "Engine warning light is on"), null);
  assert.equal(validateProblemDescription("diagnostics", "x".repeat(500)), null);
});

test("rejects a description beyond the maximum length", () => {
  assert.match(validateProblemDescription("diagnostics", "x".repeat(501)), /500/);
});