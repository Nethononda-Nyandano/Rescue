import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Alert } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";

const RESEND_SECONDS = 120;
const CODE_LENGTH = 6;

const generateSecureAuthSecret = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let secret = "ResQ9!";
  for (let i = 0; i < 26; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

const Mfa = () => {
  const params = useLocalSearchParams<{
    email?: string;
    mode?: string;
    strategy?: string;
    emailAddressId?: string;
  }>();
  const email = params.email || "";
  const mode = params.mode || "signIn";
  const strategy = params.strategy || "email_code";
  const emailAddressId = params.emailAddressId;

  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, "0")}`;
  };

  const isComplete = code.length === CODE_LENGTH;

  const handleVerify = async (codeToVerify = code) => {
    if (codeToVerify.length !== CODE_LENGTH) return;
    if (!isSignInLoaded || !isSignUpLoaded) return;
    if (loading) return;

    setLoading(true);

    let success = false;
    try {
      if (mode === "signUp") {
        let completeSignUp: any;
        try {
          completeSignUp = await signUp.attemptEmailAddressVerification({
            code: codeToVerify,
          });
        } catch (verifyErr: any) {
          const errCode = verifyErr?.errors?.[0]?.code;
          const errMsg = verifyErr?.errors?.[0]?.message || "";
          if (
            errCode === "verification_already_verified" ||
            errMsg.toLowerCase().includes("already been verified") ||
            signUp?.verifications?.emailAddress?.status === "verified"
          ) {
            completeSignUp = signUp;
          } else {
            throw verifyErr;
          }
        }

        let sessionId = completeSignUp?.createdSessionId || signUp?.createdSessionId;

        // Automatically fulfill password requirement if backend expects one
        if (!sessionId && (completeSignUp?.status === "missing_requirements" || signUp?.status === "missing_requirements")) {
          const missing = completeSignUp?.missingFields || signUp?.missingFields || [];
          if (missing.includes("password")) {
            try {
              completeSignUp = await signUp.update({
                password: generateSecureAuthSecret(),
              });
              sessionId = completeSignUp?.createdSessionId || signUp?.createdSessionId;
            } catch (pwdErr) {
              console.warn("Auto password resolution error:", pwdErr);
            }
          }
        }

        if (completeSignUp?.status !== "complete" || !sessionId) {
          const missingFields = completeSignUp?.missingFields || signUp.missingFields || [];
          Alert.alert(
            "Registration incomplete",
            missingFields.length
              ? `The authentication provider still requires: ${missingFields.join(", ")}. No account session was started.`
              : "Email verification did not create an active account session. Please try again.",
          );
          return;
        }

        await setSignUpActive({ session: sessionId });
        success = true;
        router.replace("/(auth)/complete-profile");
      } else {
        let completeSignIn: any;
        try {
          if (signIn.status === "needs_second_factor") {
            const secondFactor = signIn.supportedSecondFactors?.find(
              (factor: any) =>
                factor.strategy === "phone_code" ||
                factor.strategy === "totp" ||
                factor.strategy === "email_code"
            ) as any;

            completeSignIn = await signIn.attemptSecondFactor({
              strategy: secondFactor?.strategy || "phone_code",
              code: codeToVerify,
            });
          } else if (strategy === "reset_password_email_code") {
            completeSignIn = await signIn.attemptFirstFactor({
              strategy: "reset_password_email_code",
              code: codeToVerify,
              password: generateSecureAuthSecret(),
            });
          } else {
            completeSignIn = await signIn.attemptFirstFactor({
              strategy: "email_code",
              code: codeToVerify,
            });
          }
        } catch (signInErr: any) {
          const errCode = signInErr?.errors?.[0]?.code;
          const errMsg = signInErr?.errors?.[0]?.message || "";
          if (
            errCode === "verification_already_verified" ||
            errMsg.toLowerCase().includes("already been verified")
          ) {
            completeSignIn = signIn;
          } else {
            throw signInErr;
          }
        }

        const sessionId = completeSignIn?.createdSessionId || signIn?.createdSessionId;

        if (completeSignIn?.status === "complete" && sessionId) {
          await setSignInActive({ session: sessionId });
          success = true;
          router.replace("/(auth)/complete-profile");
        } else if (completeSignIn?.status === "needs_second_factor") {
          const secondFactor = completeSignIn.supportedSecondFactors?.find(
            (factor: any) => factor.strategy === "phone_code"
          ) as any;

          if (secondFactor) {
            await signIn.prepareSecondFactor({
              strategy: "phone_code",
              phoneNumberId: secondFactor.phoneNumberId,
            });
            setCode("");
            Alert.alert(
              "Two-Factor Authentication",
              "A verification code has been sent to your phone. Please enter it to continue."
            );
          } else {
            setCode("");
            Alert.alert(
              "Two-Factor Authentication",
              "Please enter your two-factor authentication code to complete sign in."
            );
          }
        } else {
          Alert.alert(
            "Sign-in incomplete",
            "The authentication provider did not create an active session. Please try again.",
          );
        }
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert(
        "Verification Failed",
        err?.errors?.[0]?.message || "Invalid or expired code. Please try again."
      );
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;

    setResending(true);
    try {
      if (mode === "signUp") {
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
      } else if (signIn.status === "needs_second_factor") {
        const phoneFactor = signIn.supportedSecondFactors?.find(
          (factor: any) => factor.strategy === "phone_code"
        ) as any;
        if (phoneFactor) {
          await signIn.prepareSecondFactor({
            strategy: "phone_code",
            phoneNumberId: phoneFactor.phoneNumberId,
          });
        }
      } else {
        const factor =
          signIn.supportedFirstFactors?.find(
            (f: any) => f.strategy === strategy && (!emailAddressId || f.emailAddressId === emailAddressId),
          ) as any ||
          signIn.supportedFirstFactors?.find(
            (f: any) => f.strategy === "email_code" || f.strategy === "reset_password_email_code",
          ) as any;

        if (factor?.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: factor.strategy,
            emailAddressId: factor.emailAddressId,
          });
        } else if (emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: (strategy as any) || "email_code",
            emailAddressId,
          });
        }
      }

      setSecondsLeft(RESEND_SECONDS);
      setCode("");
      Alert.alert("Success", "A new verification code has been sent to your email.");
    } catch (err: any) {
      console.error("Resend error:", err);
      Alert.alert(
        "Resend Failed",
        err?.errors?.[0]?.message || "Could not resend verification code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      
      <SafeAreaView style={{ flex: 1, backgroundColor:"#f9fafb"}}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
        <View className="flex-1 items-center bg-gray-50">
          <StatusBar style="dark" />
          {/* Back button */}
          <View className="w-full px-4 pt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center w-full p-6">
            <Image
              source={require("@/assets/images/logo4.png")}
              className="w-40 h-20"
              resizeMode="contain"
            />

            <Text className="text-xl font-poppin-medium text-gray-900 mt-2">
              Verify your email
            </Text>
            <Text className="text-gray-500 mt-1 mb-6 font-poppin text-center">
              {email
                ? <Text>Enter the 6-digit code sent to <Text className="font-poppin-medium text-black">{email}</Text> </Text>
                : "Enter the 6-digit code sent to your email"}
            </Text>

            {/* 6-box code */}
            <View className="w-full" style={{ position: "relative" }}>
              <Pressable
                className="w-full flex-row justify-between"
                onPress={() => inputRef.current?.focus()}
              >
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    className={`w-12 h-14 rounded-xl items-center justify-center ${code.length === i ? "bg-amber-50" : "bg-white"}`}
                  >
                    <Text className="text-xl font-poppin-bold text-gray-900">
                      {code[i] || ""}
                    </Text>
                  </View>
                ))}
              </Pressable>

              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(text) => {
                  const sanitized = text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
                  setCode(sanitized);
                  if (sanitized.length === CODE_LENGTH) {
                    handleVerify(sanitized);
                  }
                }}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoFocus
                caretHidden
                editable={!loading}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={() => handleVerify()}
              disabled={!isComplete || loading}
              className={`w-full p-4 items-center justify-center rounded-xl h-14 mt-6 ${ isComplete && !loading ? "bg-gray-900" : "bg-gray-300" }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-poppin-bold text-white">
                  Verify
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend / countdown */}
            <View className="flex-row items-center mt-5">
              {resending ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : secondsLeft > 0 ? (
                <Text className="text-gray-500 font-poppin text-sm">
                  Code expires in {formatTime(secondsLeft)}
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text className="text-gray-900 font-poppin-bold text-sm underline">
                    Resend code
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default Mfa;
