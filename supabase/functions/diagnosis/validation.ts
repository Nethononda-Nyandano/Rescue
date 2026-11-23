const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateSymptomMessage(value: unknown, hasImage = false): string {
  if (typeof value !== "string") {
    if (hasImage) return "Please assess the attached vehicle image and ask for any details needed.";
    throw new Error("Describe the vehicle problem before requesting a diagnosis.");
  }

  const message = value.trim();
  if (!message) {
    if (hasImage) return "Please assess the attached vehicle image and ask for any details needed.";
    throw new Error("Describe the vehicle problem before requesting a diagnosis.");
  }
  if (message.length > 1800) {
    throw new Error("Keep each symptom description under 1,800 characters.");
  }

  return message;
}

export function validateDiagnosisImage(base64Value: unknown, mimeTypeValue: unknown): { data: string; mimeType: string } | null {
  if (base64Value == null && mimeTypeValue == null) return null;
  if (typeof base64Value !== "string" || typeof mimeTypeValue !== "string") {
    throw new Error("The attached image could not be read. Please choose another JPEG, PNG, or WebP image.");
  }

  const mimeType = mimeTypeValue.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP image for vehicle diagnosis.");
  }

  const data = base64Value.trim().replace(/^data:image\/(?:jpeg|png|webp);base64,/i, "");
  if (!data || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4) {
    throw new Error("The image is too large. Choose an image smaller than 4 MB.");
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    throw new Error("The attached image is invalid. Please choose another image.");
  }

  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  const decodedSize = Math.floor(data.length * 3 / 4) - padding;
  if (decodedSize > MAX_IMAGE_BYTES) {
    throw new Error("The image is too large. Choose an image smaller than 4 MB.");
  }

  return { data, mimeType };
}

export function hasPotentiallyDangerousSymptoms(message: string): boolean {
  return /\b(smoke|smoking|flames?|fire|burning smell|fuel (?:leak|smell)|petrol smell|(?:brakes?|brake pedal).{0,28}(?:fail(?:ed|ing|ure)?|not working|soft|to the floor|going to the floor)|(?:no|lost) brakes|(?:cannot|can't) stop|steering(?: wheel)?.{0,28}(?:fail(?:ed|ing)?|not working|locked)|overheat(?:ing)?|engine temperature.{0,20}red|loss of control)\b/i.test(message);
}