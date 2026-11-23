import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  hasPotentiallyDangerousSymptoms,
  validateDiagnosisImage,
  validateSymptomMessage,
} from "./validation.ts";

Deno.test("symptom descriptions are trimmed and length-limited", () => {
  assertEquals(validateSymptomMessage("  The engine clicks when I start it.  "), "The engine clicks when I start it.");
  assertThrows(() => validateSymptomMessage("  "));
  assertThrows(() => validateSymptomMessage("x".repeat(1801)));
  assertEquals(
    validateSymptomMessage("", true),
    "Please assess the attached vehicle image and ask for any details needed.",
  );
});

Deno.test("image validation accepts supported image types and bounded base64", () => {
  assertEquals(validateDiagnosisImage("aGVsbG8=", "image/jpeg"), {
    data: "aGVsbG8=",
    mimeType: "image/jpeg",
  });
  assertEquals(validateDiagnosisImage("aGVsbG8=", "image/png")?.mimeType, "image/png");
  assertEquals(validateDiagnosisImage("aGVsbG8=", "image/webp")?.mimeType, "image/webp");
  assertEquals(validateDiagnosisImage(null, null), null);
  assertThrows(() => validateDiagnosisImage("aGVsbG8=", "image/gif"));
  assertThrows(() => validateDiagnosisImage("not base64!", "image/png"));
  assertThrows(() => validateDiagnosisImage("A".repeat(5_600_000), "image/webp"));
});

Deno.test("dangerous vehicle symptoms are flagged independently of the model", () => {
  assertEquals(hasPotentiallyDangerousSymptoms("There is smoke coming from the engine"), true);
  assertEquals(hasPotentiallyDangerousSymptoms("My brakes are not working"), true);
  assertEquals(hasPotentiallyDangerousSymptoms("The brake pedal goes to the floor"), true);
  assertEquals(hasPotentiallyDangerousSymptoms("The radio display is dim"), false);
});