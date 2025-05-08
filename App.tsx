"use client"

import { useEffect, useState } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as Notifications from "expo-notifications"
import NetInfo from "@react-native-community/netinfo"
import { View, Text, ActivityIndicator } from "react-native"
import Constants from "expo-constants"

// Screens
import SplashScreen from "./screens/SplashScreen"
import OnboardingScreen from "./screens/OnboardingScreen"
import AuthScreen from "./screens/AuthScreen"
import PasswordResetScreen from "./screens/PasswordResetScreen"
import MainTabNavigator from "./navigation/MainTabNavigator"

// Components
import OfflineIndicator from "./components/OfflineIndicator"

// Context
import { ThemeProvider } from "./context/ThemeContext"
import { FirebaseProvider } from "./context/FirebaseContext"
import { AuthProvider } from "./context/AuthContext"
import { useFirebase } from "./context/FirebaseContext"

const Stack = createNativeStackNavigator()

// Configure notification behavior only if not in Expo Go
if (!Constants.appOwnership || Constants.appOwnership !== "expo") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// Create a wrapper component that waits for Firebase to be ready
const AppContent = () => {
  const { isFirebaseReady } = useFirebase()
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [navigationError, setNavigationError] = useState<string | null>(null)

  useEffect(() => {
    // Check if it's the first time the app is launched
    const initializeApp = async () => {
      try {
        // Wait for Firebase to be ready
        if (!isFirebaseReady) {
          console.log("Waiting for Firebase to be ready...")
          return
        }

        console.log("Firebase is ready, continuing app initialization")
        const hasLaunched = await AsyncStorage.getItem("hasLaunched")
        if (hasLaunched === null) {
          // First time launching the app
          setIsFirstLaunch(true)
          await AsyncStorage.setItem("hasLaunched", "true")
        } else {
          setIsFirstLaunch(false)
        }
      } catch (error) {
        console.error("Error initializing app:", error)
        setIsFirstLaunch(false)
      } finally {
        // Only set loading to false if Firebase is ready
        if (isFirebaseReady) {
          setIsLoading(false)
        }
      }
    }

    initializeApp()

    // Set up network connectivity listener
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    return () => {
      netInfoUnsubscribe()
    }
  }, [isFirebaseReady])

  if (!isFirebaseReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 20 }}>{!isFirebaseReady ? "Initializing Firebase..." : "Loading app..."}</Text>
      </View>
    )
  }

  if (navigationError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
          There was an error initializing the app. Please restart.
        </Text>
        <Text style={{ color: "gray", fontSize: 14 }}>{navigationError.toString()}</Text>
      </View>
    )
  }

  return (
    <NavigationContainer onReady={() => console.log("Navigation container is ready")} fallback={<SplashScreen />}>
      <OfflineIndicator />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
        <Stack.Screen name="AuthScreen" component={AuthScreen} />
        <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FirebaseProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </FirebaseProvider>
    </SafeAreaProvider>
  )
}
