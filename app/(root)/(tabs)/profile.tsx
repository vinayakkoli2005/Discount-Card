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
import { useCallback, useState ,  useEffect} from "react";

import { logout, isValidStore, getMyStores } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { fetchMyStores } from "@/lib/api";


import icons from "@/constants/icons";

const Profile = () => {
  const { user, refetch } = useGlobalContext();

  const [myStores, setMyStores] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);

  const loadMyStores = async () => {
    if (!user?.$id) {
      setMyStores([]);
      setIsReady(true);
      return;
    }

    try {
      setIsReady(false);

      let data;
      try {
        data = await fetchMyStores(user.$id);
      } catch {
        data = await getMyStores(user.$id);
      }
      setMyStores(data.filter(isValidStore));
    } finally {
      setIsReady(true);
    }
  };

  // 🔄 Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadMyStores();
    }, [user?.$id])
  );
  useEffect(() => {
    console.log("Profile state:", {
      userId: user?.$id,
      myStores: myStores.length,
    });
  }, [myStores, user?.$id]);


  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      Alert.alert("Success", "Logged out successfully");
      refetch();
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
        <Text className="text-xl font-rubik-bold mt-5">Profile</Text>

        <View className="items-center mt-10">
          <Image
            source={{ uri: user?.avatar }}
            className="size-40 rounded-full"
          />
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
              <TouchableOpacity
                key={store.$id}
                onPress={() => router.push("/my-stores")}
                className="py-4 border-b border-primary-200"
              >
                <Text className="text-base font-rubik-medium">
                  {store.name}
                </Text>
              </TouchableOpacity>
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
