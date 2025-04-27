"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { createStackNavigator } from "@react-navigation/stack"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { ActivityIndicator, View, Text, StyleSheet } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

// Auth Screens
import AuthScreen from "../screens/AuthScreen"
import PasswordResetScreen from "../screens/PasswordResetScreen"
import OnboardingScreen from "../screens/OnboardingScreen"

// Role-specific Tab Navigators
import BuyerTabNavigator from "./BuyerTabNavigator"
import SellerTabNavigator from "./SellerTabNavigator"
import RunnerTabNavigator from "./RunnerTabNavigator"

// Common Screens
import AboutScreen from "../screens/About"
import BusinessHoursScreen from "../screens/BusinessHours"
import BusinessLocationScreen from "../screens/BusinessLocation"
import ContactSupport from "../screens/ContactSupport"
import ErrandDetailsScreen from "../screens/ErrandDetailsScreen"
import NewChatScreen from "../screens/NewChatScreen"
import TermsAndPrivacyScreen from "../screens/TermsAndPrivacy"
import ChatScreen from "../screens/ChatScreen"
import Notification from "../screens/NotificationsScreen"
import IdentityVerificationScreen from "../screens/IdentityVerificationScreen"
import Payment from "../screens/PaymentScreen"
import SwitchRole from "../screens/SwitchRoleScreen"
import HelpCenterScreen from "../screens/HelpCenterScreen"

// Context
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import type { UserType } from "../types"

const Stack = createStackNavigator()

// Define the props type for OnboardingScreen
interface OnboardingProps {
  onComplete: () => Promise<void>
}

const MainNavigator = () => {
  const { user, isLoading: authLoading, userType, setUserType } = useAuth()
  const { theme } = useTheme()
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null)
  const [isCheckingFirstLaunch, setIsCheckingFirstLaunch] = useState(true)
  const [currentNavigator, setCurrentNavigator] = useState<React.ComponentType<any> | null>(null)

  // This effect runs when the component mounts to check if it's the first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem("hasLaunched")
        if (value === null) {
          await AsyncStorage.setItem("hasLaunched", "true")
          setIsFirstLaunch(true)
        } else {
          setIsFirstLaunch(false)
        }
      } catch (error) {
        console.error("Error checking first launch:", error)
        setIsFirstLaunch(false)
      } finally {
        setIsCheckingFirstLaunch(false)
      }
    }

    checkFirstLaunch()
  }, [])

  // This effect runs when the component mounts to check if the user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem("hasOnboarded")
        setHasOnboarded(value === "true")
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      }
    }

    checkOnboarding()
  }, [])

  // This effect runs when the user or userType changes to update the current navigator
  useEffect(() => {
    if (user) {
      const checkUserType = async () => {
        try {
          // Get the stored user type from AsyncStorage
          const storedUserType = (await AsyncStorage.getItem("userType")) as UserType | null

          // If we have a stored user type, use it
          const currentUserType = storedUserType || userType || "buyer"
          console.log("MainNavigator - Setting navigator based on user type:", currentUserType)

          // Update the auth context if needed
          if (setUserType && currentUserType !== userType) {
            setUserType(currentUserType as UserType)
          }

          // Set the appropriate navigator based on user type
          switch (currentUserType) {
            case "seller":
              console.log("MainNavigator - Setting SellerTabNavigator")
              setCurrentNavigator(SellerTabNavigator)
              break
            case "runner":
              console.log("MainNavigator - Setting RunnerTabNavigator")
              setCurrentNavigator(RunnerTabNavigator)
              break
            case "buyer":
            default:
              console.log("MainNavigator - Setting BuyerTabNavigator")
              setCurrentNavigator(BuyerTabNavigator)
              break
          }
        } catch (error) {
          console.error("Error checking user type:", error)
          setCurrentNavigator(BuyerTabNavigator) // Default to buyer
        }
      }

      checkUserType()
    } else {
      setCurrentNavigator(null)
    }
  }, [user, userType])

  // Add this debugging code to help identify issues with role switching
  useEffect(() => {
    console.log("MainNavigator - Current user type:", userType)
    console.log("MainNavigator - Current navigator:", currentNavigator?.name || "None")
  }, [userType, currentNavigator])

  // This effect runs when the screen comes into focus to check for userType changes
  useFocusEffect(
    useCallback(() => {
      if (user) {
        const checkUserType = async () => {
          try {
            console.log("Checking user type on focus")
            const storedUserType = (await AsyncStorage.getItem("userType")) as UserType | null
            console.log("Stored user type:", storedUserType, "Current user type:", userType)

            if (storedUserType && storedUserType !== userType) {
              console.log("User type changed, updating navigator")
              // If the stored userType is different from the current userType,
              // update the current navigator
              switch (storedUserType) {
                case "seller":
                  setCurrentNavigator(SellerTabNavigator)
                  break
                case "runner":
                  setCurrentNavigator(RunnerTabNavigator)
                  break
                case "buyer":
                default:
                  setCurrentNavigator(BuyerTabNavigator)
                  break
              }

              // Update the auth context
              if (setUserType) {
                setUserType(storedUserType as UserType)
              }
            }
          } catch (error) {
            console.error("Error checking user type:", error)
          }
        }

        checkUserType()
      }
    }, [user, userType]),
  )

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem("hasOnboarded", "true")
      setHasOnboarded(true)
    } catch (error) {
      console.error("Error setting onboarding status:", error)
    }
  }

  if (authLoading || isCheckingFirstLaunch) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    )
  }

  // Determine which tab navigator to use based on user role
  const TabNavigator = currentNavigator || BuyerTabNavigator

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isFirstLaunch === true && !hasOnboarded && !user ? (
        // Onboarding Flow
        <Stack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen
              {...props}
              // @ts-ignore - We know this prop exists even if TypeScript doesn't
              onComplete={handleOnboardingComplete}
            />
          )}
        </Stack.Screen>
      ) : !user ? (
        // Auth Flow
        <>
          <Stack.Screen name="AuthScreen" component={AuthScreen} />
          <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
        </>
      ) : (
        // Main App Flow
        <>
          <Stack.Screen name="TabNavigator" component={TabNavigator} />
          <Stack.Screen name="ErrandDetails" component={ErrandDetailsScreen} />
          <Stack.Screen name="ContactSupport" component={ContactSupport} />
          <Stack.Screen name="NewChat" component={NewChatScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="TermsAndPrivacy" component={TermsAndPrivacyScreen} />
          <Stack.Screen name="BusinessHours" component={BusinessHoursScreen} />
          <Stack.Screen name="BusinessLocation" component={BusinessLocationScreen} />
          <Stack.Screen name="Notification" component={Notification} />
          <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
          <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
          <Stack.Screen name="Payment" component={Payment} />
          <Stack.Screen name="SwitchRole" component={SwitchRole} />
        </>
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
})

export default MainNavigator
