"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { notificationService, type Notification } from "../services/notification"

// Define your navigation param types
type RootStackParamList = {
  ErrandDetails: { errandId: string }
  Chat: { chatId: string }
  PaymentDetails: { paymentId: string }
  // Add other screens here as needed
}

const NotificationsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const userNotifications = await notificationService.getUserNotifications(user.id)
      setNotifications(userNotifications)
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadNotifications()
    setIsRefreshing(false)
  }

  const handleNotificationPress = async (notification: Notification) => {
    if (!user || !notification.id) return

    try {
      // Mark as read
      await notificationService.markNotificationAsRead(user.id, notification.id)

      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )

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

  const handleMarkAllAsRead = async () => {
    if (!user) return

    try {
      await notificationService.markAllNotificationsAsRead(user.id)
      setNotifications((prevNotifications) => prevNotifications.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? theme.card : theme.secondary },
        { borderColor: theme.border },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        {getNotificationIcon(item.type, item.read ? theme.text + "80" : theme.primary)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.notificationBody, { color: theme.text + "80" }]}>{item.body}</Text>
        <Text style={[styles.notificationTime, { color: theme.text + "60" }]}>{formatTimestamp(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  )

  const getNotificationIcon = (type: string, color: string) => {
    switch (type) {
      case "errand_request":
        return <Ionicons name="add-circle" size={24} color={color} />
      case "errand_accepted":
        return <Ionicons name="checkmark-circle" size={24} color={color} />
      case "errand_started":
        return <Ionicons name="play-circle" size={24} color={color} />
      case "errand_completed":
        return <Ionicons name="checkmark-done-circle" size={24} color={color} />
      case "errand_cancelled":
        return <Ionicons name="close-circle" size={24} color={color} />
      case "new_message":
        return <Ionicons name="chatbubble" size={24} color={color} />
      case "payment_received":
      case "payment_completed":
        return <Ionicons name="card" size={24} color={color} />
      default:
        return <Ionicons name="notifications" size={24} color={color} />
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id || item.createdAt}
          contentContainerStyle={styles.notificationsList}
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
              <Ionicons name="notifications-off" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications</Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>You don't have any notifications yet</Text>
            </View>
          }
        />
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  markAllButton: {
    paddingVertical: 5,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
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
    padding: 20,
  },
  notificationItem: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  notificationIcon: {
    marginRight: 15,
    alignSelf: "flex-start",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 10,
  },
  notificationTime: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
})

export default NotificationsScreen