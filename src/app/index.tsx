import React from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <StatusBar style="dark" />
      <Image
        source={require('@/assets/images/logo4.png')}
        className="w-40 h-20"
        resizeMode="contain"
      />
      <ActivityIndicator size="small" color="#111827" className="mt-4" />
    </View>
  );
}