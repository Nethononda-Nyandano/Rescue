export async function getDiagnosisFunctionErrorMessage(error: unknown): Promise<string> {
  const context = (error as {
    context?: {
      status?: number;
      clone?: () => { json?: () => Promise<unknown>; text?: () => Promise<string> };
      json?: () => Promise<unknown>;
      text?: () => Promise<string>;
    };
  } | null)?.context;
  const status = context?.status;
  const fallback = error instanceof Error && error.message !== "Edge Function returned a non-2xx status code"
    ? error.message
    : status === 401
      ? "Your session expired or was rejected. Please sign in again."
      : status !== undefined && status >= 500
        ? `The diagnosis service is temporarily unavailable (HTTP ${status}). Please try again later.`
        : status !== undefined
          ? `The diagnosis request failed (HTTP ${status}). Please try again.`
          : "The diagnosis service is temporarily unavailable. Please try again.";
  if (!context) return fallback;

  let responseBody: unknown;
  try {
    const response = context.clone?.() ?? context;
    if (response.json) responseBody = await response.json();
  } catch {
    try {
      const response = context.clone?.() ?? context;
      if (response.text) responseBody = await response.text();
    } catch {
      // Use the status-based fallback when the error body cannot be read.
    }
  }

  const body = responseBody && typeof responseBody === "object"
    ? responseBody as Record<string, unknown>
    : null;
  const bodyMessage = body
    ? [body.error, body.message, body.msg].find((value): value is string => typeof value === "string")
    : undefined;
  const rawBody = typeof responseBody === "string" ? responseBody.trim() : "";
  const code = body && typeof body.code === "string" ? body.code : "";
  const isMissingFunction = status === 404 && (
    /^(?:NOT_FOUND|FUNCTION_NOT_FOUND)$/i.test(code) ||
    /^(?:NOT_FOUND|FUNCTION_NOT_FOUND)$/i.test(rawBody) ||
    /function.{0,40}not found|requested function was not found/i.test(bodyMessage || rawBody) ||
    (!bodyMessage && !rawBody)
  );
  const message = isMissingFunction
    ? "The diagnosis service is not deployed for this Supabase project. Deploy it with `supabase functions deploy diagnosis --no-verify-jwt`, and confirm the app uses the same Supabase project."
    : bodyMessage || fallback;
  const warning = body && typeof body.urgentWarning === "string" ? body.urgentWarning : null;
  return warning ? `${message}\n\nSafety warning: ${warning}` : message;
}