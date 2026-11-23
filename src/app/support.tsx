import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';

export default function SupportScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-2 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">Help & Support</Text>
      </View>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-sm font-poppin-semibold text-gray-900 mb-2">Common questions</Text>
        <Text className="text-sm font-poppin text-gray-600 leading-6 mb-4">
          Destination search: on Tow, tap search and type a street, suburb, workshop, or petrol station. Pick a result
          to set the drop-off pin and price the tow distance.
        </Text>
        <Text className="text-sm font-poppin text-gray-600 leading-6 mb-4">
          Live tracking: after a mechanic accepts, the green arrow on the map is their vehicle. It updates as they drive.
        </Text>
        <Text className="text-sm font-poppin text-gray-600 leading-6 mb-6">
          No rescuer found: keep your request retrying, or wait until a mechanic goes online nearby.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@resq.app')}
          className="bg-gray-900 py-3.5 rounded-2xl items-center"
        >
          <Text className="text-sm font-poppin-bold text-white">Email support</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
