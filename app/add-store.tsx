import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";

import { useGlobalContext } from "@/lib/global-provider";
import { createStore } from "@/lib/api";
import { categories } from "@/constants/data";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker } from "react-native-maps";
import * as ImagePicker from "expo-image-picker";






const AddStore = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  // ─────────────────────────────
  // Form State
  // ─────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        Alert.alert("Permission denied");
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
    });

    if (!result.canceled) {
        setImageUri(result.assets[0].uri);
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setLatitude(loc.coords.latitude);
    setLongitude(loc.coords.longitude);
  };

  // ─────────────────────────────
  // Submit
  // ─────────────────────────────
  const handleSubmit = async () => {
    if (!name || !category || !address || !description) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert("Error", "Please select store location");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    if (!category) {
        Alert.alert("Error", "Please select a store category");
        return;
    }


    const success = await createStore({
      name,
      category,
      address,
      description,
      latitude,
      longitude,
      ownerId: user.$id,
    });

    if (success) {
      Alert.alert("Success", "Store created");
      router.back();
    } else {
      Alert.alert("Error", "Failed to create store");
    }
  };

  return (
    <SafeAreaView className="h-full bg-white">
      <ScrollView contentContainerClassName="px-6 pb-32">
        <Text className="text-2xl font-rubik-bold mt-6">
          Add New Store
        </Text>

        {/* Name */}
        <TextInput
          placeholder="Store Name"
          value={name}
          onChangeText={setName}
          className="border border-primary-200 rounded-lg px-4 py-3 mt-6"
        />

        {/* Category */}
        <View className="border border-primary-200 rounded-lg mt-4">
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
        <TextInput
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
          className="border border-primary-200 rounded-lg px-4 py-3 mt-4"
        />

        {/* Description */}
        <TextInput
          placeholder="About Store"
          value={description}
          onChangeText={setDescription}
          multiline
          className="border border-primary-200 rounded-lg px-4 py-3 mt-4 h-28"
        />

        {/* Location */}
        <Text className="text-lg font-rubik-bold mt-8">
          Store Location
        </Text>

        <TouchableOpacity
          onPress={useCurrentLocation}
          className="bg-primary-200 py-3 rounded-full mt-4"
        >
          <Text className="text-center font-rubik-bold">
            Use My Current Location
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



        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary-300 py-4 rounded-full mt-10"
        >
          <Text className="text-white text-center font-rubik-bold text-lg">
            Create Store
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddStore;
