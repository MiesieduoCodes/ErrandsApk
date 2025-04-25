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
  ActivityIndicator,
  Animated,
  Easing
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useAuth, type UserType } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import * as Google from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { RootStackParamList } from "../types"

WebBrowser.maybeCompleteAuthSession()

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>
}

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const { login, register, user } = useAuth()
  const { theme, isDark } = useTheme()
  const [isSignUp, setIsSignUp] = useState(false)
  const [userType, setUserType] = useState<UserType>("buyer")
  const [isLoading, setIsLoading] = useState(false)

  // Animation values
  const dotAnimation = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  // Form fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")

  // Google Auth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "YOUR_WEB_CLIENT_ID",
    androidClientId: "63:92:FB:19:95:BE:9A:05:4A:E0:B9:35:FC:29:ED:91:CD:25:9C:9A",
    iosClientId: "com.googleusercontent.apps.917138938207-o39m78nc40p5iitma610du6qf6qljo6q",
  })

  useEffect(() => {
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
        ])
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
    if (response?.type === "success") {
      const { id_token } = response.params
      handleGoogleSignIn(id_token)
    }
  }, [response])

  useEffect(() => {
    if (user) {
      // Navigate to Main screen with the appropriate tab based on user type
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    }
  }, [user, navigation])

  const handleAuth = async () => {
    if (isSignUp && (!name || !email || !phone || !password)) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!isSignUp && (!email || !password)) {
      Alert.alert("Error", "Please enter your email and password")
      return
    }

    try {
      setIsLoading(true)

      if (isSignUp) {
        // Pass the selected userType to the register function
        await register(email, password, name, userType)
        Alert.alert("Success", "Account created successfully!")
      } else {
        // Pass the selected userType to the login function to ensure proper redirection
        await login(email, password, userType)
      }
    } catch (error) {
      console.error("Authentication error:", error)
      let errorMessage = "Authentication failed. Please try again."
      if ((error as { code: string }).code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use. Please use a different email or sign in."
      } else if ((error as { code: string }).code === "auth/invalid-email") {
        errorMessage = "Invalid email address."
      } else if ((error as { code: string }).code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password."
      } else if (
        (error as { code: string }).code === "auth/user-not-found" ||
        (error as { code: string }).code === "auth/wrong-password"
      ) {
        errorMessage = "Invalid email or password."
      }

      Alert.alert("Error", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setIsLoading(true)
      // Pass the selected userType to the Google sign-in function
      await signInWithGoogle(idToken, userType)
    } catch (error) {
      console.error("Google sign in error:", error)
      Alert.alert("Error", "Google sign in failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      await promptAsync()
    } catch (error) {
      console.error("Google authentication error:", error)
      Alert.alert("Error", "Google authentication failed. Please try again.")
    }
  }

  const navigateToPasswordReset = () => {
    navigation.navigate("PasswordReset")
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
                transform: [{
                  scale: dotAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  })
                }]
              }
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
                    transform: [{
                      translateY: dotAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, -8, 0],
                      })
                    }],
                    opacity: dotAnimation.interpolate({
                      inputRange: [0, 0.3, 0.6, 1],
                      outputRange: [0.3, 1, 0.3, 0.3],
                    }),
                  }
                ]}
              />
            ))}
          </View>
          
          {/* Loading Text */}
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {userType === 'buyer' ? 'Preparing buyer experience...' :
             userType === 'seller' ? 'Setting up seller dashboard...' :
             'Getting runner tools ready...'}
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
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            />
          </View>
          
          {/* Hint Text */}
          <Text style={[styles.hintText, { color: theme.text + '80' }]}>
            This won't take long...
          </Text>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: theme.text }]}>Airands</Text>
            <Text style={[styles.subtitle, { color: theme.text + "80" }]}>
              {isSignUp ? "Create your account" : "Welcome back"}
            </Text>
          </View>

          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "buyer" && styles.activeUserType,
                {
                  borderBottomColor: userType === "buyer" ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setUserType("buyer")}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === "buyer" && styles.activeUserTypeText,
                  { color: userType === "buyer" ? theme.primary : theme.text + "80" },
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
                },
              ]}
              onPress={() => setUserType("runner")}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === "runner" && styles.activeUserTypeText,
                  { color: userType === "runner" ? theme.primary : theme.text + "80" },
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
                },
              ]}
              onPress={() => setUserType("seller")}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === "seller" && styles.activeUserTypeText,
                  { color: userType === "seller" ? theme.primary : theme.text + "80" },
                ]}
              >
                Seller
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {isSignUp && (
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
                placeholderTextColor={theme.text + "50"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

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
            />

            {isSignUp && (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    color: theme.text,
                  },
                ]}
                placeholder="Phone Number"
                placeholderTextColor={theme.text + "50"}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            )}

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
              placeholderTextColor={theme.text + "50"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={navigateToPasswordReset}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password ?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleAuth}>
              <Text style={styles.buttonText}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.text + "80" }]}>OR</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, { borderColor: theme.border, backgroundColor: theme.card }]}
              onPress={handleGoogleAuth}
            >
              <Ionicons name="logo-google" size={20} color={theme.text} />
              <Text style={[styles.googleButtonText, { color: theme.text }]}>Sign in with Google</Text>
            </TouchableOpacity>

            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleText, { color: theme.text + "80" }]}>
                {isSignUp ? "Already have an account ?" : "Don't have an account ?"}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={[styles.toggleButton, { color: theme.primary }]}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 4,
    width: '80%',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
  },
  hintText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 30,
  },
  logo: {
    width: 230,
    height: 230,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
  },
  userTypeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 25,
    marginBottom: 15,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    marginHorizontal: 5,
  },
  activeUserType: {
    borderBottomWidth: 2,
  },
  userTypeText: {
    fontSize: 16,
  },
  activeUserTypeText: {
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    height: 50,
    borderRadius: 8,
    marginBottom: 15,
  },
  googleButtonText: {
    fontSize: 16,
    marginLeft: 10,
  },
})

export default AuthScreen

function signInWithGoogle(idToken: string, userType: string) {
  throw new Error("Function not implemented.")
}