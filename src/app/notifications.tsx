import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationsScreen() {
  const router = useRouter();
  const [jobUpdates, setJobUpdates] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@resq_notif_prefs').then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.jobUpdates === 'boolean') setJobUpdates(parsed.jobUpdates);
        if (typeof parsed.marketing === 'boolean') setMarketing(parsed.marketing);
      } catch {}
    });
  }, []);

  const persist = (nextJob: boolean, nextMarketing: boolean) => {
    AsyncStorage.setItem(
      '@resq_notif_prefs',
      JSON.stringify({ jobUpdates: nextJob, marketing: nextMarketing })
    ).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">Notifications</Text>
      </View>
      <View className="px-5 mt-2">
        <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between mb-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-poppin-medium text-gray-900">Rescue updates</Text>
            <Text className="text-xs font-poppin text-gray-500">Rescue updates use your device’s default alert sound when allowed.</Text>
          </View>
          <Switch
            value={jobUpdates}
            onValueChange={(v) => {
              setJobUpdates(v);
              persist(v, marketing);
            }}
          />
        </View>
        <Text className="text-xs font-poppin text-gray-500 mt-3">
          Allow notifications in your device settings. Sound depends on your system and app notification settings; rescue updates require the app to be connected and are not remote push alerts while it is closed.
        </Text>
        <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-poppin-medium text-gray-900">Tips & offers</Text>
            <Text className="text-xs font-poppin text-gray-500">Optional product updates</Text>
          </View>
          <Switch
            value={marketing}
            onValueChange={(v) => {
              setMarketing(v);
              persist(jobUpdates, v);
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
