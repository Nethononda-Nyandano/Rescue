import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">Privacy & Security</Text>
      </View>
      <ScrollView className="px-5">
        <Text className="text-sm font-poppin text-gray-600 leading-6">
          ResQ uses your location only to find nearby help, price distance, and show the mechanic moving toward you.
          Payment cards store the last 4 digits and expiry — not the full card number or CVV. You can sign out at any
          time from Settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
