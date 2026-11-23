import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Modal } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  getUserProfileFromSupabase,
  ProfileRecord,
} from "@/utils/profileService";
import { menuSections, menutype } from "@/utils/settingsServices";

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [dbProfile, setDbProfile] = useState<ProfileRecord | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      getUserProfileFromSupabase(user.id).then(({ data }) => {
        if (data) {
          setDbProfile(data);
        }
      });
    }
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      setShowLogoutModal(false);
      router.replace("/(auth)/sign-in" as any);
    } catch (err: any) {
      console.error("Sign out error", err);
      setShowLogoutModal(false);
      setInfoModal({
        title: "Log Out Failed",
        message:
          err?.message || "Could not log out at this moment. Please try again.",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const confirmSignOut = () => {
    setShowLogoutModal(true);
  };

  const handleMenuItemPress = (item: menutype) => {
    if (!item.route) return;

    if (item.route.startsWith("/(tabs)")) {
      router.push(item.route as any);
    } else {
      router.push(item.route as any);
    }
  };

  const displayName =
    (dbProfile?.first_name
      ? `${dbProfile.first_name}${dbProfile.last_name ? ` ${dbProfile.last_name}` : ""}`
      : null) ||
    (user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : null) ||
    user?.primaryEmailAddress?.emailAddress ||
    "User";

  const userEmail =
    dbProfile?.email || user?.primaryEmailAddress?.emailAddress || "Not set";

  const initials =
    (
      (user?.firstName?.substring(0, 1) || "") +
      (user?.lastName?.substring(0, 1) || "")
    ).toUpperCase() ||
    displayName.substring(0, 2).toUpperCase() ||
    "RQ";

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} className="bg-gray-50">
        <View className="flex-row justify-between items-center py-2 bg-gray-50 px-6">
          <Text className="text-xl font-poppin-bold text-gray-800">
            Settings
          </Text>
          <Image
            source={require("@/assets/images/logo4.png")}
            className="w-20 h-14"
            resizeMode="contain"
          />
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1,  }}
          className="p-6 bg-gray-50"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}

          {/* Profile Summary Card */}
          <View className="w-full bg-white flex items-center justify-center p-5 rounded-xl mb-6">
            <Text className="p-4 bg-gray-800 rounded-full text-white text-xl font-poppin-semibold mb-2">
              {initials}
            </Text>
            <Text className="text-2xl font-poppin-semibold text-gray-900 text-center">
              {displayName}
            </Text>
            <Text className="text-xs font-poppin-light text-gray-800/60 mt-0.5 text-center">
              {userEmail}
            </Text>
          </View>

          {/* Grouped Menu Blocks */}
          {menuSections.map((section) => (
            <View key={section.id} className="mb-5">
              <Text className="text-xs font-poppin-semibold uppercase text-gray-500 tracking-wider mb-2 px-1">
                {section.title}
              </Text>
              <View className="bg-white rounded-xl overflow-hidden ">
                {section.items.map((item, index) => {
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => handleMenuItemPress(item)}
                      activeOpacity={0.7}
                      className="flex-row items-center px-4 py-3.5"
                    >
                      <View className="w-9 h-9 rounded-xl items-center justify-center mr-3">
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color="#101828"
                        />
                      </View>
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-poppin-medium text-gray-900">
                          {item.title}
                        </Text>
                        {item.subtitle && (
                          <Text className="text-xs font-poppin text-gray-400 mt-0.5">
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Account Actions / Log Out Section */}
          <View className="mb-6">
            <Text className="text-xs font-poppin-semibold uppercase text-gray-500 tracking-wider mb-2 px-1">
              Account Actions
            </Text>
            <View className="bg-white rounded-xl overflow-hidden shadow-sm">
              <TouchableOpacity
                onPress={confirmSignOut}
                disabled={loggingOut}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-3.5"
              >
                <View className="w-9 h-9 rounded-xl items-center justify-center mr-3">
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color="#dc2626"
                    />
                  )}
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-poppin-medium text-red-600">
                    {loggingOut ? "Signing out..." : "Log Out"}
                  </Text>
                  <Text className="text-xs font-poppin text-gray-400 mt-0.5">
                    Sign out of your ResQ account safely
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#f87171" />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version Info */}
          <View className="items-center mt-2">
            <Text className="text-xs font-poppin text-gray-400">ResQ</Text>
          </View>
        </ScrollView>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!loggingOut) setShowLogoutModal(false);
          }}
        >
          <View className="flex-1 justify-center items-center bg-gray-800/60 px-6">
            <View className="w-full bg-white rounded-2xl p-6 items-center shadow-2xl">
              <View
                className={
                  "p-2 items-start justify-center w-full mb-4 "
                }
              >
                <Text className="text-xl font-poppin-bold text-start text-gray-900 t mb-2">
                  Log Out
                </Text>
              </View>

              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                Are you sure you want to log out of your account?
              </Text>

              <View className="flex-row w-full space-x-3 gap-3">
                <TouchableOpacity
                  onPress={() => setShowLogoutModal(false)}
                  disabled={loggingOut}
                  activeOpacity={0.8}
                  className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-sm font-poppin-semibold text-gray-700">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSignOut}
                  disabled={loggingOut}
                  activeOpacity={0.8}
                  className="flex-1 py-3.5 bg-red-600 rounded-xl items-center justify-center flex-row "
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-poppin-semibold text-white">
                      Log Out
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Info / Notice Modal */}
        <Modal
          visible={!!infoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setInfoModal(null)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 items-center shadow-2xl">
              <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mb-4 ">
                <Ionicons
                  name="information-circle-outline"
                  size={30}
                  color="#d97706"
                />
              </View>
              <Text className="text-lg font-poppin-bold text-gray-900 text-center mb-2">
                {infoModal?.title}
              </Text>
              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                {infoModal?.message}
              </Text>

              <TouchableOpacity
                onPress={() => setInfoModal(null)}
                activeOpacity={0.8}
                className="w-full py-3.5 bg-gray-900 rounded-xl items-center justify-center"
              >
                <Text className="text-sm font-poppin-semibold text-white">
                  Got It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default Settings;
