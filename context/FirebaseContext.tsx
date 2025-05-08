"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { app, auth, db, storage, database } from "../firebase/config"
import type { Auth } from "firebase/auth"
import type { Firestore as FirestoreType } from "@firebase/firestore"
import type { Storage } from "firebase/storage"
import type { Database as DatabaseType } from "@firebase/database"
import type { FirebaseApp } from "firebase/app"

interface FirebaseContextType {
  app: FirebaseApp | null
  auth: Auth | null
  db: FirestoreType | null
  storage: Storage | null
  database: DatabaseType | null
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
    // Simple check to ensure Firebase is initialized
    if (auth && db && storage && database) {
      console.log("Firebase services are ready")
      setIsFirebaseReady(true)
    } else {
      console.error("Some Firebase services are not initialized")
    }
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
