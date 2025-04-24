"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  StatusBar
} from "react-native"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

const { width } = Dimensions.get('window')

interface FAQ {
  id: string
  question: string
  answer: string
  icon: string
}

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

const faqData: FAQ[] = [
  {
    id: "1",
    question: "How do I request an errand?",
    answer: "To request an errand, go to the Home screen and tap on 'Request an Errand'. Fill in the details of what you need and submit your request.",
    icon: "running"
  },
  {
    id: "2",
    question: "How do payments work?",
    answer: "You can pay for errands using your in-app wallet, bank transfer, or cash on delivery depending on your preference and the seller's accepted payment methods.",
    icon: "credit-card"
  },
  {
    id: "3",
    question: "How do I become a runner?",
    answer: "To become a runner, go to your profile and tap on 'Switch Role'. Select 'Runner' and complete the verification process.",
    icon: "user-shield"
  },
  {
    id: "4",
    question: "What if my order is not delivered?",
    answer: "If your order is not delivered, you can contact the runner directly through the app. If you can't resolve the issue, you can report it to our support team.",
    icon: "exclamation-triangle"
  },
  // {
  //   id: "5",
  //   question: "How do I track my errand?",
  //   answer: "You can track your errand in real-time from the Home screen when you have an active order. You'll see the runner's location and estimated time of arrival.",
  //   icon: "map-marker-alt"
  // },
  // {
  //   id: "6",
  //   question: "How do I contact support?",
  //   answer: "You can contact support 24/7 through this chat interface or email us at support@errandapp.com. Average response time is under 15 minutes.",
  //   icon: "headset"
  // }
]

const HelpCenterScreen = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: `Howdy ${user?.displayName || ""}! 👋 I'm your Errand Assistant. How can I help you today?`,
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showFAQ, setShowFAQ] = useState(true)
  const flatListRef = useRef<FlatList<Message>>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const isDark = theme.type === "dark"
  const textColor = isDark ? "#FFFFFF" : "#000000"
  const backgroundColor = isDark ? "#121212" : "#F5F5F5"
  const cardColor = isDark ? "#1E1E1E" : "#FFFFFF"
  const inputBgColor = isDark ? "#2C2C2C" : "#EFEFEF"
  const accentColor = "#02A54D"
  const secondaryColor = isDark ? "#4CCB7F" : "#4CCB7F"
  const borderColor = isDark ? "#333333" : "#E0E0E0"

  // Calculate top padding based on platform
  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 40 : 60

  useEffect(() => {
    if (messages.length > 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true
      }).start(() => setShowFAQ(false))
    } else {
      setShowFAQ(true)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true
      }).start()
    }
  }, [messages.length])

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const handleSend = () => {
    if (inputText.trim() === "") return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsTyping(true)

    setTimeout(() => {
      const matchedFaq = faqData.find(
        (faq) =>
          faq.question.toLowerCase().includes(inputText.toLowerCase()) ||
          inputText.toLowerCase().includes(faq.question.toLowerCase()) ||
          inputText.toLowerCase().includes(faq.answer.toLowerCase())
      )

      let botResponse
      if (matchedFaq) {
        botResponse = matchedFaq.answer
      } else if (inputText.toLowerCase().includes("thank")) {
        botResponse = "You're welcome! Is there anything else I can help with?"
      } else {
        botResponse = "I don't have an immediate answer for that. Would you like to:\n\n1. Speak with a human support agent\n2. Browse our FAQ\n3. Try rephrasing your question"
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleFAQSelect = (question: string) => {
    setInputText(question)
    handleSend()
  }

  const renderFaqItem = ({ item }: { item: FAQ }) => (
    <TouchableOpacity
      style={[styles.faqItem, { backgroundColor: cardColor, borderColor }]}
      onPress={() => handleFAQSelect(item.question)}
      activeOpacity={0.7}
    >
      <View style={styles.faqIconContainer}>
        <FontAwesome5 
          name={item.icon} 
          size={18} 
          color={accentColor} 
          style={styles.faqIcon}
        />
      </View>
      <Text style={[styles.faqQuestion, { color: textColor }]}>{item.question}</Text>
      <MaterialIcons name="chevron-right" size={20} color={isDark ? "#555555" : "#AAAAAA"} />
    </TouchableOpacity>
  )

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = item.sender === "bot"

    return (
      <View style={[styles.messageContainer, isBot ? styles.botMessageContainer : styles.userMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            isBot
              ? [styles.botMessageBubble, { backgroundColor: cardColor, borderColor }]
              : [styles.userMessageBubble, { backgroundColor: accentColor }],
          ]}
        >
          <Text style={[styles.messageText, { color: isBot ? textColor : "#FFFFFF" }]}>{item.text}</Text>
          <Text style={[styles.messageTime, { color: isBot ? (isDark ? "#AAAAAA" : "#888888") : "rgba(255,255,255,0.7)" }]}>
            {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        style={{ flex: 1 }}
      >
        {/* Added substantial top padding to push content down */}
        <View style={{ paddingTop: topPadding }}>
          <View style={[styles.header, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', borderColor }]}>
            <View style={styles.headerContent}>
              <FontAwesome5 name="headset" size={24} color={accentColor} />
              <Text style={[styles.headerTitle, { color: textColor }]}>Help Center</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: isDark ? "#AAAAAA" : "#666666" }]}>
              We're here to help 24/7
            </Text>
          </View>
        </View>

        {showFAQ && (
          <Animated.View style={[styles.faqContainer, { opacity: fadeAnim }]}>
            <Text style={[styles.faqTitle, { color: textColor }]}>How can we help?</Text>
            <Text style={[styles.faqSubtitle, { color: isDark ? "#AAAAAA" : "#666666" }]}>
              Browse common questions or ask me anything
            </Text>
            <FlatList
              data={faqData}
              renderItem={renderFaqItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.faqListContainer}
            />
          </Animated.View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesContainer, { paddingBottom: 15 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => <View style={{ height: showFAQ ? 0 : 20 }} />}
        />

        {isTyping && (
          <View style={[styles.typingIndicator, { backgroundColor: cardColor, borderColor }]}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={[styles.typingText, { color: textColor }]}>Assistant is typing...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Type your question..."
            placeholderTextColor={isDark ? "#AAAAAA" : "#888888"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            enablesReturnKeyAutomatically
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: inputText.trim() ? accentColor : isDark ? "#444444" : "#DDDDDD",
                transform: [{ scale: inputText.trim() ? 1 : 0.8 }]
              },
            ]}
            onPress={handleSend}
            disabled={inputText.trim() === ""}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={inputText.trim() ? "#FFFFFF" : isDark ? "#777777" : "#999999"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderBottomWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  faqContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  faqSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  faqListContainer: {
    paddingBottom: 10,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  faqIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(2, 165, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqIcon: {
    marginLeft: 1,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 15,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  botMessageContainer: {
    alignSelf: "flex-start",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  botMessageBubble: {
    borderTopLeftRadius: 4,
  },
  userMessageBubble: {
    borderTopRightRadius: 4,
    borderColor: '#02A54D',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: "flex-end",
    marginTop: 6,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  typingText: {
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
})

export default HelpCenterScreen

