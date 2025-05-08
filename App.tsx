"use client"

import { useEffect, useState } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as Notifications from "expo-notifications"
import NetInfo from "@react-native-community/netinfo"
import { View, Text } from "react-native"
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

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [navigationError, setNavigationError] = useState<string | null>(null)

  useEffect(() => {
    // Check if it's the first time the app is launched
    const initializeApp = async () => {
      try {
        // Ensure JS runtime is ready
        await new Promise((resolve) => setTimeout(resolve, 1000))

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
        // Simulate loading time to ensure Firebase is ready
        setTimeout(() => {
          setIsLoading(false)
        }, 3000) // Increased time to ensure Firebase initialization
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
  }, [])

  if (isLoading) {
    return <SplashScreen />
  }

  if (navigationError) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 20, textAlign: "center" }}>
            There was an error initializing the app. Please restart.
          </Text>
          <Text style={{ color: "gray", fontSize: 14 }}>{navigationError.toString()}</Text>
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <FirebaseProvider>
        <AuthProvider>
          <ThemeProvider>
            <NavigationContainer
              onReady={() => console.log("Navigation container is ready")}
              fallback={<SplashScreen />}
            >
              <OfflineIndicator />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isFirstLaunch && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
                <Stack.Screen name="AuthScreen" component={AuthScreen} />
                <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
                <Stack.Screen name="Main" component={MainTabNavigator} />
              </Stack.Navigator>
            </NavigationContainer>
          </ThemeProvider>
        </AuthProvider>
      </FirebaseProvider>
    </SafeAreaProvider>
  )
}
