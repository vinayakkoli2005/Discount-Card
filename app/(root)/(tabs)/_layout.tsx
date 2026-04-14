import { Tabs } from "expo-router";
import { Image } from "react-native";

import icons from "@/constants/icons";

const ACTIVE_COLOR = "#2563EB"; // blue-600
const INACTIVE_COLOR = "#9CA3AF"; // gray-400

export default function TabsLayout() {
  if (__DEV__) console.log("Profile icon:", icons.person);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          display: "none",
        },
      }}
    >
      {/* 🏠 Home */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.home}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
            />
          ),
        }}
      />

      {/* 🏪 My Store */}
      <Tabs.Screen
        name="my-stores"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.store}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
            />
          ),
        }}
      />

      {/* 👤 Profile (LAST) */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={icons.person}
              style={{
                width: 22,
                height: 22,
                tintColor: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
              }}
            />


          ),
        }}
      />
    </Tabs>
  );
}
