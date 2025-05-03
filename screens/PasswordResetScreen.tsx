"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import * as Haptics from "expo-haptics"

import type { NativeStackScreenProps } from "@react-navigation/native-stack"

type PasswordResetScreenProps = NativeStackScreenProps<any, any>

const PasswordResetScreen = ({ navigation }: PasswordResetScreenProps) => {
  const { resetPassword } = useAuth()
  const { theme, isDark } = useTheme()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleResetPassword = async () => {
    // Validate email
    if (!email) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    try {
      setIsLoading(true)
      await resetPassword(email)
      setIsSuccess(true)

      // Provide haptic feedback on success
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch (error) {
      console.error("Password reset error:", error)

      let errorMessage = "Failed to send password reset email. Please try again."
      if ((error as any)?.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address."
      } else if ((error as any)?.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address."
      } else if ((error as any)?.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later."
      }

      Alert.alert("Error", errorMessage)

      // Provide haptic feedback on error
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
      </View>

      <View style={styles.content}>
        <Image
          source={require("../assets/freepik_br_0a1bdefd-95ff-4157-8b52-51e56ad85d7c.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {!isSuccess ? (
          <>
            <Text style={[styles.description, { color: theme.text + "80" }]}>
              Don't worry. We've all been there before. Great News ! . We can help you out. Enter your email address and
              we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  color: theme.text,
                },
              ]}
              placeholder="Email Address"
              placeholderTextColor={theme.text + "50"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={60} color={theme.primary} />
            <Text style={[styles.successTitle, { color: theme.text }]}>Email Sent!</Text>
            <Text style={[styles.successText, { color: theme.text + "80" }]}>
              We've sent a password reset link to {email}. Please check your email and follow the instructions.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate("Auth")}
            >
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendContainer}
              onPress={() => {
                setIsSuccess(false)
                setTimeout(() => handleResetPassword(), 500)
              }}
            >
              <Text style={[styles.resendText, { color: theme.primary }]}>Didn't receive the email? Resend</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 290,
    height: 290,
    marginBottom: 50,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    width: "100%",
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  successContainer: {
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  resendContainer: {
    marginTop: 20,
    padding: 10,
  },
  resendText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
})

export default PasswordResetScreen
