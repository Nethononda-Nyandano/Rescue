import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Alert } from '@/components/dialogNative';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useUser } from '@clerk/expo';
import { getUserProfileFromSupabase, saveUserProfileToSupabase } from '@/utils/profileService';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void getUserProfileFromSupabase(user.id).then(({ data }) => {
      if (!active || !data) return;
      setFirstName(data.first_name || user.firstName || '');
      setLastName(data.last_name || user.lastName || '');
      setPhone(data.phone_number || '');
    }).catch((error: unknown) => {
      console.warn('Could not load profile details:', error);
    });
    return () => {
      active = false;
    };
  }, [user?.id, user?.firstName, user?.lastName]);

  const save = async () => {
    if (!user) return;
    if (!firstName.trim()) {
      Alert.alert('Required', 'Enter your first name.');
      return;
    }
    setSaving(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      await saveUserProfileToSupabase({
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        role: 'client',
        avatarUrl: user.imageUrl,
      });
      Alert.alert('Saved', 'Your profile was updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Could not save', err?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">Edit Profile</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="px-5">
          <Text className="text-xs font-poppin text-gray-500 mb-1">First name</Text>
          <TextInput value={firstName} onChangeText={setFirstName} className="bg-white rounded-2xl px-4 py-3 mb-3 font-poppin" />
          <Text className="text-xs font-poppin text-gray-500 mb-1">Last name</Text>
          <TextInput value={lastName} onChangeText={setLastName} className="bg-white rounded-2xl px-4 py-3 mb-3 font-poppin" />
          <Text className="text-xs font-poppin text-gray-500 mb-1">Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" className="bg-white rounded-2xl px-4 py-3 mb-6 font-poppin" />
          <TouchableOpacity onPress={save} disabled={saving} className="bg-gray-900 py-3.5 rounded-2xl items-center">
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-sm font-poppin-bold text-white">Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
