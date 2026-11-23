import { supabase } from "@/utils/supabase";
import { getDiagnosisFunctionErrorMessage } from "@/utils/diagnosisFunctionErrors";

export interface DiagnosisResponse {
  message: string;
  likelyCause?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  possibleCauses: string[];
  nextSteps: string[];
  followUpQuestions: string[];
  toolsOrPartsNeeded?: string[];
  urgent: boolean;
  urgentWarning: string | null;
  recommendedService?: 'tow' | 'tyre' | 'battery' | 'fuel' | 'mechanic' | null;
}

export interface DiagnosisMessage {
  id?: string;
  role: "user" | "assistant";
  text: string;
  imageUri?: string | null;
  response?: DiagnosisResponse;
  createdAt: string;
}

export interface DiagnosisSummary {
  id: string;
  title: string;
  isUrgent: boolean;
  updatedAt: string;
}

export interface DiagnosisConversation extends DiagnosisSummary {
  messages: DiagnosisMessage[];
}

type TokenGetter = () => Promise<string | null>;

export async function requestVehicleDiagnosis(
  getToken: TokenGetter,
  conversationId: string | null,
  message: string,
  imageUri?: string | null,
  imageBase64?: string | null,
  imageMimeType?: string | null,
): Promise<{
  conversationId: string;
  userMessage: DiagnosisMessage;
  assistantMessage: DiagnosisMessage;
}> {
  const token = await getToken();
  if (!token) throw new Error("Your session is invalid or expired. Please sign in again.");

  const { data, error } = await supabase.functions.invoke("diagnosis", {
    body: {
      action: "diagnose",
      conversationId,
      message,
      imageBase64: imageBase64 || undefined,
      imageMimeType: imageBase64 ? imageMimeType || "image/jpeg" : undefined,
      audience: "client",
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(await getDiagnosisFunctionErrorMessage(error));
  if (!data?.conversationId || !data?.userMessage || !data?.assistantMessage) {
    throw new Error("The diagnosis service returned an incomplete response. Please try again.");
  }

  return {
    conversationId: data.conversationId,
    userMessage: { ...data.userMessage, imageUri: imageUri || null },
    assistantMessage: data.assistantMessage,
  };
}

export async function getDiagnosisHistory(getToken: TokenGetter): Promise<DiagnosisSummary[]> {
  const token = await getToken();
  if (!token) throw new Error("Your session is invalid or expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("diagnosis", {
    body: { action: "history" },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(await getDiagnosisFunctionErrorMessage(error));
  if (!Array.isArray(data?.conversations)) {
    throw new Error("The diagnosis service returned an invalid history response. Please try again.");
  }
  return data.conversations.map((item: any) => ({
    id: item.id,
    title: item.title,
    isUrgent: item.is_urgent,
    updatedAt: item.updated_at,
  }));
}

export async function getDiagnosisConversation(
  getToken: TokenGetter,
  conversationId: string,
): Promise<DiagnosisConversation> {
  const token = await getToken();
  if (!token) throw new Error("Your session is invalid or expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("diagnosis", {
    body: { action: "load", conversationId },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(await getDiagnosisFunctionErrorMessage(error));
  const item = data?.conversation;
  if (!item || !Array.isArray(item.messages)) throw new Error("Diagnosis conversation not found.");
  return {
    id: item.id,
    title: item.title,
    isUrgent: item.is_urgent,
    updatedAt: item.updated_at,
    messages: item.messages,
  };
}
