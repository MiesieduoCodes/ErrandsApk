"use client"
import { useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { TabView, SceneMap, NavigationState, Route } from "react-native-tab-view"
import { useWindowDimensions } from "react-native"

// Common Screens
import ProfileScreen from "../screens/ProfileScreen"
import ChatListScreen from "../screens/ChatListScreen"
import ActivityScreen from "../screens/ActivityScreen"

// Buyer Screens
import BuyerHomeScreen from "../screens/buyer/HomeScreen"
import ErrandsScreen from "../screens/ErrandsScreen"
import SearchScreen from "../screens/SearchScreen"

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

type TabRoute = Route & {
  icon: string;
  badge?: number;
}

type TabBarProps = {
  navigationState: NavigationState<TabRoute>;
  position: any;
  jumpTo: (key: string) => void;
}

const MainTabNavigator = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const layout = useWindowDimensions()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [index, setIndex] = useState(0)
  const [routes, setRoutes] = useState<TabRoute[]>([])

  useEffect(() => {
    if (!user) return

    // Define routes based on user type
    const userRoutes: TabRoute[] = []
    if (user.userType === 'buyer') {
      userRoutes.push(
        { key: 'home', title: 'Home', icon: 'home' },
        { key: 'errands', title: 'Errands', icon: 'list' },
        { key: 'search', title: 'Search', icon: 'search' },
        { key: 'messages', title: 'Messages', icon: 'chatbubbles', badge: unreadMessages },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    } else if (user.userType === 'seller') {
      userRoutes.push(
        { key: 'dashboard', title: 'Dashboard', icon: 'grid' },
        { key: 'products', title: 'Products', icon: 'cube' },
        { key: 'orders', title: 'Orders', icon: 'cart' },
        { key: 'messages', title: 'Messages', icon: 'chatbubbles', badge: unreadMessages },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    } else if (user.userType === 'runner') {
      userRoutes.push(
        { key: 'home', title: 'Home', icon: 'home' },
        { key: 'earnings', title: 'Earnings', icon: 'wallet' },
        { key: 'activity', title: 'Activity', icon: 'time' },
        { key: 'messages', title: 'Messages', icon: 'chatbubbles', badge: unreadMessages },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    }
    setRoutes(userRoutes)

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
  }, [user, unreadMessages])

  // Create scene map based on user type
  const renderScene = SceneMap({
    // Buyer scenes
    home: BuyerHomeScreen,
    errands: ErrandsScreen,
    search: SearchScreen,
    messages: ChatListScreen,
    profile: ProfileScreen,
    
    // Seller scenes
    dashboard: SellerHomeScreen,
    products: ProductsScreen,
    orders: OrdersScreen,
    
    // Runner scenes
    earnings: EarningsScreen,
    activity: ActivityScreen,
  })

  const renderTabBar = (props: TabBarProps) => {
    return (
      <View style={styles.tabBarContainer}>
        <View style={[
          styles.tabBar, 
          { 
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }
        ]}>
          {props.navigationState.routes.map((route: TabRoute, i: number) => {
            const isActive = i === props.navigationState.index
            const iconName = isActive ? route.icon : `${route.icon}-outline`
            
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => props.jumpTo(route.key)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={iconName as any}
                    size={24}
                    color={isActive ? theme.primary : theme.text + "80"}
                  />
                  {route.badge && route.badge > 0 && (
                    <View style={[
                      styles.badge, 
                      { 
                        backgroundColor: theme.accent,
                        right: -8,
                        top: -4
                      }
                    ]}>
                      <Text style={styles.badgeText}>
                        {route.badge > 9 ? '9+' : route.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? theme.primary : theme.text + "80",
                    },
                  ]}
                >
                  {route.title}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
        swipeEnabled={true}
        animationEnabled={true}
        lazy={true}
        lazyPreloadDistance={1}
        tabBarPosition="bottom"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    height: '100%',
  },
  iconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
})

export default MainTabNavigator