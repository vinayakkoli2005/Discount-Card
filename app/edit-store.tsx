import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { ID, InputFile } from "react-native-appwrite";
import MapView, { Marker } from "react-native-maps";
import { Picker } from "@react-native-picker/picker";

import icons from "@/constants/icons";
import { categories } from "@/constants/data";
import { storage, config } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { updateStore } from "@/lib/api";
import {
  getStoreNameError,
  getPhoneError,
  getAddressError,
  getDescriptionError,
} from "@/lib/validation";

const EditStore = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    category?: string;
    address?: string;
    description?: string;
    phone?: string;
    lat?: string;
    lng?: string;
  }>();

  const [name, setName] = useState(params.name ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [address, setAddress] = useState(params.address ?? "");
  const [phone, setPhone] = useState(params.phone ?? "");
  const [description, setDescription] = useState(params.description ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    params.lat ? Number(params.lat) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    params.lng ? Number(params.lng) : null
  );
  const [imageUris, setImageUris] = useState<string[]>([]);

  // Handle location returned from pick-location screen
  useEffect(() => {
    if (params.lat && params.lng) {
      setLatitude(Number(params.lat));
      setLongitude(Number(params.lng));
    }
  }, [params.lat, params.lng]);

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
      const fileName = /\.(jpg|jpeg|png|webp|heic)$/i.test(rawName)
        ? rawName
        : `${rawName}.jpg`;
      const file = InputFile.fromURI(uri, fileName);
      const uploaded = await storage.createFile(bucketId, ID.unique(), file);
      fileIds.push(uploaded.$id);
    }
    return fileIds;
  };

  const useCurrentLocation = async () => {
    try {
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
    }
  };

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

    if (!user || !params.id) {
      Alert.alert("Error", "Missing store or user info");
      return;
    }

    let uploadedImageIds: string[] | undefined;
    if (imageUris.length > 0) {
      try {
        uploadedImageIds = await uploadImages();
      } catch {
        Alert.alert("Error", "Failed to upload images");
        return;
      }
    }

    try {
      const ok = await updateStore(params.id, {
        ownerId: user.$id,
        name,
        category,
        address,
        phone: phone.replace(/\D/g, "") || undefined,
        description,
        latitude,
        longitude,
        images: uploadedImageIds,
      });

      if (!ok) {
        Alert.alert("Error", "Failed to update store");
        return;
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
      return;
    }

    Alert.alert("Success", "Store updated");
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
          <Text className="text-2xl font-rubik-bold">Edit Store</Text>
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
          <Picker selectedValue={category} onValueChange={(v) => setCategory(v)}>
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
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="border border-primary-200 rounded-lg px-4 py-3 mt-1"
        />

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
          New Images{" "}
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
                    position: "absolute",
                    top: -6,
                    right: -6,
                    backgroundColor: "#ef4444",
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    alignItems: "center",
                    justifyContent: "center",
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
                  width: 90,
                  height: 90,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: "#a8c5fa",
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
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
          className="bg-primary-200 py-3 rounded-full mt-4"
        >
          <Text className="text-center font-rubik-bold">Use My Current Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/pick-location")}
          className="bg-primary-200 py-3 rounded-full mt-3"
        >
          <Text className="text-center font-rubik-bold">Pick Location from Map</Text>
        </TouchableOpacity>

        {latitude && longitude && (
          <Text className="text-sm text-green-600 mt-2">Location selected ✓</Text>
        )}

        {latitude && longitude && (
          <View className="mt-4 rounded-xl overflow-hidden border border-primary-200">
            <MapView
              style={{ width: "100%", height: 300 }}
              region={{
                latitude,
                longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              onPress={(e) => {
                setLatitude(e.nativeEvent.coordinate.latitude);
                setLongitude(e.nativeEvent.coordinate.longitude);
              }}
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

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary-300 py-4 rounded-full mt-10"
        >
          <Text className="text-white text-center font-rubik-bold text-lg">
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditStore;
