import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ScrollViewInstance,
} from "react-native";
import { Alert, Modal } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  DiagnosisConversation,
  DiagnosisMessage,
  DiagnosisSummary,
  getDiagnosisConversation,
  getDiagnosisHistory,
  requestVehicleDiagnosis,
} from "@/utils/diagnosisService";
import type { RescueType } from "@/utils/rescueService";
import {
  collectDiagnosisSymptoms,
  mapRecommendedDiagnosisService,
  storeDiagnosisBookingHandoff,
} from "@/utils/diagnosisBooking";

const suggestedSymptoms = [
  "Check engine light flashing",
  "Car won't start / clicking sound",
  "Strange noise when braking",
  "Engine overheating or steam",
];

const assistanceOptions: {
  id: RescueType;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: 'tow',
    title: 'Towing & Recovery',
    description: 'The car cannot be safely driven or needs transport.',
    icon: 'car-sport-outline',
  },
  {
    id: 'tyre',
    title: 'Tyre Assist',
    description: 'A puncture, flat tyre, or wheel needs attention.',
    icon: 'disc-outline',
  },
  {
    id: 'fuel',
    title: 'Fuel Delivery',
    description: 'The vehicle has run out of fuel.',
    icon: 'water-outline',
  },
  {
    id: 'battery',
    title: 'Battery Rescue',
    description: 'The car will not start or needs battery assistance.',
    icon: 'flash-outline',
  },
  {
    id: 'diagnostics',
    title: 'Mobile Mechanic',
    description: 'Request an all-rounder mechanic for another problem.',
    icon: 'construct-outline',
  },
];

