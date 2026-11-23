import { getUserRole, isProfileComplete } from "@/utils/authCheck";
import { tokenCache } from "@/utils/tokenCache";
import { AlertDialogProvider } from "@/components/AppDialog";
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { getUserProfileFromSupabase, saveUserProfileToSupabase } from "@/utils/profileService";
import "../../global.css";

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.",
  );
}

function InitialLayout() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const syncRequest = useRef(0);

  const syncProfile = useCallback(async () => {
    if (!user || !isUserLoaded || !isSignedIn || !isProfileComplete(user)) return;

    const requestId = ++syncRequest.current;
    const metadata = (user.unsafeMetadata || {}) as Record<string, unknown>;
    const publicMetadata = (user.publicMetadata || {}) as Record<string, unknown>;
    const firstName = user.firstName?.trim() || String(metadata.firstName || publicMetadata.firstName || "").trim();
    const lastName = user.lastName?.trim() || String(metadata.lastName || publicMetadata.lastName || "").trim();
    const phoneNumber =
      user.primaryPhoneNumber?.phoneNumber ||
      user.phoneNumbers?.[0]?.phoneNumber ||
      String(metadata.phoneNumber || publicMetadata.phoneNumber || "");

    const { data: existingProfile, error: profileError } = await getUserProfileFromSupabase(user.id);
    if (requestId !== syncRequest.current) return;
    if (profileError) {
      console.warn("Supabase profile load warning:", profileError.message || profileError);
    }

    const { error } = await saveUserProfileToSupabase({
      userId: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      phoneNumber,
      role: getUserRole(user) || existingProfile?.role || "client",
      avatarUrl: existingProfile?.avatar_url || user.imageUrl || null,
    });
    if (requestId !== syncRequest.current) return;

    if (error) {
      console.warn("Supabase profile save warning:", error.message || error);
    }
  }, [isSignedIn, isUserLoaded, user]);

  useEffect(() => {
    if (isSignedIn && isProfileComplete(user)) {
      void syncProfile();
    }
    return () => { syncRequest.current += 1; };
  }, [isSignedIn, syncProfile, user]);

  const isAuthReady =
    isAuthLoaded &&
    (!isSignedIn || (isUserLoaded && Boolean(user)));

  useEffect(() => {
    if (!isAuthLoaded) return;

    const segs = (segments || []) as string[];
    const inAuthGroup = segs[0] === "(auth)";
    const onCompleteProfile = inAuthGroup && segs[1] === "complete-profile";

    if (!isSignedIn) {
      if (!inAuthGroup || onCompleteProfile) {
        router.replace("/(auth)/sign-in");
      }
    } else {
      // Wait until user details are fully loaded and retrieved
      if (!isUserLoaded || !user) return;

      const complete = isProfileComplete(user);

      if (!complete) {
        if (!onCompleteProfile) {
          router.replace("/(auth)/complete-profile");
        }
      } else {
        if (inAuthGroup || segs.length === 0 || segs[0] === "index") {
          router.replace("/(tabs)");
        }
      }
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, user, segments, router]);

  return (
    <View className="flex-1 bg-gray-50">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="diagnosis" options={{ headerShown: false }} />
        <Stack.Screen name="crud_vehicle" />
        <Stack.Screen name="+not-found" />
      </Stack>

      {!isAuthReady && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#f9fafb",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <Image
            source={require("@/assets/images/logo4.png")}
            className="w-40 h-20"
            resizeMode="contain"
          />
          <ActivityIndicator size="small" color="#111827" className="mt-4" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    poppin: require("@/assets/fonts/Poppins/Poppins-Regular.ttf"),
    "poppin-semibold": require("@/assets/fonts/Poppins/Poppins-SemiBold.ttf"),
    "poppin-light": require("@/assets/fonts/Poppins/Poppins-Light.ttf"),
    "poppin-bold": require("@/assets/fonts/Poppins/Poppins-Bold.ttf"),
    "poppin-extrabold": require("@/assets/fonts/Poppins/Poppins-ExtraBold.ttf"),
    "poppin-medium": require("@/assets/fonts/Poppins/Poppins-Medium.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AlertDialogProvider>
          <InitialLayout />
        </AlertDialogProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
