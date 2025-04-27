// "use client"

// import { useState, useEffect } from "react"
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   ScrollView,
//   Switch,
//   Alert,
//   ActivityIndicator,
// } from "react-native"
// import { StatusBar } from "expo-status-bar"
// import { Ionicons } from "@expo/vector-icons"
// import { useNavigation, type NavigationProp } from "@react-navigation/native"
// import { useAuth } from "../context/AuthContext"
// import { useTheme } from "../context/ThemeContext"
// import { userService } from "../services/database"
// import type { RootStackParamList } from "../types"

// interface UserStats {
//   completedErrands: number
//   totalSpent: number
//   favoriteRunners: number
//   savedAddresses: number
// }

// const ProfileScreen = () => {
//   const { user, logout, updateUserProfile } = useAuth()
//   const { theme, isDark, toggleTheme } = useTheme()
//   const navigation = useNavigation<NavigationProp<RootStackParamList>>()

//   const [isLoading, setIsLoading] = useState(false)
//   const [userStats, setUserStats] = useState<UserStats>({
//     completedErrands: 0,
//     totalSpent: 0,
//     favoriteRunners: 0,
//     savedAddresses: 0,
//   })

//   useEffect(() => {
//     if (!user) return

//     const loadUserStats = async () => {
//       try {
//         setIsLoading(true)
//         const addresses = await userService.getUserAddresses(user.id)
//         const favorites = await userService.getUserFavoriteRunners(user.id)

//         setUserStats({
//           completedErrands: 5,
//           totalSpent: 100,
//           favoriteRunners: favorites.length,
//           savedAddresses: addresses.length,
//         })
//       } catch (error) {
//         console.error("Error loading user stats:", error)
//       } finally {
//         setIsLoading(false)
//       }
//     }

//     loadUserStats()
//   }, [user])

//   const handleLogout = async () => {
//     try {
//       await logout()
//     } catch (error) {
//       console.error("Error logging out:", error)
//       Alert.alert("Error", "Failed to log out. Please try again.")
//     }
//   }

//   const confirmLogout = () => {
//     Alert.alert("Logout", "Are you sure you want to logout?", [
//       { text: "Cancel", style: "cancel" },
//       { text: "Logout", onPress: handleLogout, style: "destructive" },
//     ])
//   }

//   const handleSwitchRole = () => {
//     navigation.navigate("SwitchRole" as never)
//   }

//   const handleEditProfile = () => {
//     Alert.alert("Edit Profile", "Chill, This feature is coming soon!")
//   }

//   const handleVerifyIdentity = () => {
//     navigation.navigate("IdentityVerification" as never)
//   }

//   if (isLoading) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
//         <ActivityIndicator size="large" color={theme.primary} />
//         <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
//       </View>
//     )
//   }

//   return (
//     <View style={[styles.container, { backgroundColor: theme.background }]}>
//       <StatusBar style={isDark ? "light" : "dark"} />

//       <View style={[styles.header, { backgroundColor: theme.primary }]}>
//         <Text style={styles.headerTitle}>Profile</Text>
//       </View>

//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
//           <Image
//             source={user?.photoURL ? { uri: user.photoURL } : require("../assets/profile-avatar.png")}
//             style={styles.profileImage}
//           />

//           <View style={styles.profileInfo}>
//             <Text style={[styles.profileName, { color: theme.text }]}>
//               {user?.displayName || "User"}
//             </Text>
//             <Text style={[styles.profileEmail, { color: theme.text + "80" }]}>
//               {user?.email}
//             </Text>

//             <View style={styles.roleContainer}>
//               <Text style={[styles.roleLabel, { color: theme.text + "80" }]}>Role:</Text>
//               <View style={[styles.roleChip, { backgroundColor: theme.primary + "20" }]}>
//                 <Text style={[styles.roleText, { color: theme.primary }]}>
//                   {user?.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : "Buyer"}
//                 </Text>
//               </View>
//             </View>

//             <View style={styles.verificationContainer}>
//               <Text style={[styles.verificationLabel, { color: theme.text + "80" }]}>
//                 Verification:
//               </Text>
//               <View
//                 style={[
//                   styles.verificationChip,
//                   {
//                     backgroundColor: user?.isVerified ? "#4CAF5020" : "#FF980020",
//                     borderColor: user?.isVerified ? "#4CAF50" : "#FF9800",
//                   },
//                 ]}
//               >
//                 <Text style={[styles.verificationText, { color: user?.isVerified ? "#4CAF50" : "#FF9800" }]}>
//                   {user?.isVerified ? "Verified" : "Unverified"}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           <View style={styles.profileActions}>
//             <TouchableOpacity
//               style={[styles.profileActionButton, { backgroundColor: theme.secondary }]}
//               onPress={handleEditProfile}
//             >
//               <Ionicons name="pencil" size={20} color={theme.text} />
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.profileActionButton, { backgroundColor: theme.secondary }]}
//               onPress={handleSwitchRole}
//             >
//               <Ionicons name="swap-horizontal" size={20} color={theme.text} />
//             </TouchableOpacity>
//           </View>
//         </View>

