"use client"
import { useEffect, useState, useRef } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Animated } from "react-native"
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
  isCenter?: boolean;
}

type TabBarProps = {
  navigationState: NavigationState<TabRoute>;
  setIndex: (index: number) => void;
}

const MainTabNavigator = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const layout = useWindowDimensions()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [index, setIndex] = useState(0)
  const [routes, setRoutes] = useState<TabRoute[]>([])
  
  // Animation references for each tab
  const tabAnimations = useRef<Animated.Value[]>([]).current

  useEffect(() => {
    if (!user) return

    // Define routes based on user type
    const userRoutes: TabRoute[] = []
    if (user.userType === 'buyer') {
      userRoutes.push(
        { key: 'home', title: 'Home', icon: 'home' },
        { key: 'errands', title: 'Airands', icon: 'list' },
        { key: 'search', title: 'Search', icon: 'search', isCenter: true },
        { key: 'messages', title: 'Messages', icon: 'chatbubbles', badge: unreadMessages },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    } else if (user.userType === 'seller') {
      userRoutes.push(
        { key: 'dashboard', title: 'Dashboard', icon: 'grid' },
        { key: 'products', title: 'Products', icon: 'cube' },
        { 
          key: 'orders', 
          title: 'Orders', 
          icon: 'cart',
          isCenter: true // Mark this as center tab
        },
        { 
          key: 'messages', 
          title: 'Messages', 
          icon: 'chatbubbles', 
          badge: unreadMessages 
        },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    } else if (user.userType === 'runner') {
      userRoutes.push(
        { key: 'home', title: 'Home', icon: 'home' },
        { key: 'earnings', title: 'Earnings', icon: 'wallet' },
        { 
          key: 'activity', 
          title: 'Activity', 
          icon: 'time',
          isCenter: true // Mark this as center tab
        },
        { 
          key: 'messages', 
          title: 'Messages', 
          icon: 'chatbubbles', 
          badge: unreadMessages 
        },
        { key: 'profile', title: 'Profile', icon: 'person' }
      )
    }
    setRoutes(userRoutes)
    
    // Initialize animations for each tab
    tabAnimations.length = 0
    userRoutes.forEach((_, i) => {
      tabAnimations[i] = new Animated.Value(i === index ? 1 : 0)
    })

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

  // Handle tab change with animation
  const handleTabChange = (newIndex: number) => {
    // Reset all animations
    tabAnimations.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start()
    })
    
    // Animate the selected tab
    Animated.sequence([
      Animated.timing(tabAnimations[newIndex], {
        toValue: 1.3, // Scale up
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(tabAnimations[newIndex], {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start()
    
    setIndex(newIndex)
  }

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
            borderRadius: 30,
            marginHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}>
          {props.navigationState.routes.map((route: TabRoute, i: number) => {
            const isActive = i === props.navigationState.index
            const iconName = isActive ? route.icon : `${route.icon}-outline`
            
            // Animation values
            const scale = tabAnimations[i].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2]
            })
            
            return (
              <TouchableOpacity
                key={route.key}
                style={[
                  styles.tabItem,
                  route.isCenter && styles.centerTabItem,
                  route.isCenter && { 
                    backgroundColor: isActive 
                      ? theme.primary
                      : theme.primary + '80',
                    transform: [{ translateY: -20 }],
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }
                ]}
                onPress={() => handleTabChange(i)}
                activeOpacity={0.7}
              >
                <Animated.View style={[
                  styles.iconContainer,
                  route.isCenter && styles.centerIconContainer,
                  { transform: [{ scale }] }
                ]}>
                  <Ionicons
                    name={iconName as any}
                    size={route.isCenter ? 28 : 24}
                    color={isActive || route.isCenter ? (route.isCenter ? 'white' : theme.primary) : theme.text + "80"}
                  />
                  {route.badge && route.badge > 0 && (
                    <View style={[
                      styles.badge, 
                      { 
                        backgroundColor: theme.accent,
                        right: route.isCenter ? -10 : -8,
                        top: route.isCenter ? -10 : -4
                      }
                    ]}>
                      <Text style={styles.badgeText}>
                        {route.badge > 9 ? '9+' : route.badge}
                      </Text>
                    </View>
                  )}
                </Animated.View>
                {!route.isCenter && (
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isActive ? theme.primary : theme.text + "80",
                        opacity: isActive ? 1 : 0.7,
                      },
                    ]}
                  >
                    {route.title}
                  </Text>
                )}
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
        onIndexChange={handleTabChange}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => renderTabBar({ navigationState: { index, routes }, setIndex: handleTabChange })}
        swipeEnabled={true}
        animationEnabled={true}
        lazy={true}
        lazyPreloadDistance={1}
        tabBarPosition="bottom"
        style={{ marginBottom: 10 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    height: '100%',
  },
  centerTabItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
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