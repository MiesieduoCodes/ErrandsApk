"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Animated,
  Platform,
  Alert,
  Vibration,
  Switch,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Share
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { notificationService, type Notification } from "../services/notification"
import * as Haptics from 'expo-haptics'
import AsyncStorage from "@react-native-async-storage/async-storage"
import { BlurView } from "expo-blur"
import LottieView from "lottie-react-native"

// Define your navigation param types
type RootStackParamList = {
  ErrandDetails: { errandId: string }
  Chat: { chatId: string }
  PaymentDetails: { paymentId: string }
  NotificationSettings: undefined
  UserProfile: { userId: string }
  // Add other screens here as needed
}

type NotificationSection = {
  title: string
  data: Notification[]
}

type NotificationCategory = {
  id: 'all' | 'unread' | 'errands' | 'messages' | 'payments' | 'system'
  name: string
  icon: string
  color: string
}

const ANIMATION_DURATION = 300
const { width } = Dimensions.get('window')

const NotificationsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'errands' | 'messages' | 'payments' | 'system'>('all')
  const [notificationSections, setNotificationSections] = useState<NotificationSection[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    errandsEnabled: true,
    messagesEnabled: true,
    paymentsEnabled: true,
    systemEnabled: true,
    doNotDisturbEnabled: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '07:00'
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showDoNotDisturbModal, setShowDoNotDisturbModal] = useState(false)
  const [showNotificationDetail, setShowNotificationDetail] = useState<Notification | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [pinnedNotifications, setPinnedNotifications] = useState<string[]>([])
  const [showTutorial, setShowTutorial] = useState(false)
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    unread: 0,
    errands: 0,
    messages: 0,
    payments: 0,
    system: 0
  })
  
  // Animation values
  const filterOptionsHeight = useRef(new Animated.Value(0)).current
  const settingsHeight = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const searchBarAnimation = useRef(new Animated.Value(0)).current
  const lottieRef = useRef<LottieView>(null)
  
  // Categories for filtering
  const categories: NotificationCategory[] = [
    { id: 'all', name: 'All', icon: 'notifications-outline', color: theme.primary },
    { id: 'unread', name: 'Unread', icon: 'mail-unread-outline', color: '#2196F3' },
    { id: 'errands', name: 'Errands', icon: 'bicycle-outline', color: '#4CAF50' },
    { id: 'messages', name: 'Messages', icon: 'chatbubble-outline', color: '#00BCD4' },
    { id: 'payments', name: 'Payments', icon: 'card-outline', color: '#FF9800' },
    { id: 'system', name: 'System', icon: 'information-circle-outline', color: '#9C27B0' }
  ]
  
  // Load notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications()
      loadNotificationSettings()
      loadPinnedNotifications()
      checkFirstTimeUser()
      return () => {}
    }, [user])
  )

  // Effect to organize notifications into sections
  useEffect(() => {
    organizeNotificationsIntoSections()
    calculateNotificationStats()
  }, [notifications, selectedFilter, searchQuery, pinnedNotifications])
  
  // Play animation when notification detail is shown
  useEffect(() => {
    if (showNotificationDetail && lottieRef.current) {
      lottieRef.current.play()
    }
  }, [showNotificationDetail])
  
  const checkFirstTimeUser = async () => {
    try {
      const hasSeenTutorial = await AsyncStorage.getItem('notificationTutorialSeen')
      if (!hasSeenTutorial) {
        setShowTutorial(true)
        await AsyncStorage.setItem('notificationTutorialSeen', 'true')
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error)
    }
  }
  
  const loadPinnedNotifications = async () => {
    try {
      const pinned = await AsyncStorage.getItem('pinnedNotifications')
      if (pinned) {
        setPinnedNotifications(JSON.parse(pinned))
      }
    } catch (error) {
      console.error("Error loading pinned notifications:", error)
    }
  }
  
  const savePinnedNotifications = async (pinned: string[]) => {
    try {
      await AsyncStorage.setItem('pinnedNotifications', JSON.stringify(pinned))
      setPinnedNotifications(pinned)
    } catch (error) {
      console.error("Error saving pinned notifications:", error)
    }
  }
  
  const togglePinNotification = (notificationId: string) => {
    const newPinned = pinnedNotifications.includes(notificationId)
      ? pinnedNotifications.filter(id => id !== notificationId)
      : [...pinnedNotifications, notificationId]
    
    savePinnedNotifications(newPinned)
    
    // Show feedback
    if (!pinnedNotifications.includes(notificationId)) {
      Alert.alert("Notification pinned", "This notification will stay at the top of your list")
    }
  }
  
  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings')
      if (settings) {
        setNotificationSettings(JSON.parse(settings))
      }
    } catch (error) {
      console.error("Error loading notification settings:", error)
    }
  }
  
  const saveNotificationSettings = async (settings: typeof notificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings))
      setNotificationSettings(settings)
    } catch (error) {
      console.error("Error saving notification settings:", error)
    }
  }

  const loadNotifications = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const userNotifications = await notificationService.getUserNotifications(user.id)
      
      // Sort notifications by date (newest first)
      const sortedNotifications = userNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setNotifications(sortedNotifications)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const calculateNotificationStats = () => {
    if (!notifications.length) {
      setNotificationStats({
        total: 0,
        unread: 0,
        errands: 0,
        messages: 0,
        payments: 0,
        system: 0
      })
      return
    }
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      errands: notifications.filter(n => 
        ['errand_request', 'errand_accepted', 'errand_started', 'errand_completed', 'errand_cancelled'].includes(n.type)
      ).length,
      messages: notifications.filter(n => n.type === 'new_message').length,
      payments: notifications.filter(n => 
        ['payment_received', 'payment_completed'].includes(n.type)
      ).length,
      system: notifications.filter(n => 
        !['errand_request', 'errand_accepted', 'errand_started', 'errand_completed', 'errand_cancelled', 'new_message', 'payment_received', 'payment_completed'].includes(n.type)
      ).length
    }
    
    setNotificationStats(stats)
  }
  
  const organizeNotificationsIntoSections = () => {
    // Filter notifications based on selected filter and search query
    let filteredNotifications = [...notifications]
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredNotifications = filteredNotifications.filter(n => 
        (n.title && n.title.toLowerCase().includes(query)) || 
        (n.body && n.body.toLowerCase().includes(query))
      )
    }
    
    // Apply category filter
    if (selectedFilter === 'unread') {
      filteredNotifications = filteredNotifications.filter(n => !n.read)
    } else if (selectedFilter === 'errands') {
      filteredNotifications = filteredNotifications.filter(n => 
        ['errand_request', 'errand_accepted', 'errand_started', 'errand_completed', 'errand_cancelled'].includes(n.type)
      )
    } else if (selectedFilter === 'messages') {
      filteredNotifications = filteredNotifications.filter(n => n.type === 'new_message')
    } else if (selectedFilter === 'payments') {
      filteredNotifications = filteredNotifications.filter(n => 
        ['payment_received', 'payment_completed'].includes(n.type)
      )
    } else if (selectedFilter === 'system') {
      filteredNotifications = filteredNotifications.filter(n => 
        !['errand_request', 'errand_accepted', 'errand_started', 'errand_completed', 'errand_cancelled', 'new_message', 'payment_received', 'payment_completed'].includes(n.type)
      )
    }
    
    // Create pinned section if there are pinned notifications
    const pinnedItems = filteredNotifications.filter(n => n.id && pinnedNotifications.includes(n.id))
    
    // Group by date
    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = new Date(today - 86400000).setHours(0, 0, 0, 0)
    
    const sections: NotificationSection[] = []
    
    // Add pinned section if there are pinned notifications
    if (pinnedItems.length > 0) {
      sections.push({ title: 'Pinned', data: pinnedItems })
    }
    
    // Regular date sections
    const regularSections = [
      { title: 'Today', data: [] as Notification[] },
      { title: 'Yesterday', data: [] as Notification[] },
      { title: 'This Week', data: [] as Notification[] },
      { title: 'Earlier', data: [] as Notification[] }
    ]
    
    // Filter out pinned items from regular sections
    const unpinnedItems = filteredNotifications.filter(n => !n.id || !pinnedNotifications.includes(n.id))
    
    unpinnedItems.forEach(notification => {
      const notificationDate = new Date(notification.createdAt).setHours(0, 0, 0, 0)
      
      if (notificationDate === today) {
        regularSections[0].data.push(notification)
      } else if (notificationDate === yesterday) {
        regularSections[1].data.push(notification)
      } else if (notificationDate >= today - 6 * 86400000) {
        regularSections[2].data.push(notification)
      } else {
        regularSections[3].data.push(notification)
      }
    })
    
    // Add non-empty regular sections
    regularSections.forEach(section => {
      if (section.data.length > 0) {
        sections.push(section)
      }
    })
    
    setNotificationSections(sections)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadNotifications()
    setIsRefreshing(false)
  }

  const handleNotificationPress = async (notification: Notification) => {
    if (!user || !notification.id) return
    
    // If in selection mode, toggle selection instead of navigating
    if (isDeleting) {
      toggleNotificationSelection(notification.id)
      return
    }

    try {
      // Provide haptic feedback
      if (notificationSettings.vibrationEnabled) {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } else {
          Vibration.vibrate(10)
        }
      }
      
      // Show notification detail
      setShowNotificationDetail(notification)
      
      // Mark as read if not already read
      if (!notification.read) {
        await notificationService.markNotificationAsRead(user.id, notification.id)

        // Update local state
        setNotifications((prevNotifications) =>
          prevNotifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
        )
      }

      // Animate the notification being pressed
      animateNotificationPress()
    } catch (error) {
      console.error("Error handling notification:", error)
    }
  }
  
  const navigateFromNotification = (notification: Notification) => {
    if (!notification.data) return
    
    // Close notification detail
    setShowNotificationDetail(null)
    
    // Navigate based on notification type
    switch (notification.type) {
      case "errand_request":
      case "errand_accepted":
      case "errand_started":
      case "errand_completed":
      case "errand_cancelled":
        if (notification.data.errandId) {
          navigation.navigate("ErrandDetails", { errandId: notification.data.errandId.toString() })
        }
        break
      case "new_message":
        if (notification.data.chatId) {
          navigation.navigate("Chat", { chatId: notification.data.chatId.toString() })
        }
        break
      case "payment_received":
      case "payment_completed":
        if (notification.data.paymentId) {
          navigation.navigate("PaymentDetails", { paymentId: notification.data.paymentId.toString() })
        }
        break
      default:
        // For system notifications, just close the detail view
        break
    }
  }
  
  const shareNotification = async (notification: Notification) => {
    try {
      await Share.share({
        message: `${notification.title}\n\n${notification.body}`,
        title: 'Share Notification'
      })
    } catch (error) {
      console.error("Error sharing notification:", error)
    }
  }
  
  const animateNotificationPress = () => {
    // Scale down
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      // Scale back up
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await notificationService.markAllNotificationsAsRead(user.id)
      setNotifications((prevNotifications) => prevNotifications.map((n) => ({ ...n, read: true })))
      
      // Show success message with animation
      if (lottieRef.current) {
        lottieRef.current.play()
      }
      
      Alert.alert("Success", "All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      Alert.alert("Error", "Failed to mark notifications as read")
    }
  }
  
  const toggleFilterOptions = () => {
    setShowFilterOptions(!showFilterOptions)
    
    Animated.timing(filterOptionsHeight, {
      toValue: showFilterOptions ? 0 : 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start()
  }
  
  const toggleSettings = () => {
    setShowSettings(!showSettings)
    
    Animated.timing(settingsHeight, {
      toValue: showSettings ? 0 : 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start()
  }
  
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    
    Animated.timing(searchBarAnimation, {
      toValue: showSearch ? 0 : 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start(() => {
      if (!showSearch) {
        // Focus the search input when opening
        setTimeout(() => {
          const searchInput = document.getElementById('notification-search-input')
          if (searchInput) {
            searchInput.focus()
          }
        }, 100)
      } else {
        // Clear search when closing
        setSearchQuery('')
      }
    })
  }
  
  const toggleDeleteMode = () => {
    setIsDeleting(!isDeleting)
    setSelectedNotifications([])
  }
  
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId)
      } else {
        return [...prev, notificationId]
      }
    })
  }
  
  const selectAllNotifications = () => {
    const allIds = notifications
      .filter(n => n.id)
      .map(n => n.id as string)
    
    setSelectedNotifications(allIds)
  }
  
  const deleteSelectedNotifications = async () => {
    if (!user || selectedNotifications.length === 0) return
    
    try {
      // Delete each notification individually
      await Promise.all(
        selectedNotifications.map(id => 
          notificationService.deleteNotification(user.id, id)
        )
      )
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => 
          notification.id && !selectedNotifications.includes(notification.id)
        )
      )
      
      // Remove from pinned if any were pinned
      const newPinned = pinnedNotifications.filter(id => !selectedNotifications.includes(id))
      if (newPinned.length !== pinnedNotifications.length) {
        savePinnedNotifications(newPinned)
      }
      
      // Reset selection mode
      setIsDeleting(false)
      setSelectedNotifications([])
      
      // Show success message
      Alert.alert("Success", `${selectedNotifications.length} notification(s) deleted`)
    } catch (error) {
      console.error("Error deleting notifications:", error)
      Alert.alert("Error", "Failed to delete notifications")
    }
  }
  
  const confirmDeleteSelected = () => {
    if (selectedNotifications.length === 0) {
      Alert.alert("No Notifications Selected", "Please select notifications to delete")
      return
    }
    
    Alert.alert(
      "Delete Notifications",
      `Are you sure you want to delete ${selectedNotifications.length} notification(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteSelectedNotifications }
      ]
    )
  }
  
  const clearAllNotifications = async () => {
    if (!user) return
    
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Delete notifications one by one since there's no bulk delete method
              const deletePromises = notifications
                .filter(n => n.id)
                .map(n => notificationService.deleteNotification(user.id, n.id as string))
              
              await Promise.all(deletePromises)
              setNotifications([])
              
              // Clear pinned notifications
              savePinnedNotifications([])
              
              Alert.alert("Success", "All notifications cleared")
            } catch (error) {
              console.error("Error clearing notifications:", error)
              Alert.alert("Error", "Failed to clear notifications")
            }
          } 
        }
      ]
    )
  }

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    if (!item.id) return null
    
    const isPinned = pinnedNotifications.includes(item.id)
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { 
              backgroundColor: item.read ? theme.card : theme.secondary + '20',
              borderColor: theme.border,
              borderLeftWidth: !item.read ? 4 : 1,
              borderLeftColor: !item.read ? theme.primary : theme.border,
            },
            isPinned && styles.pinnedNotification
          ]}
          onPress={() => handleNotificationPress(item)}
          onLongPress={() => {
            if (!isDeleting && item.id) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              toggleDeleteMode()
              toggleNotificationSelection(item.id)
            }
          }}
          activeOpacity={0.7}
          delayLongPress={500}
        >
          {isDeleting && (
            <View style={styles.checkboxContainer}>
              <View 
                style={[
                  styles.checkbox, 
                  { 
                    borderColor: theme.primary,
                    backgroundColor: selectedNotifications.includes(item.id) 
                      ? theme.primary 
                      : 'transparent' 
                  }
                ]}
              >
                {selectedNotifications.includes(item.id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </View>
          )}
          
          <View 
            style={[
              styles.notificationIcon, 
              { 
                backgroundColor: getNotificationColor(item.type, theme),
                opacity: item.read ? 0.7 : 1
              }
            ]}
          >
            {getNotificationIcon(item.type, "#fff")}
          </View>
          
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text 
                style={[
                  styles.notificationTitle, 
                  { 
                    color: theme.text,
                    fontWeight: item.read ? '500' : '700'
                  }
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              
              {isPinned && (
                <Ionicons name="pin" size={14} color={theme.primary} style={styles.pinIcon} />
              )}
            </View>
            
            <Text 
              style={[
                styles.notificationBody, 
                { 
                  color: theme.text + (item.read ? "70" : "90")
                }
              ]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
            
            <View style={styles.notificationFooter}>
              <Text style={[styles.notificationTime, { color: theme.text + "60" }]}>
                {formatTimestamp(item.createdAt)}
              </Text>
              
              <View style={styles.notificationBadge}>
                <Text style={[styles.notificationBadgeText, { color: getNotificationColor(item.type, theme) }]}>
                  {getNotificationTypeLabel(item.type)}
                </Text>
              </View>
            </View>
          </View>
          
          {!isDeleting && (
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => {
                Alert.alert(
                  "Notification Options",
                  "",
                  [
                    { 
                      text: item.read ? "Mark as unread" : "Mark as read", 
                      onPress: async () => {
                        if (!user || !item.id) return
                        try {
                          if (item.read) {
                            // Update notification read status
                            await notificationService.markNotificationAsRead(user.id, item.id)
                            setNotifications(prev =>
                              prev.map(n => n.id === item.id ? { ...n, read: false } : n)
                            )
                          } else {
                            await notificationService.markNotificationAsRead(user.id, item.id)
                          }
                          
                          // Update local state
                          setNotifications(prev => 
                            prev.map(n => n.id === item.id ? { ...n, read: !item.read } : n)
                          )
                        } catch (error) {
                          console.error("Error updating notification:", error)
                        }
                      }
                    },
                    {
                      text: isPinned ? "Unpin" : "Pin to top",
                      onPress: () => togglePinNotification(item.id as string)
                    },
                    {
                      text: "Share",
                      onPress: () => shareNotification(item)
                    },
                    { 
                      text: "Delete", 
                      style: "destructive",
                      onPress: async () => {
                        if (!user || !item.id) return
                        try {
                          await notificationService.deleteNotification(user.id, item.id)
                          
                          // Update local state
                          setNotifications(prev => prev.filter(n => n.id !== item.id))
                          
                          // Remove from pinned if it was pinned
                          if (isPinned) {
                            savePinnedNotifications(pinnedNotifications.filter(id => id !== item.id))
                          }
                        } catch (error) {
                          console.error("Error deleting notification:", error)
                        }
                      }
                    },
                    { text: "Cancel", style: "cancel" }
                  ]
                )
              }}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={theme.text + "60"} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    )
  }
  
  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.text + "90" }]}>
        {section.title}
      </Text>
      {section.title === 'Pinned' && (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              "Pinned Notifications",
              "Pinned notifications always appear at the top of your list",
              [
                { text: "OK" }
              ]
            )
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.text + "60"} />
        </TouchableOpacity>
      )}
    </View>
  )

  const getNotificationIcon = (type: string, color: string) => {
    switch (type) {
      case "errand_request":
        return <Ionicons name="add-circle" size={16} color={color} />
      case "errand_accepted":
        return <Ionicons name="checkmark-circle" size={16} color={color} />
      case "errand_started":
        return <Ionicons name="play-circle" size={16} color={color} />
      case "errand_completed":
        return <Ionicons name="checkmark-done-circle" size={16} color={color} />
      case "errand_cancelled":
        return <Ionicons name="close-circle" size={16} color={color} />
      case "new_message":
        return <Ionicons name="chatbubble" size={16} color={color} />
      case "payment_received":
        return <Ionicons name="arrow-down-circle" size={16} color={color} />
      case "payment_completed":
        return <Ionicons name="card" size={16} color={color} />
      case "system_update":
        return <Ionicons name="refresh-circle" size={16} color={color} />
      case "promotion":
        return <Ionicons name="gift" size={16} color={color} />
      default:
        return <Ionicons name="notifications" size={16} color={color} />
    }
  }
  
  const getNotificationColor = (type: string, theme: any) => {
    switch (type) {
      case "errand_request":
        return "#4CAF50" // Green
      case "errand_accepted":
        return "#2196F3" // Blue
      case "errand_started":
        return "#9C27B0" // Purple
      case "errand_completed":
        return "#4CAF50" // Green
      case "errand_cancelled":
        return "#F44336" // Red
      case "new_message":
        return "#00BCD4" // Cyan
      case "payment_received":
        return "#FF9800" // Orange
      case "payment_completed":
        return "#3F51B5" // Indigo
      case "system_update":
        return "#607D8B" // Blue Grey
      case "promotion":
        return "#E91E63" // Pink
      default:
        return theme.primary
    }
  }
  
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "errand_request":
        return "New Request"
      case "errand_accepted":
        return "Accepted"
      case "errand_started":
        return "Started"
      case "errand_completed":
        return "Completed"
      case "errand_cancelled":
        return "Cancelled"
      case "new_message":
        return "Message"
      case "payment_received":
        return "Payment"
      case "payment_completed":
        return "Payment"
      case "system_update":
        return "Update"
      case "promotion":
        return "Promo"
      default:
        return "System"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMs / 3600000)
    const diffDays = Math.round(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString()
    }
  }
  
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length
  }
  
  const filterOptionsMaxHeight = filterOptionsHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120]
  })
  
  const settingsMaxHeight = settingsHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320]
  })
  
  const searchBarHeight = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60]
  })
  
  const renderFilterOption = (category: NotificationCategory) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        selectedFilter === category.id && { 
          backgroundColor: category.color + '20',
          borderColor: category.color
        }
      ]}
      onPress={() => setSelectedFilter(category.id)}
    >
      <Ionicons 
        name={category.icon as any} 
        size={16} 
        color={selectedFilter === category.id ? category.color : theme.text + '70'} 
      />
      <Text 
        style={[
          styles.filterOptionText, 
          { 
            color: selectedFilter === category.id ? category.color : theme.text,
            fontWeight: selectedFilter === category.id ? '600' : '400'
          }
        ]}
      >
        {category.name}
      </Text>
      
      {/* Show count badge */}
      {getFilterCount(category.id) > 0 && (
        <View style={[styles.filterBadge, { backgroundColor: category.color }]}>
          <Text style={styles.filterBadgeText}>{getFilterCount(category.id)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
  
  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'all':
        return notificationStats.total
      case 'unread':
        return notificationStats.unread
      case 'errands':
        return notificationStats.errands
      case 'messages':
        return notificationStats.messages
      case 'payments':
        return notificationStats.payments
      case 'system':
        return notificationStats.system
      default:
        return 0
    }
  }
  
  const renderSettingItem = (
    label: string, 
    value: boolean, 
    onToggle: (newValue: boolean) => void,
    icon: string,
    description?: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={20} color={theme.text + '70'} style={styles.settingIcon} />
        <View>
          <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
          {description && (
            <Text style={[styles.settingDescription, { color: theme.text + '70' }]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.text + '30', true: theme.primary + '70' }}
        thumbColor={value ? theme.primary : theme.text + '50'}
        ios_backgroundColor={theme.text + '30'}
      />
    </View>
  )
  
  const renderCategoryStats = () => (
    <View style={[styles.statsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.statsTitle, { color: theme.text }]}>Notification Summary</Text>
      
      <View style={styles.statsGrid}>
        {categories.map(category => (
          <TouchableOpacity 
            key={category.id}
            style={[styles.statItem, { borderColor: theme.border }]}
            onPress={() => {
              setSelectedFilter(category.id)
              toggleFilterOptions()
            }}
          >
            <View style={[styles.statIconContainer, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={20} color={category.color} />
            </View>
            <Text style={[styles.statCount, { color: theme.text }]}>
              {getFilterCount(category.id)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text + '70' }]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
  
  const renderTutorial = () => (
    <Modal
      visible={showTutorial}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTutorial(false)}
    >
      <BlurView intensity={80} style={styles.tutorialContainer} tint={isDark ? "dark" : "light"}>
        <View style={[styles.tutorialContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.tutorialTitle, { color: theme.text }]}>Welcome to Notifications!</Text>
          
          <View style={styles.tutorialStep}>
            <View style={[styles.tutorialIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="pin" size={24} color={theme.primary} />
            </View>
            <View style={styles.tutorialStepContent}>
              <Text style={[styles.tutorialStepTitle, { color: theme.text }]}>Pin Important Notifications</Text>
              <Text style={[styles.tutorialStepText, { color: theme.text + '70' }]}>
                Long press or tap the options menu to pin important notifications to the top
              </Text>
            </View>
          </View>
          
          <View style={styles.tutorialStep}>
            <View style={[styles.tutorialIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="filter" size={24} color={theme.primary} />
            </View>
            <View style={styles.tutorialStepContent}>
              <Text style={[styles.tutorialStepTitle, { color: theme.text }]}>Filter & Search</Text>
              <Text style={[styles.tutorialStepText, { color: theme.text + '70' }]}>
                Use filters to quickly find specific types of notifications
              </Text>
            </View>
          </View>
          
          <View style={styles.tutorialStep}>
            <View style={[styles.tutorialIcon, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="settings" size={24} color={theme.primary} />
            </View>
            <View style={styles.tutorialStepContent}>
              <Text style={[styles.tutorialStepTitle, { color: theme.text }]}>Customize Settings</Text>
              <Text style={[styles.tutorialStepText, { color: theme.text + '70' }]}>
                Personalize your notification preferences in the settings menu
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.tutorialButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowTutorial(false)}
          >
            <Text style={styles.tutorialButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  )
  
  const renderNotificationDetail = () => {
    if (!showNotificationDetail) return null
    
    const notification = showNotificationDetail
    
    return (
      <Modal
        visible={!!showNotificationDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotificationDetail(null)}
      >
        <BlurView intensity={80} style={styles.detailContainer} tint={isDark ? "dark" : "light"}>
          <View style={[styles.detailContent, { backgroundColor: theme.card }]}>
            <View style={styles.detailHeader}>
              <TouchableOpacity 
                style={styles.detailCloseButton}
                onPress={() => setShowNotificationDetail(null)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              
              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={styles.detailActionButton}
                  onPress={() => {
                    if (notification.id) {
                      togglePinNotification(notification.id)
                    }
                  }}
                >
                  <Ionicons 
                    name={notification.id && pinnedNotifications.includes(notification.id) ? "pin" : "pin-outline"} 
                    size={20} 
                    color={theme.text} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.detailActionButton}
                  onPress={() => shareNotification(notification)}
                >
                  <Ionicons name="share-outline" size={20} color={theme.text} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.detailActionButton}
                  onPress={async () => {
                    if (!user || !notification.id) return
                    
                    try {
                      await notificationService.deleteNotification(user.id, notification.id)
                      
                      // Update local state
                      setNotifications(prev => prev.filter(n => n.id !== notification.id))
                      
                      // Remove from pinned if it was pinned
                      if (notification.id && pinnedNotifications.includes(notification.id)) {
                        savePinnedNotifications(pinnedNotifications.filter(id => id !== notification.id))
                      }
                      
                      // Close detail view
                      setShowNotificationDetail(null)
                    } catch (error) {
                      console.error("Error deleting notification:", error)
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.detailBody}>
              <View 
                style={[
                  styles.detailIconContainer, 
                  { backgroundColor: getNotificationColor(notification.type, theme) + '20' }
                ]}
              >
                <View style={[styles.detailIcon, { backgroundColor: getNotificationColor(notification.type, theme) }]}>
                  {getNotificationIcon(notification.type, "#fff")}
                </View>
              </View>
              
              <Text style={[styles.detailTitle, { color: theme.text }]}>{notification.title}</Text>
              
              <View style={styles.detailMeta}>
                <Text style={[styles.detailTime, { color: theme.text + '70' }]}>
                  {new Date(notification.createdAt).toLocaleString()}
                </Text>
                <View style={[styles.detailType, { backgroundColor: getNotificationColor(notification.type, theme) + '20' }]}>
                  <Text style={[styles.detailTypeText, { color: getNotificationColor(notification.type, theme) }]}>
                    {getNotificationTypeLabel(notification.type)}
                  </Text>
                </View>
              </View>
              
              <Text style={[styles.detailBodyText, { color: theme.text }]}>{notification.body}</Text>
              
              {notification.data && Object.keys(notification.data).length > 0 && (
                <View style={[styles.detailData, { backgroundColor: theme.background }]}>
                  <Text style={[styles.detailDataTitle, { color: theme.text }]}>Additional Information</Text>
                  {Object.entries(notification.data).map(([key, value]) => (
                    <View key={key} style={styles.detailDataRow}>
                      <Text style={[styles.detailDataKey, { color: theme.text + '70' }]}>{key}:</Text>
                      <Text style={[styles.detailDataValue, { color: theme.text }]}>{value?.toString()}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            {notification.data && (
              <View style={styles.detailFooter}>
                <TouchableOpacity 
                  style={[styles.detailActionButton, { backgroundColor: theme.primary }]}
                  onPress={() => navigateFromNotification(notification)}
                >
                  <Text style={styles.detailActionButtonText}>
                    {notification.type.includes('errand') ? 'View Errand' : 
                     notification.type.includes('message') ? 'Open Chat' :
                     notification.type.includes('payment') ? 'View Payment' : 'View Details'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </Modal>
    )
  }
  
  const renderDoNotDisturbModal = () => (
    <Modal
      visible={showDoNotDisturbModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDoNotDisturbModal(false)}
    >
      <BlurView intensity={80} style={styles.dndContainer} tint={isDark ? "dark" : "light"}>
        <View style={[styles.dndContent, { backgroundColor: theme.card }]}>
          <Text style={[styles.dndTitle, { color: theme.text }]}>Do Not Disturb Hours</Text>
          
          <View style={styles.dndTimeContainer}>
            <View style={styles.dndTimeInput}>
              <Text style={[styles.dndTimeLabel, { color: theme.text }]}>Start Time</Text>
              <TextInput
                style={[styles.dndTimeField, { color: theme.text, borderColor: theme.border }]}
                value={notificationSettings.doNotDisturbStart}
                onChangeText={(text) => {
                  saveNotificationSettings({
                    ...notificationSettings,
                    doNotDisturbStart: text
                  })
                }}
                placeholder="HH:MM"
                placeholderTextColor={theme.text + '50'}
              />
            </View>
            
            <View style={styles.dndTimeInput}>
              <Text style={[styles.dndTimeLabel, { color: theme.text }]}>End Time</Text>
              <TextInput
                style={[styles.dndTimeField, { color: theme.text, borderColor: theme.border }]}
                value={notificationSettings.doNotDisturbEnd}
                onChangeText={(text) => {
                  saveNotificationSettings({
                    ...notificationSettings,
                    doNotDisturbEnd: text
                  })
                }}
                placeholder="HH:MM"
                placeholderTextColor={theme.text + '50'}
              />
            </View>
          </View>
          
          <Text style={[styles.dndDescription, { color: theme.text + '70' }]}>
            During these hours, you won't receive notification sounds or vibrations
          </Text>
          
          <View style={styles.dndButtons}>
            <TouchableOpacity 
              style={[styles.dndButton, { borderColor: theme.border }]}
              onPress={() => setShowDoNotDisturbModal(false)}
            >
              <Text style={[styles.dndButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.dndButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                saveNotificationSettings({
                  ...notificationSettings,
                  doNotDisturbEnabled: true
                })
                setShowDoNotDisturbModal(false)
              }}
            >
              <Text style={styles.dndButtonTextPrimary}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          {getUnreadCount() > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadBadgeText}>{getUnreadCount()}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerRight}>
          {isDeleting ? (
            <>
              <TouchableOpacity 
                style={[styles.headerButton, { marginRight: 10 }]} 
                onPress={toggleDeleteMode}
              >
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { marginRight: 10 }]} 
                onPress={selectAllNotifications}
              >
                <Text style={[styles.selectAllText, { color: theme.primary }]}>Select All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.deleteButton, 
                  { 
                    backgroundColor: selectedNotifications.length > 0 
                      ? '#F44336' 
                      : theme.text + '30',
                    opacity: selectedNotifications.length > 0 ? 1 : 0.5
                  }
                ]} 
                onPress={confirmDeleteSelected}
                disabled={selectedNotifications.length === 0}
              >
                <Text style={styles.deleteButtonText}>
                  Delete ({selectedNotifications.length})
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={toggleSearch}
              >
                <Ionicons name="search" size={22} color={theme.text + '70'} />
              </TouchableOpacity>
              
              {notifications.length > 0 && (
                <TouchableOpacity 
                  style={styles.headerButton} 
                  onPress={toggleDeleteMode}
                >
                  <Ionicons name="trash-outline" size={22} color={theme.text + '70'} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={toggleFilterOptions}
              >
                <Ionicons 
                  name="filter" 
                  size={22} 
                  color={selectedFilter !== 'all' ? theme.primary : theme.text + '70'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={toggleSettings}
              >
                <Ionicons name="settings-outline" size={22} color={theme.text + '70'} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <Animated.View 
        style={[
          styles.searchBarContainer, 
          { 
            height: searchBarHeight, 
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden'
          }
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            id="notification-search-input"
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notifications..."
            placeholderTextColor={theme.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => setSearchQuery("")}
            >
              <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.filterOptionsContainer, 
          { 
            height: filterOptionsMaxHeight, 
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden'
          }
        ]}
      >
        <View style={styles.filterOptionsContent}>
          <View style={styles.filterOptionsHeader}>
            <Text style={[styles.filterOptionsTitle, { color: theme.text }]}>Filter Notifications</Text>
            <TouchableOpacity onPress={toggleFilterOptions}>
              <Ionicons name="close" size={20} color={theme.text + '70'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsList}>
            {categories.map(category => renderFilterOption(category))}
          </ScrollView>
          
          {renderCategoryStats()}
        </View>
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.settingsContainer, 
          { 
            height: settingsMaxHeight, 
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden'
          }
        ]}
      >
        <ScrollView style={styles.settingsContent}>
          <View style={styles.settingsHeader}>
            <Text style={[styles.settingsTitle, { color: theme.text }]}>Notification Settings</Text>
            <TouchableOpacity onPress={toggleSettings}>
              <Ionicons name="close" size={20} color={theme.text + '70'} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.settingsSubtitle, { color: theme.text + '70' }]}>General</Text>
          
          {renderSettingItem(
            'Push Notifications', 
            notificationSettings.pushEnabled,
            (value) => saveNotificationSettings({...notificationSettings, pushEnabled: value}),
            'notifications-outline',
            'Receive push notifications on your device'
          )}
          
          {renderSettingItem(
            'Email Notifications', 
            notificationSettings.emailEnabled,
            (value) => saveNotificationSettings({...notificationSettings, emailEnabled: value}),
            'mail-outline',
            'Receive notifications via email'
          )}
          
          <Text style={[styles.settingsSubtitle, { color: theme.text + '70', marginTop: 15 }]}>Alerts</Text>
          
          {renderSettingItem(
            'Sound', 
            notificationSettings.soundEnabled,
            (value) => saveNotificationSettings({...notificationSettings, soundEnabled: value}),
            'volume-high-outline',
            'Play sound when notifications arrive'
          )}
          
          {renderSettingItem(
            'Vibration', 
            notificationSettings.vibrationEnabled,
            (value) => saveNotificationSettings({...notificationSettings, vibrationEnabled: value}),
            'phone-portrait-outline',
            'Vibrate when notifications arrive'
          )}
          
          {renderSettingItem(
            'Do Not Disturb', 
            notificationSettings.doNotDisturbEnabled,
            (value) => {
              if (value && !notificationSettings.doNotDisturbEnabled) {
                setShowDoNotDisturbModal(true)
              } else {
                saveNotificationSettings({...notificationSettings, doNotDisturbEnabled: value})
              }
            },
            'moon-outline',
            `Silent hours: ${notificationSettings.doNotDisturbStart} - ${notificationSettings.doNotDisturbEnd}`
          )}
          
          <Text style={[styles.settingsSubtitle, { color: theme.text + '70', marginTop: 15 }]}>Categories</Text>
          
          {renderSettingItem(
            'Errand Notifications', 
            notificationSettings.errandsEnabled,
            (value) => saveNotificationSettings({...notificationSettings, errandsEnabled: value}),
            'bicycle-outline'
          )}
          
          {renderSettingItem(
            'Message Notifications', 
            notificationSettings.messagesEnabled,
            (value) => saveNotificationSettings({...notificationSettings, messagesEnabled: value}),
            'chatbubble-outline'
          )}
          
          {renderSettingItem(
            'Payment Notifications', 
            notificationSettings.paymentsEnabled,
            (value) => saveNotificationSettings({...notificationSettings, paymentsEnabled: value}),
            'card-outline'
          )}
          
          {renderSettingItem(
            'System Notifications', 
            notificationSettings.systemEnabled,
            (value) => saveNotificationSettings({...notificationSettings, systemEnabled: value}),
            'information-circle-outline'
          )}
          
          <TouchableOpacity 
            style={[styles.clearAllButton, { borderColor: theme.border }]}
            onPress={clearAllNotifications}
          >
            <Text style={[styles.clearAllText, { color: '#F44336' }]}>Clear All Notifications</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LottieView
            ref={lottieRef}
            source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json' }}
            style={styles.loadingAnimation}
            autoPlay
            loop
          />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading notifications...</Text>
        </View>
      ) : (
        <>
          {notifications.length > 0 && !isDeleting && (
            <View style={[styles.actionBar, { backgroundColor: theme.background }]}>
              {notifications.some((n) => !n.read) && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.primary + '10' }]} 
                  onPress={handleMarkAllAsRead}
                >
                  <Ionicons name="checkmark-done-outline" size={16} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {notificationSections.length > 0 ? (
            <FlatList
              data={notificationSections}
              renderItem={({ item: section }) => (
                <View>
                  {renderSectionHeader({ section })}
                  {section.data.map((item) => (
                    <View key={item.id || `${item.type}-${item.createdAt}`}>
                      {renderNotificationItem({ item })}
                    </View>
                  ))}
                </View>
              )}
              keyExtractor={(section, index) => `section-${index}`}
              contentContainerStyle={styles.notificationsList}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.primary]}
                  tintColor={theme.primary}
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <LottieView
                source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_qm8ief3i.json' }}
                style={styles.emptyAnimation}
                autoPlay
                loop
              />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications</Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                {searchQuery.trim() 
                  ? `No results found for "${searchQuery}"`
                  : selectedFilter !== 'all' 
                    ? `You don't have any ${selectedFilter} notifications yet`
                    : `You don't have any notifications yet`}
              </Text>
              <TouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                onPress={handleRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {renderTutorial()}
      {renderNotificationDetail()}
      {renderDoNotDisturbModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  unreadBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchBarContainer: {
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  filterOptionsContainer: {
    borderBottomWidth: 1,
  },
  filterOptionsContent: {
    padding: 15,
  },
  filterOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterOptionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 13,
    marginLeft: 4,
  },
  filterBadge: {
    marginLeft: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    marginTop: 10,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  statCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  settingsContainer: {
    borderBottomWidth: 1,
  },
  settingsContent: {
    padding: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 14,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  clearAllButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  notificationsList: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  notificationItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedNotification: {
    borderStyle: 'dashed',
  },
  checkboxContainer: {
    marginRight: 10,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  notificationTitle: {
    fontSize: 16,
    flex: 1,
  },
  pinIcon: {
    marginLeft: 5,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreButton: {
    padding: 5,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tutorialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tutorialStepContent: {
    flex: 1,
  },
  tutorialStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  tutorialStepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tutorialButton: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    width: '90%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailCloseButton: {
    padding: 5,
  },
  detailActions: {
    flexDirection: 'row',
  },
  detailBody: {
    flex: 1,
    padding: 20,
  },
  detailIconContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  detailIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTime: {
    fontSize: 14,
  },
  detailType: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailBodyText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailData: {
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  detailDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  detailDataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailDataKey: {
    fontSize: 14,
    fontWeight: '500',
    width: 120,
  },
  detailDataValue: {
    fontSize: 14,
    flex: 1,
  },
  detailFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  detailActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    padding: 8,
    marginLeft: 5,
    width: '80%',
    alignItems: 'center',
  },
  detailActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dndContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dndContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  dndTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  dndTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dndTimeInput: {
    width: '45%',
  },
  dndTimeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dndTimeField: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  dndDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  dndButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dndButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  dndButtonText: {
    fontSize: 16,
  },
  dndButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default NotificationsScreen