"use client"

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"

// Screens
import HomeScreen from "../screens/runner/HomeScreen"
import EarningsScreen from "../screens/runner/EarningsScreen"
import ActivityScreen from "../screens/ActivityScreen"
import ChatListScreen from "../screens/ChatListScreen"
import ProfileScreen from "../screens/ProfileScreen"

// Services
import { chatService } from "../services/chat"
import { notificationService } from "../services/notification"

// Theme
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useEffect, useState } from "react"

const Tab = createBottomTabNavigator()

// Define valid icon names to fix TypeScript error
type IconName =
  | "map"
  | "map-outline"
  | "wallet"
  | "wallet-outline"
  | "time"
  | "time-outline"
  | "chatbubbles"
  | "chatbubbles-outline"
  | "person"
  | "person-outline"

const RunnerTabNavigator = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (!user) return

    // Check for unread messages
    const checkUnreadMessages = async () => {
      try {
        const count = await chatService.getUnreadMessageCount(user.id)
        setUnreadMessages(count)
      } catch (error) {
        console.error("Error checking unread messages:", error)
      }
    }

    // Check for unread notifications
    const checkUnreadNotifications = async () => {
      try {
        const notifications = await notificationService.getUserNotifications(user.id)
        const unreadCount = notifications.filter((notification) => !notification.read).length
        setUnreadNotifications(unreadCount)
      } catch (error) {
        console.error("Error checking unread notifications:", error)
      }
    }

    // Initial check
    checkUnreadMessages()
    checkUnreadNotifications()

    // Set up interval to check periodically
    const interval = setInterval(() => {
      checkUnreadMessages()
      checkUnreadNotifications()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [user])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.text + "80", // 50% opacity
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: IconName = "map-outline" // Default icon

          if (route.name === "Home") {
            iconName = focused ? "map" : "map-outline"
          } else if (route.name === "Earnings") {
            iconName = focused ? "wallet" : "wallet-outline"
          } else if (route.name === "Activity") {
            iconName = focused ? "time" : "time-outline"
          } else if (route.name === "Messages") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline"
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.accent,
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default RunnerTabNavigator