//         <View style={styles.statsContainer}>
//           <View style={[styles.statItem, { backgroundColor: theme.card }]}>
//             <Text style={[styles.statValue, { color: theme.primary }]}>
//               {userStats.completedErrands}
//             </Text>
//             <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Completed</Text>
//           </View>

//           <View style={[styles.statItem, { backgroundColor: theme.card }]}>
//             <Text style={[styles.statValue, { color: theme.primary }]}>
//               ₦{userStats.totalSpent.toFixed(2)}
//             </Text>
//             <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Total Spent</Text>
//           </View>

//           <View style={[styles.statItem, { backgroundColor: theme.card }]}>
//             <Text style={[styles.statValue, { color: theme.primary }]}>
//               {userStats.favoriteRunners}
//             </Text>
//             <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Favorites</Text>
//           </View>
//         </View>

//         <View style={[styles.settingsSection, { backgroundColor: theme.card }]}>
//           <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Settings</Text>

//           <TouchableOpacity style={styles.settingItem} onPress={handleVerifyIdentity}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Verify Identity</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem} onPress={handleSwitchRole}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="swap-horizontal-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Switch Role</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.settingItem}
//             onPress={() => navigation.navigate("Payment" as never)}
//           >
//             <View style={styles.settingLeft}>
//               <Ionicons name="card-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Payment Methodiaaa</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>

//           <View style={styles.settingItem}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="moon-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
//             </View>
//             <Switch
//               value={isDark}
//               onValueChange={toggleTheme}
//               trackColor={{ false: "#767577", true: theme.primary + "80" }}
//               thumbColor={isDark ? theme.primary : "#f4f3f4"}
//             />
//           </View>
//         </View>

//         <View style={[styles.settingsSection, { backgroundColor: theme.card }]}>
//           <Text style={[styles.sectionTitle, { color: theme.text }]}>Support</Text>

//           <TouchableOpacity
//             style={styles.settingItem}
//             onPress={() => navigation.navigate("HelpCenterScreen" as never)}
//           >
//             <View style={styles.settingLeft}>
//               <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Help Center</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Contact Support</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem}>
//             <View style={styles.settingLeft}>
//               <Ionicons name="document-text-outline" size={24} color={theme.primary} />
//               <Text style={[styles.settingText, { color: theme.text }]}>Terms & Privacy</Text>
//             </View>
//             <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} />
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity 
//           style={[styles.logoutButton, { backgroundColor: theme.accent }]} 
//           onPress={confirmLogout}
//         >
//           <Ionicons name="log-out-outline" size={20} color="#fff" />
//           <Text style={styles.logoutText}>Logout</Text>
//         </TouchableOpacity>

//         <Text style={[styles.versionText, { color: theme.text + "50" }]}>Version 1.0.0</Text>
//       </ScrollView>
//     </View>
//   )
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//   },
//   header: {
//     paddingTop: 60,
//     paddingHorizontal: 20,
//     paddingBottom: 20,
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#fff",
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//   },
//   profileCard: {
//     borderRadius: 12,
//     padding: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 20,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   profileImage: {
//     width: 70,
//     height: 70,
//     borderRadius: 35,
//   },
//   profileInfo: {
//     flex: 1,
//     marginLeft: 15,
//   },
//   profileName: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 5,
//   },
//   profileEmail: {
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   roleContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 5,
//   },
//   roleLabel: {
//     fontSize: 14,
//     marginRight: 5,
//   },
//   roleChip: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//   },
//   roleText: {
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   verificationContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   verificationLabel: {
//     fontSize: 14,
//     marginRight: 5,
//   },
//   verificationChip: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//     borderWidth: 1,
//   },
//   verificationText: {
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   profileActions: {
//     flexDirection: "column",
//     gap: 20,
//     justifyContent: "space-between",
//     height: 70,
//   },
//   profileActionButton: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   statsContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 20,
//   },
//   statItem: {
//     flex: 1,
//     borderRadius: 12,
//     padding: 15,
//     alignItems: "center",
//     marginHorizontal: 5,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: "bold",
//     marginBottom: 5,
//   },
//   statLabel: {
//     fontSize: 12,
//   },
//   settingsSection: {
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 20,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     marginBottom: 15,
//     paddingHorizontal: 5,
//   },
//   settingItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(0,0,0,0.05)",
//   },
//   settingLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   settingText: {
//     fontSize: 16,
//     marginLeft: 15,
//   },
//   logoutButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     height: 50,
//     borderRadius: 12,
//     marginBottom: 20,
//   },
//   logoutText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//     marginLeft: 10,
//   },
//   versionText: {
//     textAlign: "center",
//     fontSize: 12,
//     marginBottom: 30,
//   },
// })

// export default ProfileScreen
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
  Auth: undefined
  VerifyIdentity: undefined
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
        title: "Business Locations",
        icon: <MaterialIcons name="store" size={24} color={accentColor} />,
        screen: "BusinessLocations"
      },
      {
        title: "Business Hours",
        icon: <MaterialIcons name="access-time" size={24} color={accentColor} />,
        screen: "BusinessHours"
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
      icon: <FontAwesome5 name="credit-card" size={24} color={accentColor} />,
      screen: "PaymentMethods"
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
    paddingTop: 15,
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