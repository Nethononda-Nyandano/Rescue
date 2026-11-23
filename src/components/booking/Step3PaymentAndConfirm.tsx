import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
    RescueType,
    RescueService,
    PaymentMethod,
    PaymentCard,
    NearbyPOI,
    calculateDynamicRescuePrice,
} from '@/utils/rescueService';
import { VehicleType } from '@/utils/vehicle';

interface Step3PaymentAndConfirmProps {
    dynamicPriceInfo: ReturnType<typeof calculateDynamicRescuePrice>;
    selectedVehicle: VehicleType | null;
    activeService: RescueService;
    selectedService: RescueType;
    problemDescription: string;
    selectedTyrePosition: string;
    effectiveTyreSize: string;
    tyreAction: 'spare' | 'new_tyre' | 'repair';
    towDestination: {
        name: string;
        address: string;
        distanceKm: number;
    } | null;
    nearestPetrolStation?: NearbyPOI | null;
    fuelLitres: number;
    currentFuelOption: { id: string; name: string; pricePerLitre: number };
    batteryAction?: 'jump_start' | 'replace' | 'diagnostics' | string;
    address: string;
    paymentMethod: PaymentMethod;
    onSelectPaymentMethod: (method: PaymentMethod) => void;
    selectedCard: PaymentCard | null;
    onOpenCardModal: () => void;
    onBack: () => void;
    onConfirmRescue: () => void;
}

