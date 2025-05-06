"use client"

import type React from "react"

import { createContext, useState, useContext, useEffect } from "react"
import { auth, db } from "../firebase/config"
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

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUserProfile: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      console.error("Auth is not initialized")
      setIsLoading(false)
      return () => {}
    }

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

    if (!auth) {
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

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Auth is not initialized")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
    } catch (error: any) {
      console.error("Login error:", error.message)
      throw error
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    if (!auth || !db) throw new Error("Firebase services are not initialized")

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName })

      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName,
        createdAt: new Date().toISOString(),
        userType: "buyer",
      })

      setUser(user)
    } catch (error: any) {
      console.error("Registration error:", error.message)
      throw error
    }
  }

  const logout = async () => {
    if (!auth) throw new Error("Auth is not initialized")

    try {
      await signOut(auth)
      setUser(null)
    } catch (error: any) {
      console.error("Logout error:", error.message)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Auth is not initialized")

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      console.error("Reset password error:", error.message)
      throw error
    }
  }

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth?.currentUser) throw new Error("User is not authenticated")

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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
