"use client"
import { useEffect, useState } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"
import { StyleSheet } from "react-native"

// Common Screens
import ProfileScreen from "../screens/ProfileScreen"
import ChatListScreen from "../screens/ChatListScreen"
import ActivityScreen from "../screens/ActivityScreen"

// Buyer Screens
import BuyerHomeScreen from "../screens/buyer/HomeScreen"
import ErrandsScreen from "../screens/ErrandsScreen"
import SearchScreen from "../screens/SearchScreen"
import HelpCenterScreen from "../screens/HelpCenterScreen"

// Seller Screens
import SellerHomeScreen from "../screens/seller/HomeScreen"
import ProductsScreen from "../screens/seller/ProductsScreen"
import OrdersScreen from "../screens/seller/OrdersScreen"

// Runner Screens
import RunnerHomeScreen from "../screens/runner/HomeScreen"
import EarningsScreen from "../screens/runner/EarningsScreen"

// Services
import { chatService } from "../services/chat"
import { notificationService } from "../services/notification"

// Theme and Auth
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

const Tab = createBottomTabNavigator()

const MainTabNavigator = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    if (!user) return

    const checkUnreadMessages = async () => {
      try {
        const count = await chatService.getUnreadMessageCount(user.id)
        setUnreadMessages(count)
      } catch (error) {
        console.error("Error checking unread messages:", error)
      }
    }

    const checkUnreadNotifications = async () => {
      try {
        const notifications = await notificationService.getUserNotifications(user.id)
        const unreadCount = notifications.filter((notification) => !notification.read).length
        setUnreadNotifications(unreadCount)
      } catch (error) {
        console.error("Error checking unread notifications:", error)
      }
    }

    checkUnreadMessages()
    checkUnreadNotifications()

    const interval = setInterval(() => {
      checkUnreadMessages()
      checkUnreadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  const renderBuyerTabs = () => (
    <>
      <Tab.Screen name="Home" component={BuyerHomeScreen} />
      <Tab.Screen name="Errands" component={ErrandsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.accent }
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </>
  )

  const renderSellerTabs = () => (
    <>
      <Tab.Screen name="Dashboard" component={SellerHomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.accent }
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </>
  )

  const renderRunnerTabs = () => (
    <>
      <Tab.Screen name="Home" component={RunnerHomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen
        name="Messages"
        component={ChatListScreen}
        options={{
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.accent }
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </>
  )

  const getTabIcon = (routeName: string, focused: boolean) => {
    const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
      // Buyer icons
      Home: { active: "home", inactive: "home-outline" },
      Errands: { active: "list", inactive: "list-outline" },
      Search: { active: "search", inactive: "search-outline" },
      
      // Seller icons
      Dashboard: { active: "grid", inactive: "grid-outline" },
      Products: { active: "cube", inactive: "cube-outline" },
      Orders: { active: "cart", inactive: "cart-outline" },
      
      // Runner icons
      Earnings: { active: "wallet", inactive: "wallet-outline" },
      Activity: { active: "time", inactive: "time-outline" },
      
      // Common icons
      Messages: { active: "chatbubbles", inactive: "chatbubbles-outline" },
      Profile: { active: "person", inactive: "person-outline" },
      Notify: { active: "notifications", inactive: "notifications-outline" }
    }

    const iconKey = routeName in iconMap ? routeName : "Home"
    return focused ? iconMap[iconKey].active : iconMap[iconKey].inactive
  }

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
        tabBarInactiveTintColor: theme.text + "80",
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabIcon(route.name, focused)
          return <Ionicons name={iconName} size={size} color={color} />
        },
      })}
    >
      {user?.userType === 'buyer' && renderBuyerTabs()}
      {user?.userType === 'seller' && renderSellerTabs()}
      {user?.userType === 'runner' && renderRunnerTabs()}
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -6,
    top: -3,
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
})

export default MainTabNavigator