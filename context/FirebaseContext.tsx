"use client"

// Make sure to import auth and database from the updated config file
import React, { createContext, useContext, useEffect, useState } from "react"
import { app, auth, database } from "../firebase/config"
import type { Firestore } from "firebase/firestore"
import type { FirebaseStorage } from "firebase/storage"

interface FirebaseContextType {
  isFirebaseReady: boolean
  auth: typeof auth | null
  db: Firestore | null
  storage: FirebaseStorage | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  isFirebaseReady: false,
  auth: null,
  db: null,
  storage: null,
})

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)
  const [db, setDb] = useState<Firestore | null>(null)
  const [storage, setStorage] = useState<FirebaseStorage | null>(null)

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        console.log("Initializing Firebase...")

        setDb(database)
        setStorage(undefined) // No storage in config
        setIsFirebaseReady(true)

        console.log("Firebase initialized successfully")
      } catch (error) {
        console.error("Firebase initialization failed:", error)
        // Implement your error handling strategy here
      }
    }

    initializeFirebase()
  }, [])

  return <FirebaseContext.Provider value={{ isFirebaseReady, auth, db, storage }}>{children}</FirebaseContext.Provider>
}

export const useFirebase = () => useContext(FirebaseContext)
