"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Keyboard,
  Dimensions,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, type NavigationProp } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { searchService } from "../services/search"
import { chatService } from "../services/chat"
import type { RootStackParamList } from "../types"
import type { User } from "../types"
import * as Haptics from "expo-haptics"
import { userService } from "../services/database"

const { width } = Dimensions.get("window")

const NewChatScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()

  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [recentContacts, setRecentContacts] = useState<User[]>([])
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const searchInputRef = useRef<TextInput>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true)
    })
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false)
    })

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    loadRecentContacts()

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  useEffect(() => {
    if (searchQuery.length > 0) {
      handleSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadRecentContacts = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const userChats = await chatService.getUserChats(user.uid || "")
      const contactIds = new Set<string>()

      userChats.forEach((chat) => {
        chat.participants.forEach((participantId) => {
          if (participantId !== user.uid) {
            contactIds.add(participantId)
          }
        })
      })

      const contactPromises = Array.from(contactIds).map((userId) => userService.getUserByFirebaseUid(userId))
      const contactsData = await Promise.all(contactPromises)
      const validContacts = contactsData.filter((contact) => contact !== null).slice(0, 5)

      setRecentContacts(validContacts as User[])
    } catch (error) {
      console.error("Error loading recent contacts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!user || searchQuery.length < 2) return

    try {
      setIsLoading(true)
      const results = await searchService.searchUsers({ query: searchQuery })
      const filteredResults = results
        .filter((result) => result.id !== user.uid)
        .map((result) => ({
          ...result,
          lastActive: result.lastActive || "", // Ensure lastActive is defined
        }))
      setSearchResults(filteredResults)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = async (selectedUser: User) => {
    if (!user) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setIsLoading(true)
      const chat = await chatService.createChat([user.uid || "", selectedUser.id])
      navigation.navigate("Chat", { chatId: chat.id })
    } catch (error) {
      console.error("Error creating chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatLastActive = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / (60 * 24))}d ago`
  }

  const renderUserItem = ({ item }: { item: User }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleUserSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={item.photoURL ? { uri: item.photoURL } : require("../assets/profile-avatar.png")}
            style={styles.avatar}
          />
          <View style={[styles.statusIndicator, { backgroundColor: "#4CAF50", borderColor: theme.card }]} />
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={[styles.userName, { color: theme.text }]}>{item.name || "User"}</Text>
            {item.lastActive && (
              <Text style={[styles.lastActive, { color: theme.text + "60" }]}>{formatLastActive(item.lastActive)}</Text>
            )}
          </View>

          <Text style={[styles.userEmail, { color: theme.text + "80" }]}>{item.email}</Text>

          <View style={styles.badgeContainer}>
            <View style={[styles.userTypeBadge, { backgroundColor: theme.accent + "20" }]}>
              <Text style={[styles.userTypeText, { color: theme.accent }]}>
                {(item.userType ?? "unknown").charAt(0).toUpperCase() + (item.userType ?? "unknown").slice(1)}
              </Text>
            </View>

            {item.tags &&
              item.tags?.map((tag: string, index: number) => (
                <View key={index} style={[styles.tagBadge, { backgroundColor: theme.secondary + "30" }]}>
                  <Text style={[styles.tagText, { color: theme.text + "90" }]}>{tag}</Text>
                </View>
              ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.chatButton, { backgroundColor: theme.primary + "15" }]}
          onPress={() => handleUserSelect(item)}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color={theme.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )

  const renderRecentContact = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.recentContactItem} onPress={() => handleUserSelect(item)} activeOpacity={0.7}>
      <View style={styles.recentAvatarContainer}>
        <Image
          source={item.photoURL ? { uri: item.photoURL } : require("../assets/profile-avatar.png")}
          style={styles.recentAvatar}
        />
        <View style={[styles.recentStatusIndicator, { backgroundColor: "#4CAF50", borderColor: theme.background }]} />
      </View>
      <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
        {item.name?.split(" ")[0] || "User"}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>New Chat</Text>
      </View>

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: isDark ? theme.card : theme.secondary + "15",
              borderColor: theme.border + "30",
            },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery("")
                searchInputRef.current?.focus()
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {!isKeyboardVisible && recentContacts.length > 0 && !searchQuery && (
        <View style={styles.recentContactsContainer}>
          <View style={styles.recentHeaderContainer}>
            <Text style={[styles.recentHeader, { color: theme.text }]}>Recent Contacts</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentContacts}
            renderItem={renderRecentContact}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentContactsList}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.usersList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery.length > 0 ? (
                <>
                  <MaterialIcons name="search-off" size={60} color={theme.text + "30"} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No users found</Text>
                  <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                    Try a different search term or check the spelling
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="people" size={60} color={theme.text + "30"} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Find people to chat with</Text>
                  <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                    Search by name or email to start a conversation
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}

      <View style={[styles.quickActionsContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.primary + "15" }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
        >
          <Ionicons name="people" size={22} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>New Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.accent + "15" }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
        >
          <Ionicons name="person-add" size={22} color={theme.accent} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Import Contacts</Text>
        </TouchableOpacity>
      </View>
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
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    padding: 15,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
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
  usersList: {
    padding: 15,
    paddingTop: 5,
  },
  userItem: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  statusIndicator: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    bottom: 0,
    right: 15,
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  lastActive: {
    fontSize: 12,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  userTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tagBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
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
  recentContactsContainer: {
    marginBottom: 10,
  },
  recentHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  recentHeader: {
    fontSize: 16,
    fontWeight: "600",
  },
  seeAllText: {
    fontSize: 14,
  },
  recentContactsList: {
    paddingHorizontal: 10,
  },
  recentContactItem: {
    alignItems: "center",
    marginHorizontal: 5,
    width: 70,
  },
  recentAvatarContainer: {
    position: "relative",
    marginBottom: 5,
  },
  recentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  recentStatusIndicator: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    bottom: 0,
    right: 0,
  },
  recentName: {
    fontSize: 12,
    fontWeight: "500",
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
})

export default NewChatScreen
