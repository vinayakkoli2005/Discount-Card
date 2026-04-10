import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import icons from "@/constants/icons";
import images from "@/constants/images";
import Comment from "@/components/Comment";

import { useAppwrite } from "@/lib/useAppwrite";
import { fetchStoreById } from "@/lib/api";
import { Linking, Alert } from "react-native";


const Store = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const windowHeight = Dimensions.get("window").height;

  const { data: store } = useAppwrite({
    fn: async ({ id }: { id: string }) => fetchStoreById(id),
    params: {
      id: id!,
    },
  });
  const openInMaps = () => {
    if (!store?.latitude || !store?.longitude) {
        Alert.alert("Location not available");
        return;
    }

    const lat = store.latitude;
    const lng = store.longitude;
    const label = encodeURIComponent(store.name || "Store");

    // Google Maps URL (works on Android, iOS, Web)
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.openURL(url).catch(() =>
        Alert.alert("Error", "Unable to open Google Maps")
    );
    };


  return (
    <View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
      >
        {/* Store Image */}
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          <Image
            source={{ uri: store?.image }}
            className="size-full"
            resizeMode="cover"
          />
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />

          {/* Header */}
          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          >
            <View className="flex flex-row items-center w-full justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <View className="flex flex-row items-center gap-3">
                <Image source={icons.heart} className="size-7" />
                <Image source={icons.send} className="size-7" />
              </View>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View className="px-5 mt-7 flex gap-3">
          <Text className="text-2xl font-rubik-extrabold">
            {store?.name}
          </Text>

          {/* Category + Rating */}
          <View className="flex flex-row items-center gap-3">
            <View className="px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {store?.category}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
              <Text className="text-black-200 text-sm font-rubik-medium">
                {store?.rating} ({store?.reviews?.length} reviews)
              </Text>
            </View>
          </View>

          {/* Store Owner */}
          {store?.agent && (
            <View className="w-full border-t border-primary-200 pt-7 mt-5">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Store Owner
              </Text>

              <View className="flex flex-row items-center justify-between mt-4">
                <View className="flex flex-row items-center">
                  <Image
                    source={{ uri: store?.agent?.avatar ?? undefined }}
                    className="size-14 rounded-full"
                  />
                  <View className="ml-3">
                    <Text className="text-lg font-rubik-bold">
                      {store?.agent?.name}
                    </Text>
                    <Text className="text-sm font-rubik-medium text-black-200">
                      {store?.agent?.email}
                    </Text>
                  </View>
                </View>

                <View className="flex flex-row items-center gap-3">
                  <Image source={icons.chat} className="size-7" />
                  <Image source={icons.phone} className="size-7" />
                </View>
              </View>
            </View>
          )}

          {/* About Store */}
          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              About Store
            </Text>
            <Text className="text-black-200 text-base font-rubik mt-2">
              {store?.description}
            </Text>
          </View>

          {/* Gallery */}
          {(store?.gallery?.length ?? 0) > 0 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Gallery
              </Text>

              <FlatList
                data={store?.gallery}
                keyExtractor={(item) => item.$id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: (item as { image?: string }).image }}
                    className="size-40 rounded-xl"
                  />
                )}
                contentContainerClassName="flex gap-4 mt-3"
              />
            </View>
          )}

          {/* Location */}
          <TouchableOpacity className="mt-7" onPress={openInMaps}>
                <Text className="text-black-300 text-xl font-rubik-bold">
                    Location
                </Text>

                <View className="flex flex-row items-center mt-3 gap-2">
                    <Image source={icons.location} className="size-6" />
                    <Text className="text-black-200 text-sm font-rubik-medium">
                    {store?.address}
                    </Text>
                </View>

                <Image
                    source={images.map}
                    className="h-52 w-full mt-5 rounded-xl"
                />
            </TouchableOpacity>


          {/* Reviews */}
          {(store?.reviews?.length ?? 0) > 0 && store && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-black-300 text-xl font-rubik-bold">
                  Reviews ({store.reviews?.length})
                </Text>
                <TouchableOpacity>
                  <Text className="text-primary-300 font-rubik-bold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-5">
                <Comment item={store.reviews![0]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 w-full bg-white rounded-t-2xl border border-primary-200 p-7">
        <TouchableOpacity className="bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400">
          <Text className="text-white text-lg font-rubik-bold text-center">
            Show My Discount Card
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Store;
