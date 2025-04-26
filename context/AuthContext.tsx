"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"
import { Alert } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth"
import { auth } from "../firebase/config"
import { userService } from "../services/database"
import type { UserType } from "../types"

// Define the User type
export interface User {
  [x: string]: string | undefined
  uid: string
  id: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  userType: UserType
  isVerified?: boolean
}

// Define the context type
interface AuthContextType {
  user: User | null
  userType: UserType | null
  setUserType: (type: UserType) => void
  isLoading: boolean
  login: (email: string, password: string, selectedUserType?: UserType) => Promise<void>
  register: (email: string, password: string, name: string, selectedUserType?: UserType) => Promise<void>
  signInWithGoogle: (idToken: string, selectedUserType?: UserType) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>
  switchUserRole: (newRole: UserType) => Promise<void>
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  userType: null,
  setUserType: () => {},
  isLoading: true,
  login: async () => {},
  register: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  switchUserRole: async () => {},
})

// Create the provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from database
          const userData = await userService.getUserByFirebaseUid(firebaseUser.uid)

          if (userData) {
            // Set user data
            setUser({
              uid: firebaseUser.uid,
              id: userData.id,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              userType: userData.userType || "buyer",
              isVerified: userData.isVerified,
            })

            // Set user type
            setUserType(userData.userType || "buyer")

            // Store user type in AsyncStorage
            await AsyncStorage.setItem("userType", userData.userType || "buyer")
            console.log("User authenticated with role:", userData.userType || "buyer")
          } else {
            // Create new user in database
            const newUser = await userService.upsertUser({
              firebaseUid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "",
              photoUrl: firebaseUser.photoURL || "",
              userType: "buyer", // Default role
            })

            setUser({
              uid: firebaseUser.uid,
              id: newUser.id,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              userType: "buyer",
              isVerified: false,
            })

            setUserType("buyer")
            await AsyncStorage.setItem("userType", "buyer")
            console.log("New user created with default role: buyer")
          }
        } catch (error) {
          console.error("Error getting user data:", error)
          Alert.alert("Error", "Failed to get user data. Please try again.")
        }
      } else {
        setUser(null)
        setUserType(null)
        await AsyncStorage.removeItem("userType")
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Login function
  const login = async (email: string, password: string, selectedUserType?: UserType) => {
    try {
      setIsLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // If a user type is selected during login, update it
      if (selectedUserType && firebaseUser) {
        // Get current user data
        const userData = await userService.getUserByFirebaseUid(firebaseUser.uid)

        // If user exists and has a different role, update it
        if (userData && userData.userType !== selectedUserType) {
          await userService.updateUserType(userData.id, selectedUserType)
          console.log(`Updated user role on login from ${userData.userType} to ${selectedUserType}`)

          // Update local state and AsyncStorage
          setUserType(selectedUserType)
          await AsyncStorage.setItem("userType", selectedUserType)
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert("Login Failed", "Invalid email or password. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (email: string, password: string, name: string, selectedUserType: UserType = "buyer") => {
    try {
      setIsLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Update profile with display name
      await updateProfile(firebaseUser, {
        displayName: name,
      })

      // Create user in database with selected role
      await userService.upsertUser({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: name,
        userType: selectedUserType, // Use the selected role
      })

      // Set user type in AsyncStorage
      await AsyncStorage.setItem("userType", selectedUserType)
      console.log(`New user registered with role: ${selectedUserType}`)
    } catch (error) {
      console.error("Registration error:", error)
      Alert.alert("Registration Failed", "Failed to create account. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Google Sign In function
  const signInWithGoogle = async (idToken: string, selectedUserType: UserType = "buyer") => {
    try {
      setIsLoading(true)
      // Implement Google sign-in logic here
      // After successful sign-in, update the user's role if needed

      // For now, we'll just log the selected role
      console.log(`Google sign-in with selected role: ${selectedUserType}`)

      // In a real implementation, you would:
      // 1. Sign in with Google
      // 2. Check if the user exists in your database
      // 3. If they exist, update their role if different
      // 4. If they don't exist, create them with the selected role

      // Set user type in AsyncStorage
      await AsyncStorage.setItem("userType", selectedUserType)
    } catch (error) {
      console.error("Google sign-in error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true)
      await signOut(auth)
      await AsyncStorage.removeItem("userType")
    } catch (error) {
      console.error("Logout error:", error)
      Alert.alert("Logout Failed", "Failed to log out. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true)
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Reset password error:", error)
      Alert.alert("Reset Failed", "Failed to send reset email. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update user profile function
  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    try {
      setIsLoading(true)
      if (!auth.currentUser) {
        throw new Error("No authenticated user")
      }

      await updateProfile(auth.currentUser, data)

      // Update user in database
      if (user) {
        await userService.updateUserProfile(user.id, {
          name: data.displayName,
          photoURL: data.photoURL,
        })

        // Update local user state
        setUser({
          ...user,
          uid: user.uid, // Include uid when updating
          displayName: data.displayName || user.displayName,
          photoURL: data.photoURL || user.photoURL,
        })
      }
    } catch (error) {
      console.error("Update profile error:", error)
      Alert.alert("Update Failed", "Failed to update profile. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Switch user role function
  const switchUserRole = async (newRole: UserType) => {
    try {
      setIsLoading(true)
      if (!user) {
        throw new Error("No authenticated user")
      }

      // Update user type in database
      await userService.updateUserType(user.id, newRole)

      // Update local user state
      setUser({
        ...user,
        userType: newRole,
      })

      // Update user type state
      setUserType(newRole)

      // Update user type in AsyncStorage
      await AsyncStorage.setItem("userType", newRole)

      console.log("Role switched successfully to:", newRole)
    } catch (error) {
      console.error("Switch role error:", error)
      Alert.alert("Switch Failed", "Failed to switch role. Please try again.")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        setUserType,
        isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        switchUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Create a hook to use the auth context
export const useAuth = () => useContext(AuthContext)

export type { UserType }