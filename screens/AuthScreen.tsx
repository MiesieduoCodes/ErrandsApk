"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../context/AuthContext"
import { useFirebase } from "../context/FirebaseContext"
import { useTheme } from "../context/ThemeContext"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"

const { width } = Dimensions.get("window")

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<any>
}

// Define UserType type
type UserType = "buyer" | "runner" | "seller"

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const { isFirebaseReady } = useFirebase()
  const { login, register, user } = useAuth()
  const { theme, isDark } = useTheme()
  const [isSignUp, setIsSignUp] = useState(false)
  const [userType, setUserType] = useState<UserType>("buyer")
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Animation values
  const dotAnimation = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const formAnim = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  // Form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    // Form entry animation
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    if (isLoading) {
      // Logo pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Progress bar animation
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start()
    } else {
      // Reset animations when loading completes
      dotAnimation.setValue(0)
      progressAnim.setValue(0)
    }
  }, [isLoading])

  useEffect(() => {
    if (user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    }
  }, [user, navigation])

  const handleAuth = async () => {
    // Clear previous errors
    setAuthError(null)

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    // Validate form
    if (isSignUp && (!name || !email || !password)) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    if (!isSignUp && (!email || !password)) {
      Alert.alert("Error", "Please enter your email and password")
      return
    }

    try {
      setIsLoading(true)

      if (isSignUp) {
        await register(email, password, name, userType)
        Alert.alert("Success", "Account created successfully!")
      } else {
        await login(email, password, userType)
      }
    } catch (error: any) {
      console.error("Authentication error:", error)
      let errorMessage = "Authentication failed. Please try again."

      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "This email is already in use. Please use a different email or sign in."
            break
          case "auth/invalid-email":
            errorMessage = "Invalid email address."
            break
          case "auth/weak-password":
            errorMessage = "Password is too weak. Please use a stronger password."
            break
          case "auth/user-not-found":
          case "auth/wrong-password":
            errorMessage = "Invalid email or password."
            break
          case "auth/network-request-failed":
            errorMessage = "Network error. Please check your connection and try again."
            break
          default:
            errorMessage = `Authentication error: ${error.message}`
        }
      }

      setAuthError(errorMessage)
      Alert.alert("Error", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToPasswordReset = () => {
    navigation.navigate("PasswordReset")
  }

  // Show loading indicator if Firebase is not ready
  if (!isFirebaseReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text, marginTop: 20 }]}>Initializing app...</Text>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Animated.View style={styles.loadingContent}>
          {/* Animated Logo */}
          <Animated.Image
            source={require("../assets/logo.png")}
            style={[
              styles.loadingLogo,
              {
                transform: [
                  {
                    scale: dotAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1],
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />

          {/* Animated Dots */}
          <View style={styles.dotsContainer}>
            {[...Array(3)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.loadingDot,
                  {
                    backgroundColor: theme.primary,
                    transform: [
                      {
                        translateY: dotAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, -8, 0],
                        }),
                      },
                    ],
                    opacity: dotAnimation.interpolate({
                      inputRange: [0, 0.3, 0.6, 1],
                      outputRange: [0.3, 1, 0.3, 0.3],
                    }),
                  },
                ]}
              />
            ))}
          </View>

          {/* Loading Text */}
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {userType === "buyer"
              ? "Preparing buyer experience..."
              : userType === "seller"
                ? "Setting up seller dashboard..."
                : "Getting runner tools ready..."}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.primary,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Hint Text */}
          <Text style={[styles.hintText, { color: `${theme.text}80` }]}>This won't take long...</Text>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with animated entry */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: theme.text }]}>Airands</Text>
            <Text style={[styles.subtitle, { color: `${theme.text}80` }]}>
              {isSignUp ? "Create your account" : "Welcome back"}
            </Text>
          </Animated.View>

          {/* User Type Selector */}
          <Animated.View
            style={[
              styles.userTypeContainer,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "buyer" && styles.activeUserType,
                {
                  borderBottomColor: userType === "buyer" ? theme.primary : theme.border,
                  backgroundColor: userType === "buyer" ? `${theme.primary}20` : "transparent",
                },
              ]}
              onPress={() => setUserType("buyer")}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={userType === "buyer" ? theme.primary : `${theme.text}80`}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "buyer" && styles.activeUserTypeText,
                  { color: userType === "buyer" ? theme.primary : `${theme.text}80` },
                ]}
              >
                Buyer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "runner" && styles.activeUserType,
                {
                  borderBottomColor: userType === "runner" ? theme.primary : theme.border,
                  backgroundColor: userType === "runner" ? `${theme.primary}20` : "transparent",
                },
              ]}
              onPress={() => setUserType("runner")}
            >
              <Ionicons
                name="bicycle-outline"
                size={20}
                color={userType === "runner" ? theme.primary : `${theme.text}80`}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "runner" && styles.activeUserTypeText,
                  { color: userType === "runner" ? theme.primary : `${theme.text}80` },
                ]}
              >
                Runner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "seller" && styles.activeUserType,
                {
                  borderBottomColor: userType === "seller" ? theme.primary : theme.border,
                  backgroundColor: userType === "seller" ? `${theme.primary}20` : "transparent",
                },
              ]}
              onPress={() => setUserType("seller")}
            >
              <Ionicons
                name="storefront-outline"
                size={20}
                color={userType === "seller" ? theme.primary : `${theme.text}80`}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "seller" && styles.activeUserTypeText,
                  { color: userType === "seller" ? theme.primary : `${theme.text}80` },
                ]}
              >
                Seller
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Form with staggered animations */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {isSignUp && (
              <Animated.View
                style={{
                  opacity: formAnim,
                  transform: [
                    {
                      translateX: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor={`${theme.text}50`}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </Animated.View>
            )}

            <Animated.View
              style={{
                opacity: formAnim,
                transform: [
                  {
                    translateX: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              }}
            >
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
                placeholderTextColor={`${theme.text}50`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Animated.View>

            {isSignUp && (
              <Animated.View
                style={{
                  opacity: formAnim,
                  transform: [
                    {
                      translateX: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Phone Number (optional)"
                  placeholderTextColor={`${theme.text}50`}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </Animated.View>
            )}

            <Animated.View
              style={{
                opacity: formAnim,
                transform: [
                  {
                    translateX: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              }}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    color: theme.text,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={`${theme.text}50`}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </Animated.View>

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={navigateToPasswordReset}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {authError && <Text style={[styles.errorText, { color: "red" }]}>{authError}</Text>}

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
                onPress={handleAuth}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleText, { color: `${theme.text}80` }]}>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={[styles.toggleButton, { color: theme.primary }]}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  loadingContent: {
    alignItems: "center",
    padding: 30,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  progressBarContainer: {
    height: 4,
    width: "80%",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBar: {
    height: "100%",
  },
  hintText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
  },
  userTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 25,
    marginBottom: 25,
    borderRadius: 12,
    overflow: "hidden",
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  activeUserType: {
    borderBottomWidth: 2,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeUserTypeText: {
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 25,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    height: 56,
    borderRadius: 12,
    marginBottom: 15,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
})

export default AuthScreen
