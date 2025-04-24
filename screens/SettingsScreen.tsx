"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Image, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import * as ImagePicker from "expo-image-picker"
import { storage } from "../firebase/config"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import type { StackNavigationProp } from "@react-navigation/stack"

// Define navigation types
type RootStackParamList = {
  SavedAddresses: undefined
  BusinessLocations: undefined
  BusinessHours: undefined
  ServiceAreas: undefined
  Availability: undefined
  EditProfile: undefined
  PaymentMethods: undefined
  Wallet: undefined
  HelpCenterScreen: undefined
  About: undefined
  SwitchRole: undefined
  IdentityVerification: undefined
  Home: undefined
  AuthScreen: undefined
}

type NavigationProp = StackNavigationProp<RootStackParamList>

const SettingsScreen = () => {
  const { theme, toggleTheme } = useTheme()
  const { user, userType = null, logout, updateUserProfile } = useAuth()
  const navigation = useNavigation<NavigationProp>()
  const [profileImage, setProfileImage] = useState(user?.photoURL || null)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)

  const isDark = theme?.type === "dark"
  const textColor = isDark ? "#FFFFFF" : "#000000"
  const backgroundColor = isDark ? "#121212" : "#F5F5F5"
  const cardColor = isDark ? "#1E1E1E" : "#FFFFFF"
  const accentColor = "#FF6B00"

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => {
          logout()
          navigation.navigate("AuthScreen")
        } 
      },
    ])
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant permission to access your photos")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })

    if (!result.canceled && result.assets && result.assets[0]) {
      // Upload image to Firebase Storage
      const uri = result.assets[0].uri
      const response = await fetch(uri)
      const blob = await response.blob()

      if (user?.uid) {
        const storageRef = ref(storage, `profile_images/${user.uid}`)

        try {
          await uploadBytes(storageRef, blob)
          const downloadURL = await getDownloadURL(storageRef)

          // Update user profile
          await updateUserProfile({
            photoURL: downloadURL,
          })

          setProfileImage(downloadURL)
          Alert.alert("Success", "Profile image updated successfully")
        } catch (error) {
          console.error("Error uploading image: ", error)
          Alert.alert("Error", "Failed to update profile image")
        }
      }
    }
  }

  const renderRoleSpecificSettings = () => {
    if (!userType) return null;
    
    switch (userType) {
      case "buyer":
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Saved Addresses</Text>
            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardColor }]}
              onPress={() => navigation.navigate("SavedAddresses")}
            >
              <MaterialIcons name="location-on" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Manage Saved Addresses</Text>
              <MaterialIcons name="chevron-right" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
        )
      case "seller":
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Business Settings</Text>
            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardColor }]}
              onPress={() => navigation.navigate("BusinessLocations")}
            >
              <MaterialIcons name="store" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Business Location(s)</Text>
              <MaterialIcons name="chevron-right" size={24} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardColor }]}
              onPress={() => navigation.navigate("BusinessHours")}
            >
              <MaterialIcons name="access-time" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Business Hours</Text>
              <MaterialIcons name="chevron-right" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
        )
      case "runner":
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Runner Settings</Text>
            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardColor }]}
              onPress={() => navigation.navigate("ServiceAreas")}
            >
              <MaterialIcons name="map" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Service Radius</Text>
              <MaterialIcons name="chevron-right" size={24} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingItem, { backgroundColor: cardColor }]}
              onPress={() => navigation.navigate("Availability")}
            >
              <MaterialIcons name="event-available" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Availability Schedule</Text>
              <MaterialIcons name="chevron-right" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
        )
      default:
        return null
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: cardColor }]}>
        <TouchableOpacity onPress={pickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImagePlaceholder, { backgroundColor: accentColor }]}>
              <Text style={styles.profileImagePlaceholderText}>
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
              </Text>
            </View>
          )}
          <View style={styles.editIconContainer}>
            <MaterialIcons name="edit" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.userName, { color: textColor }]}>{user?.displayName || "User"}</Text>

        {userType && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userType.charAt(0).toUpperCase() + userType.slice(1)}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate("EditProfile")}>
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Theme Toggle */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Appearance</Text>
        <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
          <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#767577", true: "#FF6B00" }}
            thumbColor={"#f4f3f4"}
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Notifications</Text>
        <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
          <Ionicons name="notifications" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Push Notifications</Text>
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: "#767577", true: "#FF6B00" }}
            thumbColor={"#f4f3f4"}
          />
        </View>
        <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
          <Ionicons name="mail" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Email Notifications</Text>
          <Switch
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            trackColor={{ false: "#767577", true: "#FF6B00" }}
            thumbColor={"#f4f3f4"}
          />
        </View>
        <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
          <Ionicons name="chatbubble-ellipses" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>In-App Notifications</Text>
          <Switch
            value={inAppNotifications}
            onValueChange={setInAppNotifications}
            trackColor={{ false: "#767577", true: "#FF6B00" }}
            thumbColor={"#f4f3f4"}
          />
        </View>
      </View>

      {/* Role Specific Settings */}
      {renderRoleSpecificSettings()}

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Payment</Text>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: cardColor }]}
          onPress={() => navigation.navigate("PaymentMethods")}
        >
          <FontAwesome5 name="credit-card" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Payment Methods</Text>
          <MaterialIcons name="chevron-right" size={24} color={textColor} />
        </TouchableOpacity>
        {(userType === "seller" || userType === "runner") && (
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: cardColor }]}
            onPress={() => navigation.navigate("Wallet")}
          >
            <FontAwesome5 name="wallet" size={24} color={accentColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Wallet & Payouts</Text>
            <MaterialIcons name="chevron-right" size={24} color={textColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Support</Text>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: cardColor }]}
          onPress={() => navigation.navigate("HelpCenterScreen")}
        >
          <MaterialIcons name="help" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Help Center</Text>
          <MaterialIcons name="chevron-right" size={24} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: cardColor }]}
          onPress={() => navigation.navigate("About")}
        >
          <Ionicons name="information-circle" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>About</Text>
          <MaterialIcons name="chevron-right" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Account</Text>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: cardColor }]}
          onPress={() => navigation.navigate("SwitchRole")}
        >
          <MaterialIcons name="swap-horiz" size={24} color={accentColor} />
          <Text style={[styles.settingText, { color: textColor }]}>Switch Role</Text>
          <MaterialIcons name="chevron-right" size={24} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: cardColor }]} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
          <Text style={[styles.settingText, { color: "#FF3B30" }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: textColor }]}>Version 1.1.0</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    padding: 20,
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    color: "white",
    fontWeight: "bold",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B00",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  roleBadge: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    marginTop: 5,
  },
  roleBadgeText: {
    color: "white",
    fontWeight: "bold",
  },
  editProfileButton: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  editProfileButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: 5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  settingText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
  versionContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.6,
  },
})

export default SettingsScreen