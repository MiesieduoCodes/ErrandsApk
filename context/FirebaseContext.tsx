"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { app, auth, db, storage, database } from "../firebase/config"

// Simplified context type - focus on functionality over TypeScript perfection
interface FirebaseContextType {
  app: any
  auth: any
  db: any
  storage: any
  database: any
  isFirebaseReady: boolean
}

// Create context with default values
const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  storage: null,
  database: null,
  isFirebaseReady: false,
})

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  useEffect(() => {
    // More robust check for Firebase initialization
    const checkFirebaseReady = async () => {
      try {
        // Wait a moment to ensure JS runtime is ready
        await new Promise((resolve) => setTimeout(resolve, 500))

        console.log("Checking Firebase services...")
        console.log("Auth available:", !!auth)
        console.log("Firestore available:", !!db)
        console.log("Storage available:", !!storage)
        console.log("Database available:", !!database)

        if (auth && db && storage && database) {
          console.log("All Firebase services are ready")
          setIsFirebaseReady(true)
        } else {
          console.error("Some Firebase services are not initialized")

          // Try to reinitialize if needed (this is a fallback)
          if (!auth) {
            console.log("Auth not available, this might cause the 'auth not registered' error")
          }
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
        app,
        auth,
        db,
        storage,
        database,
        isFirebaseReady,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
