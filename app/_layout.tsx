import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { LogBox, Text, View } from "react-native";
import React from "react";

import "./globals.css";
import GlobalProvider from "@/lib/global-provider";
import { wakeBackend } from "@/lib/api";

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);

// Prevent splash from auto-hiding (important)
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Simple global error boundary
 * Catches render-time crashes and prevents white screen
 */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("🔥 Global crash caught:", error, info);

    // 🔴 If you later add Sentry, report here:
    // Sentry.Native.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-xl font-rubik-bold mb-2">
            Something went wrong
          </Text>
          <Text className="text-gray-500 text-center">
            Please restart the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    wakeBackend();
  }, []);

  // 🔒 Block render until fonts are ready
  if (!fontsLoaded) {
    return null;
  }

  return (
    <RootErrorBoundary>
      <GlobalProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GlobalProvider>
    </RootErrorBoundary>
  );
}
