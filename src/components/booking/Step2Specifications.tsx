import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { RescueType, RescueService, NearbyPOI, FUEL_LITRE_PRESETS } from '@/utils/rescueService';
import { VehicleType } from '@/utils/vehicle';
import type { FuelOption, FuelPriceZone } from '@/utils/fuelPrices';

const TYRE_POSITIONS = [
    { id: 'FL', label: 'Front Left', desc: 'Driver Front' },
    { id: 'FR', label: 'Front Right', desc: 'Passenger Front' },
    { id: 'RL', label: 'Rear Left', desc: 'Driver Rear' },
    { id: 'RR', label: 'Rear Right', desc: 'Passenger Rear' },
];

interface Step2SpecificationsProps {
    selectedVehicle: VehicleType | null;
    activeService: RescueService;
    selectedService: RescueType;
    problemDescription: string;
    onChangeProblemDescription: (description: string) => void;
    // Tow props
    towDestination: {
        name: string;
        address: string;
        distanceKm: number;
    } | null;
    onClearTowDestination: () => void;
    onOpenTowSearch: () => void;
    onSelectNearestPetrolStationAsTow: () => void;
    nearestPetrolStation?: NearbyPOI | null;
    // Tyre props
    selectedTyrePosition: string;
    onSelectTyrePosition: (pos: string) => void;
    tyreAction: 'spare' | 'new_tyre' | 'repair';
    onSelectTyreAction: (action: 'spare' | 'new_tyre' | 'repair') => void;
    availableTyreSizes: string[];
    tyreSize: string;
    onSelectTyreSize: (size: string) => void;
    customTyreSize: string;
    onChangeCustomTyreSize: (val: string) => void;
    loadingTyreSizes: boolean;
    // Fuel props
    selectedFuelType: string;
    onSelectFuelType: (fuelId: string) => void;
    fuelLitres: number;
    onChangeFuelLitres: (action: number | ((prev: number) => number)) => void;
    currentFuelOption: { id: string; name: string; pricePerLitre: number };
    fuelOptions: FuelOption[];
    fuelPriceZone: FuelPriceZone | null;
    onSelectFuelPriceZone: (zone: FuelPriceZone) => void;
    // Battery props
    batteryAction?: 'jump_start' | 'replace' | 'diagnostics';
    onSelectBatteryAction?: (action: 'jump_start' | 'replace' | 'diagnostics') => void;
    // Navigation props
    onBack: () => void;
    onContinue: () => void;
}

