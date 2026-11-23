import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
    Image,
} from 'react-native';
import { Modal } from '@/components/dialogNative';
import Ionicons from '@react-native-vector-icons/ionicons';
import { VehicleType } from '@/utils/vehicle';
import {SafeAreaView} from "react-native-safe-area-context";

interface VehicleSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    vehicles: VehicleType[];
    selectedVehicle: VehicleType | null;
    onSelectVehicle: (vehicle: VehicleType) => void;
    onAddNewVehicle?: () => void;
}

export const VehicleSelectionModal: React.FC<VehicleSelectionModalProps> = ({
    visible,
    onClose,
    vehicles,
    selectedVehicle,
    onSelectVehicle,
    onAddNewVehicle,
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/60 justify-end">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="w-full bg-white rounded-t-4xl max-h-[90%] shadow-2xl flex-col">
                            {/* Bolt-style Drag Handle */}
                            <View className="items-center pt-3 pb-1">
                                <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                            </View>

                            {/* Header */}
                            <View className="px-6 pt-2 pb-4 flex-row items-center justify-between">
                                <View className="flex-1 pr-3">
                                    <View className="flex-row items-center gap-2">

                                        <Text className="text-lg font-poppin-bold text-gray-900 tracking-tight">
                                            Which car are you driving?
                                        </Text>
                                    </View>
                                    <Text className="text-xs font-poppin text-gray-500 mt-1">
                                        Select your active car today so rescuers bring the correct equipment and parts.
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center self-start"
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={18} color="#4b5563" />
                                </TouchableOpacity>
                            </View>

                            {/* Vehicles List */}
                            <ScrollView
                                className="px-5 py-3"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 16 }}
                            >
                                <View className="gap-3">
                                    {vehicles.map((veh) => {
                                        const isSelected =
                                            (selectedVehicle?.id && selectedVehicle.id === veh.id) ||
                                            (selectedVehicle?.key && selectedVehicle.key === veh.key) ||
                                            (selectedVehicle?.reg_no && selectedVehicle.reg_no === veh.reg_no);

                                        return (
                                            <TouchableOpacity
                                                key={veh.id || veh.key || veh.reg_no}
                                                onPress={() => {
                                                    onSelectVehicle(veh);
                                                    onClose();
                                                }}
                                                activeOpacity={0.75}
                                                className={`p-4 rounded-2xl transition-all ${isSelected ? 'bg-gray-100' : 'bg-gray-50'}`}
                                            >
                                                <View className="flex-row items-center justify-between mb-2.5">
                                                    <View className="flex-row items-center gap-3 flex-1">
                                                        <View
                                                            className={`w-12 h-12 rounded-2xl items-center justify-center ${ isSelected ? 'bg-gray-800' : 'bg-gray-200' }`}
                                                        >
                                                            {veh.avatar_url &&
                                                                <Image
                                                                    source={{ uri: veh.avatar_url }}
                                                                    className="w-20 h-12 rounded-lg"
                                                                    resizeMode="cover"
                                                                />
                                                            }
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-base font-poppin-bold text-gray-900 leading-tight">
                                                                {veh.make} {veh.model}
                                                            </Text>
                                                            <Text className="text-xs font-poppin text-gray-500 mt-0.5">
                                                                {veh.year} {veh.color ?`, ${veh.color}` : ''}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View className="items-end pl-2">
                                                        {isSelected ? (
                                                            <View className="flex-row items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full">
                                                                <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                                                                <Text className="text-[11px] font-poppin-bold text-white uppercase tracking-wider">
                                                                    Selected
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <View className="w-7 h-7 rounded-full items-center justify-center bg-white">
                                                                <View className="w-3 h-3 rounded-full bg-transparent" />
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>

                                                {/* Metadata Badges */}
                                                <View className="flex-row items-center flex-wrap gap-2 pt-2.5 ">
                                                    <View className="bg-gray-900 px-2.5 py-1 rounded-md">
                                                        <Text className="text-[11px] font-poppin-bold text-white uppercase tracking-wider">
                                                            {veh.reg_no}
                                                        </Text>
                                                    </View>
                                                    <View className="bg-gray-200/90 px-2.5 py-1 rounded-md flex-row items-center gap-1">
                                                        <Text className="text-[11px] font-poppin-medium text-gray-800">
                                                             {veh.fuel_type || 'Petrol'}
                                                        </Text>
                                                    </View>
                                                    {veh.vehicle_type && veh.vehicle_type !== 'personal' && (
                                                        <View className="bg-amber-100 px-2.5 py-1 rounded-md">
                                                            <Text className="text-[11px] font-poppin-semibold text-gray-900 capitalize">
                                                                {veh.vehicle_type.replace('_', ' ')}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Bolt-style Bottom Action Section */}
                            <SafeAreaView className="bg-white px-6 pt-3 pb-6 ">
                                <View className="gap-2.5">


                                    {onAddNewVehicle && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                onClose();
                                                onAddNewVehicle();
                                            }}
                                            activeOpacity={0.7}
                                            className="w-full py-3 rounded-xl bg-gray-100 items-center justify-center flex-row gap-2"
                                        >
                                            <Ionicons name="add-circle-outline" size={16} color="#374151" />
                                            <Text className="text-xs font-poppin-semibold text-gray-700">
                                                Add Another Vehicle
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </SafeAreaView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
