import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";

import { useGlobalContext } from "@/lib/global-provider";
import { getMyStores, isValidStore } from "@/lib/appwrite";

export default function MyStores() {
  const { user } = useGlobalContext();

  const [stores, setStores] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  const loadMyStores = async () => {
    if (!user?.$id) return;

    setIsReady(false);

    const data = await getMyStores(user.$id);
    setStores(data.filter(isValidStore));

    setIsReady(true);
  };

  // Initial load
  useEffect(() => {
    loadMyStores();
  }, [user?.$id]);

  // 🔄 Refresh on focus (after Add Store)
  useFocusEffect(
    useCallback(() => {
      loadMyStores();
    }, [user?.$id])
  );
  useEffect(() => {
    console.log("MyStores state:", {
      userId: user?.$id,
      storeCount: stores.length,
    });
  }, [stores, user?.$id]);


  // 🔄 GLOBAL LOADER
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">
          Loading your stores...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-6 pb-32">
        <Text className="text-2xl font-rubik-bold mt-6">
          My Stores
        </Text>

        {stores.length === 0 && (
          <View className="mt-20 items-center">
            <Text className="text-xl font-rubik-bold text-gray-800">
              No stores yet
            </Text>

            <Text className="text-sm text-gray-500 mt-2 text-center">
              You haven’t added any stores.
              {"\n"}Create your first store to get started.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/add-store")}
              className="mt-6 bg-primary-300 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-rubik-bold">
                Add Store
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {stores.map((store) => (
          <View
            key={store.$id}
            className="border border-primary-200 rounded-xl p-4 mt-4"
          >
            <Text className="font-rubik-bold text-lg">
              {store.name}
            </Text>

            <Text className="text-sm text-gray-600 mt-1">
              {store.category}
            </Text>

            <Text className="text-sm text-gray-500 mt-1">
              {store.address}
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (!store.$id) return;
                router.push({
                  pathname: "/stores/[id]",
                  params: { id: store.$id },
                });
              }}
              className="mt-3 self-start"
            >
              <Text className="text-primary-300 font-rubik-bold">
                View details →
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
