import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Modal } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  DEFAULT_FUEL_TYPES,
  deleteVehicleFromSupabase,
  fetchVehicleFuelTypes,
  getVehicleByIdFromSupabase,
  POPULAR_CAR_COLORS,
  updateVehicleInSupabase,
  VehicleType,
} from "@/utils/vehicle";

const Edit = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const vehicleParam = (params.id || params.key || "") as string;

  // Loading / Initial states
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleType | null>(
    null,
  );

  // Form states
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [regNo, setRegNo] = useState("");
  const [color, setColor] = useState("");
  const [fuelType, setFuelType] = useState("Petrol");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Dynamic API data
  const [fuelTypesList, setFuelTypesList] =
    useState<string[]>(DEFAULT_FUEL_TYPES);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modals
  const [modalInfo, setModalInfo] = useState<{
    title: string;
    message: string;
    isSuccess?: boolean;
  } | null>(null);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load existing vehicle data
  useEffect(() => {
    let isMounted = true;

    const loadVehicleData = async () => {
      if (!vehicleParam) {
        setInitialLoading(false);
        setModalInfo({
          title: "Not Found",
          message: "Vehicle information was not provided.",
          isSuccess: true,
        });
        return;
      }

      try {
        setInitialLoading(true);
        const { data, error } = await getVehicleByIdFromSupabase(vehicleParam);

        if (isMounted) {
          if (error || !data) {
            setModalInfo({
              title: "Vehicle Error",
              message: error?.message || "Could not load vehicle details.",
              isSuccess: true,
            });
          } else {
            setCurrentVehicle(data);
            setMake(data.make || "");
            setModel(data.model || "");
            setYear(data.year || "");
            setRegNo(data.reg_no || "");
            setColor(data.color || "");
            setFuelType(data.fuel_type || "Petrol");
            setAvatarUrl(data.avatar_url || "");

            // Preload fuel specs
            if (data.make) {
              fetchVehicleFuelTypes(data.make, data.model).then((fuels) => {
                if (isMounted && fuels.length > 0) setFuelTypesList(fuels);
              });
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setModalInfo({
            title: "Error",
            message: err?.message || "Failed to load vehicle data.",
          });
        }
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    loadVehicleData();

    return () => {
      isMounted = false;
    };
  }, [vehicleParam]);

  const handleUpdateVehicle = async () => {
    if (!make.trim() || !model.trim() || !year.trim() || !regNo.trim()) {
      setModalInfo({
        title: "Required Fields",
        message: "Please fill in Make, Model, Year, and Registration Number.",
      });
      return;
    }

    const targetId = currentVehicle?.id || currentVehicle?.key || vehicleParam;
    if (!targetId) {
      setModalInfo({
        title: "Error",
        message: "Vehicle ID not found.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await updateVehicleInSupabase(targetId, {
        id: currentVehicle?.id,
        make: make.trim(),
        model: model.trim(),
        year: year.trim(),
        reg_no: regNo.trim().toUpperCase(),
        color: color.trim(),
        fuel_type: fuelType,
        avatar_url:
          avatarUrl ||
          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
      });

      if (error || !data) {
        setModalInfo({
          title: "Update Failed",
          message:
            error?.message ||
            "Failed to update vehicle details. Please try again.",
        });
        return;
      }

      setModalInfo({
        title: "Vehicle Updated!",
        message: `${make} ${model} details have been successfully updated.`,
        isSuccess: true,
      });
    } catch (err: any) {
      setModalInfo({
        title: "Update Error",
        message:
          err?.message || "An error occurred while updating the vehicle.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async () => {
    const targetId = currentVehicle?.id || currentVehicle?.key || vehicleParam;
    if (!targetId) return;

    try {
      setDeleting(true);
      const { success, error } = await deleteVehicleFromSupabase(targetId);
      setShowDeleteModal(false);

      if (!success || error) {
        setModalInfo({
          title: "Delete Failed",
          message:
            error?.message ||
            "Could not delete this vehicle. Please try again.",
        });
        return;
      }

      setModalInfo({
        title: "Vehicle Removed",
        message: `${make || "Vehicle"} was removed from your garage.`,
        isSuccess: true,
      });
    } catch (err: any) {
      setShowDeleteModal(false);
      setModalInfo({
        title: "Delete Error",
        message: err?.message || "An unexpected error occurred during removal.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
          <View className="flex-row justify-between items-center py-2 bg-gray-50 px-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl items-center justify-center"
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text className="text-xl font-poppin-bold text-gray-800">
              Edit Vehicle
            </Text>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              className="w-10 h-10 rounded-xl items-center justify-center"
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center justify-center bg-gray-50">
            <StatusBar style="dark" />
            <Image
              source={require("@/assets/images/logo4.png")}
              className="w-32 h-20"
              resizeMode="contain"
            />
            <ActivityIndicator size="small" color="#111827" className="mt-4" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} className="bg-gray-50">
        {/* Top Bar */}
        <View className="flex-row justify-between items-center py-2 bg-gray-50 px-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-xl items-center justify-center"
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-poppin-bold text-gray-800">
            Edit Vehicle
          </Text>
          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            className="w-10 h-10 rounded-xl items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
          className="p-6 bg-gray-50"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Banner */}
          <View className="bg-white rounded-3xl p-4 mb-6 items-center">
            <View className="w-full flex-row items-center justify-between mb-2">
              <Text className="text-xs font-poppin-semibold text-gray-500 uppercase tracking-wider">
                Vehicle
              </Text>
            </View>

            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-44 rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-44 rounded-2xl bg-white items-center justify-center">
                <Ionicons name="car-outline" size={48} color="#9ca3af" />
                <Text className="text-xs font-poppin text-gray-500 mt-2">
                  No Image Assigned
                </Text>
              </View>
            )}
          </View>

          {/* Form Fields */}
          <View className="bg-white rounded-3xl p-5 gap-4 mb-6">
            <Text className="text-sm font-poppin-semibold text-gray-800">
              Vehicle Specifications
            </Text>

            {/* Make */}
            <View>
              <Text className="text-xs font-poppin text-gray-500 mb-1 ml-1">
                Make / Manufacturer
              </Text>
              <View className="w-full flex-row items-center rounded-2xl h-14 px-4 bg-gray-50/50">
                <Ionicons name="car-sport-outline" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 ml-3 h-full font-poppin text-gray-900 text-sm"
                  placeholder="e.g. Toyota, BMW"
                  placeholderTextColor="#9ca3af"
                  value={make}
                  onChangeText={setMake}
                />
              </View>
            </View>

            {/* Model */}
            <View>
              <Text className="text-xs font-poppin text-gray-500 mb-1 ml-1">
                Model
              </Text>
              <View className="w-full flex-row items-center rounded-2xl h-14 px-4 bg-gray-50/50">
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color="#6b7280"
                />
                <TextInput
                  className="flex-1 ml-3 h-full font-poppin text-gray-900 text-sm"
                  placeholder="e.g. Corolla, X5"
                  placeholderTextColor="#9ca3af"
                  value={model}
                  onChangeText={setModel}
                />
              </View>
            </View>

            {/* Year and Fuel Type Row */}
            <View className="flex-row gap-3">
              {/* Year */}
              <View className="flex-1">
                <Text className="text-xs font-poppin text-gray-500 mb-1 ml-1">
                  Year
                </Text>
                <View className="w-full flex-row items-center rounded-2xl h-14 px-3 bg-gray-50/50">
                  <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-2 h-full font-poppin text-gray-900 text-sm"
                    placeholder="2023"
                    placeholderTextColor="#9ca3af"
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>

              {/* Fuel Type */}
              <View className="flex-1">
                <Text className="text-xs font-poppin text-gray-500 mb-1 ml-1">
                  Fuel Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFuelModal(true)}
                  activeOpacity={0.7}
                  className="w-full flex-row items-center justify-between rounded-2xl h-14 px-3 bg-gray-50/50"
                >
                  <View className="flex-row items-center flex-1 mr-1">
                    <MaterialCommunityIcons
                      name="gas-station-outline"
                      size={20}
                      color="#6b7280"
                    />
                    <Text
                      className="ml-2 font-poppin text-gray-900 text-sm"
                      numberOfLines={1}
                    >
                      {fuelType}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Vehicle Color Selection (Compact) */}
            <View>
              <View className="flex-row items-center justify-between mb-1 ml-1">
                <Text className="text-xs font-poppin text-gray-500">Color</Text>
                {color ? (
                  <Text className="text-xs font-poppin-semibold text-gray-800">
                    {color}
                  </Text>
                ) : null}
              </View>
              <View className="w-full flex-row items-center rounded-2xl h-14 px-4 bg-gray-50/50 mb-2.5">
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color="#6b7280"
                />
                <TextInput
                  className="flex-1 ml-3 h-full font-poppin text-gray-900 text-sm"
                  placeholder="Choose or enter color (e.g. White, Black)"
                  placeholderTextColor="#9ca3af"
                  value={color}
                  onChangeText={setColor}
                />
                {color ? (
                  <TouchableOpacity onPress={() => setColor("")}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 8,
                  paddingHorizontal: 2,
                  paddingVertical: 2,
                }}
              >
                {POPULAR_CAR_COLORS.map((c) => {
                  const isSelected =
                    color.trim().toLowerCase() === c.name.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c.name}
                      onPress={() => setColor(c.name)}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: c.hex,
                        transform: [{ scale: isSelected ? 1.1 : 1 }],
                      }}
                      className="w-7 h-7 rounded-full items-center justify-center"
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={
                            ["White", "Silver"].includes(c.name)
                              ? "#111827"
                              : "#FFFFFF"
                          }
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Registration Number */}
            <View>
              <Text className="text-xs font-poppin text-gray-500 mb-1 ml-1">
                Registration / License Plate Number
              </Text>
              <View className="w-full flex-row items-center rounded-2xl h-14 px-4 bg-gray-50/50">
                <Ionicons name="card-outline" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 ml-3 h-full font-poppin text-gray-900 text-sm"
                  placeholder="e.g. CA 123-456"
                  placeholderTextColor="#9ca3af"
                  value={regNo}
                  onChangeText={setRegNo}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleUpdateVehicle}
              disabled={submitting}
              activeOpacity={0.8}
              className="w-full bg-gray-900 py-4 rounded-2xl items-center justify-center flex-row shadow-gray-900/20"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-poppin-semibold text-base ml-2">
                  Update Vehicle
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              disabled={submitting || deleting}
              activeOpacity={0.8}
              className="w-full bg-red-50 py-3.5 rounded-2xl items-center justify-center flex-row "
            >
              <Text className="text-red-600 font-poppin-semibold text-sm ml-2">
                Delete Vehicle
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Fuel Type Picker Modal */}
        <Modal
          visible={showFuelModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFuelModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-slate-800/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 shadow-2xl max-h-[70%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-poppin-bold text-gray-900">
                  Select Fuel Type
                </Text>
                <TouchableOpacity onPress={() => setShowFuelModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {fuelTypesList.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setFuelType(type);
                      setShowFuelModal(false);
                    }}
                    className={`flex-row items-center justify-between p-3.5 my-1 rounded-xl ${fuelType === type ? "bg-gray-100" : "bg-gray-50"}`}
                  >
                    <View className="flex-row items-center gap-3">
                      <MaterialCommunityIcons
                        name={
                          type.toLowerCase().includes("electric")
                            ? "lightning-bolt"
                            : "gas-station"
                        }
                        size={20}
                        color={fuelType === type ? "#1e2939" : "#6b7280"}
                      />
                      <Text
                        className={`font-poppin text-sm ${ fuelType === type ? "text-gray-900 font-poppin-semibold" : "text-gray-800" }`}
                      >
                        {type}
                      </Text>
                    </View>
                    {fuelType === type && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="green"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!deleting) setShowDeleteModal(false);
          }}
        >
          <View className="flex-1 justify-center items-center bg-gray-800/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 items-center shadow-2xl">
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4 ">
                <Ionicons name="trash-outline" size={30} color="#dc2626" />
              </View>
              <Text className="text-xl font-poppin-bold text-gray-900 text-center mb-2">
                Delete Vehicle
              </Text>
              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                Are you sure you want to remove {make} {model} ({regNo}) from
                your vehicles? This cannot be undone.
              </Text>

              <View className="flex-row w-full space-x-3 gap-3">
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  activeOpacity={0.8}
                  className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-sm font-poppin-semibold text-gray-700">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteVehicle}
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

        {/* Notice / Feedback Modal */}
        <Modal
          visible={!!modalInfo}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            const isSuccess = modalInfo?.isSuccess;
            setModalInfo(null);
            if (isSuccess) router.back();
          }}
        >
          <View className="flex-1 justify-center items-center bg-gray-800/60 px-6">
            <View className="w-full bg-white rounded-3xl p-6 items-center shadow-2xl">
              <View
                className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${modalInfo?.isSuccess ? "bg-emerald-50" : "bg-gray-50"}`}
              >
                <Ionicons
                  name={
                    modalInfo?.isSuccess
                      ? "checkmark-circle-outline"
                      : "information-circle-outline"
                  }
                  size={30}
                  color={modalInfo?.isSuccess ? "#059669" : "#d97706"}
                />
              </View>
              <Text className="text-lg font-poppin-bold text-gray-900 text-center mb-2">
                {modalInfo?.title}
              </Text>
              <Text className="text-sm font-poppin text-gray-500 text-center mb-6 leading-5">
                {modalInfo?.message}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const isSuccess = modalInfo?.isSuccess;
                  setModalInfo(null);
                  if (isSuccess) router.back();
                }}
                activeOpacity={0.8}
                className={`w-full py-3.5 rounded-xl items-center justify-center ${ modalInfo?.isSuccess ? "bg-emerald-600" : "bg-gray-900" }`}
              >
                <Text className="text-sm font-poppin-semibold text-white">
                  {modalInfo?.isSuccess ? "Continue" : "Got It"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default Edit;
