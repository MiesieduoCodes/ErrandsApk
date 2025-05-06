"use client"

import type React from "react"

import { createContext, useState, useContext, useEffect } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useFirebase } from "./FirebaseContext"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, userType?: string) => Promise<void>
  register: (email: string, password: string, displayName: string, userType?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>
  userType: string | null
  setUserType: (type: string) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
  userType: null,
  setUserType: () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isFirebaseReady, auth, db } = useFirebase()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userType, setUserType] = useState<string | null>(null)

  // Initialize auth state
  useEffect(() => {
    if (!isFirebaseReady) {
      console.log("Firebase is not ready yet, waiting...")
      return
    }

    console.log("Firebase is ready, setting up auth listener")

    // Get stored user type
    const getStoredUserType = async () => {
      try {
        const storedUserType = await AsyncStorage.getItem("userType")
        if (storedUserType) {
          setUserType(storedUserType)
        }
      } catch (error) {
        console.error("Error getting stored user type:", error)
      }
    }
    getStoredUserType()

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        try {
          await AsyncStorage.setItem(
            "user",
            JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            }),
          )
        } catch (error) {
          console.error("Error storing user data:", error)
        }
      } else {
        setUser(null)
        try {
          await AsyncStorage.removeItem("user")
        } catch (error) {
          console.error("Error removing user data:", error)
        }
      }
      setIsLoading(false)
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isFirebaseReady, auth])

  // Fallback for when Firebase auth is not available
  useEffect(() => {
    if (!isFirebaseReady) {
      const getUserFromStorage = async () => {
        try {
          const userData = await AsyncStorage.getItem("user")
          if (userData) {
            setUser(JSON.parse(userData) as User)
          }
        } catch (error) {
          console.error("Error getting user from storage:", error)
        }
        setIsLoading(false)
      }
      getUserFromStorage()
    }
  }, [isFirebaseReady])

  const handleSetUserType = async (type: string) => {
    setUserType(type)
    try {
      await AsyncStorage.setItem("userType", type)
    } catch (error) {
      console.error("Error storing user type:", error)
    }
  }

  const login = async (email: string, password: string, userType?: string) => {
    if (!isFirebaseReady || !auth) {
      throw new Error("Firebase auth is not initialized")
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)

      // Set user type if provided
      if (userType) {
        await handleSetUserType(userType)
      }
    } catch (error: any) {
      console.error("Login error:", error.message)
      throw error
    }
  }

  const register = async (email: string, password: string, displayName: string, userType?: string) => {
    if (!isFirebaseReady || !auth || !db) {
      throw new Error("Firebase services are not initialized")
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName })

      const userTypeToUse = userType || "buyer"

      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName,
        createdAt: new Date().toISOString(),
        userType: userTypeToUse,
      })

      // Set user type in state and storage
      await handleSetUserType(userTypeToUse)

      setUser(user)
    } catch (error: any) {
      console.error("Registration error:", error.message)
      throw error
    }
  }

  const logout = async () => {
    if (!isFirebaseReady || !auth) {
      throw new Error("Firebase auth is not initialized")
    }

    try {
      await signOut(auth)
      setUser(null)
      setUserType(null)
      await AsyncStorage.removeItem("userType")
    } catch (error: any) {
      console.error("Logout error:", error.message)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    if (!isFirebaseReady || !auth) {
      throw new Error("Firebase auth is not initialized")
    }

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      console.error("Reset password error:", error.message)
      throw error
    }
  }

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!isFirebaseReady || !auth?.currentUser) {
      throw new Error("User is not authenticated")
    }

    try {
      await updateProfile(auth.currentUser, { displayName, photoURL })

      if (db) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            displayName,
            photoURL,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
      }

      setUser({ ...auth.currentUser })
    } catch (error: any) {
      console.error("Update profile error:", error.message)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        updateUserProfile,
        userType,
        setUserType: handleSetUserType,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
