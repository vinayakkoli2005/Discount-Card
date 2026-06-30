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

import { useState, useEffect, useCallback } from "react";
import { useAppwrite } from "@/lib/useAppwrite";
import { fetchStoreById, fetchProductsByStore, fetchFavorites, addFavorite, removeFavorite, Product } from "@/lib/api";
import { getFileUrl } from "@/lib/appwrite";
import { Linking, Alert } from "react-native";
import { useGlobalContext } from "@/lib/global-provider";


const Store = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const windowHeight = Dimensions.get("window").height;
  const { user } = useGlobalContext();

  const { data: store } = useAppwrite({
    fn: async ({ id }: { id: string }) => fetchStoreById(id),
    params: {
      id: id!,
    },
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (store?.$id) {
      fetchProductsByStore(store.$id).then(setProducts);
    }
  }, [store?.$id]);

  useEffect(() => {
    if (!store?.$id || !user) return;
    fetchFavorites().then((favs) => {
      const match = favs.find((f) => f.storeId === store.$id);
      setFavoriteId(match?.$id ?? null);
    });
  }, [store?.$id, user]);

  const toggleFavorite = useCallback(async () => {
    if (!store?.$id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (favoriteId) {
        await removeFavorite(favoriteId);
        setFavoriteId(null);
      } else {
        const fav = await addFavorite(store.$id);
        setFavoriteId(fav?.$id ?? null);
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [store?.$id, favoriteId, favoriteLoading]);

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
            source={{
              uri: store?.image
                || (store?.images?.length ? getFileUrl(store.images[0]) : undefined)
                || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=640&q=60",
            }}
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
                <TouchableOpacity onPress={toggleFavorite} disabled={favoriteLoading}>
                  <Image
                    source={icons.heart}
                    className="size-7"
                    style={favoriteId ? { tintColor: "#ef4444" } : undefined}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert("Coming Soon", "This feature is coming soon!")}>
                  <Image source={icons.send} className="size-7" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View className="px-5 mt-7 flex gap-3">
          <Text className="text-2xl font-rubik-extrabold">
            {store?.name}
          </Text>

          {/* Category */}
          <View className="flex flex-row items-center gap-3">
            <View className="px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {store?.category}
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

          {/* Phone + Contact */}
          {store?.phone && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold mb-3">
                Contact
              </Text>
              <View className="flex flex-row items-center justify-between border border-primary-200 rounded-xl px-4 py-3">
                <View className="flex flex-row items-center gap-2">
                  <Image source={icons.phone} className="size-5" />
                  <Text className="text-black-200 font-rubik-medium">{store.phone}</Text>
                </View>
                <View className="flex flex-row items-center gap-3">
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${store.phone}`)}
                    className="bg-primary-300 rounded-full px-4 py-2"
                  >
                    <Text className="text-white font-rubik-bold text-xs">Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`https://wa.me/91${store.phone}`)}
                    className="bg-green-500 rounded-full px-4 py-2"
                  >
                    <Text className="text-white font-rubik-bold text-xs">WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Uploaded Photos */}
          {(store?.images?.length ?? 0) > 1 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Photos
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                <View className="flex-row gap-3">
                  {store!.images!.map((fileId: string) => (
                    <Image
                      key={fileId}
                      source={{ uri: getFileUrl(fileId) }}
                      style={{ width: 160, height: 160, borderRadius: 12 }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

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


          {/* Products */}
          {products.length > 0 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Products
              </Text>
              {products.map((product) => (
                <View
                  key={product.$id}
                  className="border border-primary-200 rounded-xl p-4 mt-3"
                >
                  <View className="flex-row items-start gap-3">
                    {product.image_id && (
                      <Image
                        source={{ uri: getFileUrl(product.image_id) }}
                        style={{ width: 64, height: 64, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    )}
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-rubik-bold text-base flex-1 mr-2">
                          {product.name}
                        </Text>
                        {product.price != null && (
                          <Text className="text-primary-300 font-rubik-bold">
                            ₹{product.price}
                          </Text>
                        )}
                      </View>
                      {product.category ? (
                        <Text className="text-xs text-gray-400 mt-1">
                          {product.category}
                        </Text>
                      ) : null}
                      {product.description ? (
                        <Text className="text-sm text-black-200 mt-1">
                          {product.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

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

    </View>
  );
};

export default Store;
