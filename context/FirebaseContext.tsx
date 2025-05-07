"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { app, auth, db, storage, database } from "../firebase/config"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"
import type { Storage } from "firebase/storage"
import type { Database } from "firebase/database"

interface FirebaseContextType {
  app: any
  auth: Auth | null
  db: Firestore | null
  storage: Storage | null
  database: Database | null
  isFirebaseReady: boolean
}

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
    // Check if Firebase is initialized
    const checkFirebaseReady = async () => {
      try {
        // Verify auth is initialized
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
