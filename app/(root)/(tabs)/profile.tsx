import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";

import { logout } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useMyStores } from "@/lib/hooks/useMyStores";
import { deleteStore } from "@/lib/api";


import icons from "@/constants/icons";

const Profile = () => {
  const { user, refetch } = useGlobalContext();

  const { stores: myStores, isReady, refetch: refetchStores } = useMyStores(user?.$id);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refetchStores();
    }, [refetchStores])
  );

  useEffect(() => {
    if (__DEV__) console.log("Profile state:", { userId: user?.$id, myStores: myStores.length });
  }, [myStores, user?.$id]);


  const handleDeleteStore = (storeId: string, storeName: string) => {
    Alert.alert(
      "Delete Store",
      `Are you sure you want to delete "${storeName}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const ok = await deleteStore(storeId, user?.$id ?? "");
              if (ok) {
                refetchStores();
              } else {
                Alert.alert("Error", "Failed to delete store");
              }
            } catch {
              Alert.alert("Error", "Network error. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result) {
        Alert.alert("Success", "Logged out successfully");
        refetch();
      } else {
        Alert.alert("Error", "Logout failed, please try again");
      }
    } catch {
      Alert.alert("Error", "Could not log out");
    }
  };

  // 🔄 GLOBAL LOADER
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="h-full bg-white">
      <ScrollView contentContainerClassName="pb-32 px-7">
        <View className="flex flex-row items-center mt-5">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(root)/(tabs)");
            }}
            className="mr-3"
          >
            <Image source={icons.backArrow} className="size-5" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold">Profile</Text>
        </View>

        <View className="items-center mt-10">
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              className="size-40 rounded-full"
            />
          ) : (
            <View className="size-40 rounded-full bg-gray-200" />
          )}
          <Text className="text-2xl font-rubik-bold mt-4">
            {user?.name}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/add-store")}
          className="bg-primary-300 py-4 rounded-full mt-10"
        >
          <Text className="text-white text-center font-rubik-bold text-lg">
            + Add Store
          </Text>
        </TouchableOpacity>

        {myStores.length > 0 && (
          <View className="mt-10">
            <Text className="text-lg font-rubik-bold mb-4">
              My Stores
            </Text>

            {myStores.map((store) => (
              <View
                key={store.$id}
                className="border border-primary-200 rounded-xl p-4 mt-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-rubik-bold text-lg flex-1 mr-2">
                    {store.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteStore(store.$id, store.name)}
                  >
                    <Text className="text-red-400 text-sm font-rubik-medium">Delete</Text>
                  </TouchableOpacity>
                </View>

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
          </View>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center mt-16"
        >
          <Image source={icons.logout} className="size-6 mr-3" />
          <Text className="text-danger font-rubik-bold text-lg">
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