function DiagnosisReply({
  message,
  onBookRescue,
}: {
  message: DiagnosisMessage;
  onBookRescue: () => void;
}) {
  const response = message.response;
  if (!response) {
    return (
      <View className="self-start max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 mb-3">
        <Text className="font-poppin text-sm text-gray-800 leading-6">
          {message.text}
        </Text>
      </View>
    );
  }

  const getSeverityBadge = () => {
    const sev = response.severity?.toLowerCase() || (response.urgent ? "high" : "low");
    let bg = "bg-emerald-50 text-emerald-800";
    if (sev === "critical" || sev === "urgent") bg = "bg-red-50 text-red-800";
    else if (sev === "high") bg = "bg-orange-50 text-orange-800";
    else if (sev === "medium") bg = "bg-amber-50 text-amber-800";

    return (
      <View className={`px-2.5 py-0.5 rounded-full self-start ${bg.split(" ")[0]} mb-2`}>
        <Text className={`font-poppin-semibold text-[11px] uppercase tracking-wider ${bg.split(" ")[1]}`}>
          {response.severity || (response.urgent ? "High Risk" : "Moderate")}
        </Text>
      </View>
    );
  };

  return (
    <View className="self-start max-w-[94%] rounded-2xl rounded-tl-sm bg-white px-4 py-3.5 mb-3 shadow-xs">
      {/* Likely Cause Header */}
      {response.likelyCause ? (
        <View className="mb-2 pb-2 ">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-poppin-bold text-sm text-gray-900 flex-1 mr-2">
              {response.likelyCause}
            </Text>
            {getSeverityBadge()}
          </View>
        </View>
      ) : null}

      {/* Main explanation text */}
      <Text className="font-poppin text-sm text-gray-800 leading-6">
        {response.message || message.text}
      </Text>

      {/* Urgent Safety Warning */}
      {response.urgentWarning && (
        <View className="mt-3 rounded-xl bg-red-50 p-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons name="warning" size={18} color="#b91c1c" />
            <Text className="font-poppin-semibold text-sm text-red-800">
              Immediate Safety Warning
            </Text>
          </View>
          <Text className="font-poppin text-xs text-red-800 leading-5">
            {response.urgentWarning}
          </Text>
        </View>
      )}

      {/* Possible Causes */}
      {Boolean(response.possibleCauses && response.possibleCauses.length > 0) && (
        <View className="mt-3 bg-gray-50 rounded-xl p-3 ">
          <Text className="font-poppin-semibold text-xs text-gray-900 mb-1.5 flex-row items-center">
            Probable Causes
          </Text>
          {response.possibleCauses.map((cause, index) => (
            <View key={`${index}-${cause}`} className="flex-row items-start mb-1">
              <Text className="text-amber-600 mr-1.5 font-bold">•</Text>
              <Text className="font-poppin text-xs text-gray-700 leading-5 flex-1">
                {cause}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Suggested Next Steps */}
      {Boolean(response.nextSteps && response.nextSteps.length > 0) && (
        <View className="mt-3 bg-blue-50/50 rounded-xl p-3 ">
          <Text className="font-poppin-semibold text-xs text-gray-900 mb-1.5">
            Suggested Next Steps
          </Text>
          {response.nextSteps.map((step, index) => (
            <View key={`${index}-${step}`} className="flex-row items-start mb-1">
              <Ionicons name="checkmark-circle-outline" size={14} color="#2563eb" className="mt-0.5 mr-1.5" />
              <Text className="font-poppin text-xs text-gray-700 leading-5 flex-1">
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tools or Parts Needed */}
      {Boolean(response.toolsOrPartsNeeded && response.toolsOrPartsNeeded.length > 0) && (
        <View className="mt-3 bg-slate-50 rounded-xl p-3 ">
          <Text className="font-poppin-semibold text-xs text-slate-900 mb-1">
            Tools / Parts Required
          </Text>
          {response.toolsOrPartsNeeded?.map((item, index) => (
            <Text key={`${index}-${item}`} className="font-poppin text-xs text-slate-700 leading-5">
              • {item}
            </Text>
          ))}
        </View>
      )}

      {/* Follow-up Questions */}
      {Boolean(response.followUpQuestions && response.followUpQuestions.length > 0) && (
        <View className="mt-3 rounded-xl bg-amber-50 p-3 ">
          <Text className="font-poppin-semibold text-xs text-amber-950 mb-1">
            Questions for accurate diagnosis
          </Text>
          {response.followUpQuestions.map((question, index) => (
            <Text
              key={`${index}-${question}`}
              className="font-poppin text-xs text-amber-900 leading-5 mb-1"
            >
              ? {question}
            </Text>
          ))}
        </View>
      )}

      {/* Quick Action Button */}
      <TouchableOpacity
        onPress={onBookRescue}
        activeOpacity={0.8}
        className="mt-3 flex-row items-center justify-center bg-gray-900 py-2.5 px-3 rounded-xl"
      >
        <Ionicons name="car-outline" size={16} color="#ffffff" />
        <Text className="font-poppin-semibold text-xs text-white ml-2">
          Request Roadside Assistance
        </Text>
      </TouchableOpacity>

      <Text className="font-poppin text-[10px] text-gray-400 mt-2 text-center">
        Powered by Gemini AI • Guidance only, verify with on-site mechanic
      </Text>
    </View>
  );
}

export default function DiagnosisScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiagnosisMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [history, setHistory] = useState<DiagnosisSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistanceChoice, setAssistanceChoice] = useState<{
    messageIndex: number;
    recommendedService: RescueType | null;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const historyData = await getDiagnosisHistory(getToken);
      setHistory(historyData);
    } catch (err) {
      console.error("Diagnosis history error:", err);
      setHistoryError(err instanceof Error ? err.message : "Could not load diagnosis history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [getToken]);

  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const startNewDiagnosis = () => {
    setConversationId(null);
    setMessages([]);
    setDraft("");
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
    setSelectedImageMimeType(null);
    setError(null);
    setIsHistoryOpen(false);
  };

  const openConversation = async (summary: DiagnosisSummary) => {
    setIsHistoryOpen(false);
    setIsLoading(true);
    setError(null);
    try {
      const conversation: DiagnosisConversation =
        await getDiagnosisConversation(getToken, summary.id);
      setConversationId(conversation.id);
      setMessages(conversation.messages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open this diagnosis.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant photo library access to upload vehicle photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setSelectedImageBase64(result.assets[0].base64 || null);
        setSelectedImageMimeType(result.assets[0].mimeType || "image/jpeg");
      }
    } catch (e: any) {
      Alert.alert("Image Error", e.message || "Failed to select image from gallery.");
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera access to capture vehicle photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setSelectedImageBase64(result.assets[0].base64 || null);
        setSelectedImageMimeType(result.assets[0].mimeType || "image/jpeg");
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e.message || "Failed to take photo with camera.");
    }
  };

  const removeSelectedImage = () => {
    setSelectedImageUri(null);
    setSelectedImageBase64(null);
    setSelectedImageMimeType(null);
  };

  const sendMessage = async (overrideText?: string) => {
    const symptom = (overrideText !== undefined ? overrideText : draft).trim();
    if (isLoading) return;
    if (selectedImageUri && !selectedImageBase64) {
      setError("This photo could not be prepared for analysis. Remove it and continue with text, or take another photo.");
      return;
    }
    if (!symptom && !selectedImageBase64) return;

    setIsLoading(true);
    setError(null);
    const imgUriToSend = selectedImageUri;
    const imgBase64ToSend = selectedImageBase64;
    const imgMimeTypeToSend = selectedImageMimeType;

    try {
      const result = await requestVehicleDiagnosis(
        getToken,
        conversationId,
        symptom,
        imgUriToSend,
        imgBase64ToSend,
        imgMimeTypeToSend,
      );
      setDraft("");
      setSelectedImageUri(null);
      setSelectedImageBase64(null);
      setSelectedImageMimeType(null);
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current,
        result.userMessage,
        result.assistantMessage,
      ]);
      await loadHistory();
    } catch (err) {
      setDraft(symptom);
      setError(
        err instanceof Error
          ? err.message
          : "Could not get diagnosis guidance. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const requestMechanicHelp = (messageIndex: number, recommendation?: string | null) => {
    setError(null);
    setAssistanceChoice({
      messageIndex,
      recommendedService: mapRecommendedDiagnosisService(recommendation),
    });
  };

  const chooseAssistance = (service: RescueType) => {
    if (!assistanceChoice) return;
    if (!user?.id) {
      Alert.alert("Sign in required", "Sign in again before requesting roadside assistance.");
      return;
    }

    const symptoms = collectDiagnosisSymptoms(messages, assistanceChoice.messageIndex);
    if (!storeDiagnosisBookingHandoff(user.id, service, symptoms)) {
      Alert.alert("Could not prepare request", "Please try requesting assistance again.");
      return;
    }

    setAssistanceChoice(null);
    router.replace("/(tabs)" as any);
  };

  return (
    <>
      <View className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{ flex: 1 }}
          className="flex-1 bg-gray-50"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
            style={{ flex: 1 }}
          >
            <View className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50">
                <TouchableOpacity
                  onPress={() => router.back()}
                  accessibilityLabel="Back to dashboard"
                  className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-xs"
                >
                  <Ionicons name="arrow-back" size={19} color="#111827" />
                </TouchableOpacity>
                <View className="flex-1 ml-3">
                  <Text className="font-poppin-bold text-gray-900 text-base">
                    Gemini AI Diagnosis
                  </Text>
                  <Text className="font-poppin text-gray-500 text-[10px]">
                    Multimodal vehicle troubleshooting & analysis
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    setIsHistoryOpen(true);
                    void loadHistory();
                  }}
                  accessibilityLabel="View diagnosis history"
                  className="w-10 h-10 rounded-full bg-white items-center justify-center mr-2 shadow-xs"
                >
                  <Ionicons name="time-outline" size={20} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={startNewDiagnosis}
                  accessibilityLabel="Start new diagnosis"
                  className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-xs"
                >
                  <Ionicons name="add" size={22} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Chat messages */}
              <ScrollView
                ref={scrollRef}
                keyboardShouldPersistTaps="handled"
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
              >
                {messages.length === 0 && (
                  <View className="mb-4">
                    <View className="rounded-2xl bg-white p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
                          <Ionicons name="sparkles" size={18} color="#d97706" />
                        </View>
                        <Text className="font-poppin-bold text-sm text-gray-900">
                          AI Vehicle Inspector
                        </Text>
                      </View>
                      <Text className="font-poppin text-xs text-gray-600 leading-5">
                        Describe symptoms or share a photo of a warning light, engine bay, leak, or tyre. You’ll get cautious guidance, possible causes, and safe next steps—not a confirmed diagnosis.
                      </Text>
                    </View>

                    <Text className="font-poppin-semibold text-xs text-gray-700 mb-2">
                      Suggested Issues:
                    </Text>
                    {suggestedSymptoms.map((symptom) => (
                      <TouchableOpacity
                        key={symptom}
                        onPress={() => {
                          setDraft(symptom);
                          void sendMessage(symptom);
                        }}
                        className="bg-white rounded-xl p-3 mb-2 flex-row items-center justify-between shadow-xs"
                      >
                        <Text className="font-poppin-medium text-xs text-gray-800 flex-1 mr-2">
                          {symptom}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color="#6b7280" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {messages.map((message, index) => {
                  if (message.role === "user") {
                    return (
                      <View
                        key={message.id || index}
                        className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-gray-900 px-4 py-3 mb-3 shadow-xs"
                      >
                        {message.imageUri ? (
                          <Image
                            source={{ uri: message.imageUri }}
                            className="w-48 h-36 rounded-xl mb-2"
                            resizeMode="cover"
                          />
                        ) : null}
                        <Text className="font-poppin text-sm text-white leading-5">
                          {message.text}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <DiagnosisReply
                      key={message.id || index}
                      message={message}
                      onBookRescue={() => requestMechanicHelp(
                        index,
                        message.response?.recommendedService,
                      )}
                    />
                  );
                })}

                {isLoading && (
                  <View className="self-start rounded-2xl bg-white px-4 py-3 mb-3 flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#d97706" />
                    <Text className="font-poppin text-xs text-gray-600">
                      Gemini AI is diagnosing vehicle...
                    </Text>
                  </View>
                )}

                {error && (
                  <View className="rounded-xl bg-red-50 p-3 mb-3">
                    <Text className="font-poppin text-xs text-red-800">
                      {error}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Photo Preview Footer if an image is selected */}
              {selectedImageUri && (
                <View className="px-4 py-2 bg-gray-50 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: selectedImageUri }}
                      className="w-12 h-12 rounded-lg mr-2 "
                      resizeMode="cover"
                    />
                    <Text className="font-poppin text-xs text-gray-700">
                      Photo attached for diagnosis
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={removeSelectedImage}
                    className="p-1 rounded-full bg-gray-200"
                  >
                    <Ionicons name="close" size={16} color="#374151" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Input Area */}
              <View className="px-4 pt-2 pb-3 bg-gray-50">
                <View className="flex-row items-end gap-2">
                  {/* Camera Button */}
                  <TouchableOpacity
                    onPress={takePhotoWithCamera}
                    disabled={isLoading}
                    className="w-12 h-12 rounded-2xl bg-white items-center justify-center shadow-xs"
                    accessibilityLabel="Take a photo with camera"
                  >
                    <Ionicons name="camera-outline" size={22} color="#4b5563" />
                  </TouchableOpacity>

                  {/* Gallery Button */}
                  <TouchableOpacity
                    onPress={pickImageFromLibrary}
                    disabled={isLoading}
                    className="w-12 h-12 rounded-2xl bg-white items-center justify-center shadow-xs"
                    accessibilityLabel="Upload photo from gallery"
                  >
                    <Ionicons name="image-outline" size={22} color="#4b5563" />
                  </TouchableOpacity>

                  {/* Text Input */}
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={selectedImageUri ? "Add notes about this photo..." : "Describe symptoms or attach photo..."}
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={1800}
                    editable={!isLoading}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      void sendMessage();
                    }}
                    className="flex-1 max-h-24 min-h-12 rounded-2xl bg-white px-3.5 py-2.5 font-poppin text-sm text-gray-900"
                  />

                  {/* Send Button */}
                  <TouchableOpacity
                    onPress={() => {
                      void sendMessage();
                    }}
                    disabled={(!draft.trim() && !selectedImageBase64) || isLoading}
                    className={`w-12 h-12 rounded-2xl items-center justify-center ${ (draft.trim() || selectedImageBase64) && !isLoading ? "bg-gray-900 shadow-sm" : "bg-gray-300" }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="send" size={18} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* History Modal */}
        <Modal
          transparent
          visible={isHistoryOpen}
          animationType="slide"
          onRequestClose={() => setIsHistoryOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[78%] rounded-t-3xl bg-gray-50 px-5 pt-5 pb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-poppin-bold text-lg text-gray-900">
                  Diagnosis History
                </Text>
                <TouchableOpacity
                  onPress={() => setIsHistoryOpen(false)}
                  accessibilityLabel="Close history"
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              {isLoadingHistory ? (
                <ActivityIndicator color="#92400e" className="my-8" />
              ) : historyError ? (
                <View className="rounded-xl bg-red-50 p-4 my-3">
                  <Text className="font-poppin text-sm text-red-800">
                    {historyError}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void loadHistory()}
                    className="self-start bg-white rounded-lg px-4 py-2 mt-3"
                    accessibilityRole="button"
                  >
                    <Text className="font-poppin-semibold text-sm text-gray-900">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : history.length === 0 ? (
                <Text className="font-poppin text-sm text-gray-500 py-8 text-center">
                  No saved diagnoses yet.
                </Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled">
                  {history.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        void openConversation(item);
                      }}
                      className="flex-row items-center bg-white rounded-xl p-4 mb-2 shadow-xs"
                    >
                      <Ionicons
                        name={
                          item.isUrgent
                            ? "warning-outline"
                            : "chatbubble-ellipses-outline"
                        }
                        size={20}
                        color={item.isUrgent ? "#b91c1c" : "#92400e"}
                      />
                      <View className="flex-1 ml-3">
                        <Text
                          numberOfLines={1}
                          className="font-poppin-bold text-sm text-gray-900"
                        >
                          {item.title}
                        </Text>
                        <Text className="font-poppin text-[11px] text-gray-500">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Assistance Type Picker */}
        <Modal
          transparent
          visible={assistanceChoice !== null}
          animationType="slide"
          onRequestClose={() => setAssistanceChoice(null)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[88%] rounded-t-3xl bg-gray-50 px-5 pt-5 pb-8">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-poppin-bold text-lg text-gray-900 flex-1">
                  What assistance do you need?
                </Text>
                <TouchableOpacity
                  onPress={() => setAssistanceChoice(null)}
                  accessibilityLabel="Close assistance type picker"
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <Text className="font-poppin text-xs text-gray-600 leading-5 mb-3">
                The AI suggestion is guidance, not a confirmed fault. Choose the help you want. Typed symptoms will be shared with your service provider; attached photos will not.
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {assistanceOptions.map((option) => {
                  const isSuggested = option.id === assistanceChoice?.recommendedService;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => chooseAssistance(option.id)}
                      activeOpacity={0.8}
                      className={`mb-2 flex-row items-center rounded-2xl p-3.5 ${isSuggested ? 'bg-amber-50' : 'bg-white'}`}
                    >
                      <View className={`w-10 h-10 rounded-xl items-center justify-center ${isSuggested ? 'bg-amber-100' : 'bg-gray-100'}`}>
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={isSuggested ? '#92400e' : '#374151'}
                        />
                      </View>
                      <View className="flex-1 ml-3 mr-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-poppin-semibold text-sm text-gray-900">
                            {option.title}
                          </Text>
                          {isSuggested && (
                            <Text className="font-poppin-semibold text-[9px] uppercase text-amber-800">
                              AI suggestion
                            </Text>
                          )}
                        </View>
                        <Text className="font-poppin text-[11px] text-gray-500 mt-0.5">
                          {option.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}