export const Step3PaymentAndConfirm: React.FC<Step3PaymentAndConfirmProps> = ({
    dynamicPriceInfo,
    selectedVehicle,
    activeService,
    selectedService,
    problemDescription,
    selectedTyrePosition,
    effectiveTyreSize,
    tyreAction,
    towDestination,
    nearestPetrolStation,
    fuelLitres,
    currentFuelOption,
    batteryAction = 'jump_start',
    address,
    paymentMethod,
    onSelectPaymentMethod,
    selectedCard,
    onOpenCardModal,
    onBack,
    onConfirmRescue,
}) => {
    return (
        <>
            {/* Request Summary Card */}
            <View className="bg-gray-50 p-3.5 rounded-2xl mb-3 w-full">
                <Text className="text-[10px] w-full font-poppin-bold flex flex-row justify-between text-gray-400 uppercase tracking-wider mb-2">
                    Rescue Request Summary
                </Text>

                {/* Vehicle Details */}
                <View className="flex-row items-center gap-2.5 pb-2 mb-2">
                    {selectedVehicle?.avatar_url ? (
                        <Image
                            source={{ uri: selectedVehicle.avatar_url }}
                            className="w-20 h-14 rounded-lg"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-14 h-14 rounded-xl bg-gray-200 items-center justify-center">
                            <Ionicons name="car" size={24} color="#374151" />
                        </View>
                    )}
                    <View className="flex-1">
                        <Text className="text-xs font-poppin-bold text-gray-900">
                            {selectedVehicle
                                ? `${selectedVehicle.make} ${selectedVehicle.model} ${selectedVehicle.year || ''}`
                                : 'Vehicle Details'}
                        </Text>
                        <Text className="text-[10px] font-poppin text-gray-500">
                            Plate: {selectedVehicle?.reg_no || ''} • {selectedVehicle?.fuel_type || 'Petrol'}
                        </Text>
                    </View>
                </View>

                {/* Service Details */}
                <View className="flex-row items-center gap-2.5 pb-2 mb-2">
                    <Image
                        source={activeService.icon}
                        className="w-20 h-14"
                        resizeMode="contain"
                    />
                    <View className="flex-1">
                        <Text className="text-xs font-poppin-bold text-gray-900">
                            {activeService.title}
                        </Text>
                        <Text className="text-[10px] font-poppin text-gray-600">
                            {selectedService === 'tyre' &&
                                `Wheel ${selectedTyrePosition} (${effectiveTyreSize}) • ${
                                    tyreAction === 'spare'
                                        ? 'Fit Spare Wheel'
                                        : tyreAction === 'new_tyre'
                                        ? 'Supply New Tyre Unit'
                                        : 'Puncture Repair'
                                }`}
                            {selectedService === 'tow' &&
                                (towDestination
                                    ? `Destination: ${towDestination.name} (${towDestination.distanceKm} km)`
                                    : (nearestPetrolStation
                                        ? `Destination: Nearest Station (${nearestPetrolStation.distanceKm} km)`
                                        : 'Destination: Local Station Depot'))}
                            {selectedService === 'fuel' &&
                                `${fuelLitres}L of ${currentFuelOption.name}${nearestPetrolStation ? ` from ${nearestPetrolStation.name.split(' ')[0]}` : ''}`}
                            {selectedService === 'battery' &&
                                (batteryAction === 'replace'
                                    ? 'Supply & Fit New 12V Battery'
                                    : batteryAction === 'diagnostics'
                                    ? 'Battery & Alternator Test'
                                    : 'Emergency Jump Start Boost')}
                            {selectedService === 'diagnostics' && 'All-rounder roadside assessment'}
                        </Text>
                    </View>
                </View>

                {problemDescription.trim() !== '' && (
                    <View className="bg-white rounded-xl p-3 mb-2">
                        <Text className="text-[10px] font-poppin-semibold text-gray-500 uppercase mb-1">
                            Symptoms shared with provider
                        </Text>
                        <Text className="text-xs font-poppin text-gray-800">
                            {problemDescription.trim()}
                        </Text>
                    </View>
                )}

                {/* Location & ETA */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                        <Ionicons name="location" size={14} color="#10b981" />
                        <Text className="text-[11px] font-poppin text-gray-600" numberOfLines={1}>
                            {address}
                        </Text>
                    </View>
                </View>
            </View>

            {/* PAYMENT METHOD SELECTION */}
            <View className="bg-gray-50/90 p-3 rounded-2xl mb-3">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-poppin-semibold text-gray-600 uppercase tracking-wider">
                        Payment Method
                    </Text>
                    {paymentMethod === 'card' && (
                        <TouchableOpacity
                            onPress={onOpenCardModal}
                            className="flex-row items-center gap-1"
                        >
                            <Text className="text-xs font-poppin-semibold text-amber-600">
                                {selectedCard ? 'Change Card' : 'Add Card'}
                            </Text>
                            <Ionicons name="chevron-forward" size={12} color="#d97706" />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="flex-row gap-2">
                    {/* Cash Button */}
                    <TouchableOpacity
                        onPress={() => onSelectPaymentMethod('cash')}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-2 ${ paymentMethod === 'cash' ? 'bg-white shadow-sm' : 'bg-white/60' }`}
                    >
                        <Ionicons
                            name="cash-outline"
                            size={18}
                            color={paymentMethod === 'cash' ? '#10b981' : '#6b7280'}
                        />
                        <Text
                            className={`text-xs font-poppin-semibold ${ paymentMethod === 'cash' ? 'text-emerald-900' : 'text-gray-700' }`}
                        >
                            Cash
                        </Text>
                    </TouchableOpacity>

                    {/* Card Button */}
                    <TouchableOpacity
                        onPress={() => {
                            onSelectPaymentMethod('card');
                            if (!selectedCard) {
                                onOpenCardModal();
                            }
                        }}
                        activeOpacity={0.8}
                        className={`flex-1 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-2 ${ paymentMethod === 'card' ? 'bg-white shadow-sm' : 'bg-white/60' }`}
                    >
                        <Ionicons
                            name="card-outline"
                            size={18}
                            color={paymentMethod === 'card' ? '#f59e0b' : '#6b7280'}
                        />
                        <Text
                            className={`text-xs font-poppin-semibold ${ paymentMethod === 'card' ? 'text-amber-950' : 'text-gray-700' }`}
                            numberOfLines={1}
                        >
                            {selectedCard
                                ? `${selectedCard.card_brand} ••${selectedCard.card_number_last4}`
                                : 'Card Payment'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Detailed Price Breakdown */}
            <View className="bg-gray-50 p-3 rounded-2xl mb-3.5">
                <View className="flex-row items-center justify-between py-0.5">
                    <Text className="text-[11px] font-poppin text-gray-500">Base Callout Fee</Text>
                    <Text className="text-[11px] font-poppin-medium text-gray-800">
                        R{dynamicPriceInfo.basePrice}
                    </Text>
                </View>

                <View className="flex-row items-center justify-between py-0.5">
                    <Text className="text-[11px] font-poppin text-gray-500">Dispatch & Distance Fee</Text>
                    <Text className="text-[11px] font-poppin-medium text-gray-800">
                        R{dynamicPriceInfo.distanceFee + (dynamicPriceInfo.garageFee || 0)}
                    </Text>
                </View>

                {dynamicPriceInfo.towDropoffFee ? (
                    <View className="flex-row items-center justify-between py-0.5">
                        <Text className="text-[11px] font-poppin text-gray-500">Towing Route Distance</Text>
                        <Text className="text-[11px] font-poppin-medium text-gray-800">
                            R{dynamicPriceInfo.towDropoffFee}
                        </Text>
                    </View>
                ) : null}

                {dynamicPriceInfo.fuelCost ? (
                    <View className="flex-row items-center justify-between py-0.5">
                        <Text className="text-[11px] font-poppin text-gray-500">
                            Fuel ({fuelLitres}L @ R{currentFuelOption.pricePerLitre.toFixed(2)}/L)
                        </Text>
                        <Text className="text-[11px] font-poppin-medium text-gray-800">
                            R{dynamicPriceInfo.fuelCost.toFixed(2)}
                        </Text>
                    </View>
                ) : null}

                {dynamicPriceInfo.tyreSupplyFee ? (
                    <View className="flex-row items-center justify-between py-0.5">
                        <Text className="text-[11px] font-poppin text-gray-500">Replacement Tyre Unit</Text>
                        <Text className="text-[11px] font-poppin-medium text-gray-800">
                            R{dynamicPriceInfo.tyreSupplyFee}
                        </Text>
                    </View>
                ) : null}

                {dynamicPriceInfo.batterySupplyFee ? (
                    <View className="flex-row items-center justify-between py-0.5">
                        <Text className="text-[11px] font-poppin text-gray-500">Replacement 12V Battery</Text>
                        <Text className="text-[11px] font-poppin-medium text-gray-800">
                            R{dynamicPriceInfo.batterySupplyFee}
                        </Text>
                    </View>
                ) : null}

                <View className="flex-row items-center justify-between pt-1.5 mt-1">
                    <Text className="text-xs font-poppin-bold text-gray-900">
                        {selectedService === 'diagnostics' ? 'Indicative estimate' : 'Total Price'}
                    </Text>
                    <Text className="text-sm font-poppin-bold text-emerald-600">
                        R{dynamicPriceInfo.totalPrice.toFixed(2)}
                    </Text>
                </View>
                {selectedService === 'diagnostics' && (
                    <Text className="text-[10px] font-poppin text-gray-500 mt-1">
                        Final diagnosis and repair costs are confirmed by the mechanic after inspection.
                    </Text>
                )}
            </View>

            {/* STEP 3 NAVIGATION & CONFIRM BUTTONS */}
            <View className="flex-row gap-2.5">
                <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.8}
                    className="py-4 px-4 bg-gray-100 rounded-2xl flex-row items-center justify-center gap-1"
                >
                    <Ionicons name="chevron-back" size={16} color="#374151" />
                    <Text className="text-sm font-poppin-semibold text-gray-700">Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onConfirmRescue}
                    activeOpacity={0.85}
                    className="flex-1 py-4 bg-emerald-500 rounded-2xl items-center justify-center shadow-lg"
                >
                    <Text className="text-sm font-poppin-bold text-white">
                        Confirm & Request Rescue (R{dynamicPriceInfo.totalPrice.toFixed(2)})
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
};
