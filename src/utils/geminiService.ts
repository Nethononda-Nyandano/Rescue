import { requestVehicleDiagnosis } from "@/utils/diagnosisService";

export interface GeminiDiagnosisResult {
  message: string;
  likelyCause: string;
  severity: "low" | "medium" | "high" | "critical";
  possibleCauses: string[];
  nextSteps: string[];
  followUpQuestions: string[];
  toolsOrPartsNeeded?: string[];
  urgent: boolean;
  urgentWarning?: string;
  recommendedService?: "tow" | "tyre" | "battery" | "fuel" | "mechanic" | null;
}

interface DiagnosisInput {
  getToken: () => Promise<string | null>;
  conversationId?: string | null;
  text?: string;
  imageBase64?: string;
  imageUri?: string | null;
  mimeType?: string;
}

// --------------------------------------------------
// Main Diagnosis Function
// --------------------------------------------------

export async function runGeminiMultimodalDiagnosis({
  getToken,
  conversationId = null,
  text = "",
  imageBase64,
  imageUri = null,
  mimeType = "image/jpeg",
}: DiagnosisInput): Promise<GeminiDiagnosisResult> {
  const result = await requestVehicleDiagnosis(
    getToken,
    conversationId,
    text,
    imageUri,
    imageBase64,
    mimeType,
  );
  const response = result.assistantMessage.response;
  if (!response) throw new Error("The diagnosis service returned an incomplete response. Please try again.");

  return {
    message: response.message,
    likelyCause: response.likelyCause || "No single cause can be confirmed from the available information.",
    severity: response.severity || (response.urgent ? "high" : "medium"),
    possibleCauses: response.possibleCauses,
    nextSteps: response.nextSteps,
    followUpQuestions: response.followUpQuestions,
    toolsOrPartsNeeded: response.toolsOrPartsNeeded,
    urgent: response.urgent,
    urgentWarning: response.urgentWarning || undefined,
    recommendedService: response.recommendedService,
  };
}