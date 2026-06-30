import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ID } from "react-native-appwrite";
import { storage, config } from "@/lib/appwrite";
import icons from "@/constants/icons";
import {
  getStoreNameError,
  getPhoneError,
  getAddressError,
  getDescriptionError,
} from "@/lib/validation";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";

import { useGlobalContext } from "@/lib/global-provider";
import { createStore, createProduct } from "@/lib/api";
import { categories } from "@/constants/data";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";






type ProductInput = {
  localId: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUri: string;
};

const AddStore = () => {
  const [imageUris, setImageUris] = useState<string[]>([]);

  // ─────────────────────────────
  // Product State
  // ─────────────────────────────
  const [products, setProducts] = useState<ProductInput[]>([]);

  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  // ─────────────────────────────
  // Form State
  // ─────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const addImage = async () => {
    if (imageUris.length >= 5) {
      Alert.alert("Limit reached", "You can add up to 5 images");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const bucketId = config.storeImagesBucketId;
    if (!bucketId) throw new Error("Store images bucket not configured");
    const fileIds: string[] = [];
    for (const uri of imageUris) {
      const rawName = uri.split("/").pop()?.split("?")[0] || "image.jpg";
      const fileName = /\.(jpg|jpeg|png|webp|heic)$/i.test(rawName) ? rawName : `${rawName}.jpg`;
      const uploaded = await storage.createFile(bucketId, ID.unique(), { uri, name: fileName, type: "image/jpeg", size: 0 } as any);
      fileIds.push(uploaded.$id);
    }
    return fileIds;
  };

  // ─────────────────────────────
  // Product helpers
  // ─────────────────────────────
  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      { localId: Date.now().toString(), name: "", description: "", price: "", category: "", imageUri: "" },
    ]);
  };

  const pickProductImage = async (localId: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Permission denied"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProducts((prev) =>
        prev.map((p) => p.localId === localId ? { ...p, imageUri: result.assets[0].uri } : p)
      );
    }
  };

  const removeProduct = (localId: string) => {
    setProducts((prev) => prev.filter((p) => p.localId !== localId));
  };

  const updateProduct = (localId: string, field: keyof Omit<ProductInput, "localId">, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, [field]: value } : p))
    );
  };

  const createProducts = async (storeId: string) => {
    const bucketId = config.storeImagesBucketId;
    for (const p of products) {
      if (!p.name.trim() || !p.description.trim() || !p.price.trim()) continue;
      let image_id: string | undefined;
      if (p.imageUri && bucketId) {
        const rawName = p.imageUri.split("/").pop()?.split("?")[0] || "image.jpg";
        const fileName = /\.(jpg|jpeg|png|webp|heic)$/i.test(rawName) ? rawName : `${rawName}.jpg`;
        const uploaded = await storage.createFile(bucketId, ID.unique(), { uri: p.imageUri, name: fileName, type: "image/jpeg", size: 0 } as any);
        image_id = uploaded.$id;
      }
      await createProduct({
        store_id: storeId,
        name: p.name.trim(),
        description: p.description.trim(),
        price: parseFloat(p.price),
        category: p.category,
        image_id,
      });
    }
  };

  const handleMapPress = (event: any) => {
  const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
    };



  // ─────────────────────────────
  // Receive map-picked location
  // ─────────────────────────────
  useEffect(() => {
    if (params.lat && params.lng) {
      setLatitude(Number(params.lat));
      setLongitude(Number(params.lng));
    }
  }, [params.lat, params.lng]);

  // ─────────────────────────────
  // Use current location
  // ─────────────────────────────
  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch {
      Alert.alert("Error", "Unable to fetch location. Please try again.");
    } finally {
      setIsLocating(false);
    }
  };

  // ─────────────────────────────
  // Submit
  // ─────────────────────────────
  const handleSubmit = async () => {
    const nameError = getStoreNameError(name);
    if (nameError) { Alert.alert("Invalid Store Name", nameError); return; }

    if (!category) { Alert.alert("Invalid Category", "Please select a store category"); return; }

    const addressError = getAddressError(address);
    if (addressError) { Alert.alert("Invalid Address", addressError); return; }

    const phoneError = getPhoneError(phone);
    if (phoneError) { Alert.alert("Invalid Phone Number", phoneError); return; }

    const descError = getDescriptionError(description);
    if (descError) { Alert.alert("Invalid Description", descError); return; }

    if (!latitude || !longitude) {
      Alert.alert("Location Required", "Please select store location");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not logged in");
      return;
    }


    let uploadedImageIds: string[] = [];
    if (imageUris.length > 0) {
      try {
        uploadedImageIds = await uploadImages();
      } catch {
        Alert.alert("Error", "Failed to upload images");
        return;
      }
    }

    // Validate products if any were added
    for (const p of products) {
      if (!p.name.trim()) { Alert.alert("Product Error", `A product in "${p.category}" is missing a name`); return; }
      if (!p.description.trim()) { Alert.alert("Product Error", `Product "${p.name}" is missing a description`); return; }
      if (!p.price.trim() || isNaN(parseFloat(p.price))) { Alert.alert("Product Error", `Product "${p.name}" has an invalid price`); return; }
    }

    let storeId: string | null = null;
    try {
      storeId = await createStore({
        name,
        category,
        address,
        phone: phone.replace(/\D/g, "") || undefined,
        description,
        latitude,
        longitude,
        images: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
      });
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
      return;
    }

    if (!storeId) {
      Alert.alert("Error", "Failed to create store");
      return;
    }

    if (products.length > 0 && storeId) {
      try {
        await createProducts(storeId);
      } catch {
        Alert.alert("Warning", "Store created but some products failed to save");
      }
    }

    Alert.alert("Success", "Store created");
    router.back();
  };

  return (
    <SafeAreaView className="h-full bg-white">
      <ScrollView contentContainerClassName="px-6 pb-32">
        <View className="flex flex-row items-center mt-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(root)/(tabs)");
            }}
            className="mr-3"
          >
            <Image source={icons.backArrow} className="size-5" />
          </TouchableOpacity>
          <Text className="text-2xl font-rubik-bold">Add New Store</Text>
        </View>

        {/* Name */}
        <Text className="text-sm font-rubik-medium text-black-300 mt-6">
          Store Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="Store Name"
          value={name}
          onChangeText={setName}
          className="border border-primary-200 rounded-lg px-4 py-3 mt-1"
        />

        {/* Category */}
        <Text className="text-sm font-rubik-medium text-black-300 mt-4">
          Category <Text className="text-red-500">*</Text>
        </Text>
        <View className="border border-primary-200 rounded-lg mt-1">
        <Picker
            selectedValue={category}
            onValueChange={(value) => setCategory(value)}
        >
            <Picker.Item label="Select Store Category" value="" />

            {categories
            .filter((item) => item.category !== "All")
            .map((item) => (
                <Picker.Item
                key={item.category}
                label={item.title}
                value={item.category}
                />
            ))}
        </Picker>
        </View>

        {/* Address */}
        <Text className="text-sm font-rubik-medium text-black-300 mt-4">
          Address <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
          className="border border-primary-200 rounded-lg px-4 py-3 mt-1"
        />

        {/* Phone */}
        <Text className="text-sm font-rubik-medium text-black-300 mt-4">
          Phone Number <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="Phone Number"
          value={phone}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 10);
            setPhone(digits);
            setPhoneError(digits.length > 0 && digits.length !== 10 ? "Phone number must be exactly 10 digits" : null);
          }}
          keyboardType="phone-pad"
          maxLength={10}
          className="border border-primary-200 rounded-lg px-4 py-3 mt-1"
        />
        {phoneError && (
          <Text className="text-red-500 text-xs mt-1">{phoneError}</Text>
        )}

        {/* Description */}
        <Text className="text-sm font-rubik-medium text-black-300 mt-4">
          About Store <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          placeholder="About Store"
          value={description}
          onChangeText={setDescription}
          multiline
          className="border border-primary-200 rounded-lg px-4 py-3 mt-1 h-28"
        />

        {/* Images */}
        <Text className="text-lg font-rubik-bold mt-8">
          Store Images{" "}
          <Text className="text-sm text-gray-400 font-rubik">(up to 5)</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-3">
            {imageUris.map((uri, index) => (
              <View key={index} className="relative">
                <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 10 }} />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    backgroundColor: "#ef4444", borderRadius: 10,
                    width: 20, height: 20, alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {imageUris.length < 5 && (
              <TouchableOpacity
                onPress={addImage}
                style={{
                  width: 90, height: 90, borderRadius: 10,
                  borderWidth: 1.5, borderColor: "#a8c5fa",
                  borderStyle: "dashed", alignItems: "center",
                  justifyContent: "center", backgroundColor: "#f5f8ff",
                }}
              >
                <Text style={{ fontSize: 28, color: "#a8c5fa" }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Location */}
        <Text className="text-lg font-rubik-bold mt-8">
          Store Location <Text className="text-red-500">*</Text>
        </Text>

        <TouchableOpacity
          onPress={useCurrentLocation}
          disabled={isLocating}
          className="bg-primary-200 py-3 rounded-full mt-4 flex-row items-center justify-center gap-2"
        >
          {isLocating && <ActivityIndicator size="small" />}
          <Text className="text-center font-rubik-bold">
            {isLocating ? "Fetching location..." : "Use My Current Location"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/pick-location")}
          className="bg-primary-200 py-3 rounded-full mt-3"
        >
          <Text className="text-center font-rubik-bold">
            Pick Location from Map
          </Text>
        </TouchableOpacity>

        {latitude && longitude && (
          <Text className="text-sm text-green-600 mt-2">
            Location selected ✓
          </Text>
        )}
        {latitude && longitude && (
        <View className="mt-4 rounded-xl overflow-hidden border border-primary-200">
            <MapView
            provider={PROVIDER_GOOGLE}
            style={{ width: "100%", height: 300 }}
            region={{
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }}
            onPress={handleMapPress} // 👈 tap to change location
            >
            <Marker
                coordinate={{ latitude, longitude }}
                title="Store Location"
                draggable
                onDragEnd={(e) => {
                setLatitude(e.nativeEvent.coordinate.latitude);
                setLongitude(e.nativeEvent.coordinate.longitude);
                }}
            />
            </MapView>
        </View>
        )}



        {/* Products */}
        <Text className="text-lg font-rubik-bold mt-10">
          Products{" "}
          <Text className="text-sm text-gray-400 font-rubik">(optional)</Text>
        </Text>
        <Text className="text-xs text-gray-400 mt-1 mb-3">
          Name, description and price are required per product. Category is optional.
        </Text>

        {products.map((p, index) => (
          <View key={p.localId} className="border border-primary-200 rounded-xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-rubik-bold text-sm text-black-300">Product {index + 1}</Text>
              <TouchableOpacity onPress={() => removeProduct(p.localId)}>
                <Text className="text-red-400 text-xs font-rubik-medium">Remove</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-1">Name <Text className="text-red-500">*</Text></Text>
            <TextInput
              placeholder="Product name"
              value={p.name}
              onChangeText={(v) => updateProduct(p.localId, "name", v)}
              className="border border-primary-200 rounded-lg px-3 py-2 mb-3"
            />

            <Text className="text-xs text-gray-500 mb-1">Description <Text className="text-red-500">*</Text></Text>
            <TextInput
              placeholder="Product description"
              value={p.description}
              onChangeText={(v) => updateProduct(p.localId, "description", v)}
              multiline
              className="border border-primary-200 rounded-lg px-3 py-2 mb-3 h-16"
            />

            <Text className="text-xs text-gray-500 mb-1">Price <Text className="text-red-500">*</Text></Text>
            <TextInput
              placeholder="0.00"
              value={p.price}
              onChangeText={(v) => updateProduct(p.localId, "price", v)}
              keyboardType="decimal-pad"
              className="border border-primary-200 rounded-lg px-3 py-2 mb-3"
            />

            <Text className="text-xs text-gray-500 mb-1">Category (optional)</Text>
            <TextInput
              placeholder="e.g. Electronics, Snacks..."
              value={p.category}
              onChangeText={(v) => updateProduct(p.localId, "category", v)}
              className="border border-primary-200 rounded-lg px-3 py-2"
            />

            <View className="flex-row items-center gap-3 mt-3">
              {p.imageUri ? (
                <View className="relative">
                  <Image source={{ uri: p.imageUri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                  <TouchableOpacity
                    onPress={() => setProducts((prev) => prev.map((q) => q.localId === p.localId ? { ...q, imageUri: "" } : q))}
                    style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#ef4444", borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => pickProductImage(p.localId)}
                  style={{ borderWidth: 1.5, borderColor: "#a8c5fa", borderStyle: "dashed", borderRadius: 8, width: 64, height: 64, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f8ff" }}
                >
                  <Text style={{ fontSize: 22, color: "#a8c5fa" }}>+</Text>
                  <Text style={{ fontSize: 9, color: "#a8c5fa" }}>Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity
          onPress={addProduct}
          className="border border-dashed border-primary-300 rounded-xl py-4 items-center mt-1"
        >
          <Text className="text-primary-300 font-rubik-bold">+ Add Product</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary-300 py-4 rounded-full mt-10"
        >
          <Text className="text-white text-center font-rubik-bold text-lg">
            Add Store
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddStore;
