import assert from "node:assert/strict";
import test from "node:test";
import { claimNotificationEvent } from "./notificationEvents.ts";

test("claims a status event only once", () => {
  const seen = new Set();
  assert.equal(claimNotificationEvent(seen, "request-1:arrived"), true);
  assert.equal(claimNotificationEvent(seen, "request-1:arrived"), false);
});

test("keeps the deduplication set bounded", () => {
  const seen = new Set(Array.from({ length: 100 }, (_, index) => `event-${index}`));
  assert.equal(claimNotificationEvent(seen, "event-new"), true);
  assert.equal(seen.size, 100);
  assert.equal(seen.has("event-0"), false);
});