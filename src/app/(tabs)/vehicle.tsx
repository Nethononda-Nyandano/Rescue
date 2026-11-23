import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Modal } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useUser } from "@clerk/expo";
import {
  deleteVehicleFromSupabase,
  getUserVehiclesFromSupabase,
  VehicleType,
} from "@/utils/vehicle";

const Vehicle = () => {
  const router = useRouter();
  const { user } = useUser();

  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleType | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const loadVehicles = useCallback(
    async (isPullToRefresh = false) => {
      if (!user?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!isPullToRefresh) setLoading(true);
      try {
        const { data, error } = await getUserVehiclesFromSupabase(user.id);
        if (error) {
          console.error("Error fetching vehicles:", error);
        } else {
          setVehicles(data || []);
        }
      } catch (e: any) {
        console.error("Exception fetching vehicles:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles(true);
  };

  const goToAddVehicle = () => {
    router.push("/crud_vehicle/add" as any);
  };

  const goToEditVehicle = (vehicle: VehicleType) => {
    const id = vehicle.id || vehicle.key;
    if (id) {
      router.push({
        pathname: "/crud_vehicle/edit" as any,
        params: { id, key: vehicle.key },
      });
    }
  };

  const executeDelete = async () => {
    if (!vehicleToDelete) return;
    const targetId = vehicleToDelete.id || vehicleToDelete.key;
    if (!targetId) return;

    try {
      setDeleting(true);
      const { success, error } = await deleteVehicleFromSupabase(targetId);
      if (success) {
        setVehicles((prev) => prev.filter((v) => (v.id || v.key) !== targetId));
        setVehicleToDelete(null);
      } else {
        setErrorModal(error?.message || "Failed to delete vehicle.");
      }
    } catch (e: any) {
      setErrorModal(e?.message || "An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <SafeAreaView style={{ flex: 1 }} className="bg-gray-50">
        {/* Top Bar */}
        <View className="flex-row justify-between items-center py-2 bg-gray-50 px-6">
          <View>
            <Text className="text-xl font-poppin-bold text-gray-800">
              My Vehicles
            </Text>
            <Text className="text-xs font-poppin text-gray-500">
              {vehicles.length}{" "}
              {vehicles.length === 1
                ? "vehicle registered"
                : "vehicles registered"}
            </Text>
          </View>
          <Image
            source={require("@/assets/images/logo4.png")}
            className="w-20 h-14"
            resizeMode="contain"
          />
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
          className="p-6 bg-gray-50"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d97706"
              colors={["#d97706"]}
            />
          }
        >
          {/* Quick Add Button Bar when vehicles exist */}
          {vehicles.length > 0 && (
            <TouchableOpacity
              onPress={goToAddVehicle}
              activeOpacity={0.8}
              className="flex-row items-center justify-between p-4 mb-4 bg-gray-900 rounded-2xl shadow-sm"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-gray-500/20 items-center justify-center">
                  <Ionicons name="add" size={22} color="#ffff" />
                </View>
                <View>
                  <Text className="text-sm font-poppin-semibold text-white">
                    Add Another Vehicle
                  </Text>
                  <Text className="text-xs font-poppin text-gray-400">
                    Speed up roadside rescue responses
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {/* Loading State */}
          {loading && !refreshing && (
            <View className="flex-1 items-center justify-center bg-gray-50">
              <StatusBar style="dark" />
              <Image
                source={require("@/assets/images/logo4.png")}
                className="w-32 h-20"
                resizeMode="contain"
              />
              <ActivityIndicator
                size="small"
                color="#111827"
                className="mt-4"
              />
            </View>
          )}

          {/* Empty State */}
          {!loading && vehicles.length === 0 && (
            <View className="p-6 items-center justify-center bg-white rounded-3xl my-auto">
              <View className="w-20 h-20 rounded-full items-center justify-center mb-4 ">
                <Ionicons name="car-outline" size={40} />
              </View>
              <Text className="text-xl font-poppin-semibold text-gray-900 mb-1 text-center">
                No Vehicles Found
              </Text>
              <Text className="text-xs font-poppin text-gray-400 text-center max-w-[240px] mb-6">
                Add a vehicle to speed up your rescue request match and
                emergency dispatch
              </Text>

              <TouchableOpacity
                onPress={goToAddVehicle}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 rounded-xl shadow-sm"
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text className="text-sm text-white font-poppin-semibold">
                  Add Your First Vehicle
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Vehicles List */}
          {!loading && vehicles.length > 0 && (
            <View className="gap-3">
              {vehicles.map((vehicle, index) => {
                const vehicleId =
                  vehicle.id || vehicle.key || `vehicle-${index}`;
                return (
                  <TouchableOpacity
                    key={vehicleId}
                    onPress={() => goToEditVehicle(vehicle)}
                    activeOpacity={0.7}
                    className="bg-white p-4 rounded-2xl shadow-sm flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3.5 flex-1 mr-2">
                      {/* Vehicle Image Thumbnail */}
                      <View className="w-28 h-16 overflow-hidden items-center justify-center">
                        {vehicle.avatar_url ? (
                          <Image
                            source={{ uri: vehicle.avatar_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="car" size={26} color="#9ca3af" />
                        )}
                      </View>

                      {/* Vehicle Info */}
                      <View className="flex-1">
                        <Text
                          className="font-poppin-bold text-gray-900 text-base"
                          numberOfLines={1}
                        >
                          {vehicle.make} {vehicle.model}
                        </Text>

                        <View className="flex gap-1 mt-0.5">
                          <View className="rounded-md">
                            <Text className="font-poppin-semibold text-xs text-gray-800 tracking-wider">
                              {vehicle.reg_no}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1.5">
                            <Text className="font-poppin text-xs text-gray-500">
                              {vehicle.year}
                            </Text>
                            {vehicle.color ? (
                              <>
                                <Text className="text-gray-300 text-xs">-</Text>
                                <Text className="font-poppin text-xs text-gray-600">
                                  {vehicle.color}
                                </Text>
                              </>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row items-center gap-1">
                      <View className="w-8 h-8 items-center justify-center">
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#9ca3af"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View className="flex-1 justify-end mt-8">
            {/* App Info */}
            <View className="items-center">
              <Text className="text-xs font-poppin text-gray-400">
                ResQ Vehicle Management
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={!!vehicleToDelete}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!deleting) setVehicleToDelete(null);
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 items-center shadow-2xl">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4 ">
                <Ionicons name="trash-outline" size={30} color="#dc2626" />
              </View>
              <Text className="text-xl font-poppin-bold text-gray-900 text-center mb-2">
                Delete Vehicle
              </Text>
              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                Are you sure you want to remove {vehicleToDelete?.make}{" "}
                {vehicleToDelete?.model} ({vehicleToDelete?.reg_no})?
              </Text>

              <View className="flex-row w-full space-x-3 gap-3">
                <TouchableOpacity
                  onPress={() => setVehicleToDelete(null)}
                  disabled={deleting}
                  activeOpacity={0.8}
                  className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-sm font-poppin-semibold text-gray-700">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={executeDelete}
                  disabled={deleting}
                  activeOpacity={0.8}
                  className="flex-1 py-3.5 bg-red-600 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-poppin-semibold text-white">
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Error Notice Modal */}
        <Modal
          visible={!!errorModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErrorModal(null)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 items-center shadow-2xl">
              <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-4 ">
                <Ionicons
                  name="alert-circle-outline"
                  size={30}
                  color="#dc2626"
                />
              </View>
              <Text className="text-lg font-poppin-bold text-gray-900 text-center mb-2">
                Operation Failed
              </Text>
              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                {errorModal}
              </Text>

              <TouchableOpacity
                onPress={() => setErrorModal(null)}
                activeOpacity={0.8}
                className="w-full py-3.5 bg-gray-900 rounded-xl items-center justify-center"
              >
                <Text className="text-sm font-poppin-semibold text-white">
                  Got It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default Vehicle;
