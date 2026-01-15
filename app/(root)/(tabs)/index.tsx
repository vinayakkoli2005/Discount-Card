import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";

import icons from "@/constants/icons";
import NoResults from "@/components/NoResults";
import { Card } from "@/components/Cards";

import { useGlobalContext } from "@/lib/global-provider";
import { getStores, isValidStore } from "@/lib/appwrite";
import { getDistanceInKm } from "@/lib/distance";

const PAGE_SIZE = 10;

export default function Index() {
  const { user } = useGlobalContext();

  // 📍 User location
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 📦 Stores + pagination
  const [stores, setStores] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1️⃣ Get user location (once)
  useEffect(() => {
    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Location is needed to show nearby stores"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // 2️⃣ Load FIRST PAGE
  const loadInitialStores = async () => {
    setIsReady(false);
    setPage(0);
    setHasMore(true);

    const firstBatch = await getStores({
      limit: PAGE_SIZE,
      offset: 0,
    });

    setStores(firstBatch);
    setHasMore(firstBatch.length === PAGE_SIZE);
    setIsReady(true);
  };

  // Load when location is ready
  useEffect(() => {
    if (!userLocation) return;
    loadInitialStores();
  }, [userLocation]);

  // 🔄 Refresh when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (!userLocation) return;
      loadInitialStores();
    }, [userLocation])
  );
  useEffect(() => {
    console.log("Index state:", {
      stores: stores.length,
      page,
      hasMore,
      userLocation,
    });
  }, [stores, page, hasMore, userLocation]);


  // 3️⃣ Load MORE stores on scroll
  const loadMoreStores = async () => {
    if (!hasMore || isFetchingMore) return;

    setIsFetchingMore(true);

    const nextPage = page + 1;

    const nextBatch = await getStores({
      limit: PAGE_SIZE,
      offset: nextPage * PAGE_SIZE,
    });

    setStores((prev) => [...prev, ...nextBatch]);
    setPage(nextPage);
    setHasMore(nextBatch.length === PAGE_SIZE);
    setIsFetchingMore(false);
  };

  // 4️⃣ Sort by distance (safe + memoized)
  const sortedStores = useMemo(() => {
    if (!userLocation) return [];

    return stores
      .filter(isValidStore)
      .sort((a, b) => {
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
  }, [stores, userLocation]);

  const handleCardPress = (id?: string) => {
    if (!id) return;
    router.push(`/stores/${id}`);
  };

  // 🔄 GLOBAL LOADER
  if (!isReady || !userLocation) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">
          Fetching nearby stores...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={sortedStores}
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
            <View className="flex flex-row items-center justify-between mt-5">
              <View className="flex flex-row items-center">
                <Image
                  source={{ uri: user?.avatar }}
                  className="size-12 rounded-full"
                />
                <View className="ml-2">
                  <Text className="text-sm text-black-200">
                    Nearby stores for
                  </Text>
                  <Text className="text-base font-rubik-medium text-black-300">
                    {user?.name}
                  </Text>
                </View>
              </View>
              <Image source={icons.bell} className="size-6" />
            </View>

            <Text className="text-xl font-rubik-bold text-black-300 mt-6">
              Stores Near You
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
