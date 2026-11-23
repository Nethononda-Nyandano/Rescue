import assert from "node:assert/strict";
import test from "node:test";
import { getDiagnosisFunctionErrorMessage } from "./diagnosisFunctionErrors.ts";

function functionError(status, body) {
  return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: new Response(body, {
      status,
      headers: { "content-type": "application/json" },
    }),
  });
}

test("explains when the diagnosis Edge Function has not been deployed", async () => {
  const message = await getDiagnosisFunctionErrorMessage(functionError(404, JSON.stringify({
    code: "NOT_FOUND",
    message: "Function not found",
  })));
  assert.match(message, /deploy.*diagnosis/i);
});

test("preserves a function-level not-found response", async () => {
  assert.equal(
    await getDiagnosisFunctionErrorMessage(functionError(404, JSON.stringify({ error: "This diagnosis was not found." }))),
    "This diagnosis was not found.",
  );
});

test("recognizes a plain-text missing-function gateway response", async () => {
  const message = await getDiagnosisFunctionErrorMessage(functionError(404, "NOT_FOUND"));
  assert.match(message, /deploy.*diagnosis/i);
});

test("does not mistake an unreadable history response for a missing function", async () => {
  const message = await getDiagnosisFunctionErrorMessage(functionError(404, "unreadable"));
  assert.match(message, /HTTP 404/);
  assert.doesNotMatch(message, /not deployed/i);
});

test("shows the function authentication response", async () => {
  assert.equal(
    await getDiagnosisFunctionErrorMessage(functionError(401, JSON.stringify({ error: "Your session is invalid or expired. Please sign in again." }))),
    "Your session is invalid or expired. Please sign in again.",
  );
});

test("shows a server-provided history error", async () => {
  assert.equal(
    await getDiagnosisFunctionErrorMessage(functionError(500, JSON.stringify({ error: "Could not load diagnosis history." }))),
    "Could not load diagnosis history.",
  );
});

test("includes an HTTP status when the response body is malformed", async () => {
  const message = await getDiagnosisFunctionErrorMessage(functionError(503, "not-json"));
  assert.match(message, /503/);
  assert.match(message, /temporarily unavailable/i);
});

test("preserves urgent safety warnings from function responses", async () => {
  const message = await getDiagnosisFunctionErrorMessage(functionError(502, JSON.stringify({
    error: "Diagnosis unavailable.",
    urgentWarning: "Stop driving and pull over safely.",
  })));
  assert.match(message, /Diagnosis unavailable\./);
  assert.match(message, /Safety warning: Stop driving and pull over safely\./);
});