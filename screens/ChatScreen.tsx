"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { chatService, type Message } from "../services/chat"
import { userService } from "../services/database"
import { type Chat } from "../services/chat"
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const ChatScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { chatId } = route.params as { chatId: string }

  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [chatData, setChatData] = useState<Chat | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  interface OtherUser {
    name?: string
    email?: string
    photoURL?: string
    userType: string
  }
  
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const flatListRef = useRef<FlatList<Message>>(null)
  const lastMessageCount = useRef(0)

  // Load sound effect
  useEffect(() => {
    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/message.mp3')
      );
      setSound(sound);
    }

    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Auto-reload messages every 5 seconds
  useEffect(() => {
    loadChatData()
    loadMessages()

    // Mark messages as read when opening the chat
    if (user) {
      chatService.markMessagesAsRead(chatId, user.id)
    }

    const interval = setInterval(() => {
      reloadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [chatId, user])

  // Play sound when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCount.current && sound) {
      playNotificationSound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  const playNotificationSound = async () => {
    try {
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const reloadMessages = async () => {
    try {
      const chatMessages = await chatService.getChatMessages(chatId)
      setMessages(chatMessages)
    } catch (error) {
      console.error("Error reloading messages:", error)
    }
  }

  const loadChatData = async () => {
    if (!user) return

    try {
      // Get chat data
      const chatsRef = await chatService.getUserChats(user.id)
      const chat = chatsRef.find((c) => c.id === chatId)

      if (chat) {
        setChatData(chat)

        // Get other user data
        const otherParticipantId = chat.participants.find((id) => id !== user.id)
        if (otherParticipantId) {
          const userData = await userService.getUserByFirebaseUid(otherParticipantId)
          setOtherUser(userData)

          // Set navigation title
          navigation.setOptions({
            title: userData ? userData.name || userData.email : "Chat",
            headerTitleStyle: {
              color: theme.text,
              fontSize: 18,
              fontWeight: '600',
            },
          })
        }
      }
    } catch (error) {
      console.error("Error loading chat data:", error)
    }
  }

  const loadMessages = async () => {
    try {
      setIsLoading(true)
      const chatMessages = await chatService.getChatMessages(chatId)
      setMessages(chatMessages)
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return

    try {
      setIsSending(true)
      const newMessage = await chatService.sendMessage(chatId, user.id, messageText.trim())

      // Update local state
      setMessages((prevMessages) => [...prevMessages, newMessage])
      setMessageText("")

      // Play sound and haptic feedback for sent message
      playNotificationSound();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Scroll to bottom
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true })
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.senderId === user?.id

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
        {!isMyMessage && otherUser?.photoURL && (
          <Image
            source={otherUser.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")}
            style={styles.messageAvatar}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage
              ? [styles.myMessageBubble, { backgroundColor: theme.primary }]
              : [styles.otherMessageBubble, { backgroundColor: theme.secondary }],
          ]}
        >
          <Text style={[styles.messageText, { color: isMyMessage ? "#fff" : theme.text }]}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: isMyMessage ? "#ffffffaa" : theme.text + "80" }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
            {isMyMessage && (
              <Ionicons 
                name={item.read ? "checkmark-done" : "checkmark"} 
                size={16} 
                color={item.read ? "#ffffffaa" : "#ffffff80"} 
                style={styles.readIndicator}
              />
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otherUser ? (
            <>
              <Image
                source={otherUser.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")}
                style={styles.avatar}
              />
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
                  {otherUser.name || "User"}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.text + "60" }]} numberOfLines={1}>
                  {otherUser.userType.charAt(0).toUpperCase() + otherUser.userType.slice(1)}
                </Text>
              </View>
            </>
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
        </View>

        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id || item.timestamp}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={60} color={theme.text + "30"} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
                <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                  Start the conversation by sending a message
                </Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.text + "50"}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: messageText.trim() ? theme.primary : theme.text + "20",
              opacity: isSending || !messageText.trim() ? 0.6 : 1
            }]}
            onPress={handleSendMessage}
            disabled={isSending || !messageText.trim()}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color={messageText.trim() ? "#fff" : theme.text + "60"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoButton: {
    padding: 5,
    marginLeft: 5,
  },
  content: {
    flex: 1,
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
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "80%",
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 50,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  readIndicator: {
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
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
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
})

export default ChatScreen