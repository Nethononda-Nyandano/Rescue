import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Alert } from '@/components/dialogNative';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@resq_emergency_contacts';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      try {
        setContacts(JSON.parse(raw));
      } catch {}
    });
  }, []);

  const saveList = async (next: { name: string; phone: string }[]) => {
    setContacts(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-poppin-bold text-gray-900">Emergency Contacts</Text>
      </View>
      <ScrollView className="px-5">
        <Text className="text-xs font-poppin text-gray-500 mb-3">
          People we can help you notify after a breakdown. They are stored on this device.
        </Text>
        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          className="bg-white rounded-2xl px-4 py-3 mb-2 font-poppin"
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="bg-white rounded-2xl px-4 py-3 mb-3 font-poppin"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          onPress={() => {
            if (!name.trim() || !phone.trim()) {
              Alert.alert('Required', 'Enter a name and phone number.');
              return;
            }
            saveList([...contacts, { name: name.trim(), phone: phone.trim() }]);
            setName('');
            setPhone('');
          }}
          className="bg-gray-900 py-3 rounded-2xl items-center mb-5"
        >
          <Text className="text-sm font-poppin-bold text-white">Add contact</Text>
        </TouchableOpacity>
        {contacts.map((c, i) => (
          <View key={`${c.phone}-${i}`} className="bg-white rounded-2xl px-4 py-3 mb-2 flex-row items-center">
            <View className="flex-1">
              <Text className="text-sm font-poppin-semibold text-gray-900">{c.name}</Text>
              <Text className="text-xs font-poppin text-gray-500">{c.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => saveList(contacts.filter((_, idx) => idx !== i))}>
              <Ionicons name="trash-outline" size={18} color="#e11d48" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
