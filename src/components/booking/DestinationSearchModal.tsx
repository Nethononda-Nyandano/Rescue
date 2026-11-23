import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { NearbyPOI } from '@/utils/rescueService';

export interface TowDestinationItem {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

interface DestinationSearchModalProps {
    visible: boolean;
    onClose: () => void;
    searchQuery: string;
    onChangeSearchQuery: (text: string) => void;
    isSearching: boolean;
    nearestPetrolStation?: NearbyPOI | null;
    suggestions: {
        id: string;
        name: string;
        address: string;
        latitude: number;
        longitude: number;
        distanceKm: number;
    }[];
    onSelectDestination: (dest: TowDestinationItem) => void;
}

export const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({
    visible,
    onClose,
    searchQuery,
    onChangeSearchQuery,
    isSearching,
    nearestPetrolStation,
    suggestions,
    onSelectDestination,
}) => {
    if (!visible) return null;

    return (
        <View className="absolute inset-0 bg-black/60 z-50 justify-end">
            <SafeAreaView edges={['top', 'bottom']} style={{flex:1}} className="flex-1 justify-end">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View className="bg-white rounded-t-3xl max-h-[85%] p-5 shadow-2xl">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-base font-poppin-bold text-gray-900">
                            Set Tow Drop-off Destination
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={24} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row items-center bg-gray-100 px-3.5 py-2.5 rounded-2xl mb-3">
                        <Ionicons name="search" size={18} color="#6b7280" />
                        <TextInput
                            placeholder="Search a street, suburb or place"
                            value={searchQuery}
                            onChangeText={onChangeSearchQuery}
                            autoFocus
                            returnKeyType="search"
                            className="flex-1 ml-2 text-sm font-poppin text-gray-900"
                            placeholderTextColor="#9ca3af"
                        />
                        {searchQuery.length > 0 ? (
                            <TouchableOpacity onPress={() => onChangeSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        ) : null}
                        {isSearching && <ActivityIndicator size="small" color="#101828" className="ml-2" />}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="max-h-72">
                        {/* Quick Choice: Nearest Petrol Station */}
                        {nearestPetrolStation && (
                            <TouchableOpacity
                                onPress={() => {
                                    onSelectDestination({
                                        name: nearestPetrolStation.name,
                                        address: nearestPetrolStation.address,
                                        latitude: nearestPetrolStation.latitude,
                                        longitude: nearestPetrolStation.longitude,
                                        distanceKm: nearestPetrolStation.distanceKm,
                                    });
                                    onClose();
                                }}
                                className="p-3 mb-1 bg-amber-50 rounded-2xl flex-row items-center gap-3"
                            >
                                <View className="w-9 h-9 rounded-full bg-amber-500 items-center justify-center">
                                    <Ionicons name="flash" size={18} color="#ffffff" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-poppin-semibold text-amber-700 uppercase">
                                        Closest petrol station
                                    </Text>
                                    <Text className="text-xs font-poppin-bold text-gray-900">
                                        {nearestPetrolStation.name}
                                    </Text>
                                    <Text className="text-[11px] font-poppin text-gray-500" numberOfLines={1}>
                                        {nearestPetrolStation.distanceKm} km away • {nearestPetrolStation.address}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {!isSearching && searchQuery.trim().length >= 2 && suggestions.length === 0 ? (
                            <View className="py-8 items-center">
                                <Ionicons name="search-outline" size={28} color="#9ca3af" />
                                <Text className="text-xs font-poppin text-gray-500 mt-2 text-center">
                                    No places found for “{searchQuery}”. Try a street name, suburb, or landmark.
                                </Text>
                            </View>
                        ) : null}

                        {suggestions.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => {
                                    onSelectDestination({
                                        name: item.name,
                                        address: item.address,
                                        latitude: item.latitude,
                                        longitude: item.longitude,
                                        distanceKm: item.distanceKm,
                                    });
                                    onClose();
                                }}
                                className="p-3 flex-row items-center gap-3"
                            >
                                <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                                    <Ionicons name="location" size={18} color="#4b5563" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-poppin-bold text-gray-900">
                                        {item.name}
                                    </Text>
                                    <Text className="text-[11px] font-poppin text-gray-500" numberOfLines={1}>
                                        {item.address} ({item.distanceKm} km away)
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};
