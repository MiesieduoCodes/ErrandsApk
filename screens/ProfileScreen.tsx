"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, type NavigationProp } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { userService } from "../services/database"
import type { RootStackParamList } from "../types"

interface UserStats {
  completedErrands: number
  totalSpent: number
  favoriteRunners: number
  savedAddresses: number
}

const ProfileScreen = () => {
  const { user, logout, updateUserProfile } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()

  const [isLoading, setIsLoading] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({
    completedErrands: 0,
    totalSpent: 0,
    favoriteRunners: 0,
    savedAddresses: 0,
  })

  useEffect(() => {
    if (!user) return

    const loadUserStats = async () => {
      try {
        setIsLoading(true)
        const addresses = await userService.getUserAddresses(user.id)
        const favorites = await userService.getUserFavoriteRunners(user.id)

        setUserStats({
          completedErrands: 5,
          totalSpent: 100,
          favoriteRunners: favorites.length,
          savedAddresses: addresses.length,
        })
      } catch (error) {
        console.error("Error loading user stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserStats()
  }, [user])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Error logging out:", error)
      Alert.alert("Error", "Failed to log out. Please try again.")
    }
  }

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleLogout, style: "destructive" },
    ])
  }

  const handleSwitchRole = () => {
    navigation.navigate("SwitchRole" as never)
  }

  const handleEditProfile = () => {
    Alert.alert("Edit Profile", "Chill, This feature is coming soon!")
  }

  const handleVerifyIdentity = () => {
    navigation.navigate("IdentityVerification" as never)
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <Image
            source={user?.photoURL ? { uri: user.photoURL } : require("../assets/profile-avatar.png")}
            style={styles.profileImage}
          />

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {user?.displayName || "User"}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.text + "80" }]}>
              {user?.email}
            </Text>

            <View style={styles.roleContainer}>
              <Text style={[styles.roleLabel, { color: theme.text + "80" }]}>Role:</Text>
              <View style={[styles.roleChip, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.roleText, { color: theme.primary }]}>
                  {user?.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : "Buyer"}
                </Text>
              </View>
            </View>

            <View style={styles.verificationContainer}>
              <Text style={[styles.verificationLabel, { color: theme.text + "80" }]}>
                Verification:
              </Text>
              <View
                style={[
                  styles.verificationChip,
                  {
                    backgroundColor: user?.isVerified ? "#4CAF5020" : "#FF980020",
                    borderColor: user?.isVerified ? "#4CAF50" : "#FF9800",
                  },
                ]}
              >
                <Text style={[styles.verificationText, { color: user?.isVerified ? "#4CAF50" : "#FF9800" }]}>
                  {user?.isVerified ? "Verified" : "Unverified"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={[styles.profileActionButton, { backgroundColor: theme.secondary }]}
              onPress={handleEditProfile}
            >
              <Ionicons name="pencil" size={20} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.profileActionButton, { backgroundColor: theme.secondary }]}
              onPress={handleSwitchRole}
            >
              <Ionicons name="swap-horizontal" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {userStats.completedErrands}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Completed</Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              ₦{userStats.totalSpent.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Total Spent</Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {userStats.favoriteRunners}
            </Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Favorites</Text>
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Settings</Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleVerifyIdentity}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Verify Identity</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleSwitchRole}>
            <View style={styles.settingLeft}>
              <Ionicons name="swap-horizontal-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Switch Role</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("Payment" as never)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="card-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Payment Methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: theme.primary + "80" }}
              thumbColor={isDark ? theme.primary : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Support</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("HelpCenterScreen" as never)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.accent }]} 
          onPress={confirmLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.text + "50" }]}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  roleLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  verificationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  verificationLabel: {
    fontSize: 14,
    marginRight: 5,
  },
  verificationChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  profileActions: {
    flexDirection: "column",
    gap: 20,
    justifyContent: "space-between",
    height: 70,
  },
  profileActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  settingsSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 30,
  },
})

export default ProfileScreen