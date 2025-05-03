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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
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
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import * as Location from "expo-location"

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
                <Ionicons
                  name={item.read ? "checkmark-done" : "checkmark"}
                  size={16}
                  color={item.read ? "#ffffffaa" : "#ffffff80"}
                  style={styles.readIndicator}
                />
              )}
            </View>

            {/* Display reactions */}
            {reactions[item.id!]?.length > 0 && (
              <View style={styles.reactionsContainer}>
                {reactions[item.id!].map((reaction, i) => (
                  <Text key={`${reaction.userId}-${i}`} style={styles.reactionEmoji}>
                    {reaction.emoji}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {!showReactions && (
            <TouchableOpacity
              style={[styles.reactionButton, isMyMessage ? styles.myReactionButton : styles.otherReactionButton]}
              onPress={() => item.id && showReactionOptions(item.id)}
            >
              <MaterialCommunityIcons name="emoticon-outline" size={16} color={theme.text + "80"} />
            </TouchableOpacity>
          )}

          {showReactions === item.id && (
            <Animated.View
              style={[
                styles.reactionOptions,
                isMyMessage ? styles.myReactionOptions : styles.otherReactionOptions,
                {
                  opacity: reactionAnim,
                  transform: [
                    { scale: reactionAnim },
                    {
                      translateY: reactionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((reaction) => (
                <TouchableOpacity
                  key={reaction}
                  style={styles.reactionOption}
                  onPress={() => item.id && addReaction(item.id, reaction)}
                >
                  <Text style={styles.reactionEmoji}>{reaction}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderDay = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let dayText
    if (date.toDateString() === today.toDateString()) {
      dayText = "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayText = "Yesterday"
    } else {
      dayText = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      })
    }

    return (
      <View style={styles.dayContainer}>
        <View style={[styles.dayBadge, { backgroundColor: isDark ? theme.card : theme.secondary + "20" }]}>
          <Text style={[styles.dayText, { color: theme.text }]}>{dayText}</Text>
        </View>
      </View>
    )
  }

  const handleAttachmentSelection = async (type: string) => {
    setSelectedAttachmentType(type)
    setAttachmentInProgress(true)

    try {
      let result

      if (type === "photo") {
        result = await pickImage()
      } else if (type === "camera") {
        result = await takePhoto()
      } else if (type === "document") {
        result = await pickDocument()
      } else if (type === "location") {
        result = await pickLocation()
      }

      if (result) {
        await sendAttachment(result)
      }
    } catch (error) {
      console.error(`Error handling ${type} attachment:`, error)
    } finally {
      setAttachmentInProgress(false)
      setShowAttachmentOptions(false)
    }
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!")
        return null
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: "image",
        }
      }
      return null
    } catch (error) {
      console.error("Error picking image:", error)
      return null
    }
  }

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== "granted") {
        alert("Sorry, we need camera permissions to make this work!")
        return null
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: "image",
        }
      }
      return null
    } catch (error) {
      console.error("Error taking photo:", error)
      return null
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      })

      if (!result.canceled) {
        return {
          uri: result.uri,
          name: result.assets[0]?.name || "unknown",
          type: "file",
        }
      }
      return null
    } catch (error) {
      console.error("Error picking document:", error)
      return null
    }
  }

  const pickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        alert("Sorry, we need location permissions to make this work!")
        return null
      }

      const location = await Location.getCurrentPositionAsync({})
      return {
        coords: location.coords,
        type: "location",
      }
    } catch (error) {
      console.error("Error getting location:", error)
      return null
    }
  }

  const sendAttachment = async (attachment: any) => {
    if (!user) return

    try {
      setIsSending(true)

      let attachmentUrl = ""
      let messageText = ""

      if (attachment.type === "image") {
        // Upload image to storage
        const uploadResult = await uploadMedia(attachment.uri)
        attachmentUrl = uploadResult.url
        messageText = attachmentUrl
      } else if (attachment.type === "file") {
        // Upload file to storage
        const uploadResult = await uploadMedia(attachment.uri, attachment.name)
        attachmentUrl = uploadResult.url
        messageText = `Shared a file: ${attachment.name}\n${attachmentUrl}`
      } else if (attachment.type === "location") {
        const { latitude, longitude } = attachment.coords
        messageText = `Shared a location: https://maps.google.com/?q=${latitude},${longitude}`
      }

      if (messageText) {
        const newMessage = await chatService.sendMessage(
          chatId,
          user.id,
          messageText,
          attachment.type !== "location"
            ? {
                url: attachmentUrl,
                type: attachment.type,
              }
            : undefined,
        )

        setMessages((prevMessages) => [...prevMessages, newMessage])

        playNotificationSound()
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    } catch (error) {
      console.error("Error sending attachment:", error)
      alert("Failed to send attachment. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const uploadMedia = async (uri: string, fileName?: string) => {
    // This is a placeholder for your actual upload function
    // You would typically upload to Firebase Storage or another service

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Return mock URL - replace with actual upload implementation
    return {
      url: uri,
      fileName: fileName || "image.jpg",
    }
  }

  const renderAttachmentOptions = () => {
    const options = [
      { icon: "image-outline", label: "Photo", color: "#4CAF50", type: "photo" },
      { icon: "camera-outline", label: "Camera", color: "#2196F3", type: "camera" },
      { icon: "document-outline", label: "Document", color: "#FF9800", type: "document" },
      { icon: "location-outline", label: "Location", color: "#9C27B0", type: "location" },
    ]

    return (
      <Animated.View
        style={[
          styles.attachmentOptionsContainer,
          {
            opacity: attachmentAnim,
            transform: [
              {
                translateY: attachmentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.icon}
            style={styles.attachmentOption}
            onPress={() => {
              handleAttachmentSelection(option.type)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            }}
          >
            <View style={[styles.attachmentIconContainer, { backgroundColor: option.color }]}>
              <Ionicons name={option.icon as any} size={24} color="#fff" />
            </View>
            <Text style={[styles.attachmentLabel, { color: theme.text }]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
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

        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => {
            if (otherUser?.id) {
              navigation.navigate('ProfileScreen', { userId: otherUser.id })
            }
          }}
        >
          {otherUser ? (
            <>
              <View style={styles.avatarContainer}>
                <Image
                  source={otherUser.photoURL ? { uri: otherUser.photoURL } : require("../assets/profile-avatar.png")}
                  style={styles.avatar}
                />
                {otherUser.isOnline && (
                  <View style={styles.headerOnlineIndicator} />
                )}
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
                  {otherUser.name || "User"}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.text + "60" }]} numberOfLines={1}>
                  {typing ? (
                    <View style={styles.typingContainer}>
                      <Text style={{ color: theme.primary }}>Typing</Text>
                      <View style={styles.typingDots}>
                        <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
                        <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
                        <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
                      </View>
                    </View>
                  ) : (
                    otherUser.isOnline ? 'Online' : `Last seen ${otherUser.lastSeen ? formatLastSeen(otherUser.lastSeen, otherUser.isOnline) : 'recently'}`
                  )}
                </Text>
              </View>
            </>
          ) : (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="call-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Ionicons name="videocam-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
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
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => `${item.id}-${item.timestamp}`}
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Image 
                    source={require('../assets/empty-chat.png')} 
                    style={styles.emptyImage}
                    resizeMode="contain"
                  />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No messages yet</Text>
                  <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                    Start the conversation by sending a message
                  </Text>
                </View>
              }
            />
            
            {showScrollButton && (
              <TouchableOpacity 
                style={[styles.scrollButton, { backgroundColor: theme.card }]}
                onPress={scrollToBottom}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
              <TouchableOpacity 
                style={[styles.scrollButton, { backgroundColor: theme.card }]}
                onPress={scrollToBottom}
                activeOpacity={0.8}
            />
            
            {showScrollButton && (
              <TouchableOpacity 
                style={[styles.scrollButton, { backgroundColor: theme.card }]}
                onPress={scrollToBottom}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
          </>
        )}

        {showAttachmentOptions && renderAttachmentOptions()}

        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={toggleAttachmentOptions}
          >
            <Ionicons 
              name={showAttachmentOptions ? "close" : "add"} 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>
          
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? theme.background : theme.secondary + '20' }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.text }]}
              placeholder="Type a message..."
              placeholderTextColor={theme.text + "50"}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color={theme.text + '70'} />
            </TouchableOpacity>
          </View>
          
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.sendButton, { 
                backgroundColor: messageText.trim() ? theme.primary : theme.text + "20",
              }]}
              onPress={handleSendMessage}
              disabled={isSending || !messageText.trim()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons 
                  name={messageText.trim() ? "send" : "mic-outline"} 
                  size={20} 
                  color={messageText.trim() ? "#fff" : theme.text + "60"} 
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      
      {showImagePreview && (
        <Pressable 
          style={styles.imagePreviewContainer}
          onPress={() => setShowImagePreview(null)}
        >
          <BlurView intensity={90} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
          <TouchableOpacity 
            style={styles.closePreviewButton}
            onPress={() => setShowImagePreview(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image 
            source={{ uri: showImagePreview }} 
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          <View style={styles.imagePreviewActions}>
            <TouchableOpacity style={styles.imageAction}>
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageAction}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageAction}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </Pressable>
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
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: "#000",
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
  avatarContainer: {
    position: "relative",
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
  headerOnlineIndicator: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
    bottom: 0,
    right: 12,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 6,
  },
  onlineIndicator: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    borderWidth: 1.5,
    borderColor: "#fff",
    bottom: 6,
    right: 8,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
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
    marginBottom: 4,
    maxWidth: "80%",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  myMessageContainer: {
    alignSelf: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubbleContainer: {
    position: "relative",
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 50,
    maxWidth: "100%",
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  myFirstMessage: {
    borderTopRightRadius: 18,
  },
  otherFirstMessage: {
    borderTopLeftRadius: 18,
  },
  myLastMessage: {
    borderBottomRightRadius: 18,
  },
  otherLastMessage: {
    borderBottomLeftRadius: 18,
  },
  imageBubble: {
    padding: 4,
    backgroundColor: "transparent",
  },
  imageContainer: {
    borderRadius: 14,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 14,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  readIndicator: {
    marginLeft: 4,
  },
  reactionButton: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  myReactionButton: {
    left: -14,
    bottom: 10,
  },
  otherReactionButton: {
    right: -14,
    bottom: 10,
  },
  reactionOptions: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  myReactionOptions: {
    bottom: -50,
    right: 0,
  },
  otherReactionOptions: {
    bottom: -50,
    left: 0,
  },
  reactionOption: {
    padding: 6,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  dayContainer: {
    alignItems: "center",
    marginVertical: 15,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    marginRight: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 16,
    lineHeight: 20,
  },
  emojiButton: {
    marginLeft: 5,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  scrollButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDots: {
    flexDirection: "row",
    marginLeft: 5,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
    opacity: 0.8,
  },
  attachmentOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  attachmentOption: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  attachmentIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  attachmentLabel: {
    fontSize: 12,
  },
  imagePreviewContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1001,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 10,
  },
  imagePreviewActions: {
    flexDirection: "row",
    position: "absolute",
    bottom: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    padding: 10,
  },
  imageAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignSelf: "flex-start",
  },
})

export default ChatScreen
