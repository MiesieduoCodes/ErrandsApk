"use client"

import { useEffect, useState } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as Notifications from "expo-notifications"
import NetInfo from "@react-native-community/netinfo"

// Screens
import SplashScreen from "./screens/SplashScreen"
import OnboardingScreen from "./screens/OnboardingScreen"
import AuthScreen from "./screens/AuthScreen"
import ErrandDetailsScreen from "./screens/ErrandDetailsScreen"
import NewChatScreen from "./screens/NewChatScreen"
import ChatScreen from "./screens/ChatScreen"
import NearbyScreen from "./screens/NearbyScreen" // Ensure the file name is correct
import HelpCenterScreen from "./screens/HelpCenterScreen" // Ensure the file name and path are correct
import ActivityScreen from "./screens/ActivityScreen"
import SearchScreen from "./screens/SearchScreen"
import ErrandsScreen from "./screens/ErrandsScreen" // Ensure the file name is correct
import AboutScreen from "./screens/About"

import SettingsScreen from "./screens/SettingsScreen"
import Notification from "./screens/NotificationsScreen"
import IdentityVerificationScreen from "./screens/IdentityVerificationScreen"
import Payment from "./screens/PaymentScreen"
import BusinessHoursScreen from "./screens/BusinessHours"
import ContactSupport from "./screens/ContactSupport"
import SwitchRole from "./screens/SwitchRoleScreen"
import PasswordResetScreen from "./screens/PasswordResetScreen"
import MainTabNavigator from "./navigation/MainTabNavigator"
import ChatListScreen from "./screens/ChatListScreen"
import TermsAndPrivacyScreen from "./screens/TermsAndPrivacy"
// Components
import OfflineIndicator from "./components/OfflineIndicator"

// Context
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider } from "./context/AuthContext"

// Services
import { setupDeepLinkListener } from "./services/socialSharing"

const Stack = createNativeStackNavigator()

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Check if it's the first time the app is launched
    const checkFirstLaunch = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched")
        if (hasLaunched === null) {
          // First time launching the app
          setIsFirstLaunch(true)
          await AsyncStorage.setItem("hasLaunched", "true")
        } else {
          setIsFirstLaunch(false)
        }
      } catch (error) {
        console.error("Error checking first launch:", error)
        setIsFirstLaunch(false)
      } finally {
        // Simulate loading time
        setTimeout(() => {
          setIsLoading(false)
        }, 10000) // Reduced time for quicker testing
      }
    }

    checkFirstLaunch()

    // Set up notification listeners
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification)
    })

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response received:", response)
      // Handle notification tap
    })

    // Set up network connectivity listener
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    // Set up deep link listener
    const deepLinkUnsubscribe = setupDeepLinkListener((data) => {
      console.log("Deep link received:", data)
      // Handle deep links
    })

    return () => {
      subscription.remove()
      responseSubscription.remove()
      netInfoUnsubscribe()
      if (deepLinkUnsubscribe) deepLinkUnsubscribe()
    }
  }, [])

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <NavigationContainer>
            <OfflineIndicator />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {isFirstLaunch && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="Payment" component={Payment} />
              <Stack.Screen name="ContactSupport" component={ContactSupport} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="About" component={AboutScreen} />
              <Stack.Screen name="BusinessHours" component={BusinessHoursScreen} />
              <Stack.Screen name="ChatList" component={ChatListScreen} />
              <Stack.Screen name="NewChat" component={NewChatScreen} />
              <Stack.Screen name="Notification" component={Notification} />
              <Stack.Screen name="SwitchRole" component={SwitchRole} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Nearby" component={NearbyScreen} />
              <Stack.Screen name="TermsAndPrivacy" component={TermsAndPrivacyScreen} />
              <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
              <Stack.Screen name="Errands" component={ErrandsScreen} />
              <Stack.Screen name="Activity" component={ActivityScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
              <Stack.Screen name="ErrandDetails" component={ErrandDetailsScreen} />
              <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}