import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Image,
  Linking,
  ScrollView,
  Platform,
} from "react-native";
import { Alert } from "@/components/dialogNative";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";

import { useRouter, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { useUser } from "@clerk/expo";
import { fetchDrivingRoute } from "@/utils/googleMaps";
import type { DrivingRouteEstimate } from "@/utils/routeEstimate";
import {
  MapboxMapView,
  RescuerMapData,
  DestinationMapData,
  PoiMapData,
} from "@/components/MapboxMapView";
import { CardManagementModal } from "@/components/CardManagementModal";
import { VehicleSelectionModal } from "@/components/VehicleSelectionModal";
import { RescueChatModal } from "@/components/RescueChatModal";
import { Step1ServiceAndCar } from "@/components/booking/Step1ServiceAndCar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Step2Specifications } from "@/components/booking/Step2Specifications";
import { Step3PaymentAndConfirm } from "@/components/booking/Step3PaymentAndConfirm";
import { DestinationSearchModal } from "@/components/booking/DestinationSearchModal";
import {
  RESCUE_SERVICES,
  RescueType,
  PaymentMethod,
  PaymentCard,
  Rescuer,
  NearbyPOI,
  getUserPaymentCards,
  addPaymentCard,
  createRescueRequest,
  updateRescueRequestStatus,
  reverseGeocodeMapbox,
  calculateDynamicRescuePrice,
  calculateDistanceKm,
  fetchNearbyPOIs,
  fetchNearbyRegisteredMechanics,
  searchPlacesMapbox,
  fetchRescuerById,
  subscribeToRescueRequest,
  subscribeToRescuerLocation,
  getActiveClientRequest,
  getRescueRequestById,
} from "@/utils/rescueService";
import { getFuelOptions, isFuelPriceReferenceCurrent, type FuelPriceZone } from "@/utils/fuelPrices";
import {
  getUserVehiclesFromSupabase,
  VehicleType,
  fetchVehicleTyreSizes,
} from "@/utils/vehicle";
import { validateProblemDescription } from "@/utils/rescueRequestRules";
import { notifyRescueEvent, prepareRescueNotifications } from "@/utils/notificationService";
import { claimNotificationEvent } from "@/utils/notificationEvents";
import {
  chooseActiveVehicle,
  consumeDiagnosisBookingHandoff,
  shouldPromptForVehicleSelection,
  type DiagnosisBookingHandoff,
} from "@/utils/diagnosisBooking";

type RequestFlowState =
  | "SELECTING"
  | "CONFIRMING_PICKUP"
  | "FINDING_RESCUER"
  | "NO_RESCUER_FOUND"
  | "TRACKING"
  | "COMPLETED";

const POPULAR_TYRE_SIZES = [
  "205/55 R16",
  "195/65 R15",
  "225/45 R17",
  "215/60 R16",
  "Other",
];

export default function TabsIndex() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const insets = useSafeAreaInsets();

  // 3-step booking flow (1: Service & Car -> 2: Specifications -> 3: Payment & Confirm)
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);

  // Map & Location state
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>({
    latitude: -26.2041, // Default Johannesburg
    longitude: 28.0473,
  });
  const [address, setAddress] = useState<string>("Detecting location...");
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);

  // Nearby real POIs from Mapbox
  const [nearbyPetrolStations, setNearbyPetrolStations] = useState<NearbyPOI[]>(
    [],
  );
  const [nearbyMechanics, setNearbyMechanics] = useState<NearbyPOI[]>([]);

  // Flow state
  const [flowState, setFlowState] = useState<RequestFlowState>("SELECTING");
  const [jobStatus, setJobStatus] = useState<string>("en_route");

  // Rescue service & payment state
  const [selectedService, setSelectedService] = useState<RescueType>("tow");
  const [problemDescription, setProblemDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [savedCards, setSavedCards] = useState<PaymentCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // User vehicles state
  const [userVehicles, setUserVehicles] = useState<VehicleType[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(
    null,
  );
  const [showVehiclePromptModal, setShowVehiclePromptModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const hasPromptedVehicleRef = useRef(false);
  const promptedVehicleUserIdRef = useRef<string | null>(userId ?? null);
  const pendingDiagnosisBookingRef = useRef<DiagnosisBookingHandoff | null>(null);

  // 1. Tow Truck Specific State (Dropoff Destination)
  const [towDestination, setTowDestination] = useState<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  } | null>(null);
  const [destSearchQuery, setDestSearchQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState<
    {
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      distanceKm: number;
    }[]
  >([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestSearchModal, setShowDestSearchModal] = useState(false);

  // 2. Tyre Assist Specific State (Car API integration, Wheel position & Action)
  const [availableTyreSizes, setAvailableTyreSizes] =
    useState<string[]>(POPULAR_TYRE_SIZES);
  const [loadingTyreSizes, setLoadingTyreSizes] = useState<boolean>(false);
  const [tyreSize, setTyreSize] = useState<string>("205/55 R16");
  const [customTyreSize, setCustomTyreSize] = useState<string>("");
  const [hasSpareWheel, setHasSpareWheel] = useState<boolean>(true);
  const [selectedTyrePosition, setSelectedTyrePosition] =
    useState<string>("FL");
  const [tyreAction, setTyreAction] = useState<"spare" | "new_tyre" | "repair">(
    "spare",
  );

  // 3. Fuel Delivery Specific State
  const [selectedFuelType, setSelectedFuelType] = useState<string>("petrol_95");
  const [fuelLitres, setFuelLitres] = useState<number>(10);
  const [fuelPriceZone, setFuelPriceZone] = useState<FuelPriceZone | null>(null);

  // 4. Battery Rescue Specific State
  const [batteryAction, setBatteryAction] = useState<
    "jump_start" | "replace" | "diagnostics"
  >("jump_start");

  // Active Rescue & Rescuer state
  const [assignedRescuer, setAssignedRescuer] = useState<Rescuer | null>(null);
  const [routeEstimate, setRouteEstimate] = useState<DrivingRouteEstimate | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const activeRequestIdRef = useRef(activeRequestId);
  const [searchDots, setSearchDots] = useState<string>("");
  const requestUnsubRef = useRef<(() => void) | null>(null);
  const seenStatusNotificationEventsRef = useRef(new Set<string>());
  const rescuerUnsubRef = useRef<(() => void) | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rescuerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingActiveRef = useRef(false);
  const locationRef = useRef(location);
  const assignedRescuerRef = useRef(assignedRescuer);
  const pickupLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const routeRequestIdRef = useRef(0);

  useEffect(() => {
    locationRef.current = location;
    assignedRescuerRef.current = assignedRescuer;
    activeRequestIdRef.current = activeRequestId;
  }, [location, assignedRescuer, activeRequestId]);

  // Nearest Petrol Station (for Fuel / Tow depot) and Registered Mechanic calculations
  const nearestPetrolStation =
    nearbyPetrolStations.length > 0 ? nearbyPetrolStations[0] : null;

  const nearestMechanic =
    nearbyMechanics.length > 0 ? nearbyMechanics[0] : null;

  // Current Fuel config
  const fuelOptions = getFuelOptions(fuelPriceZone);
  const currentFuelOption =
    fuelOptions.find((f) => f.id === selectedFuelType) || fuelOptions[0];

  // Dynamic price calculation
  const effectiveTyreSize =
    tyreSize === "Other" && customTyreSize.trim()
      ? customTyreSize.trim()
      : tyreSize;
  const dynamicPriceInfo = calculateDynamicRescuePrice(
    selectedService,
    assignedRescuer?.distance_km || 2.8,
    selectedService === "tyre" || selectedService === "battery" || selectedService === "diagnostics"
      ? nearestMechanic?.distanceKm || 3.0
      : nearestPetrolStation?.distanceKm || 3.0,
    {
      towDropoffDistanceKm:
        selectedService === "tow" && towDestination
          ? towDestination.distanceKm
          : undefined,
      fuelLitres: selectedService === "fuel" ? fuelLitres : undefined,
      fuelPricePerLitre:
        selectedService === "fuel"
          ? currentFuelOption.pricePerLitre
          : undefined,
      needsNewTyre:
        selectedService === "tyre" ? tyreAction === "new_tyre" : false,
      needsNewBattery:
        selectedService === "battery" ? batteryAction === "replace" : false,
      batteryAction: selectedService === "battery" ? batteryAction : undefined,
    },
  );

  // Load Tyre Sizes for vehicle using the Car / Tyre API & database
  const loadTyreSizesForVehicle = useCallback(
    async (vehicle: VehicleType | null) => {
      if (!vehicle) {
        setAvailableTyreSizes(POPULAR_TYRE_SIZES);
        return;
      }
      setLoadingTyreSizes(true);
      try {
        const sizes = await fetchVehicleTyreSizes(
          vehicle.make,
          vehicle.model,
          vehicle.year,
        );
        if (sizes && sizes.length > 0) {
          const listWithOther = Array.from(new Set([...sizes, "Other"]));
          setAvailableTyreSizes(listWithOther);
          setTyreSize(sizes[0]);
        } else {
          setAvailableTyreSizes(POPULAR_TYRE_SIZES);
        }
      } catch {
        setAvailableTyreSizes(POPULAR_TYRE_SIZES);
      } finally {
        setLoadingTyreSizes(false);
      }
    },
    [],
  );

  // Auto-detect fuel type helper and trigger tyre size load from vehicle
  const updateVehicleAndFuel = useCallback(
    (vehicle: VehicleType | null) => {
      setSelectedVehicle(vehicle);
      if (vehicle?.id || vehicle?.key) {
        AsyncStorage.setItem(
          "@resq_active_vehicle_id",
          vehicle.id || vehicle.key || "",
        ).catch(() => {});
      }
      if (vehicle?.fuel_type) {
        const ftype = vehicle.fuel_type.toLowerCase();
        if (ftype.includes("diesel")) {
          setSelectedFuelType("diesel_50ppm");
        } else if (ftype.includes("93")) {
          setSelectedFuelType("petrol_93");
        } else {
          setSelectedFuelType("petrol_95");
        }
      }
      loadTyreSizesForVehicle(vehicle);
    },
    [loadTyreSizesForVehicle],
  );

  // Fetch user vehicles from Supabase
  const loadUserVehicles = useCallback(
    async () => {
      if (!userId) return;
      try {
        const { data, error } = await getUserVehiclesFromSupabase(userId);
        if (error) {
          console.warn("Error fetching user vehicles:", error);
          return;
        }

        const handoff =
          pendingDiagnosisBookingRef.current ||
          consumeDiagnosisBookingHandoff(userId);
        if (data && data.length > 0) {
          setUserVehicles(data);
          const savedVehId = await AsyncStorage.getItem(
            "@resq_active_vehicle_id",
          ).catch(() => null);
          const activeVeh = chooseActiveVehicle(data, savedVehId) || data[0];
          updateVehicleAndFuel(activeVeh);

          if (handoff) {
            pendingDiagnosisBookingRef.current = null;
            if (activeRequestIdRef.current) {
              Alert.alert(
                "Rescue already in progress",
                "Your current rescue request is active. Finish or cancel it before starting another request.",
              );
              return;
            }
            const activeRequest = await getActiveClientRequest(userId);
            if (activeRequest?.id || activeRequestIdRef.current) {
              Alert.alert(
                "Rescue already in progress",
                "Your current rescue request is active. Finish or cancel it before starting another request.",
              );
              return;
            }
            setSelectedService(handoff.service);
            setProblemDescription(handoff.problemDescription);
            setBookingStep(2);
            setFlowState("SELECTING");
          }

          if (
            shouldPromptForVehicleSelection(data.length) &&
            !hasPromptedVehicleRef.current
          ) {
            hasPromptedVehicleRef.current = true;
            setShowVehiclePromptModal(true);
          } else if (!shouldPromptForVehicleSelection(data.length)) {
            setShowVehiclePromptModal(false);
          }
        } else {
          setUserVehicles([]);
          setSelectedVehicle(null);
          setShowVehiclePromptModal(false);
          if (handoff) {
            pendingDiagnosisBookingRef.current = handoff;
            Alert.alert(
              "Add a vehicle to continue",
              "Your selected assistance and typed symptoms are saved. Add a vehicle to continue with the request.",
              [
                {
                  text: "Add Vehicle",
                  onPress: () => router.push("/crud_vehicle/add" as any),
                },
                { text: "Later", style: "cancel" },
              ],
            );
          }
        }
      } catch (e) {
        console.warn("Error fetching user vehicles:", e);
      }
    },
    [userId, updateVehicleAndFuel, router],
  );

  useEffect(() => {
    if (promptedVehicleUserIdRef.current !== (userId ?? null)) {
      promptedVehicleUserIdRef.current = userId ?? null;
      hasPromptedVehicleRef.current = false;
      pendingDiagnosisBookingRef.current = null;
    }
  }, [userId]);

  // Load vehicles and prompt once when each authenticated user opens the dashboard.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        void loadUserVehicles();
      }
    }, [userId, loadUserVehicles]),
  );

  // Fetch closest registered mechanics for mechanic service, and closest Mapbox POIs for fuel/tow
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [gasPOIs, registeredMechanics] = await Promise.all([
          fetchNearbyPOIs(location.latitude, location.longitude, "gas_station"),
          fetchNearbyRegisteredMechanics(location.latitude, location.longitude),
        ]);
        if (isMounted) {
          setNearbyPetrolStations(gasPOIs || []);
          setNearbyMechanics(registeredMechanics || []);
        }
      } catch (err) {
        console.warn(
          "Error fetching nearby POIs and registered mechanics:",
          err,
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [location.latitude, location.longitude]);

  // Searching Radar Animation
  const [pulseAnim1] = useState(() => new Animated.Value(0));
  const [pulseAnim2] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (flowState === "FINDING_RESCUER") {
      const createPulse = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2200,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const a1 = createPulse(pulseAnim1, 0);
      const a2 = createPulse(pulseAnim2, 800);

      a1.start();
      a2.start();

      const interval = setInterval(() => {
        setSearchDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);

      return () => {
        a1.stop();
        a2.stop();
        clearInterval(interval);
      };
    }
  }, [flowState, pulseAnim1, pulseAnim2]);

  const stopSearchWatchers = useCallback(() => {
    if (requestUnsubRef.current) {
      requestUnsubRef.current();
      requestUnsubRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopRescuerWatch = useCallback(() => {
    if (rescuerUnsubRef.current) {
      rescuerUnsubRef.current();
      rescuerUnsubRef.current = null;
    }
    if (rescuerPollRef.current) {
      clearInterval(rescuerPollRef.current);
      rescuerPollRef.current = null;
    }
    trackingActiveRef.current = false;
  }, []);

  const attachRescuerTracking = useCallback(
    (rescuer: Rescuer) => {
      stopRescuerWatch();
      const coords = pickupLocationRef.current || locationRef.current;
      const distance_km = calculateDistanceKm(
        coords.latitude,
        coords.longitude,
        rescuer.current_latitude,
        rescuer.current_longitude,
      );
      const pricing = calculateDynamicRescuePrice(
        selectedService,
        distance_km,
        distance_km,
      );
      setAssignedRescuer({
        ...rescuer,
        distance_km,
        calculated_price: pricing.totalPrice,
      });
      setRouteEstimate(null);
      setIsRouteLoading(true);
      setFlowState("TRACKING");
      trackingActiveRef.current = true;

      const applyLiveRescuer = (live: Rescuer) => {
        const latest = pickupLocationRef.current || locationRef.current;
        const liveDist = calculateDistanceKm(
          latest.latitude,
          latest.longitude,
          live.current_latitude,
          live.current_longitude,
        );
        setAssignedRescuer((prev) => ({
          ...(prev || live),
          ...live,
          distance_km: liveDist,
        }));
      };

      rescuerUnsubRef.current = subscribeToRescuerLocation(
        rescuer.id,
        applyLiveRescuer,
      );
      rescuerPollRef.current = setInterval(async () => {
        const live = await fetchRescuerById(rescuer.id);
        if (live) applyLiveRescuer(live);
      }, 2500);
    },
    [selectedService, stopRescuerWatch],
  );

  useEffect(() => {
    if (flowState !== "TRACKING" || !assignedRescuer?.id) {
      return;
    }

    let cancelled = false;
    let requestInFlight = false;
    const updateRoadRoute = async () => {
      if (requestInFlight) return;
      const rescuer = assignedRescuerRef.current;
      const pickup = pickupLocationRef.current;
      if (
        !rescuer ||
        !pickup ||
        !Number.isFinite(rescuer.current_latitude) ||
        !Number.isFinite(rescuer.current_longitude)
      ) {
        setRouteEstimate(null);
        setIsRouteLoading(false);
        return;
      }

      requestInFlight = true;
      const requestId = ++routeRequestIdRef.current;
      setIsRouteLoading(true);
      try {
        const route = await fetchDrivingRoute(
          rescuer.current_latitude,
          rescuer.current_longitude,
          pickup.latitude,
          pickup.longitude,
        );
        if (!cancelled && requestId === routeRequestIdRef.current) {
          setRouteEstimate(route);
        }
      } catch (error) {
        console.warn("Could not calculate the rescuer's road route:", error);
        if (!cancelled && requestId === routeRequestIdRef.current) setRouteEstimate(null);
      } finally {
        requestInFlight = false;
        if (!cancelled && requestId === routeRequestIdRef.current) setIsRouteLoading(false);
      }
    };

    void updateRoadRoute();
    const interval = setInterval(() => void updateRoadRoute(), 30000);
    return () => {
      cancelled = true;
      routeRequestIdRef.current += 1;
      clearInterval(interval);
    };
  }, [flowState, assignedRescuer?.id]);

  const handleAcceptedRequest = useCallback(
    async (request: {
      id?: string;
      rescuer_id?: string | null;
      status?: string;
      pickup_latitude?: number;
      pickup_longitude?: number;
    }) => {
      if (
        Number.isFinite(request.pickup_latitude) &&
        Number.isFinite(request.pickup_longitude)
      ) {
        pickupLocationRef.current = {
          latitude: Number(request.pickup_latitude),
          longitude: Number(request.pickup_longitude),
        };
      }
      const acceptedStatuses = [
        "assigned",
        "en_route",
        "arrived",
        "in_progress",
      ];
      if (request.status === "completed") {
        setJobStatus("completed");
        setFlowState("COMPLETED");
        stopRescuerWatch();
        return true;
      }
      if (
        !request.rescuer_id ||
        !acceptedStatuses.includes(request.status || "")
      ) {
        return false;
      }
      if (trackingActiveRef.current) {
        setJobStatus(request.status || "en_route");
        return true;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setJobStatus(request.status || "en_route");
      const rescuer = await fetchRescuerById(request.rescuer_id);
      if (rescuer) {
        attachRescuerTracking(rescuer);
        if (request.id) {
          pollRef.current = setInterval(async () => {
            const row = await getRescueRequestById(request.id as string);
            if (!row) return;
            if (row.status === "arrived" || row.status === "in_progress") {
              setJobStatus(row.status);
            }
            if (row.status === "completed") {
              setJobStatus("completed");
              setFlowState("COMPLETED");
              stopRescuerWatch();
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            }
            if (row.status === "cancelled") {
              setFlowState("SELECTING");
              setAssignedRescuer(null);
              setActiveRequestId(null);
              stopRescuerWatch();
            }
          }, 3000);
        }
        return true;
      }
      return false;
    },
    [attachRescuerTracking, stopRescuerWatch],
  );

  // Draggable bottom sheet animation state
  const [translateY] = useState(() => new Animated.Value(0));
  const currentTranslateY = useRef(0);
  const dragStartY = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(480);
  const collapsedOffsetRef = useRef(320);

  const COLLAPSED_OFFSET = Math.max(
    180,
    sheetHeight - Math.max(insets.bottom, 16) - 120,
  );

  useEffect(() => {
    collapsedOffsetRef.current = COLLAPSED_OFFSET;
  }, [COLLAPSED_OFFSET]);

  useEffect(() => {
    const id = translateY.addListener((state) => {
      currentTranslateY.current = state.value;
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  const snapTo = useCallback(
    (toValue: number, velocity?: number) => {
      const maxOffset = collapsedOffsetRef.current;
      const target = Math.max(0, Math.min(maxOffset, toValue));
      Animated.spring(translateY, {
        toValue: target,
        velocity: velocity,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start(() => {
        setIsCollapsed(target > maxOffset / 2);
      });
    },
    [translateY],
  );

  const toggleSheet = () => {
    const maxOffset = collapsedOffsetRef.current;
    if (currentTranslateY.current > maxOffset / 2) {
      snapTo(0);
    } else {
      snapTo(maxOffset);
    }
  };

  const [panResponder, setPanResponder] = useState<any>(null);

  useEffect(() => {
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        dragStartY.current = currentTranslateY.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const maxOffset = collapsedOffsetRef.current;
        const nextVal = Math.max(
          0,
          Math.min(maxOffset, dragStartY.current + gestureState.dy),
        );
        translateY.setValue(nextVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxOffset = collapsedOffsetRef.current;
        const currentPos = currentTranslateY.current;
        const vy = gestureState.vy;

        if (vy > 0.4) {
          snapTo(maxOffset, vy);
        } else if (vy < -0.4) {
          snapTo(0, vy);
        } else {
          if (currentPos > maxOffset / 2) {
            snapTo(maxOffset);
          } else {
            snapTo(0);
          }
        }
      },
    });
    setPanResponder(pr);
  }, [translateY, snapTo]);

  // Request Location Permission and fetch current location
  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoadingLocation(false);
        setAddress("Location permission denied. Showing default area.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(newCoords);

      // Reverse geocode
      const addr = await reverseGeocodeMapbox(
        newCoords.latitude,
        newCoords.longitude,
      );
      setAddress(addr);
    } catch (err) {
      console.warn("Error fetching user location:", err);
      if (location?.latitude && location?.longitude) {
        try {
          const addr = await reverseGeocodeMapbox(
            location.latitude,
            location.longitude,
          );
          if (addr) setAddress(addr);
        } catch {
          setAddress(`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
        }
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    if (user?.id) void prepareRescueNotifications();
  }, [user?.id]);

  // Load initial data (Location, User Cards, Vehicles)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted" && isMounted) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted) {
            const newCoords = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
            setLocation(newCoords);
            const addr = await reverseGeocodeMapbox(
              newCoords.latitude,
              newCoords.longitude,
            );
            if (isMounted) setAddress(addr);
          }
        }
      } catch (err) {
        console.warn("Initial location error:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopSearchWatchers();
      stopRescuerWatch();
    };
  }, [stopSearchWatchers, stopRescuerWatch]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const active = await getActiveClientRequest(userId);
      if (cancelled || !active?.id) return;
      setActiveRequestId(active.id);
      const accepted = await handleAcceptedRequest(active);
      if (
        !accepted &&
        (active.status === "searching" || active.status === "pending")
      ) {
        setFlowState("FINDING_RESCUER");
        requestUnsubRef.current = subscribeToRescueRequest(
          active.id,
          (updated) => {
            handleAcceptedRequest(updated);
            if (
              updated.status === "arrived" ||
              updated.status === "in_progress"
            ) {
              setJobStatus(updated.status);
            }
            if (updated.status === "completed") {
              setJobStatus("completed");
              setFlowState("COMPLETED");
              stopRescuerWatch();
            }
            if (updated.status === "no_driver_found")
              setFlowState("NO_RESCUER_FOUND");
            if (updated.status === "cancelled") {
              setFlowState("SELECTING");
              setActiveRequestId(null);
              stopRescuerWatch();
            }
          },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, handleAcceptedRequest, stopRescuerWatch]);

  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      getUserPaymentCards(user.id).then(({ data }) => {
        if (isMounted && data && data.length > 0) {
          setSavedCards(data);
          setSelectedCard(data[0]);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleContinueFromStep1 = () => {
    if (!selectedVehicle) {
      Alert.alert(
        "Vehicle Required",
        "Please add and select a vehicle to proceed with your rescue request.",
        [
          {
            text: "Add Vehicle",
            onPress: () => router.push("/crud_vehicle/add" as any),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }
    setBookingStep(2);
  };

  const handleContinueFromStep2 = () => {
    if (selectedService === "fuel" && !fuelPriceZone) {
      Alert.alert("Fuel price zone required", "Choose whether the delivery will use inland or coastal reference prices.");
      return;
    }
    if (selectedService === "fuel" && !isFuelPriceReferenceCurrent()) {
      Alert.alert("Fuel prices need updating", "The published monthly reference has expired. Please try again after current fuel prices are updated.");
      return;
    }
    const descriptionError = validateProblemDescription(selectedService, problemDescription);
    if (descriptionError) {
      Alert.alert("Problem description required", descriptionError);
      return;
    }
    if (selectedService === "tow" && !towDestination) {
      Alert.alert(
        "Drop-off destination required",
        "Search and select where the vehicle should be towed.",
      );
      setShowDestSearchModal(true);
      return;
    }
    setBookingStep(3);
  };

  const handleAddNewCard = async (newCardData: {
    card_holder_name: string;
    card_number_last4: string;
    card_brand: string;
    expiry_month: string;
    expiry_year: string;
  }): Promise<boolean> => {
    if (!user?.id) return false;
    const { data, error } = await addPaymentCard({
      user_id: user.id,
      ...newCardData,
      is_default: savedCards.length === 0,
    });

    if (error || !data) {
      return false;
    }

    const updated = [data, ...savedCards];
    setSavedCards(updated);
    setSelectedCard(data);
    setPaymentMethod("card");
    return true;
  };

  const handleSelectCard = (card: PaymentCard) => {
    setSelectedCard(card);
    setPaymentMethod("card");
  };

  const destSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Destination search debounce for Tow (Google Places Autocomplete)
  const handleSearchDestination = (text: string) => {
    setDestSearchQuery(text);
    if (destSearchTimerRef.current) {
      clearTimeout(destSearchTimerRef.current);
    }
    if (text.trim().length < 2) {
      setDestSuggestions([]);
      setIsSearchingDest(false);
      return;
    }
    setIsSearchingDest(true);
    destSearchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchPlacesMapbox(
          text,
          location.latitude,
          location.longitude,
        );
        setDestSuggestions(results);
      } catch (e) {
        console.warn("Search places error:", e);
      } finally {
        setIsSearchingDest(false);
      }
    }, 280);
  };

  // Wait for a real mechanic to accept — never auto-assign mock/nearby drivers
  const handleStartFindingRescuer = async () => {
    if (!user?.id) return;
    if (selectedService === "fuel" && (!fuelPriceZone || !isFuelPriceReferenceCurrent())) {
      Alert.alert(
        "Current fuel price required",
        fuelPriceZone
          ? "The published monthly fuel price reference has expired. Please try again once updated prices are available."
          : "Choose inland or coastal fuel pricing before confirming this request.",
      );
      return;
    }
    stopSearchWatchers();
    stopRescuerWatch();
    setAssignedRescuer(null);
    setFlowState("FINDING_RESCUER");
    snapTo(0);

    try {
      pickupLocationRef.current = {
        latitude: locationRef.current.latitude,
        longitude: locationRef.current.longitude,
      };
      const { data: requestRecord } = await createRescueRequest({
        user_id: user.id,
        vehicle_id: selectedVehicle?.id,
        rescue_type: selectedService,
        notes: problemDescription.trim() || undefined,
        payment_method: paymentMethod,
        card_id: paymentMethod === "card" ? selectedCard?.id : null,
        card_details:
          paymentMethod === "card" && selectedCard
            ? {
                card_holder_name: selectedCard.card_holder_name,
                card_number_last4: selectedCard.card_number_last4,
                card_brand: selectedCard.card_brand,
              }
            : null,
        pickup_latitude: location.latitude,
        pickup_longitude: location.longitude,
        pickup_address: address,
        destination_latitude:
          selectedService === "tow" && towDestination
            ? towDestination.latitude
            : null,
        destination_longitude:
          selectedService === "tow" && towDestination
            ? towDestination.longitude
            : null,
        destination_address:
          selectedService === "tow" && towDestination
            ? towDestination.address
            : null,
        distance_km: dynamicPriceInfo.rescuerDistanceKm,
        garage_distance_km: dynamicPriceInfo.garageDistanceKm,
        fuel_type: selectedService === "fuel" ? currentFuelOption.name : null,
        fuel_litres: selectedService === "fuel" ? fuelLitres : null,
        fuel_price_per_litre:
          selectedService === "fuel" ? currentFuelOption.pricePerLitre : null,
        service_details: selectedService === "fuel" && fuelPriceZone
          ? {
              fuel_price_zone: fuelPriceZone,
              fuel_price_reference_effective_from: "2026-11-04",
            }
          : null,
        tyre_size: selectedService === "tyre" ? effectiveTyreSize : null,
        has_spare_wheel: selectedService === "tyre" ? hasSpareWheel : true,
        needs_new_tyre:
          selectedService === "tyre" ? tyreAction === "new_tyre" : false,
        tyre_position: selectedService === "tyre" ? selectedTyrePosition : null,
        battery_action: selectedService === "battery" ? batteryAction : null,
        nearest_poi_name:
          selectedService === "tyre" || selectedService === "battery" || selectedService === "diagnostics"
            ? nearestMechanic?.name || null
            : nearestPetrolStation?.name || null,
        nearest_poi_type:
          selectedService === "tyre" || selectedService === "battery" || selectedService === "diagnostics"
            ? "mechanic"
            : "gas_station",
        estimated_price: dynamicPriceInfo.totalPrice,
        status: "searching",
        rescuer_id: null,
      });

      if (!requestRecord?.id) {
        setFlowState("NO_RESCUER_FOUND");
        return;
      }

      setActiveRequestId(requestRecord.id);

      const watchRequest = async (incoming?: {
        id?: string;
        rescuer_id?: string | null;
        status?: string;
      }) => {
        const snapshot = incoming || requestRecord;
        const statusMessages: Record<string, { title: string; body: string }> = {
          assigned: {
            title: "A mechanic accepted your request",
            body: "Your mechanic is preparing to travel to the pickup location.",
          },
          en_route: {
            title: "Your mechanic is on the way",
            body: "A mechanic is travelling to your pickup location.",
          },
          arrived: {
            title: "Your mechanic has arrived",
            body: "Your mechanic is at the pickup location.",
          },
          in_progress: {
            title: "Rescue in progress",
            body: "Your mechanic has started working on your vehicle.",
          },
          completed: {
            title: "Rescue completed",
            body: "Your mechanic marked the rescue as complete.",
          },
          cancelled: {
            title: "Rescue request cancelled",
            body: "The active rescue request was cancelled.",
          },
        };
        const notification = snapshot.status ? statusMessages[snapshot.status] : null;
        const requestId = snapshot.id || requestRecord.id;
        if (
          notification &&
          requestId &&
          claimNotificationEvent(
            seenStatusNotificationEventsRef.current,
            `${requestId}:${snapshot.status}`,
          )
        ) {
          void notifyRescueEvent(
            `${requestId}:${snapshot.status}`,
            notification.title,
            selectedService === "diagnostics"
              ? `All-rounder mechanic update: ${notification.body}`
              : notification.body,
          );
        }
        if (snapshot.status === "cancelled") {
          stopSearchWatchers();
          setFlowState("SELECTING");
          setActiveRequestId(null);
          return;
        }
        if (snapshot.status === "no_driver_found") {
          stopSearchWatchers();
          setFlowState("NO_RESCUER_FOUND");
          return;
        }
        await handleAcceptedRequest(snapshot);
      };

      requestUnsubRef.current = subscribeToRescueRequest(
        requestRecord.id,
        (updated) => {
          watchRequest(updated);
          if (
            updated.status === "arrived" ||
            updated.status === "in_progress"
          ) {
            setJobStatus(updated.status);
          }
          if (updated.status === "completed") {
            setJobStatus("completed");
            setFlowState("COMPLETED");
            stopRescuerWatch();
            stopSearchWatchers();
          }
        },
      );

      if (requestRecord?.id) {
        pollRef.current = setInterval(async () => {
          const data = await getRescueRequestById(requestRecord.id!);
          if (data) {
            await watchRequest(data);
          }
        }, 3000);

        searchTimeoutRef.current = setTimeout(async () => {
          const row = await getRescueRequestById(requestRecord.id!);
          if (
            row &&
            (row.status === "searching" || row.status === "pending") &&
            !row.rescuer_id
          ) {
            await updateRescueRequestStatus(requestRecord.id!, "no_driver_found");
            stopSearchWatchers();
            setFlowState("NO_RESCUER_FOUND");
          }
        }, 180000);
      }
    } catch (err) {
      console.error("Error finding rescuer:", err);
      setFlowState("NO_RESCUER_FOUND");
    }
  };

  // Cancel Active Search or Request
  const handleCancelRequest = () => {
    Alert.alert(
      "Cancel Rescue Request",
      "Are you sure you want to cancel this rescue request?",
      [
        { text: "No, Keep", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            stopSearchWatchers();
            stopRescuerWatch();
            if (activeRequestId) {
              await updateRescueRequestStatus(activeRequestId, "cancelled");
            }
            setFlowState("SELECTING");
            setAssignedRescuer(null);
            setActiveRequestId(null);
          },
        },
      ],
    );
  };

  const activeService =
    RESCUE_SERVICES.find((s) => s.id === selectedService) || RESCUE_SERVICES[0];

  const rescuerMapData: RescuerMapData | null = useMemo(() => {
    if (!assignedRescuer) return null;
    return {
      latitude: assignedRescuer.current_latitude,
      longitude: assignedRescuer.current_longitude,
      name: assignedRescuer.full_name,
      vehiclePlate: assignedRescuer.vehicle_plate,
      heading: assignedRescuer.heading,
    };
  }, [assignedRescuer]);

  const destinationMapData: DestinationMapData | null = useMemo(() => {
    if (selectedService === "tow" && towDestination) {
      return {
        latitude: towDestination.latitude,
        longitude: towDestination.longitude,
        name: towDestination.name,
        address: towDestination.address,
      };
    }
    if (selectedService === "fuel" && nearestPetrolStation) {
      return {
        latitude: nearestPetrolStation.latitude,
        longitude: nearestPetrolStation.longitude,
        name: nearestPetrolStation.name,
        address: nearestPetrolStation.address,
      };
    }
    return null;
  }, [selectedService, towDestination, nearestPetrolStation]);

  const poiMapData: PoiMapData | null = useMemo(() => {
    if (selectedService === "tyre" || selectedService === "diagnostics") {
      return nearestMechanic
        ? {
            latitude: nearestMechanic.latitude,
            longitude: nearestMechanic.longitude,
            name: nearestMechanic.name,
            category: "mechanic",
          }
        : null;
    }
    return nearestPetrolStation
      ? {
          latitude: nearestPetrolStation.latitude,
          longitude: nearestPetrolStation.longitude,
          name: nearestPetrolStation.name,
          category: "gas_station",
        }
      : null;
  }, [selectedService, nearestMechanic, nearestPetrolStation]);

  const poisMapData: PoiMapData[] = useMemo(() => {
    if (selectedService === "tyre" || selectedService === "diagnostics") {
      return nearbyMechanics.map((m) => ({
        latitude: m.latitude,
        longitude: m.longitude,
        name: m.name,
        category: "mechanic" as const,
      }));
    }
    return nearbyPetrolStations.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      name: p.name,
      category: "gas_station" as const,
    }));
  }, [selectedService, nearbyMechanics, nearbyPetrolStations]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar
        style="dark"
      />

      {/* FULLSCREEN MAP */}
      <View className="absolute inset-0">
        <MapboxMapView
          latitude={location.latitude}
          longitude={location.longitude}
          zoom={flowState === "TRACKING" ? 14 : 15}
          rescuer={flowState === "TRACKING" ? rescuerMapData : null}
          destination={destinationMapData}
          poi={poiMapData}
          pois={poisMapData}
          showRoute={flowState === "TRACKING" || !!destinationMapData}
          followVehicle={flowState === "TRACKING"}
        />
      </View>

      {/* TOP FLOATING BAR */}
      <SafeAreaView
        edges={["top"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <View
          className="px-5 pt-2 flex-row justify-between items-center"
          pointerEvents="box-none"
        >
          {/* Status Pill during Finding or Tracking */}
          {flowState === "FINDING_RESCUER" && (
            <View className="bg-gray-800 py-1.5 px-3.5 rounded-full flex-row items-center gap-1.5 shadow-md">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-xs font-poppin-semibold text-white">
                Searching nearby units...
              </Text>
            </View>
          )}

          {flowState === "TRACKING" && assignedRescuer && (
            <View className="bg-gray-800 py-1.5 px-3.5 rounded-full flex-row items-center gap-1.5 shadow-md">
              <View className="w-2 h-2 rounded-full bg-emerald-200" />
              <Text className="text-xs font-poppin-semibold text-white">
                {jobStatus === "arrived"
                  ? "Rescuer has arrived"
                  : jobStatus === "in_progress"
                    ? "Rescue in progress"
                    : routeEstimate
                      ? `En Route • ${routeEstimate.durationMinutes} min`
                      : isRouteLoading
                        ? "En Route • calculating ETA…"
                        : "En Route • ETA unavailable"}
              </Text>
            </View>
          )}

          {flowState !== "FINDING_RESCUER" && flowState !== "TRACKING" && (
            <View />
          )}

          {/* Recenter / Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push("/diagnosis" as any)}
              activeOpacity={0.8}
              accessibilityLabel="Open AI vehicle diagnosis"
              className="h-11 bg-white/95 rounded-2xl px-3 flex-row items-center justify-center gap-2 shadow-sm"
            >
              <Ionicons name="medkit-outline" size={18} color="#111827" />
              <Text className="font-poppin-semibold text-xs text-gray-900">AI Diagnosis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={fetchCurrentLocation}
              activeOpacity={0.8}
              className="w-11 h-11 bg-white/95 rounded-2xl items-center justify-center shadow-sm"
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Ionicons name="navigate" size={19} color="#111827" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* BOTTOM SHEET VIEW (DRAGGABLE) */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-4xl shadow-2xl "
        style={{
          paddingBottom: Math.max(insets.bottom, 16),
          maxHeight: "88%",
          transform: [{ translateY }],
        }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 100) {
            setSheetHeight(h);
          }
        }}
      >
        {/* Drag handle header area */}
        <View
          {...(panResponder?.panHandlers || {})}
          className="items-center pt-3 pb-1"
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleSheet}
            className="py-1 px-8 items-center"
          >
            <View className="w-12 h-1.5 bg-gray-300 rounded-full mb-1" />
            <Ionicons
              name={isCollapsed ? "chevron-up" : "chevron-down"}
              size={14}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 1. SELECTING STAGE: 3-Step Wizard                            */}
        {/* Step 1: Choose Service & Car                                */}
        {/* Step 2: Service Specifications                              */}
        {/* Step 3: Payment Method & Confirmation                       */}
        {/* ============================================================ */}
        {flowState === "SELECTING" && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={{ flexShrink: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              className="px-5 pt-1"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
            {/* ============================================================ */}
            {/* STEP 1: RESCUE TYPE & CAR SELECTION                         */}
            {/* ============================================================ */}
            {bookingStep === 1 && (
              <Step1ServiceAndCar
                address={address}
                onRefreshLocation={fetchCurrentLocation}
                userVehicles={userVehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={updateVehicleAndFuel}
                onAddVehicle={() => router.push("/crud_vehicle/add" as any)}
                onChangeVehicle={() => {
                  if (shouldPromptForVehicleSelection(userVehicles.length)) {
                    setShowVehiclePromptModal(true);
                  }
                }}
                selectedService={selectedService}
                onSelectService={setSelectedService}
                nearestMechanic={nearestMechanic}
                nearestPetrolStation={nearestPetrolStation}
                towDestination={towDestination}
                fuelLitres={fuelLitres}
                currentFuelOption={currentFuelOption}
                fuelPriceZone={fuelPriceZone}
                tyreAction={tyreAction}
                onContinue={handleContinueFromStep1}
              />
            )}

            {/* ============================================================ */}
            {/* STEP 2: SERVICE SPECIFICATIONS                              */}
            {/* ============================================================ */}
            {bookingStep === 2 && (
              <Step2Specifications
                selectedVehicle={selectedVehicle}
                activeService={activeService}
                selectedService={selectedService}
                problemDescription={problemDescription}
                onChangeProblemDescription={setProblemDescription}
                towDestination={towDestination}
                onClearTowDestination={() => setTowDestination(null)}
                onOpenTowSearch={() => setShowDestSearchModal(true)}
                onSelectNearestPetrolStationAsTow={() => {
                  if (nearestPetrolStation) {
                    setTowDestination({
                      name: nearestPetrolStation.name,
                      address: nearestPetrolStation.address,
                      latitude: nearestPetrolStation.latitude,
                      longitude: nearestPetrolStation.longitude,
                      distanceKm: nearestPetrolStation.distanceKm,
                    });
                  }
                }}
                nearestPetrolStation={nearestPetrolStation}
                selectedTyrePosition={selectedTyrePosition}
                onSelectTyrePosition={setSelectedTyrePosition}
                tyreAction={tyreAction}
                onSelectTyreAction={(action) => {
                  setTyreAction(action);
                  setHasSpareWheel(action !== "new_tyre");
                }}
                availableTyreSizes={availableTyreSizes}
                tyreSize={tyreSize}
                onSelectTyreSize={setTyreSize}
                customTyreSize={customTyreSize}
                onChangeCustomTyreSize={setCustomTyreSize}
                loadingTyreSizes={loadingTyreSizes}
                selectedFuelType={selectedFuelType}
                onSelectFuelType={setSelectedFuelType}
                fuelLitres={fuelLitres}
                onChangeFuelLitres={setFuelLitres}
                currentFuelOption={currentFuelOption}
                fuelOptions={fuelOptions}
                fuelPriceZone={fuelPriceZone}
                onSelectFuelPriceZone={setFuelPriceZone}
                batteryAction={batteryAction}
                onSelectBatteryAction={setBatteryAction}
                onBack={() => setBookingStep(1)}
                onContinue={handleContinueFromStep2}
              />
            )}

            {/* ============================================================ */}
            {/* STEP 3: PAYMENT METHOD & CONFIRMATION                        */}
            {/* ============================================================ */}
            {bookingStep === 3 && (
              <Step3PaymentAndConfirm
                dynamicPriceInfo={dynamicPriceInfo}
                selectedVehicle={selectedVehicle}
                activeService={activeService}
                selectedService={selectedService}
                problemDescription={problemDescription}
                selectedTyrePosition={selectedTyrePosition}
                effectiveTyreSize={effectiveTyreSize}
                tyreAction={tyreAction}
                towDestination={towDestination}
                nearestPetrolStation={nearestPetrolStation}
                fuelLitres={fuelLitres}
                currentFuelOption={currentFuelOption}
                batteryAction={batteryAction}
                address={address}
                paymentMethod={paymentMethod}
                onSelectPaymentMethod={setPaymentMethod}
                selectedCard={selectedCard}
                onOpenCardModal={() => setShowCardModal(true)}
                onBack={() => setBookingStep(2)}
                onConfirmRescue={handleStartFindingRescuer}
              />
            )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ============================================================ */}
        {/* 3. FINDING RESCUER STAGE (Radar Pulse Animation) */}
        {/* ============================================================ */}
        {flowState === "FINDING_RESCUER" && (
          <View className="px-5 py-4 items-center">
            {/* Radar Pulse Animation Container */}
            <View className="w-32 h-32 items-center justify-center my-2">
              <Animated.View
                style={{
                  position: "absolute",
                  width: 128,
                  height: 128,
                  borderRadius: 64,
                  backgroundColor: "#1e2939",
                  opacity: pulseAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.45, 0],
                  }),
                  transform: [
                    {
                      scale: pulseAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1.4],
                      }),
                    },
                  ],
                }}
              />
              <Animated.View
                style={{
                  position: "absolute",
                  width: 128,
                  height: 128,
                  borderRadius: 64,
                  backgroundColor: "#1e2939",
                  opacity: pulseAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.45, 0],
                  }),
                  transform: [
                    {
                      scale: pulseAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1.4],
                      }),
                    },
                  ],
                }}
              />
              <View className="w-18 h-18 rounded-full bg-gray-800 items-center justify-center shadow-lg ">
                <Ionicons name="car-sport" size={32} color="#ffffff" />
              </View>
            </View>

            <Text className="text-base font-poppin-bold text-gray-900 mt-2">
              Finding a Rescuer{searchDots}
            </Text>
            <Text className="text-xs font-poppin text-gray-500 text-center mt-1 mb-5 px-6">
              Waiting for a nearby mechanic to accept. Your request stays open
              until someone takes it.
            </Text>

            {/* Cancel Search Button */}
            <TouchableOpacity
              onPress={handleCancelRequest}
              activeOpacity={0.8}
              className="w-full py-3 bg-gray-100 h-16 rounded-2xl items-center justify-center"
            >
              <Text className="text-sm font-poppin-semibold text-gray-700">
                Cancel Search
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* 4. NO RESCUER FOUND STAGE */}
        {/* ============================================================ */}
        {flowState === "NO_RESCUER_FOUND" && (
          <View className="px-6 py-4 items-center">
            <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center mb-3">
              <Ionicons name="alert-circle" size={36} color="#e11d48" />
            </View>
            <Text className="text-base font-poppin-bold text-gray-900">
              No Rescuers Found Nearby
            </Text>
            <Text className="text-xs font-poppin text-gray-500 text-center mt-1.5 mb-5 px-3 leading-4">
              All nearby rescue units are currently offline with other requests.
              Please try again in a few moments.
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setFlowState("SELECTING")}
                activeOpacity={0.8}
                className="flex-1 py-3 bg-gray-100 rounded-2xl items-center justify-center"
              >
                <Text className="text-xs font-poppin-semibold text-gray-700">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStartFindingRescuer}
                activeOpacity={0.8}
                className="flex-1 py-3 bg-gray-800 rounded-2xl items-center justify-center shadow-md"
              >
                <Text className="text-xs font-poppin-bold text-gray-950">
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* 5. TRACKING & RESCUER DETAILS STAGE (Live Rescuer Tracking) */}
        {/* ============================================================ */}
        {flowState === "TRACKING" && assignedRescuer && (
          <View className="px-5 pt-1">
            {/* Rescuer Status Banner */}
            <View className="flex-row items-center justify-between bg-gray-500/10 p-3 rounded-2xl mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                <Text className="text-xs font-poppin-bold text-gray-950">
                  {jobStatus === "arrived"
                    ? "Rescuer has arrived at your location"
                    : jobStatus === "in_progress"
                      ? "Rescue is in progress"
                      : "Live tracking, vehicle is moving"}
                </Text>
              </View>
              <Text className="text-[10px] font-poppin-bold text-gray-900 text-right">
                {routeEstimate
                  ? `${routeEstimate.durationMinutes} min • ${routeEstimate.distanceKm.toFixed(1)} km`
                  : isRouteLoading
                    ? "Calculating route…"
                    : "Road distance and ETA unavailable"}
              </Text>
            </View>
            {routeEstimate && (
              <Text className="text-[10px] font-poppin text-gray-500 text-right -mt-2 mb-2">
                {routeEstimate.trafficAware ? "Traffic-aware road estimate" : "Road estimate; live traffic unavailable"}
              </Text>
            )}

            {/* Driver Profile & Vehicle Card */}
            <View className="bg-gray-50/80 p-3.5 rounded-2xl mb-3">
              <View className="flex-row items-center gap-3">
                <Image
                  source={{
                    uri:
                      assignedRescuer.avatar_url ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
                  }}
                  style={{ width: 48, height: 48, borderRadius: 24 }}
                />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-poppin-bold text-gray-900">
                      {assignedRescuer.full_name}
                    </Text>
                    {(assignedRescuer as any).documents_verified && (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color="#10b981"
                      />
                    )}
                  </View>
                  <Text className="text-xs font-poppin-medium text-gray-600">
                    {assignedRescuer.vehicle_make}{" "}
                    {assignedRescuer.vehicle_model}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-[11px] font-poppin-bold text-gray-600">
                      ★ {assignedRescuer.rating?.toFixed(1) || "4.9"}
                    </Text>
                    <Text className="text-[11px] font-poppin text-gray-400">
                      •
                    </Text>
                    <Text className="text-[11px] font-poppin text-gray-500">
                      {assignedRescuer.total_rescues || 45} rescues
                    </Text>
                    <Text className="text-[11px] font-poppin text-gray-400">
                      •
                    </Text>
                    <View className="bg-gray-200 px-1.5 py-0.5 rounded">
                      <Text className="text-[10px] font-poppin-bold text-gray-700 uppercase">
                        {assignedRescuer.vehicle_plate}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Actions (Call, Message, Cancel) */}
            <View className="flex-row gap-2.5 mb-1">
              <TouchableOpacity
                onPress={() => {
                  if (assignedRescuer.phone_number) {
                    Linking.openURL(`tel:${assignedRescuer.phone_number}`);
                  } else {
                    Alert.alert(
                      "Calling Driver",
                      "Connecting call to rescuer...",
                    );
                  }
                }}
                activeOpacity={0.8}
                className="flex-1 py-3 bg-emerald-600 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
              >
                <Ionicons name="call" size={17} color="#ffffff" />
                <Text className="text-xs font-poppin-bold text-white">
                  Call Rescuer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowChatModal(true)}
                activeOpacity={0.8}
                className="flex-1 py-3 bg-gray-900 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
              >
                <Ionicons name="chatbubble" size={17} color="#ffffff" />
                <Text className="text-xs font-poppin-bold text-white">
                  Message
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancelRequest}
                activeOpacity={0.8}
                className="w-12 py-3 bg-rose-50 rounded-2xl items-center justify-center "
              >
                <Ionicons name="close" size={20} color="#e11d48" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {flowState === "COMPLETED" && (
          <View className="px-6 py-5 items-center">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-3">
              <Ionicons name="checkmark-circle" size={36} color="#059669" />
            </View>
            <Text className="text-base font-poppin-bold text-gray-900">
              Rescue completed
            </Text>
            <Text className="text-xs font-poppin text-gray-500 text-center mt-1.5 mb-5 px-3 leading-4">
              Your {activeService.title.toLowerCase()} is done. You can request
              help again any time.
            </Text>
            <TouchableOpacity
              onPress={() => {
                stopSearchWatchers();
                stopRescuerWatch();
                setAssignedRescuer(null);
                setActiveRequestId(null);
                setBookingStep(1);
                setFlowState("SELECTING");
              }}
              activeOpacity={0.8}
              className="w-full py-3 bg-amber-500 rounded-2xl items-center justify-center"
            >
              <Text className="text-xs font-poppin-bold text-gray-950">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* TOW DROP-OFF DESTINATION SEARCH MODAL */}
      <DestinationSearchModal
        visible={showDestSearchModal}
        onClose={() => setShowDestSearchModal(false)}
        searchQuery={destSearchQuery}
        onChangeSearchQuery={handleSearchDestination}
        isSearching={isSearchingDest}
        nearestPetrolStation={nearestPetrolStation}
        suggestions={destSuggestions}
        onSelectDestination={setTowDestination}
      />

      {/* PAYMENT CARD MANAGEMENT MODAL */}
      <CardManagementModal
        visible={showCardModal}
        onClose={() => setShowCardModal(false)}
        cards={savedCards}
        selectedCard={selectedCard}
        onSelectCard={handleSelectCard}
        onAddNewCard={handleAddNewCard}
      />

      {/* VEHICLE SELECTION MODAL ("WHICH CAR ARE YOU DRIVING TODAY?") */}
      <VehicleSelectionModal
        visible={showVehiclePromptModal && shouldPromptForVehicleSelection(userVehicles.length)}
        onClose={() => setShowVehiclePromptModal(false)}
        vehicles={userVehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={updateVehicleAndFuel}
        onAddNewVehicle={() => router.push("/crud_vehicle/add" as any)}
      />

      {/* IN-APP REALTIME RESCUE CHAT */}
      {activeRequestId && user && (
        <RescueChatModal
          visible={showChatModal}
          rescueRequestId={activeRequestId}
          currentUserId={user.id}
          currentUserRole="client"
          otherPartyName={assignedRescuer?.full_name || "Mechanic"}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </View>
  );
}
