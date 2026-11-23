import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-6">
      <Text className="text-xl font-poppin-bold text-gray-900 mb-2">
        Page Not Found
      </Text>
      <Text className="text-gray-500 font-poppin text-center mb-6">
        The screen you are looking for does not exist.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/')}
        className="bg-gray-900 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-poppin-medium">Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}
