"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { app, auth, db, storage, database } from "../firebase/config"
import type { FirebaseApp } from "firebase/app"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"
import type { Database } from "firebase/database"

// Define the Firebase context type
interface FirebaseContextType {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  storage: FirebaseStorage
  database: Database
  isFirebaseReady: boolean
}

// Create context with default values using type assertions
const FirebaseContext = createContext<FirebaseContextType>({
  app: {} as FirebaseApp,
  auth: {} as Auth,
  db: {} as Firestore,
  storage: {} as FirebaseStorage,
  database: {} as Database,
  isFirebaseReady: false,
})

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  useEffect(() => {
    // Check if Firebase is initialized
    const checkFirebaseReady = async () => {
      try {
        // Simple check to ensure Firebase is initialized
        if (auth && db && storage && database) {
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

  // Use type assertions to tell TypeScript what types these variables are
  const contextValue: FirebaseContextType = {
    app: app as FirebaseApp,
    auth: auth as Auth,
    db: db as Firestore,
    storage: storage as FirebaseStorage,
    database: database as Database,
    isFirebaseReady,
  }

  return <FirebaseContext.Provider value={contextValue}>{children}</FirebaseContext.Provider>
}

export const useFirebase = () => useContext(FirebaseContext)
