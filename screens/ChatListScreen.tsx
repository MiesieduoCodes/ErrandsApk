"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { chatService, type Chat } from "../services/chat"
import { userService } from "../services/database"

// Define your RootStackParamList type if it's not already defined
type RootStackParamList = {
  Chat: { chatId: string }
  NewChat: undefined
  // Add other screens as needed
}

// Define User type if not imported from database service
type User = {
  id: string
  email: string
  name?: string
  photoURL?: string
  userType: string
  // Add other user properties as needed
}

type ChatUsers = Record<string, User | null>

const ChatListScreen = () => {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { theme, isDark } = useTheme()
  const [chats, setChats] = useState<Chat[]>([])
  const [chatUsers, setChatUsers] = useState<ChatUsers>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadChats()
  }, [user])

  const loadChats = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const userChats = await chatService.getUserChats(user.id)
      setChats(userChats)

      // Load user data for each chat
      const userDataPromises: Promise<ChatUsers>[] = []
      const userIds = new Set<string>()

      userChats.forEach((chat) => {
        chat.participants.forEach((participantId) => {
          if (participantId !== user.id && !userIds.has(participantId)) {
            userIds.add(participantId)
            userDataPromises.push(
              userService
                .getUserByFirebaseUid(participantId)
                .then((userData) => ({ [participantId]: userData }))
                .catch(() => ({ [participantId]: null }))
            )
          }
        })
      })

      const usersData = await Promise.all(userDataPromises)
      const usersMap = Object.assign({}, ...usersData)
      setChatUsers(usersMap)
    } catch (error) {
      console.error("Error loading chats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadChats()
    setIsRefreshing(false)
  }

  const handleChatPress = (chat: Chat) => {
    navigation.navigate("Chat", { chatId: chat.id })
  }

  const getChatName = (chat: Chat) => {
    if (!user) return "Chat"

    // Find the other participant
    const otherParticipantId = chat.participants.find((id) => id !== user.id)
    if (!otherParticipantId) return "Chat"

    const otherUser = chatUsers[otherParticipantId]
    return otherUser ? otherUser.name || otherUser.email : "User"
  }

  const getChatAvatar = (chat: Chat) => {
    if (!user) return null

    // Find the other participant
    const otherParticipantId = chat.participants.find((id) => id !== user.id)
    if (!otherParticipantId) return null

    const otherUser = chatUsers[otherParticipantId]
    return otherUser && otherUser.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")
  }

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return ""

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

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={[styles.chatItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleChatPress(item)}
    >
      <Image source={getChatAvatar(item)} style={styles.avatar} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: theme.text }]}>{getChatName(item)}</Text>
          {item.lastMessage && (
            <Text style={[styles.chatTime, { color: theme.text + "60" }]}>
              {formatTimestamp(item.lastMessage.timestamp)}
            </Text>
          )}
        </View>
        {item.lastMessage ? (
          <Text style={[styles.lastMessage, { color: theme.text + "80" }]} numberOfLines={1}>
            {item.lastMessage.senderId === user?.id ? "You: " : ""}
            {item.lastMessage.text}
          </Text>
        ) : (
          <Text style={[styles.noMessages, { color: theme.text + "60" }]}>No messages yet</Text>
        )}
        {item.errandId && (
          <View style={[styles.errandBadge, { backgroundColor: theme.primary + "20" }]}>
            <Text style={[styles.errandBadgeText, { color: theme.primary }]}>Errand Chat</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.newChatButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("NewChat")}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatsList}
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
              <Ionicons name="chatbubbles-outline" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages</Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>You don't have any conversations yet</Text>
              <TouchableOpacity
                style={[styles.startChatButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate("NewChat")}
              >
                <Text style={styles.startChatButtonText}>Start a new chat</Text>
              </TouchableOpacity>
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
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
  chatsList: {
    padding: 20,
  },
  chatItem: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
  },
  chatTime: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  noMessages: {
    fontSize: 14,
    fontStyle: "italic",
  },
  errandBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
  },
  errandBadgeText: {
    fontSize: 12,
    fontWeight: "500",
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
    marginBottom: 20,
  },
  startChatButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
})

export default ChatListScreen