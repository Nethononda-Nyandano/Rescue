import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from "@react-native-vector-icons/ionicons";

export default function AboutScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">About ResQ</Text>
      </View>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-sm font-poppin text-gray-600 leading-6">
          ResQ is roadside assistance for drivers who need a tow, tyre change, fuel delivery, or battery jump.
          You request help from the Home map. A nearby mechanic accepts, you track their vehicle live, then they
          complete the job on site.
        </Text>
        <Text className="text-sm font-poppin-semibold text-gray-900 mt-5 mb-1">How a rescue works</Text>
        <Text className="text-sm font-poppin text-gray-600 leading-6">
          1. Choose the service and the car you are driving.{'\n'}
          2. Add details (tow drop-off, tyre, fuel litres, or battery action).{'\n'}
          3. Confirm payment. Nearby mechanics see your request.{'\n'}
          4. When a mechanic accepts, follow the moving vehicle on the map.{'\n'}
          5. Call or message them until they arrive and finish the job.
        </Text>
        <Text className="text-xs font-poppin text-gray-400 mt-8">Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
