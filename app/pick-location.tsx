import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, TouchableOpacity, Text } from "react-native";
import { useState } from "react";
import { router } from "expo-router";

export default function PickLocation() {
  const [point, setPoint] = useState<any>(null);

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={(e) => setPoint(e.nativeEvent.coordinate)}
      >
        {point && <Marker coordinate={point} />}
      </MapView>

      {point && (
        <TouchableOpacity
          className="absolute bottom-10 self-center bg-primary-300 px-6 py-3 rounded-full"
          onPress={() =>
            router.replace({
              pathname: "/add-store",
              params: {
                lat: point.latitude,
                lng: point.longitude,
              },
            })
          }
        >
          <Text className="text-white font-rubik-bold">
            Confirm Location
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