export const Step2Specifications: React.FC<Step2SpecificationsProps> = ({
    selectedVehicle,
    activeService,
    selectedService,
    problemDescription,
    onChangeProblemDescription,
    towDestination,
    onClearTowDestination,
    onOpenTowSearch,
    onSelectNearestPetrolStationAsTow,
    nearestPetrolStation,
    selectedTyrePosition,
    onSelectTyrePosition,
    tyreAction,
    onSelectTyreAction,
    availableTyreSizes,
    tyreSize,
    onSelectTyreSize,
    customTyreSize,
    onChangeCustomTyreSize,
    loadingTyreSizes,
    selectedFuelType,
    onSelectFuelType,
    fuelLitres,
    onChangeFuelLitres,
    currentFuelOption,
    fuelOptions,
    fuelPriceZone,
    onSelectFuelPriceZone,
    batteryAction = 'jump_start',
    onSelectBatteryAction,
    onBack,
    onContinue,
}) => {
    return (
        <>
            {/* Selected Vehicle & Service Summary Pill */}
            <View className="bg-white p-2.5 rounded-xl mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                    <Text className="text-xs font-poppin-semibold text-gray-900" numberOfLines={1}>
                        {selectedVehicle
                            ? `Driving: ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.reg_no})`
                            : ''}
                    </Text>
                </View>
                <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                    <Text className="text-[10px] font-poppin-bold text-gray-800">
                        {activeService.title}
                    </Text>
                </View>
            </View>

            {selectedService === 'diagnostics' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center gap-1.5 mb-1.5">
                        <Ionicons name="construct-outline" size={16} color="#101828" />
                        <Text className="text-xs font-poppin-bold text-gray-950">
                            What is happening with your vehicle?
                        </Text>
                    </View>
                    <Text className="text-[11px] font-poppin text-gray-500 mb-2">
                        Describe symptoms such as warning lights, unusual sounds, starting problems, or gearbox trouble.
                    </Text>
                    <TextInput
                        value={problemDescription}
                        onChangeText={onChangeProblemDescription}
                        placeholder="Tell the mechanic what you noticed..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        className="min-h-24 bg-gray-50 px-3 py-2.5 rounded-xl text-xs font-poppin text-gray-800"
                        accessibilityLabel="Describe the vehicle problem"
                    />
                    <Text className="text-[10px] font-poppin text-gray-400 text-right mt-1">
                        {problemDescription.length}/500
                    </Text>
                </View>
            )}

            {selectedService !== 'diagnostics' && problemDescription.trim() !== '' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center gap-1.5 mb-1.5">
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color="#101828" />
                        <Text className="text-xs font-poppin-bold text-gray-950">
                            Symptoms from AI diagnosis
                        </Text>
                    </View>
                    <Text className="text-[10px] font-poppin text-gray-500 mb-2">
                        Edit the typed details that will be shared with your service provider. Photos are not included.
                    </Text>
                    <TextInput
                        value={problemDescription}
                        onChangeText={onChangeProblemDescription}
                        placeholder="Describe the vehicle symptoms..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        className="min-h-20 bg-gray-50 px-3 py-2.5 rounded-xl text-xs font-poppin text-gray-800"
                        accessibilityLabel="Edit symptoms from AI diagnosis"
                    />
                    <Text className="text-[10px] font-poppin text-gray-400 text-right mt-1">
                        {problemDescription.length}/500
                    </Text>
                </View>
            )}

            {/* 1. TOW TRUCK: Drop-off Destination Selection */}
            {selectedService === 'tow' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="flag-outline" size={15} color="#101828" />
                            <Text className="text-xs font-poppin-bold text-gray-950">
                                Tow Drop-off Destination
                            </Text>
                        </View>
                        {towDestination && (
                            <TouchableOpacity onPress={onClearTowDestination}>
                                <Text className="text-[11px] font-poppin-medium text-red-500">Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {towDestination ? (
                        <View className="flex-row items-center justify-between bg-white p-3 rounded-xl ">
                            <View className="flex-1 mr-2">
                                <Text className="text-xs font-poppin-bold text-gray-900" numberOfLines={1}>
                                    {towDestination.name}
                                </Text>
                                <Text className="text-[11px] font-poppin text-gray-500" numberOfLines={1}>
                                    {towDestination.address}
                                </Text>
                                <Text className="text-[10px] font-poppin-semibold text-emerald-700 mt-0.5">
                                    Route: {towDestination.distanceKm} km from pickup
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onOpenTowSearch}
                                className="px-2.5 py-1.5 bg-gray-800 rounded-lg"
                            >
                                <Text className="text-[11px] font-poppin-bold text-white">Change</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <TouchableOpacity
                                onPress={onOpenTowSearch}
                                activeOpacity={0.8}
                                className="flex-row items-center gap-2 bg-white p-2.5 rounded-xl mb-2"
                            >
                                <Ionicons name="search" size={16} color="#9ca3af" />
                                <Text className="text-xs font-poppin text-gray-400 flex-1">
                                    Search workshop, home or address...
                                </Text>
                                <View className="bg-gray-100 px-2 py-1 rounded-md">
                                    <Text className="text-[10px] font-poppin-semibold text-gray-600">Choose</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Quick Option: Nearest Petrol Station / Garage */}
                            {nearestPetrolStation && (
                                <TouchableOpacity
                                    onPress={onSelectNearestPetrolStationAsTow}
                                    activeOpacity={0.8}
                                    className="flex-row items-center justify-between bg-white/80 p-2.5 rounded-xl "
                                >
                                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                                        <Ionicons name="location-outline" size={15} color="#101828" />
                                        <Text className="text-xs font-poppin-medium text-gray-800" numberOfLines={1}>
                                            Nearest Petrol Station ({nearestPetrolStation.name.split(' ')[0]} - {nearestPetrolStation.distanceKm}km)
                                        </Text>
                                    </View>
                                    <Text className="text-[11px] font-poppin-bold text-gray-700">Select</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* 2. TYRE ASSIST: Wheel Position, Action Choice & Car API Tyre Size */}
            {selectedService === 'tyre' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-1.5">

                            <Text className="text-xs font-poppin-bold text-gray-950">
                                Tyre Service Specification
                            </Text>
                        </View>
                        <Text className="text-[10px] font-poppin-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            Mobile Mechanic
                        </Text>
                    </View>

                    {/* Question A: Which wheel is it? */}
                    <Text className="text-[11px] font-poppin-semibold text-gray-700 mb-1.5">
                        1. Which wheel needs assistance?
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {TYRE_POSITIONS.map((pos) => {
                            const isPosSelected = selectedTyrePosition === pos.id;
                            return (
                                <TouchableOpacity
                                    key={pos.id}
                                    onPress={() => onSelectTyrePosition(pos.id)}
                                    activeOpacity={0.8}
                                    style={{ width: '48%' }}
                                    className={`p-2.5 rounded-xl flex-row items-center justify-between ${isPosSelected ? 'bg-gray-100' : 'bg-white'}`}
                                >
                                    <View className="flex-row items-center gap-2">
                                        <View
                                            className={`w-7 h-7 rounded-lg items-center justify-center ${ isPosSelected ? 'bg-gray-200' : 'bg-gray-100' }`}
                                        >
                                            <Ionicons
                                                name="disc-outline"
                                                size={16}
                                                color={isPosSelected ? '#101828' : '#374151'}
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-xs font-poppin-bold text-gray-900">
                                                {pos.id}
                                            </Text>
                                            <Text className="text-[10px] font-poppin text-gray-500">
                                                {pos.label}
                                            </Text>
                                        </View>
                                    </View>
                                    {isPosSelected && (
                                        <Ionicons name="checkmark-circle" size={16} color="#101828" />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Question B: What is supposed to happen? */}
                    <Text className="text-[11px] font-poppin-semibold text-gray-700 mb-1.5">
                        2. What is supposed to happen?
                    </Text>
                    <View className="gap-2 mb-3">
                        {/* Option 1: Spare wheel */}
                        <TouchableOpacity
                            onPress={() => onSelectTyreAction('spare')}
                            activeOpacity={0.8}
                            className={`p-2.5 rounded-xl flex-row items-center justify-between ${tyreAction === 'spare' ? 'bg-gray-100' : 'bg-white'}`}
                        >
                            <View className="flex-row items-center gap-2 flex-1 mr-2">
                                <View className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center">
                                    <Ionicons name="sync" size={15} color="#101828" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-poppin-bold text-gray-900">
                                        Fit My Spare Wheel
                                    </Text>
                                    <Text className="text-[10px] font-poppin text-gray-500">
                                        I have a spare tyre • Labor callout only
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-[10px] font-poppin-bold text-emerald-600">Standard</Text>
                                {tyreAction === 'spare' && (
                                    <Ionicons name="radio-button-on" size={16} color="#101828" />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Replacement tyre unit */}
                        <TouchableOpacity
                            onPress={() => onSelectTyreAction('new_tyre')}
                            activeOpacity={0.8}
                            className={`p-2.5 rounded-xl flex-row items-center justify-between ${tyreAction === 'new_tyre' ? 'bg-gray-100' : 'bg-white'}`}
                        >
                            <View className="flex-row items-center gap-2 flex-1 mr-2">
                                <View className="w-7 h-7 rounded-lg bg-gray-50 items-center justify-center">
                                    <Ionicons name="cart-outline" size={15} color="#101828" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-poppin-bold text-gray-900">
                                        Bring New Replacement Tyre
                                    </Text>
                                    <Text className="text-[10px] font-poppin text-gray-500">
                                        Mechanic supplies & fits brand new tyre unit
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-[10px] font-poppin-bold text-amber-700">+R950</Text>
                                {tyreAction === 'new_tyre' && (
                                    <Ionicons name="radio-button-on" size={16} color="#101828" />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Option 3: Puncture Repair */}
                        <TouchableOpacity
                            onPress={() => onSelectTyreAction('repair')}
                            activeOpacity={0.8}
                            className={`p-2.5 rounded-xl flex-row items-center justify-between ${tyreAction === 'repair' ? 'bg-gray-100' : 'bg-white'}`}
                        >
                            <View className="flex-row items-center gap-2 flex-1 mr-2">
                                <View className="w-7 h-7 rounded-lg bg-gray-50 items-center justify-center">
                                    <Ionicons name="build-outline" size={15} color="#101828" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-poppin-bold text-gray-900">
                                        Puncture Repair / Air Inflation
                                    </Text>
                                    <Text className="text-[10px] font-poppin text-gray-500">
                                        Inspect, patch puncture or pump flat tyre on-site
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-[10px] font-poppin-bold text-emerald-600">On-Site</Text>
                                {tyreAction === 'repair' && (
                                    <Ionicons name="radio-button-on" size={16} color="#101828" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Question C: Tyre Size from Car API */}
                    <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-[11px] font-poppin-semibold text-gray-700">
                            3. Tyre Size Profile
                        </Text>
                        {loadingTyreSizes ? (
                            <View className="flex-row items-center gap-1">
                                <ActivityIndicator size="small" color="#101828" />
                                <Text className="text-[10px] font-poppin text-gray-600">Checking API specs...</Text>
                            </View>
                        ) : (
                            <Text className="text-[10px] font-poppin text-gray-600">
                                {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'OEM Specs'}
                            </Text>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 mb-2">
                        {availableTyreSizes.map((sz) => {
                            const isSzSelected = tyreSize === sz;
                            return (
                                <TouchableOpacity
                                    key={sz}
                                    onPress={() => onSelectTyreSize(sz)}
                                    className={`py-1.5 px-3 rounded-xl mr-1.5 ${ isSzSelected ? 'bg-gray-500/10 shadow-sm' : 'bg-white' } `}
                                >
                                    <Text
                                        className={`text-xs font-poppin-semibold ${ isSzSelected ? 'text-gray-950 font-poppin-bold' : 'text-gray-700' }`}
                                    >
                                        {sz}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {tyreSize === 'Other' && (
                        <TextInput
                            placeholder="Enter tyre size (e.g. 235/50 R18)"
                            value={customTyreSize}
                            onChangeText={onChangeCustomTyreSize}
                            className="bg-white px-3 py-2 rounded-xl text-xs font-poppin text-gray-800 mt-1"
                        />
                    )}
                </View>
            )}

            {/* 3. FUEL DELIVERY: Fuel Grade, Litres & Live Pricing */}
            {selectedService === 'fuel' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="water-outline" size={15} color="#101828" />
                            <Text className="text-xs font-poppin-bold text-gray-950">
                                Emergency Fuel Specifications
                            </Text>
                        </View>
                        {nearestPetrolStation && (
                            <Text className="text-[10px] font-poppin-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                                {nearestPetrolStation.name.split(' ')[0]} ({nearestPetrolStation.distanceKm} km)
                            </Text>
                        )}
                    </View>

                    <Text className="text-[11px] font-poppin-semibold text-gray-600 mb-1.5">
                        Official November 2026 pump zone
                    </Text>
                    <View className="flex-row gap-2 mb-2">
                        {(['inland', 'coastal'] as const).map((zone) => (
                            <TouchableOpacity
                                key={zone}
                                onPress={() => onSelectFuelPriceZone(zone)}
                                activeOpacity={0.8}
                                className={`flex-1 rounded-xl p-2.5 ${fuelPriceZone === zone ? 'bg-gray-900' : 'bg-gray-100'}`}
                            >
                                <Text className={`text-xs font-poppin-bold text-center ${fuelPriceZone === zone ? 'text-white' : 'text-gray-800'}`}>
                                    {zone === 'inland' ? 'Inland' : 'Coastal'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-[10px] font-poppin text-gray-500 mb-2">
                        Effective 4 Nov–1 Dec 2026; new prices start 2 Dec. Diesel prices are wholesale references, not pump prices.
                    </Text>

                    {/* Fuel Type Buttons */}
                    <Text className="text-[11px] font-poppin-semibold text-gray-600 mb-1.5">
                        Select Fuel Grade
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {fuelOptions.map((f) => {
                            const isFuelSelected = selectedFuelType === f.id;
                            return (
                                <TouchableOpacity
                                    key={f.id}
                                    onPress={() => onSelectFuelType(f.id)}
                                    activeOpacity={0.8}
                                    style={{ width: '48%' }}
                                    className={`p-2.5 rounded-xl ${ isFuelSelected ? 'bg-gray-500/10 shadow-sm' : 'bg-white' }`}
                                >
                                    <Text
                                        className={`text-xs font-poppin-bold ${ isFuelSelected ? 'text-gray-950' : 'text-gray-800' }`}
                                        numberOfLines={1}
                                    >
                                        {f.name}
                                    </Text>
                                    <Text
                                        className={`text-[10px] font-poppin mt-0.5 ${ isFuelSelected ? 'text-gray-700 font-poppin-medium' : 'text-gray-500' }`}
                                    >
                                        {fuelPriceZone ? `R${f.pricePerLitre.toFixed(2)} / Litre` : 'Choose a price zone'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Fuel Litres Stepper */}
                    <View className="flex-row items-center justify-between bg-white p-3 rounded-xl mb-2">
                        <View>
                            <Text className="text-xs font-poppin-bold text-gray-900">
                                Fuel Quantity: {fuelLitres} Litres
                            </Text>
                            <Text className="text-[11px] font-poppin text-amber-700">
                                Fuel Cost: {fuelPriceZone ? `R${(fuelLitres * currentFuelOption.pricePerLitre).toFixed(2)}` : 'Select a price zone'}
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={() => onChangeFuelLitres((prev) => Math.max(5, prev - 5))}
                                className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center"
                            >
                                <Ionicons name="remove" size={16} color="#374151" />
                            </TouchableOpacity>
                            <Text className="text-sm font-poppin-bold text-gray-900 w-8 text-center">
                                {fuelLitres}L
                            </Text>
                            <TouchableOpacity
                                onPress={() => onChangeFuelLitres((prev) => Math.min(30, prev + 5))}
                                className="w-8 h-8 rounded-lg bg-gray-900 items-center justify-center"
                            >
                                <Ionicons name="add" size={16} color="#ffffff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Presets */}
                    <View className="flex-row gap-2">
                        {FUEL_LITRE_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                onPress={() => onChangeFuelLitres(preset)}
                                className={`flex-1 py-1.5 rounded-xl items-center justify-center ${fuelLitres === preset ? 'bg-gray-100' : 'bg-white'}`}
                            >
                                <Text
                                    className={`text-[11px] font-poppin-semibold ${ fuelLitres === preset ? 'text-gray-950 font-poppin-bold' : 'text-gray-600' }`}
                                >
                                    {preset}L
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* 3. BATTERY ASSIST: Action Type Selection */}
            {selectedService === 'battery' && (
                <View className="bg-white p-3.5 rounded-2xl mb-3.5">
                    <View className="flex-row items-center gap-1.5 mb-2">

                        <Text className="text-xs font-poppin-bold text-gray-950">
                            Battery Rescue Service
                        </Text>
                    </View>
                    <Text className="text-[11px] font-poppin text-gray-500 mb-3">
                        Choose the required roadside battery assistance
                    </Text>

                    <View className="gap-2 mb-2">
                        {[
                            {
                                id: 'jump_start' as const,
                                label: 'Jump Start Boost',
                                desc: 'Heavy-duty booster pack jump start & voltage check',
                                price: 'Standard Included',
                            },
                            {
                                id: 'replace' as const,
                                label: 'Supply & Fit New Battery',
                                desc: 'Deliver suitable 12V automotive battery & installation',
                                price: '+R1,250 Unit Fee',
                            },
                            {
                                id: 'diagnostics' as const,
                                label: 'Battery & Alternator Test',
                                desc: 'Diagnostics of battery health, alternator, and starter',
                                price: 'Standard Included',
                            },
                        ].map((opt) => {
                            const isSelected = batteryAction === opt.id;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => onSelectBatteryAction && onSelectBatteryAction(opt.id)}
                                    activeOpacity={0.8}
                                    className={`p-3 rounded-xl flex-row items-center justify-between ${isSelected ? 'bg-gray-100' : 'bg-white'}`}
                                >
                                    <View className="flex-1 mr-2">
                                        <Text className={`text-xs font-poppin-bold ${isSelected ? 'text-gray-950' : 'text-gray-900'}`}>
                                            {opt.label}
                                        </Text>
                                        <Text className="text-[10px] font-poppin text-gray-500">
                                            {opt.desc}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className={`text-[10px] font-poppin-bold ${opt.price.includes("+") ? "text-emerald-500" : "text-gray-800"} `}>
                                            {opt.price}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={16} color="#101828" className="mt-0.5" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* STEP 2 NAVIGATION BUTTONS */}
            <View className="flex-row gap-2.5 mt-1">
                <TouchableOpacity
                    onPress={onBack}
                    activeOpacity={0.8}
                    className="py-3.5 px-4 bg-gray-100 rounded-2xl flex-row items-center justify-center gap-1"
                >
                    <Ionicons name="chevron-back" size={16} color="#374151" />
                    <Text className="text-sm font-poppin-semibold text-gray-700">Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onContinue}
                    activeOpacity={0.85}
                    className="flex-1 py-3.5 bg-gray-900 rounded-2xl h-16 flex-row items-center justify-between px-5 "
                >
                    <View>
                        <Text className="text-sm font-poppin-bold text-white">
                            Review & Payment
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1 py-1.5 px-3 rounded-xl">
                        <Ionicons name="chevron-forward" size={14} color="#ffffff" />
                    </View>
                </TouchableOpacity>
            </View>
        </>
    );
};
