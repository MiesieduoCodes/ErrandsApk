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

type RootStackParamList = {
  SavedAddresses: undefined
  BusinessLocationScreen:undefined
  BusinessHoursScreen:undefined
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
  Auth: undefined
  VerifyIdentity: undefined
  NotificationScreen: undefined
  ContactSupport: undefined
  TermsAndPrivacy: undefined
}

type UserRole = 'buyer' | 'seller' | 'runner' | 'admin'
type NavigationProp = StackNavigationProp<RootStackParamList>

interface SettingItem {
  title: string
  icon: JSX.Element
  screen: keyof RootStackParamList
}

const SettingsScreen = () => {
  const { theme, toggleTheme } = useTheme()
  const { user, userType, logout, updateUserProfile } = useAuth()
  const navigation = useNavigation<NavigationProp>()
  const [profileImage, setProfileImage] = useState(user?.photoURL || null)
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    inApp: true
  })

  // Theme variables
  const isDark = theme?.type === "dark"
  const textColor = isDark ? "#FFFFFF" : "#000000"
  const backgroundColor = isDark ? "#121212" : "#F5F5F5"
  const cardColor = isDark ? "#1E1E1E" : "#FFFFFF"
  const accentColor = "#FF6B00"

  // Role-specific menu configurations
  const roleSpecificSettings: Record<UserRole, SettingItem[]> = {
    buyer: [
      {
        title: "Saved Addresses",
        icon: <MaterialIcons name="location-on" size={24} color={accentColor} />,
        screen: "SavedAddresses"
      },
      {
        title: "Verify Identity",
        icon: <MaterialIcons name="verified-user" size={24} color={accentColor} />,
        screen: "VerifyIdentity"
      }
    ],
    seller: [
      {
        title: "Business Locationses",
        icon: <MaterialIcons name="store" size={24} color={accentColor} />,
        screen: "BusinessLocationScreen"
      },
      {
        title: "Business Hours",
        icon: <MaterialIcons name="access-time" size={24} color={accentColor} />,
        screen: "BusinessHoursScreen"
      },
      {
        title: "Wallet & Payouts",
        icon: <FontAwesome5 name="wallet" size={24} color={accentColor} />,
        screen: "Wallet"
      },
      {
        title: "Verify Identity",
        icon: <MaterialIcons name="verified-user" size={24} color={accentColor} />,
        screen: "VerifyIdentity"
      }
    ],
    runner: [
      {
        title: "Service Areas",
        icon: <MaterialIcons name="map" size={24} color={accentColor} />,
        screen: "ServiceAreas"
      },
      {
        title: "Availability",
        icon: <MaterialIcons name="event-available" size={24} color={accentColor} />,
        screen: "Availability"
      },
      {
        title: "Wallet & Payouts",
        icon: <FontAwesome5 name="wallet" size={24} color={accentColor} />,
        screen: "Wallet"
      },
      {
        title: "Verify Identity",
        icon: <MaterialIcons name="verified-user" size={24} color={accentColor} />,
        screen: "VerifyIdentity"
      }
    ],
    admin: [
      {
        title: "Admin Dashboard",
        icon: <MaterialIcons name="admin-panel-settings" size={24} color={accentColor} />,
        screen: "Home"
      }
    ]
  }

  // Common settings for all roles
  const commonSettings: SettingItem[] = [
    {
      title: "Notifications",
      icon: <MaterialIcons name="notifications" size={24} color={accentColor} />,
      screen: "NotificationScreen"
    },
    {
      title: "Switch Role",
      icon: <MaterialIcons name="swap-horiz" size={24} color={accentColor} />,
      screen: "SwitchRole"
    }
  ]

  // Support settings
  const supportSettings: SettingItem[] = [
    {
      title: "Help Center",
      icon: <MaterialIcons name="help" size={24} color={accentColor} />,
      screen: "HelpCenterScreen"
    },
    {
      title: "Contact Support",
      icon: <MaterialIcons name="contact-support" size={24} color={accentColor} />,
      screen: "ContactSupport"
    },
    {
      title: "Terms & Privacy",
      icon: <MaterialIcons name="policy" size={24} color={accentColor} />,
      screen: "TermsAndPrivacy"
    },
    {
      title: "About",
      icon: <Ionicons name="information-circle" size={24} color={accentColor} />,
      screen: "About"
    }
  ]

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        onPress: () => {
          logout()
          navigation.navigate("Auth")
        } 
      },
    ])
  }

  const handleImageUpload = async () => {
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

    if (!result.canceled && result.assets?.[0]?.uri && user?.uid) {
      try {
        const uri = result.assets[0].uri
        const response = await fetch(uri)
        const blob = await response.blob()
        const storageRef = ref(storage, `profile_images/${user.uid}`)
        
        await uploadBytes(storageRef, blob)
        const downloadURL = await getDownloadURL(storageRef)
        await updateUserProfile({ photoURL: downloadURL })
        setProfileImage(downloadURL)
        Alert.alert("Success", "Profile image updated successfully")
      } catch (error) {
        console.error("Image upload failed:", error)
        Alert.alert("Error", "Failed to update profile image")
      }
    }
  }

  const renderSettingItem = (
    title: string, 
    icon: JSX.Element, 
    screen: keyof RootStackParamList,
    isLast = false,
    isDanger = false
  ) => (
    <TouchableOpacity
      style={[
        styles.settingItem, 
        { 
          backgroundColor: cardColor,
          marginBottom: isLast ? 0 : 8
        }
      ]}
      onPress={() => navigation.navigate(screen)}
    >
      {icon}
      <Text style={[
        styles.settingText, 
        { 
          color: isDanger ? "#FF3B30" : textColor 
        }
      ]}>
        {title}
      </Text>
      {!isDanger && <MaterialIcons name="chevron-right" size={24} color={textColor} />}
    </TouchableOpacity>
  )

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
      {children}
    </View>
  )

  // Early return if userType is null
  if (!userType) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textColor }}>Loading user information...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: cardColor }]}>
          <TouchableOpacity onPress={handleImageUpload}>
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

          <Text style={[styles.userName, { color: textColor }]}>
            {user?.displayName || "User"}
          </Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {userType.charAt(0).toUpperCase() + userType.slice(1)}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.editProfileButton} 
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        {renderSection("Appearance", 
          <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={accentColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: accentColor }}
              thumbColor={"#f4f3f4"}
            />
          </View>
        )}

        {/* Notifications Section */}
        {renderSection("Notifications", 
          <>
            <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
              <Ionicons name="notifications" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Push Notifications</Text>
              <Switch
                value={notifications.push}
                onValueChange={(value) => setNotifications({...notifications, push: value})}
                trackColor={{ false: "#767577", true: accentColor }}
                thumbColor={"#f4f3f4"}
              />
            </View>
            <View style={[styles.settingItem, { backgroundColor: cardColor }]}>
              <Ionicons name="mail" size={24} color={accentColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Email Notifications</Text>
              <Switch
                value={notifications.email}
                onValueChange={(value) => setNotifications({...notifications, email: value})}
                trackColor={{ false: "#767577", true: accentColor }}
                thumbColor={"#f4f3f4"}
              />
            </View>
          </>
        )}

        {/* Role-Specific Settings */}
        {renderSection(
          `${userType.charAt(0).toUpperCase() + userType.slice(1)} Settings`,
          <>
            {roleSpecificSettings[userType].map((setting: SettingItem, index: number) => 
              renderSettingItem(
                setting.title,
                setting.icon,
                setting.screen,
                index === roleSpecificSettings[userType].length - 1
              )
            )}
          </>
        )}

        {/* Common Settings */}
        {renderSection("Account",
          <>
            {commonSettings.map((setting: SettingItem, index: number) => 
              renderSettingItem(
                setting.title,
                setting.icon,
                setting.screen,
                index === commonSettings.length - 1
              )
            )}
          </>
        )}

        {/* Support Section */}
        {renderSection("Support",
          <>
            {supportSettings.map((setting: SettingItem, index: number) => 
              renderSettingItem(
                setting.title,
                setting.icon,
                setting.screen,
                index === supportSettings.length - 1
              )
            )}
          </>
        )}

        {/* Logout Section */}
        {renderSection("",
          renderSettingItem(
            "Logout",
            <MaterialIcons name="logout" size={24} color="#FF3B30" />,
            "Auth",
            true,
            true
          )
        )}

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: textColor }]}>Version 1.1.0</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
    paddingHorizontal: 15,
    paddingTop: 25,
  },
  profileSection: {
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
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
    marginVertical: 30,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.6,
  },
})

export default SettingsScreen