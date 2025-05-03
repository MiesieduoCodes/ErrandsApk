module.exports = {
    name: "Airands App",
    slug: "airands-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#4361ee",
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/9a47f7ae-fcbb-4262-969b-4dc631f16e54",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.miesieduo.Airand",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      package: "com.miesieduo.Airand",
    },
    web: {
      favicon: "./assets/logo.png",
    },
    scheme: "airandsapp",
    plugins: [
      "@react-native-google-signin/google-signin",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
        },
      ],
    ],
    runtimeVersion: {
      policy: "sdkVersion",
    },
    extra: {
      eas: {
        projectId: "9a47f7ae-fcbb-4262-969b-4dc631f16e54",
        android: {
          sha1: "63:92:FB:19:95:BE:9A:05:4A:E0:B9:35:FC:29:ED:91:CD:25:9C:9A",
          sha256: "F3:58:07:BA:65:85:E1:10:0E:84:B7:2D:8D:F9:F9:B3:03:E6:41:10:BC:9C:2A:E0:47:E8:D4:19:AA:51:01:F5",
        },
      },
    },
  };
  