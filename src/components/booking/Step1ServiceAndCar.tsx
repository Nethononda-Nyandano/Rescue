import {
    NearbyPOI,
    RESCUE_SERVICES,
    RescueType,
    calculateDynamicRescuePrice,
} from "@/utils/rescueService";
import { VehicleType } from "@/utils/vehicle";
import type { FuelPriceZone } from '@/utils/fuelPrices';
import Ionicons from "@react-native-vector-icons/ionicons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

interface Step1ServiceAndCarProps {
  address: string;
  onRefreshLocation: () => void;
  userVehicles: VehicleType[];
  selectedVehicle: VehicleType | null;
  onSelectVehicle: (veh: VehicleType) => void;
  onAddVehicle: () => void;
  onChangeVehicle?: () => void;
  selectedService: RescueType;
  onSelectService: (service: RescueType) => void;
  nearestMechanic?: NearbyPOI | null;
  nearestPetrolStation?: NearbyPOI | null;
  towDestination: { distanceKm: number } | null;
  fuelLitres: number;
  currentFuelOption: { pricePerLitre: number };
  fuelPriceZone: FuelPriceZone | null;
  tyreAction: string;
  onContinue: () => void;
}

export const Step1ServiceAndCar: React.FC<Step1ServiceAndCarProps> = ({
  address,
  onRefreshLocation,
  userVehicles,
  selectedVehicle,
  onSelectVehicle,
  onAddVehicle,
  onChangeVehicle,
  selectedService,
  onSelectService,
  nearestMechanic,
  nearestPetrolStation,
  towDestination,
  fuelLitres,
  currentFuelOption,
  fuelPriceZone,
  tyreAction,
  onContinue,
}) => {
  return (
    <>
      {/* Pickup Location Banner */}
      <View className="flex-row items-center gap-2.5 bg-white p-3 rounded-2xl mb-3.5">
        <View className="w-8 h-8 rounded-full bg-gray-500/10 items-center justify-center">
          <Ionicons name="location" size={17} color="#101828" />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-poppin-medium text-gray-400 uppercase tracking-wider">
            Pickup Location
          </Text>
          <Text
            className="text-xs font-poppin-semibold text-gray-800"
            numberOfLines={1}
          >
            {address}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefreshLocation} className="p-1">
          <Ionicons name="locate-outline" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* SELECT CAR I'M DRIVING TODAY */}
      <View className="mb-3.5">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-poppin-semibold text-gray-700 uppercase tracking-wider">
            {"Car I'm Driving Today"}
          </Text>
          {userVehicles.length > 1 ? (
            <TouchableOpacity
              onPress={onChangeVehicle}
              activeOpacity={0.7}
              className="flex-row items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg"
            >
              <Ionicons name="swap-horizontal" size={13} color="#1f2937" />
              <Text className="text-[11px] font-poppin-semibold text-gray-800">
                Change Car
              </Text>
            </TouchableOpacity>
          ) : userVehicles.length === 0 ? (
            <TouchableOpacity
              onPress={onAddVehicle}
              className="flex-row items-center gap-1 px-2 py-0.5 rounded-lg"
            >
              <Text className="text-[10px] font-poppin-bold text-gray-800">
                Add Car
              </Text>
              <Ionicons name="chevron-forward" size={13} color="#1e2939" />
            </TouchableOpacity>
          ) : null}
        </View>

        {userVehicles.length > 0 ? (
          (() => {
            const activeVehicle = selectedVehicle || userVehicles[0];
            return (
              <TouchableOpacity
                activeOpacity={userVehicles.length > 1 ? 0.75 : 1}
                onPress={userVehicles.length > 1 ? onChangeVehicle : undefined}
                className="p-3.5 bg-gray-500/10 rounded-2xl "
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2.5 flex-1">
                    <View className="flex-1">
                      <Text
                        className="text-sm font-poppin-bold text-gray-900"
                        numberOfLines={1}
                      >
                        {activeVehicle.make} {activeVehicle.model}
                      </Text>
                      <Text className="text-xs font-poppin text-gray-500 mt-0.5">
                        {activeVehicle.year}{" "}
                        {activeVehicle.color ? `, ${activeVehicle.color}` : ""}
                      </Text>
                    </View>
                  </View>

                  {userVehicles.length <= 1 && (
                    <View className="flex-row items-center gap-1 bg-gray-900 px-2 py-1 rounded-full">
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#ffffff"
                      />
                      <Text className="text-[10px] font-poppin-bold text-white uppercase">
                        Active
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center justify-between pt-2 ">
                  <View className="flex-row items-center gap-2">
                    <View className=" py-0.5 rounded">
                      <Text className="text-[10px] font-poppin-bold text-gray-800 uppercase tracking-wider">
                        {activeVehicle.reg_no}
                      </Text>
                    </View>

                    {activeVehicle.vehicle_type &&
                      activeVehicle.vehicle_type !== "personal" && (
                        <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-poppin-semibold text-gray-900 capitalize">
                            {activeVehicle.vehicle_type.replace("_", " ")}
                          </Text>
                        </View>
                      )}
                  </View>
                  {activeVehicle.avatar_url && (
                    <Image
                      source={{ uri: activeVehicle.avatar_url }}
                      className="w-24 h-12 rounded-md"
                      resizeMode="cover"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })()
        ) : (
          <TouchableOpacity
            onPress={onAddVehicle}
            activeOpacity={0.8}
            className="p-3 bg-white rounded-2xl flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2.5 flex-1 mr-2">
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                <Ionicons name="car" size={16} color="#101828" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-poppin-bold text-gray-800">
                  No Car Added Yet
                </Text>
                <Text className="text-[10px] font-poppin text-gray-500">
                  Tap to add the car you are driving today
                </Text>
              </View>
            </View>
            <View className="bg-gray-800 px-2.5 py-1 rounded-lg">
              <Text className="text-[11px] font-poppin-bold text-white">
                + Add
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* RESCUE TYPES SELECTOR */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-poppin-semibold text-gray-700 uppercase tracking-wider">
          Select Rescue Service
        </Text>
        <Text className="text-[11px] font-poppin text-gray-600">
          {selectedService === "tyre" || selectedService === "battery" || selectedService === "diagnostics"
            ? nearestMechanic
              ? `Mechanic: ${nearestMechanic.name.split(" ")[0]} (${nearestMechanic.distanceKm} km)`
              : ""
            : nearestPetrolStation
              ? `Petrol: ${nearestPetrolStation.name.split(" ")[0]} (${nearestPetrolStation.distanceKm} km)`
              : ""}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2.5 mb-4">
        {RESCUE_SERVICES.map((srv) => {
          const isSelected = selectedService === srv.id;
          const poiDistance =
            srv.id === "tyre" || srv.id === "battery" || srv.id === "diagnostics"
              ? nearestMechanic?.distanceKm || 3.0
              : nearestPetrolStation?.distanceKm || 3.0;
          const srvPrice = calculateDynamicRescuePrice(
            srv.id,
            2.8,
            poiDistance,
            {
              towDropoffDistanceKm:
                srv.id === "tow" && towDestination
                  ? towDestination.distanceKm
                  : undefined,
              fuelLitres: srv.id === "fuel" ? fuelLitres : undefined,
              fuelPricePerLitre:
                srv.id === "fuel" ? currentFuelOption.pricePerLitre : undefined,
              needsNewTyre:
                srv.id === "tyre" ? tyreAction === "new_tyre" : false,
            },
          );

          return (
            <TouchableOpacity
              key={srv.id}
              onPress={() => onSelectService(srv.id)}
              activeOpacity={0.8}
              style={{ width: "48%" }}
              className="p-2 rounded-2xl items-center justify-center relative bg-white"
            >
              {isSelected && (
                <View className="absolute top-2 right-2">
                  <Ionicons name="checkmark-circle" size={16} color="#101828" />
                </View>
              )}
              <View className=" rounded-xl items-center justify-center mb-0.5">
                <Image
                  source={srv.icon as any}
                  className="w-20 h-10"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs font-poppin-bold text-gray-900 text-center">
                {srv.title}
              </Text>
              <Text className="text-[9px] font-poppin text-gray-500 text-center">
                {srv.subtitle}
              </Text>
              <View
                className="w-full items-center mt-1.5"
              >
                <Text className="text-[11px] font-poppin-bold text-gray-900">
                  {srv.id === 'fuel' && !fuelPriceZone ? 'Choose fuel zone' : `From R${srvPrice.totalPrice.toFixed(2)}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* STEP 1 NEXT BUTTON */}
      <TouchableOpacity
        onPress={onContinue}
        activeOpacity={0.85}
        className="w-full py-3.5 bg-gray-900 rounded-2xl h-16 flex-row items-center justify-between px-5 mt-1"
      >
        <View>
          <Text className="text-sm font-poppin-bold text-white">
            Continue to specifications
          </Text>
        </View>
        <View className="flex-row items-center gap-1 py-1.5 px-3 rounded-xl">
          <Ionicons name="chevron-forward" size={14} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </>
  );
};
