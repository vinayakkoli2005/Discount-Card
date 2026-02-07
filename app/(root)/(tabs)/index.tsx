import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  View,
  Alert,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";

import icons from "@/constants/icons";
import NoResults from "@/components/NoResults";
import { Card } from "@/components/Cards";

import { useGlobalContext } from "@/lib/global-provider";
import { isValidStore } from "@/lib/appwrite";
import { getDistanceInKm } from "@/lib/distance";
import { fetchStores } from "@/lib/api";

const PAGE_SIZE = 10;

export default function Index() {
  const { user } = useGlobalContext();

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

  /* ---------------- LOAD FIRST PAGE ---------------- */
  const loadInitialStores = async () => {
    try {
      setIsReady(false);
      setPage(0);
      setHasMore(true);

      const firstBatch = await fetchStores({
        limit: PAGE_SIZE,
        offset: 0,
        query: debouncedQuery || undefined,
      });

      setStores(firstBatch);
      setHasMore(firstBatch.length === PAGE_SIZE);
    } catch (err) {
      console.error("Initial fetch failed", err);
    } finally {
      setIsReady(true);
    }
  };

  /* initial load */
  useEffect(() => {
    loadInitialStores();
  }, []);

  /* reload on search change */
  useEffect(() => {
    loadInitialStores();
  }, [debouncedQuery]);

  useFocusEffect(
    useCallback(() => {
      loadInitialStores();
    }, [debouncedQuery])
  );

  /* ---------------- LOAD MORE ---------------- */
  const loadMoreStores = async () => {
    if (!hasMore || isFetchingMore) return;

    try {
      setIsFetchingMore(true);
      const nextPage = page + 1;

      const nextBatch = await fetchStores({
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
        query: debouncedQuery || undefined,
      });

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
              <View className="flex flex-row items-center">
                <Image
                  source={{ uri: user?.avatar }}
                  className="size-12 rounded-full"
                />
                <View className="ml-2">
                  <Text className="text-sm text-black-200">
                    Welcome back
                  </Text>
                  <Text className="text-base font-rubik-medium text-black-300">
                    {user?.name}
                  </Text>
                </View>
              </View>
              <Image source={icons.bell} className="size-6" />
            </View>

            {/* SEARCH + LOCATION ICON */}
            <View className="mt-4 flex flex-row items-center gap-3">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search stores"
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3"
                returnKeyType="search"
              />

              <Pressable
                onPress={enableLocationSorting}
                className="bg-gray-100 rounded-xl p-3"
              >
                {isLocating ? (
                  <ActivityIndicator />
                ) : (
                  <Image source={icons.location} className="size-5" />
                )}
              </Pressable>
            </View>

            <Text className="text-xl font-rubik-bold text-black-300 mt-6">
              Stores
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
