"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
// Import with explicit type annotations
import {
  app as firebaseApp,
  auth as firebaseAuth, // Ensure explicit typing
  db as firebaseDb,
  storage as firebaseStorage,
  database as firebaseDatabase,
} from "../firebase/config"
import type { FirebaseApp } from "firebase/app"
import type { Auth } from "firebase/auth"
import { getAuth } from "firebase/auth"

// Define the Firebase context type with explicit any types
interface FirebaseContextType {
  app: FirebaseApp | any
  auth: Auth | any
  db: any
  storage: any
  database: any
  isFirebaseReady: boolean
}

// Create context with default values
const FirebaseContext = createContext<FirebaseContextType>({
  auth: getAuth(firebaseApp),
  auth: null,
  db: null,
  storage: null,
  database: null,
  isFirebaseReady: false,
})

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  useEffect(() => {
    // Check if Firebase is initialized
    const checkFirebaseReady = async () => {
      try {
        // Simple check to ensure Firebase is initialized
        if (firebaseAuth && firebaseDb && firebaseStorage && firebaseDatabase) {
          console.log("Firebase services are ready")
          setIsFirebaseReady(true)
        } else {
          console.error("Some Firebase services are not initialized")
        }
      } catch (error) {
        console.error("Error checking Firebase readiness:", error)
      }
    }

    checkFirebaseReady()
  }, [])

  return (
    <FirebaseContext.Provider
      value={{
        app: firebaseApp,
        auth: firebaseAuth,
        db: firebaseDb,
        storage: firebaseStorage,
        database: firebaseDatabase,
        isFirebaseReady,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
