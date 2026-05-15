import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Text,
  View,
  Alert,
  Pressable,
  TextInput,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";

import icons from "@/constants/icons";
import NoResults from "@/components/NoResults";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";

import { isValidStore } from "@/lib/appwrite";
import { getDistanceInKm } from "@/lib/distance";
import { fetchStores } from "@/lib/api";

const PAGE_SIZE = 10;

export default function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const filterParam = Array.isArray(params.filter)
    ? params.filter[0]
    : params.filter;

  /* ---------------- SEARCH ---------------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /* 🔑 debounce search input */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---------------- LOCATION (OPTIONAL) ---------------- */
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  /* ---------------- STORES + PAGINATION ---------------- */
  const [stores, setStores] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const requestVersionRef = useRef(0);

  /* ---------------- LOAD FIRST PAGE ---------------- */
  const loadInitialStores = async () => {
    const requestVersion = ++requestVersionRef.current;

    try {
      setIsReady(false);
      setPage(0);
      setHasMore(true);

      const firstBatch = await fetchStores({
        limit: PAGE_SIZE,
        offset: 0,
        query: debouncedQuery || undefined,
        category: filterParam,
      });

      if (requestVersion !== requestVersionRef.current) return;
      setStores(firstBatch);
      setHasMore(firstBatch.length === PAGE_SIZE);
    } catch (err) {
      console.error("Initial fetch failed", err);
    } finally {
      if (requestVersion !== requestVersionRef.current) return;
      setIsReady(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialStores();
    }, [debouncedQuery, filterParam])
  );

  /* ---------------- LOAD MORE ---------------- */
  const loadMoreStores = async () => {
    if (!hasMore || isFetchingMore) return;
    const requestVersion = requestVersionRef.current;

    try {
      setIsFetchingMore(true);
      const nextPage = page + 1;

      const nextBatch = await fetchStores({
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
        query: debouncedQuery || undefined,
        category: filterParam,
      });

      if (requestVersion !== requestVersionRef.current) return;
      setStores((prev) => [...prev, ...nextBatch]);
      setPage(nextPage);
      setHasMore(nextBatch.length === PAGE_SIZE);
    } catch (err) {
      console.error("Pagination fetch failed", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  /* ---------------- ENABLE LOCATION ---------------- */
  const enableLocationSorting = async () => {
    try {
      setIsLocating(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location disabled",
          "We need location to show nearby stores"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationEnabled(true);
    } catch {
      Alert.alert("Error", "Unable to fetch location");
    } finally {
      setIsLocating(false);
    }
  };

  /* ---------------- DISPLAY STORES ---------------- */
  const displayStores = useMemo(() => {
    const validStores = stores.filter(isValidStore);

    if (!locationEnabled || !userLocation) {
      return validStores;
    }

    return [...validStores].sort((a, b) => {
      const d1 = getDistanceInKm(
        userLocation.latitude,
        userLocation.longitude,
        a.latitude,
        a.longitude
      );
      const d2 = getDistanceInKm(
        userLocation.latitude,
        userLocation.longitude,
        b.latitude,
        b.longitude
      );
      return d1 - d2;
    });
  }, [stores, locationEnabled, userLocation]);

  const handleCardPress = (id?: string) => {
    if (!id) return;
    router.push(`/stores/${id}`);
  };

  /* ---------------- LOADER ---------------- */
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">Loading stores...</Text>
      </SafeAreaView>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* SIDEBAR MODAL */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={{ flex: 1, flexDirection: "row" }}>
          {/* Sidebar panel */}
          <Animated.View
            style={{
              transform: [{ translateX: slideAnim }],
              width: 280,
              backgroundColor: "white",
              height: "100%",
              shadowColor: "#000",
              shadowOffset: { width: 2, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 10,
              paddingTop: 60,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 32, color: "#191d31" }}>
              Menu
            </Text>

            <TouchableOpacity
              onPress={() => {
                closeMenu();
                setTimeout(() => router.push("/(root)/(tabs)/profile"), 220);
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}
            >
              <Image source={icons.person} style={{ width: 20, height: 20, marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: "#191d31" }}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                closeMenu();
                setTimeout(() => router.push("/developer"), 220);
              }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}
            >
              <Image source={icons.info} style={{ width: 20, height: 20, marginRight: 12, tintColor: "#0061FF" }} />
              <Text style={{ fontSize: 16, color: "#0061FF", fontWeight: "600" }}>Developer Info</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Dimmed overlay — closes the sidebar */}
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      <FlatList
        data={displayStores}
        numColumns={2}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item.$id)} />
        )}
        columnWrapperClassName="flex gap-5 px-5"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreStores}
        onEndReachedThreshold={0.7}
        ListFooterComponent={
          isFetchingMore ? (
            <ActivityIndicator className="mt-6" />
          ) : null
        }
        ListEmptyComponent={<NoResults />}
        ListHeaderComponent={
          <View className="px-5">
            {/* HEADER */}
            <View className="flex flex-row items-center justify-between mt-5">
              {/* Hamburger */}
              <TouchableOpacity onPress={openMenu} className="p-1">
                <View className="w-6 h-0.5 bg-black-300 mb-1" />
                <View className="w-6 h-0.5 bg-black-300 mb-1" />
                <View className="w-6 h-0.5 bg-black-300" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => Alert.alert("Coming Soon", "Notifications are coming soon!")}>
                <Image source={icons.bell} className="size-6" />
              </TouchableOpacity>
            </View>

            {/* SEARCH */}
            <View className="mt-4">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search stores"
                className="bg-gray-100 rounded-xl px-4 py-3"
                returnKeyType="search"
              />
            </View>

            <Text className="text-xl font-rubik-bold text-black-300 mt-6">
              Stores
            </Text>
            <Filters />
          </View>
        }
      />
    </SafeAreaView>
  );
}
