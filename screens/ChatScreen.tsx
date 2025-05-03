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
  Animated,
  Easing,
  Pressable,
  Dimensions,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { chatService, type Message } from "../services/chat"
import { userService } from "../services/database"
import type { Chat } from "../services/chat"
import * as Haptics from "expo-haptics"
import { Audio } from "expo-av"
import { BlurView } from "expo-blur"

type RootStackParamList = {
  ChatScreen: { chatId: string }
  ProfileScreen: { userId: string }
  // Add other screens here as needed
}

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "ChatScreen">
type ChatScreenRouteProp = RouteProp<RootStackParamList, "ChatScreen">

const { width, height } = Dimensions.get("window")

interface OtherUser {
  id: string
  name?: string
  email?: string
  photoURL?: string
  userType: string
  isOnline?: boolean
  lastSeen?: string
}

const formatLastSeen = (timestamp: string | undefined, isOnline?: boolean): string => {
  if (isOnline) {
    return "Online"
  }

  if (!timestamp) {
    return "Last seen: Unknown"
  }

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hr ago`
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

const ChatScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<ChatScreenNavigationProp>()
  const route = useRoute<ChatScreenRouteProp>()
  const { chatId } = route.params
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const lastSeenMessage = otherUser ? formatLastSeen(otherUser.lastSeen, otherUser.isOnline) : "Unknown"
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [chatData, setChatData] = useState<Chat | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [typing, setTyping] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false)
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null)
  const [reactions, setReactions] = useState<{ [messageId: string]: { emoji: string; userId: string }[] }>({})
  const [selectedAttachmentType, setSelectedAttachmentType] = useState<string | null>(null)
  const [isAttachmentPickerVisible, setIsAttachmentPickerVisible] = useState(false)
  const [attachmentInProgress, setAttachmentInProgress] = useState(false)

  const flatListRef = useRef<FlatList<Message>>(null)
  const lastMessageCount = useRef(0)
  const inputRef = useRef<TextInput>(null)
  const scrollY = useRef(new Animated.Value(0)).current

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const attachmentAnim = useRef(new Animated.Value(0)).current
  const reactionAnim = useRef(new Animated.Value(0)).current

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [10, 0],
    extrapolate: "clamp",
  })

  // Load sound effect
  useEffect(() => {
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(require("../assets/message.mp3"))
        setSound(sound)
      } catch (error) {
        console.error("Error loading sound:", error)
      }
    }

    loadSound()

    return () => {
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [])

  // Auto-reload messages every 5 seconds
  useEffect(() => {
    loadChatData()
    loadMessages()
    loadMessageReactions()

    if (user) {
      chatService.markMessagesAsRead(chatId, user.id)
    }

    const interval = setInterval(() => {
      reloadMessages()
      loadMessageReactions()
    }, 5000)

    return () => clearInterval(interval)
  }, [chatId, user])

  // Play sound when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCount.current && sound) {
      playNotificationSound()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      animateNewMessage()
    }
    lastMessageCount.current = messages.length
  }, [messages.length])

  // Animate attachment options
  useEffect(() => {
    if (showAttachmentOptions) {
      Animated.spring(attachmentAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start()
    } else {
      Animated.timing(attachmentAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [showAttachmentOptions])

  // Animate reaction options
  useEffect(() => {
    if (showReactions) {
      Animated.spring(reactionAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start()
    } else {
      Animated.timing(reactionAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [showReactions])

  const animateNewMessage = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const playNotificationSound = async () => {
    try {
      if (sound) {
        await sound.replayAsync()
      }
    } catch (error) {
      console.error("Error playing sound:", error)
    }
  }

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
      const chatsRef = await chatService.getUserChats(user.id)
      const chat = chatsRef.find((c) => c.id === chatId)

      if (chat) {
        setChatData(chat)

        const otherParticipantId = chat.participants.find((id) => id !== user.id)
        if (otherParticipantId) {
          const userData = await userService.getUserByFirebaseUid(otherParticipantId)
          setOtherUser({
            ...userData,
            isOnline: Math.random() > 0.5,
            lastSeen: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
          })

          navigation.setOptions({
            title: userData ? userData.name || userData.email : "Chat",
            headerTitleStyle: {
              color: theme.text,
              fontSize: 18,
              fontWeight: "600",
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

  const loadMessageReactions = async () => {
    try {
      const allReactions = await chatService.getMessageReactions(chatId)
      setReactions(allReactions)
    } catch (error) {
      console.error("Error loading message reactions:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return

    try {
      setIsSending(true)
      const newMessage = await chatService.sendMessage(chatId, user.id, messageText.trim())

      setMessages((prevMessages) => [...prevMessages, newMessage])
      setMessageText("")

      playNotificationSound()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      animateSendButton()

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)

      setTyping(true)
      setTimeout(() => setTyping(false), 1500)
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

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y
    scrollY.setValue(yOffset)

    setShowScrollButton(yOffset > 300)
  }

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const toggleAttachmentOptions = () => {
    setShowAttachmentOptions(!showAttachmentOptions)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const showReactionOptions = (messageId: string) => {
    setShowReactions(messageId)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const addReaction = async (messageId: string, reaction: string) => {
    if (!user || !messageId) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Update local state immediately for responsive UI
      setReactions((prev) => {
        const messageReactions = prev[messageId] || []

        // Check if user already reacted with this emoji
        const existingReactionIndex = messageReactions.findIndex((r) => r.userId === user.id && r.emoji === reaction)

        if (existingReactionIndex >= 0) {
          // Remove reaction if it already exists
          const newMessageReactions = [...messageReactions]
          newMessageReactions.splice(existingReactionIndex, 1)
          return { ...prev, [messageId]: newMessageReactions }
        } else {
          // Add new reaction
          return {
            ...prev,
            [messageId]: [...messageReactions, { emoji: reaction, userId: user.id }],
          }
        }
      })

      // Save reaction to database
      await chatService.addMessageReaction(chatId, messageId, user.id, reaction)

      setShowReactions(null)
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isMyMessage = item.senderId === user?.id
    const isFirstInGroup = index === 0 || messages[index - 1].senderId !== item.senderId
    const isLastInGroup = index === messages.length - 1 || messages[index + 1].senderId !== item.senderId

    const slideUpAnimation = {
      transform: [
        {
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20],
          }),
        },
      ],
      opacity: slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    }

    const hasImage =
      item.text.includes("http") &&
      (item.text.includes(".jpg") ||
        item.text.includes(".png") ||
        item.text.includes(".jpeg") ||
        item.text.includes(".gif"))

    const imageUrl = hasImage ? item.text : null

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
          index === messages.length - 1 ? slideUpAnimation : null,
        ]}
      >
        {!isMyMessage && isLastInGroup && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (item.senderId) {
                navigation.navigate("ProfileScreen", { userId: item.senderId })
              }
            }}
          >
            <Image
              source={otherUser?.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")}
              style={styles.messageAvatar}
            />
            {otherUser?.isOnline && <View style={styles.onlineIndicator} />}
          </TouchableOpacity>
        )}
        {!isMyMessage && isLastInGroup && !otherUser?.photoURL && (
          <View style={[styles.messageAvatarPlaceholder, { backgroundColor: theme.primary + "40" }]}>
            <Text style={styles.avatarInitial}>{otherUser?.name?.charAt(0) || otherUser?.email?.charAt(0) || "?"}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => item.id && showReactionOptions(item.id)}
          delayLongPress={200}
          style={styles.messageBubbleContainer}
        >
          <View
            style={[
              styles.messageBubble,
              isMyMessage
                ? [styles.myMessageBubble, { backgroundColor: theme.primary }]
                : [styles.otherMessageBubble, { backgroundColor: isDark ? theme.card : theme.secondary + "30" }],
              isFirstInGroup ? (isMyMessage ? styles.myFirstMessage : styles.otherFirstMessage) : null,
              isLastInGroup ? (isMyMessage ? styles.myLastMessage : styles.otherLastMessage) : null,
              hasImage && styles.imageBubble,
            ]}
          >
            {imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowImagePreview(imageUrl)}
                style={styles.imageContainer}
              >
                <Image source={{ uri: imageUrl }} style={styles.messageImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, { color: isMyMessage ? "#fff" : theme.text }]}>{item.text}</Text>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, { color: isMyMessage ? "#ffffffaa" : theme.text + "80" }]}>
                {formatTimestamp(item.timestamp)}
              </Text>
              {isMyMessage && (
                <Ionicons name={item.read ? "checkmark-done" : "checkmark"} size={16} color={theme.text + "80"} />
              )}
            </View>
          </View>

          {item.id && reactions[item.id] && reactions[item.id].length > 0 && (
            <View style={styles.reactionsContainer}>
              {item.id && reactions[item.id]?.map((reaction, index) => (
                <Text key={index} style={styles.reaction}>
                  {reaction.emoji}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.background} />

        {/* Animated Header */}
        <Animated.View
          style={[
            styles.animatedHeader,
            {
              backgroundColor: theme.background,
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslate }],
            },
          ]}
        >
          {otherUser && (
            <Pressable
              style={styles.headerContent}
              onPress={() => navigation.navigate("ProfileScreen", { userId: otherUser.id })}
            >
              <Image
                source={otherUser?.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")}
                style={styles.headerAvatar}
              />
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{otherUser.name || otherUser.email}</Text>
                <Text style={[styles.headerSubtitle, { color: theme.text + "80" }]}>{lastSeenMessage}</Text>
              </View>
            </Pressable>
          )}
        </Animated.View>

        {/* Chat Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id || item.timestamp}
              contentContainerStyle={styles.chatContainer}
              onScroll={handleScroll}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              inverted={false}
              scrollEventThrottle={16}
            />

            {showScrollButton && (
              <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
                <Ionicons name="arrow-down" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Input Area */}
        <View style={[styles.inputArea, { backgroundColor: theme.background }]}>
          <TouchableOpacity style={styles.attachmentButton} onPress={toggleAttachmentOptions}>
            <Ionicons name="add" size={28} color={theme.primary} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.text + "80"}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            blurOnSubmit={false}
            onSubmitEditing={handleSendMessage}
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name="send" size={24} color="#fff" />
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>

        {/* Attachment Options */}
        <Animated.View
          style={[
            styles.attachmentOptionsContainer,
            {
              transform: [
                {
                  translateY: attachmentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
              opacity: attachmentAnim,
              backgroundColor: theme.background,
            },
          ]}
        >
          <TouchableOpacity style={styles.attachmentOption}>
            <Ionicons name="camera" size={28} color={theme.primary} />
            <Text style={[styles.attachmentOptionText, { color: theme.text }]}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentOption}>
            <Ionicons name="image" size={28} color={theme.primary} />
            <Text style={[styles.attachmentOptionText, { color: theme.text }]}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentOption}>
            <Ionicons name="document" size={28} color={theme.primary} />
            <Text style={[styles.attachmentOptionText, { color: theme.text }]}>Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentOption}>
            <Ionicons name="location" size={28} color={theme.primary} />
            <Text style={[styles.attachmentOptionText, { color: theme.text }]}>Location</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Reaction Options */}
        <BlurView style={styles.reactionOptionsOverlay} intensity={30} tint={isDark ? "dark" : "light"}>
          <Animated.View
            style={[
              styles.reactionOptionsContainer,
              {
                transform: [
                  {
                    translateY: reactionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
                opacity: reactionAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "👍")}
            >
              <Text style={styles.reactionOptionText}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "❤️")}
            >
              <Text style={styles.reactionOptionText}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "😂")}
            >
              <Text style={styles.reactionOptionText}>😂</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "😮")}
            >
              <Text style={styles.reactionOptionText}>😮</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "😢")}
            >
              <Text style={styles.reactionOptionText}>😢</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reactionOption}
              onPress={() => showReactions && addReaction(showReactions, "😡")}
            >
              <Text style={styles.reactionOptionText}>😡</Text>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>

        {/* Image Preview */}
        {showImagePreview && (
          <Pressable style={styles.imagePreviewOverlay} onPress={() => setShowImagePreview(null)}>
            <BlurView style={styles.imagePreviewContainer} intensity={30} tint={isDark ? "dark" : "light"}>
              <Image source={{ uri: showImagePreview }} style={styles.fullScreenImage} resizeMode="contain" />
            </BlurView>
          </Pressable>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  chatContainer: {
    padding: 10,
    paddingTop: 70,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  myMessageContainer: {
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 5,
  },
  messageAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4cd964",
  },
  messageBubbleContainer: {
    maxWidth: "75%",
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  myMessageBubble: {
    borderTopRightRadius: 4,
  },
  otherMessageBubble: {
    borderTopLeftRadius: 4,
  },
  myFirstMessage: {
    borderTopRightRadius: 20,
  },
  otherFirstMessage: {
    borderTopLeftRadius: 20,
  },
  myLastMessage: {
    borderBottomRightRadius: 20,
  },
  otherLastMessage: {
    borderBottomLeftRadius: 20,
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 3,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 5,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 70,
    right: 20,
    backgroundColor: "#00000040",
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
  attachmentButton: {
    padding: 8,
  },
  attachmentOptionsContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  attachmentOption: {
    alignItems: "center",
  },
  attachmentOptionText: {
    fontSize: 12,
    marginTop: 5,
  },
  reactionOptionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionOptionsContainer: {
    backgroundColor: "#ffffff80",
    borderRadius: 30,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
  },
  reactionOption: {
    padding: 10,
  },
  reactionOptionText: {
    fontSize: 24,
  },
  reactionsContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  reaction: {
    fontSize: 16,
    marginRight: 5,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 150,
  },
  imageBubble: {
    padding: 0,
  },
  imagePreviewOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#00000080",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    borderRadius: 20,
    overflow: "hidden",
    width: "90%",
    height: "60%",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
})

export default ChatScreen
