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
  SectionList,
  Alert,
  Vibration,
  Switch,
  ScrollView,
  Image
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { notificationService, type Notification } from "../services/notification"
import * as Haptics from 'expo-haptics'
import { BlurView } from "expo-blur"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Define your navigation param types
type RootStackParamList = {
  ErrandDetails: { errandId: string }
  Chat: { chatId: string }
  PaymentDetails: { paymentId: string }
  NotificationSettings: undefined
  // Add other screens here as needed
}

type NotificationSection = {
  title: string
  data: Notification[]
}

const ANIMATION_DURATION = 300

const NotificationsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'errands' | 'messages' | 'payments'>('all')
  const [notificationSections, setNotificationSections] = useState<NotificationSection[]>([])
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  
  // Animation values
  const filterOptionsHeight = useRef(new Animated.Value(0)).current
  const settingsHeight = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  
  // Load notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications()
      loadNotificationSettings()
      return () => {}
    }, [user])
  )

  // Effect to organize notifications into sections
  useEffect(() => {
    organizeNotificationsIntoSections()
  }, [notifications, selectedFilter])
  
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
  
  const organizeNotificationsIntoSections = () => {
    // Filter notifications based on selected filter
    let filteredNotifications = [...notifications]
    
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
    }
    
    // Group by date
    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = new Date(today - 86400000).setHours(0, 0, 0, 0)
    
    const sections: NotificationSection[] = [
      { title: 'Today', data: [] },
      { title: 'Yesterday', data: [] },
      { title: 'This Week', data: [] },
      { title: 'Earlier', data: [] }
    ]
    
    filteredNotifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt).setHours(0, 0, 0, 0)
      
      if (notificationDate === today) {
        sections[0].data.push(notification)
      } else if (notificationDate === yesterday) {
        sections[1].data.push(notification)
      } else if (notificationDate >= today - 6 * 86400000) {
        sections[2].data.push(notification)
      } else {
        sections[3].data.push(notification)
      }
    })
    
    // Remove empty sections
    const nonEmptySections = sections.filter(section => section.data.length > 0)
    setNotificationSections(nonEmptySections)
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

      // Navigate based on notification type
      if (notification.data) {
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
            // For system notifications, just mark as read
            break
        }
      }
    } catch (error) {
      console.error("Error handling notification:", error)
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
      
      // Show success message
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
  
  const deleteSelectedNotifications = async () => {
    if (!user || selectedNotifications.length === 0) return
    
    try {
      await Promise.all(
        selectedNotifications.map(id => 
          notificationService.deleteNotification(user.id, id)
        )
      )
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id && !selectedNotifications.includes(notification.id))
      )
      
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
              await notificationService.clearAllNotifications(user.id)
              setNotifications([])
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

  const renderNotificationItem = ({ item }: { item: Notification }) => (
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
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => {
          if (!isDeleting) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            toggleDeleteMode()
            if (item.id) {
              toggleNotificationSelection(item.id)
            }
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
          <Text 
            style={[
              styles.notificationTitle, 
              { 
                color: theme.text,
                fontWeight: item.read ? '500' : '700'
              }
            ]}
          >
            {item.title}
          </Text>
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
          <Text style={[styles.notificationTime, { color: theme.text + "60" }]}>
            {formatTimestamp(item.createdAt)}
          </Text>
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
                      if (!user) return
                      try {
                        if (item.read) {
                          await notificationService.markNotificationAsUnread(user.id, item.id)
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
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                      if (!user) return
                      try {
                        await notificationService.deleteNotification(user.id, item.id)
                        
                        // Update local state
                        setNotifications(prev => prev.filter(n => n.id !== item.id))
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
  
  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.text + "90" }]}>
        {section.title}
      </Text>
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
      default:
        return theme.primary
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
    outputRange: [0, 60]
  })
  
  const settingsMaxHeight = settingsHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240]
  })
  
  const renderFilterOption = (filter: typeof selectedFilter, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        selectedFilter === filter && { 
          backgroundColor: theme.primary + '20',
          borderColor: theme.primary
        }
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedFilter === filter ? theme.primary : theme.text + '70'} 
      />
      <Text 
        style={[
          styles.filterOptionText, 
          { 
            color: selectedFilter === filter ? theme.primary : theme.text,
            fontWeight: selectedFilter === filter ? '600' : '400'
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
  
  const renderSettingItem = (
    label: string, 
    value: boolean, 
    onToggle: (newValue: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={20} color={theme.text + '70'} style={styles.settingIcon} />
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
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
          styles.filterOptionsContainer, 
          { 
            height: filterOptionsMaxHeight, 
            borderBottomColor: theme.border,
            backgroundColor: theme.card,
            overflow: 'hidden'
          }
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptionsContent}>
          {renderFilterOption('all', 'All', 'notifications-outline')}
          {renderFilterOption('unread', 'Unread', 'mail-unread-outline')}
          {renderFilterOption('errands', 'Errands', 'bicycle-outline')}
          {renderFilterOption('messages', 'Messages', 'chatbubble-outline')}
          {renderFilterOption('payments', 'Payments', 'card-outline')}
        </ScrollView>
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
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsTitle, { color: theme.text }]}>Notification Settings</Text>
          
          {renderSettingItem(
            'Push Notifications', 
            notificationSettings.pushEnabled,
            (value) => saveNotificationSettings({...notificationSettings, pushEnabled: value}),
            'notifications-outline'
          )}
          
          {renderSettingItem(
            'Email Notifications', 
            notificationSettings.emailEnabled,
            (value) => saveNotificationSettings({...notificationSettings, emailEnabled: value}),
            'mail-outline'
          )}
          
          {renderSettingItem(
            'Sound', 
            notificationSettings.soundEnabled,
            (value) => saveNotificationSettings({...notificationSettings, soundEnabled: value}),
            'volume-high-outline'
          )}
          
          {renderSettingItem(
            'Vibration', 
            notificationSettings.vibrationEnabled,
            (value) => saveNotificationSettings({...notificationSettings, vibrationEnabled: value}),
            'phone-portrait-outline'
          )}
          
          <TouchableOpacity 
            style={[styles.clearAllButton, { borderColor: theme.border }]}
            onPress={clearAllNotifications}
          >
            <Text style={[styles.clearAllText, { color: '#F44336' }]}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
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
          
          <SectionList
            sections={notificationSections}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.notificationsList}
            stickySectionHeadersEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Image 
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2645/2645890.png' }}
                  style={styles.emptyImage}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications</Text>
                <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                  {selectedFilter !== 'all' 
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
            }
          />
        </>
      )}
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
  filterOptionsContainer: {
    borderBottomWidth: 1,
  },
  filterOptionsContent: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionText: {
    fontSize: 13,
    marginLeft: 4,
  },
  settingsContainer: {
    borderBottomWidth: 1,
  },
  settingsContent: {
    padding: 20,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
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
  },
  settingIcon: {
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 14,
  },
  clearAllButton: {
    marginTop: 10,
    paddingVertical: 10,
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  notificationsList: {
    paddingBottom: 20,
  },
  sectionHeader: {
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
  notificationTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
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
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.5,
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
})

export default NotificationsScreen
