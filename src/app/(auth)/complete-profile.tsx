import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Alert } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useUser, useClerk } from "@clerk/expo";
import {
  UserRole,
  saveUserProfileToSupabase,
} from "../../utils/profileService";

type StepKey = "phone" | "firstName" | "lastName";
type IoniconsGlyph = React.ComponentProps<typeof Ionicons>["name"];

interface StepConfig {
  key: StepKey;
  title: string;
  subtitle: string;
  placeholder?: string;
  icon?: IoniconsGlyph;
  keyboardType?: "phone-pad" | "default";
}

const ALL_STEPS: StepConfig[] = [
  {
    key: "phone",
    title: "What's your phone number?",
    subtitle: "We will use this to contact and verify your rescue updates",
    placeholder: "+27 (00) 000-0000",
    icon: "call-outline",
    keyboardType: "phone-pad",
  },
  {
    key: "firstName",
    title: "What's your first name?",
    subtitle: "Let us know what to call you",
    placeholder: "First name",
    icon: "person-outline",
    keyboardType: "default",
  },
  {
    key: "lastName",
    title: "What's your last name?",
    subtitle: "Your family name or surname",
    placeholder: "Last name",
    icon: "person-outline",
    keyboardType: "default",
  },
];

const CompleteProfile = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initialize existing user values when user is available
  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      const existingPhone =
        user.primaryPhoneNumber?.phoneNumber ||
        user.phoneNumbers?.[0]?.phoneNumber ||
        (user.unsafeMetadata as Record<string, any>)?.phoneNumber;
      if (existingPhone && !phone) {
        setPhone(existingPhone);
      }

      const existingFirstName =
        user.firstName ||
        (user.unsafeMetadata as Record<string, any>)?.firstName;
      if (existingFirstName && !firstName) {
        setFirstName(existingFirstName);
      }

      const existingLastName =
        user.lastName ||
        (user.unsafeMetadata as Record<string, any>)?.lastName;
      if (existingLastName && !lastName) {
        setLastName(existingLastName);
      }
    }
  }

  // Determine which fields are missing or needed
  const missingSteps = useMemo<StepConfig[]>(() => {
    if (!isLoaded || !user) return [];

    const steps: StepConfig[] = [];
    const hasPhone = Boolean(
      user.primaryPhoneNumber?.phoneNumber ||
      (user.phoneNumbers && user.phoneNumbers.length > 0) ||
      (user.unsafeMetadata as Record<string, any>)?.phoneNumber
    );
    const hasFirstName = Boolean(
      user.firstName?.trim() ||
      (user.unsafeMetadata as Record<string, any>)?.firstName
    );
    const hasLastName = Boolean(
      user.lastName?.trim() ||
      (user.unsafeMetadata as Record<string, any>)?.lastName
    );

    if (!hasPhone) {
      const step = ALL_STEPS.find((s) => s.key === "phone");
      if (step) steps.push(step);
    }
    if (!hasFirstName) {
      const step = ALL_STEPS.find((s) => s.key === "firstName");
      if (step) steps.push(step);
    }
    if (!hasLastName) {
      const step = ALL_STEPS.find((s) => s.key === "lastName");
      if (step) steps.push(step);
    }

    return steps;
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return;
    // Check if initial essential missing fields are all set and user already has explicit role metadata
    const hasMetadataRole = Boolean(
      (user.unsafeMetadata as Record<string, any>)?.role ||
      (user.publicMetadata as Record<string, any>)?.role
    );
    const hasPhone = Boolean(
      user.primaryPhoneNumber?.phoneNumber ||
      (user.phoneNumbers && user.phoneNumbers.length > 0) ||
      (user.unsafeMetadata as Record<string, any>)?.phoneNumber
    );
    const hasName = Boolean(
      (user.firstName || (user.unsafeMetadata as Record<string, any>)?.firstName) &&
      (user.lastName || (user.unsafeMetadata as Record<string, any>)?.lastName)
    );

    if (hasPhone && hasName && hasMetadataRole) {
      router.replace("/(tabs)" as any);
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user || missingSteps.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const currentStep = missingSteps[currentStepIndex] || missingSteps[0];
  const isLastStep = currentStepIndex === missingSteps.length - 1;

  const getCurrentValue = () => {
    switch (currentStep.key) {
      case "phone":
        return phone;
      case "firstName":
        return firstName;
      case "lastName":
        return lastName;
      default:
        return "";
    }
  };

  const setCurrentValue = (text: string) => {
    switch (currentStep.key) {
      case "phone":
        setPhone(text);
        break;
      case "firstName":
        setFirstName(text);
        break;
      case "lastName":
        setLastName(text);
        break;
    }
  };

  const isCurrentStepValid = () => {
    switch (currentStep.key) {
      case "phone":
        return phone.trim().length >= 5;
      case "firstName":
        return firstName.trim().length > 0;
      case "lastName":
        return lastName.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!isCurrentStepValid()) {
      if (currentStep.key === "phone") {
        Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      } else {
        Alert.alert("Required", "Please fill in this field before continuing.");
      }
      return;
    }

    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }

    // When on the last step, persist all collected data to Clerk and Supabase
    setLoading(true);

    try {
      // Client app defaults user role to 'client'
      const finalRole: UserRole = "client";
      const finalPhone =
        phone.trim() ||
        user.primaryPhoneNumber?.phoneNumber ||
        user.phoneNumbers?.[0]?.phoneNumber ||
        (user.unsafeMetadata as Record<string, any>)?.phoneNumber ||
        "";
      const finalFirstName =
        firstName.trim() ||
        user.firstName ||
        (user.unsafeMetadata as Record<string, any>)?.firstName ||
        "";
      const finalLastName =
        lastName.trim() ||
        user.lastName ||
        (user.unsafeMetadata as Record<string, any>)?.lastName ||
        "";

      // 1. Update Clerk user phone if provided
      if (finalPhone && !user.primaryPhoneNumber?.phoneNumber) {
        try {
          await user.createPhoneNumber({ phoneNumber: finalPhone });
        } catch (e) {
          console.warn("Clerk createPhoneNumber optional fallback:", e);
        }
      }

      // 2. Update Clerk user profile attributes
      await user.update({
        firstName: finalFirstName,
        lastName: finalLastName,
      });

      // 3. Save metadata to Clerk
      const metadataPayload = {
        role: finalRole,
        phoneNumber: finalPhone,
        firstName: finalFirstName,
        lastName: finalLastName,
      };

      if (typeof user.updateMetadata === "function") {
        await user.updateMetadata({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            ...metadataPayload,
          },
        });
      } else {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            ...metadataPayload,
          },
        });
      }

      // 4. Save profile to Supabase database (store user id data and role enum)
      const { error: supabaseError } = await saveUserProfileToSupabase({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        firstName: finalFirstName,
        lastName: finalLastName,
        fullName: `${finalFirstName} ${finalLastName}`.trim(),
        phoneNumber: finalPhone,
        role: finalRole,
        avatarUrl: user.imageUrl || null,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      // 5. Reload Clerk session user and route to tabs
      await user.reload();
      router.replace("/(tabs)" as any);
    } catch (err: any) {
      console.error("Failed to complete profile:", err);
      Alert.alert(
        "Update Failed",
        err?.errors?.[0]?.message ||
          err?.message ||
          "Could not save your profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in" as any);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} className="bg-gray-50">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            className="flex-1 bg-gray-50"
          >
            {/* Header / Sign out */}
            <View className="w-full flex-row justify-between items-center px-6 pt-3">
              {currentStepIndex > 0 ? (
                <TouchableOpacity
                  onPress={() => setCurrentStepIndex((prev) => prev - 1)}
                  disabled={loading}
                  className="w-10 h-10 items-center justify-center rounded-full bg-white "
                >
                  <Ionicons name="arrow-back" size={20} color="#111827" />
                </TouchableOpacity>
              ) : (
                <View className="w-10 h-10" />
              )}

              <TouchableOpacity onPress={handleSignOut} disabled={loading}>
                <Text className="text-xs text-gray-500 font-poppin">
                  Sign out
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 justify-center items-center w-full px-6 py-4">
              <Image
                source={require("@/assets/images/logo4.png")}
                className="w-40 h-20 mb-2"
                resizeMode="contain"
              />

              {/* Step indicator */}
              <View className="w-full mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-poppin-medium px-3 py-1 rounded-full">
                    Step {currentStepIndex + 1} of {missingSteps.length}
                  </Text>
                  <Text className="text-xs font-poppin text-gray-500">
                    Profile Setup
                  </Text>
                </View>

                {/* Progress bar */}
                <View className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-gray-900 rounded-full"
                    style={{
                      width: `${((currentStepIndex + 1) / missingSteps.length) * 100}%`,
                    }}
                  />
                </View>
              </View>

              {/* Title & Subtitle */}
              <View className="w-full mb-6">
                <Text className="text-2xl font-poppin-bold text-gray-900 mb-1 text-left">
                  {currentStep.title}
                </Text>
                <Text className="text-sm font-poppin text-gray-500 text-left">
                  {currentStep.subtitle}
                </Text>
              </View>

              {/* Text Input container for phone, firstName, lastName */}
              <View className="w-full gap-3">
                <View className="w-full flex-row items-center rounded-xl h-14 px-3 bg-white">
                  <Ionicons
                    name={(currentStep?.icon || "pencil-outline") as any}
                    size={20}
                    color="#6b7280"
                  />
                  <TextInput
                    className="flex-1 ml-2 h-full font-poppin text-gray-900"
                    placeholder={currentStep.placeholder}
                    placeholderTextColor="#9ca3af"
                    value={getCurrentValue()}
                    onChangeText={setCurrentValue}
                    keyboardType={currentStep.keyboardType}
                    autoCapitalize={
                      currentStep.key === "phone" ? "none" : "words"
                    }
                    autoFocus
                    editable={!loading}
                    onSubmitEditing={handleNext}
                    returnKeyType={isLastStep ? "done" : "next"}
                  />
                </View>
              </View>

              {/* Action button */}
              <TouchableOpacity
                onPress={handleNext}
                disabled={loading || !isCurrentStepValid()}
                className={`w-full flex-row gap-2 justify-center h-14 items-center rounded-xl mt-6 ${ isCurrentStepValid() && !loading ? "bg-gray-900" : "bg-gray-300" }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text className="text-white font-poppin-medium">
                      {isLastStep ? "Complete Profile" : "Continue"}
                    </Text>
                    {!isLastStep && (
                      <Ionicons name="chevron-forward" size={18} color="#fff" />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default CompleteProfile;
