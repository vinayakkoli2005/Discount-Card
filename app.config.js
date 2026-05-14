export default {
  expo: {
    name: "Volo",
    owner: "vinayaksensei",
    slug: "discount-card",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/Logo.png",
    scheme: "appwrite-callback-695272a5002c9fe4b025",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ds.discountcard",
      buildNumber: "1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Allow $(PRODUCT_NAME) to use your location to show nearby stores.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Allow $(PRODUCT_NAME) to use your location to show nearby stores.",
        NSPhotoLibraryUsageDescription:
          "The app accesses your photos to let you attach images to your store listings.",
        NSCameraUsageDescription:
          "The app uses your camera to let you take photos for store listings.",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/Logo.png",
        backgroundColor: "#ffffff",
      },
      package: "com.ds.discountcard",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "READ_MEDIA_IMAGES",
        "READ_EXTERNAL_STORAGE",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          resizeMode: "cover",
          backgroundColor: "#ffffff",
          enableFullScreenImage_legacy: true,
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/Rubik-Bold.ttf",
            "./assets/fonts/Rubik-ExtraBold.ttf",
            "./assets/fonts/Rubik-Light.ttf",
            "./assets/fonts/Rubik-Medium.ttf",
            "./assets/fonts/Rubik-Regular.ttf",
            "./assets/fonts/Rubik-SemiBold.ttf",
          ],
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "The app accesses your photos to let you attach images to your store listings.",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow $(PRODUCT_NAME) to use your location to show nearby stores.",
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: "566fcd96-fbd7-4b0d-a150-7667c2b319f6",
      },
    },
  },
};
