"use client"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, CommonActions } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import type { UserType } from "../context/AuthContext"

// Define your navigation types
type RootStackParamList = {
  Main: undefined;  // Your root navigator
  SwitchRole: undefined;
  // Add other routes as needed
}

const SwitchRole = () => {
  const { user, switchUserRole } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation()

  const handleRoleSwitch = async (role: UserType) => {
    try {
      console.log("Switching to role:", role)
      await switchUserRole(role)

      Alert.alert(
        "Role Changed", 
        `You are now a ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        [
          {
            text: "OK",
            onPress: () => {
              // Proper navigation reset
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Main" }],
                })
              )
            },
          },
        ]
      )
    } catch (error) {
      console.error("Error switching role:", error)
      Alert.alert("Error", "Failed to switch role. Please try again.")
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.secondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Switch Role</Text>
      </View>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: theme.text + "80" }]}>
        Choose which role you want to use in the app
      </Text>

      {/* Role Cards */}
      <View style={styles.rolesContainer}>
        {/* Buyer Card */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            {
              backgroundColor: theme.card,
              borderColor: user?.userType === "buyer" ? theme.primary : theme.border,
              borderWidth: user?.userType === "buyer" ? 2 : 1,
            },
          ]}
          onPress={() => handleRoleSwitch("buyer")}
        >
          <View style={[styles.roleIconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Ionicons name="cart" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.roleName, { color: theme.text }]}>Buyer</Text>
          <Text style={[styles.roleDescription, { color: theme.text + "80" }]}>
            Request errands and services from sellers and runners
          </Text>
          {user?.userType === "buyer" && (
            <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Seller Card */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            {
              backgroundColor: theme.card,
              borderColor: user?.userType === "seller" ? theme.primary : theme.border,
              borderWidth: user?.userType === "seller" ? 2 : 1,
            },
          ]}
          onPress={() => handleRoleSwitch("seller")}
        >
          <View style={[styles.roleIconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Ionicons name="storefront" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.roleName, { color: theme.text }]}>Seller</Text>
          <Text style={[styles.roleDescription, { color: theme.text + "80" }]}>
            Sell products and services to buyers
          </Text>
          {user?.userType === "seller" && (
            <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Runner Card */}
        <TouchableOpacity
          style={[
            styles.roleCard,
            {
              backgroundColor: theme.card,
              borderColor: user?.userType === "runner" ? theme.primary : theme.border,
              borderWidth: user?.userType === "runner" ? 2 : 1,
            },
          ]}
          onPress={() => handleRoleSwitch("runner")}
        >
          <View style={[styles.roleIconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Ionicons name="bicycle" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.roleName, { color: theme.text }]}>Runner</Text>
          <Text style={[styles.roleDescription, { color: theme.text + "80" }]}>
            Deliver products and complete errands for buyers
          </Text>
          {user?.userType === "runner" && (
            <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer Note */}
      <Text style={[styles.note, { color: theme.text + "80" }]}>
        Note: You can switch between roles at any time from your profile
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  rolesContainer: {
    gap: 20,
  },
  roleCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  roleName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  activeIndicator: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  note: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 30,
  },
})

export default SwitchRole