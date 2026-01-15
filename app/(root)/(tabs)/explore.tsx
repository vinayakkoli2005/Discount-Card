import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import { isValidStore } from "@/lib/appwrite";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import icons from "@/constants/icons";
import Search from "@/components/Search";
import { Card } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";

import { getStores } from "@/lib/appwrite";
import { getDistanceInKm } from "@/lib/distance";

const PAGE_SIZE = 10;

const Explore = () => {
  const params = useLocalSearchParams<{
    query?: string;
    filter?: string;
  }>();

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

  // 2️⃣ Load FIRST PAGE when location / filters change
  useEffect(() => {
    if (!userLocation) return;

    loadInitialStores();
  }, [userLocation, params.filter, params.query]);

  useFocusEffect(
    useCallback(() => {
      if (!userLocation) return;

      loadInitialStores();
    }, [userLocation, params.filter, params.query])
  );
//  tell why crash happen optional
  useEffect(() => {
    console.log("Explore state:", {
      stores: stores.length,
      page,
      hasMore,
      userLocation,
    });
  }, [stores, page, hasMore, userLocation]);



  const loadInitialStores = async () => {
    setIsReady(false);
    setPage(0);
    setHasMore(true);

    const firstBatch = await getStores({
      category: params.filter,
      query: params.query,
      limit: PAGE_SIZE,
      offset: 0,
    });

    setStores(firstBatch);
    setHasMore(firstBatch.length === PAGE_SIZE);
    setIsReady(true);
  };

  // 3️⃣ Load MORE stores on scroll
  const loadMoreStores = async () => {
    if (!hasMore || isFetchingMore) return;

    setIsFetchingMore(true);

    const nextPage = page + 1;

    const nextBatch = await getStores({
      category: params.filter,
      query: params.query,
      limit: PAGE_SIZE,
      offset: nextPage * PAGE_SIZE,
    });

    setStores((prev) => [...prev, ...nextBatch]);
    setPage(nextPage);
    setHasMore(nextBatch.length === PAGE_SIZE);
    setIsFetchingMore(false);
  };

  // 4️⃣ Sort stores by distance (safe + memoized)
  const sortedStores = useMemo(() => {
    if (!userLocation) return [];

    return stores
      .filter(
        isValidStore
      )
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


  // 🔄 GLOBAL LOADING SCREEN
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
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <Text className="text-base font-rubik-medium">
                Explore Nearby Stores
              </Text>

              <Image source={icons.bell} className="w-6 h-6" />
            </View>

            <Search />

            <View className="mt-5">
              <Filters />
              <Text className="text-xl font-rubik-bold mt-5">
                Found {sortedStores.length} Stores
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Explore;
