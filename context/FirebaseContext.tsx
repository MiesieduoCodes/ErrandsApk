"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import { getDatabase, type Database } from "firebase/database"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface FirebaseContextType {
  isFirebaseReady: boolean
  auth: Auth | null
  db: Firestore | null
  storage: FirebaseStorage | null
  rtdb: Database | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  isFirebaseReady: false,
  auth: null,
  db: null,
  storage: null,
  rtdb: null,
})

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)
  const [auth, setAuth] = useState<Auth | null>(null)
  const [db, setDb] = useState<Firestore | null>(null)
  const [storage, setStorage] = useState<FirebaseStorage | null>(null)
  const [rtdb, setRtdb] = useState<Database | null>(null)

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        console.log("Initializing Firebase...")

        // Firebase configuration
        const firebaseConfig = {
          apiKey: "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
          authDomain: "boltlikeapp.firebaseapp.com",
          projectId: "boltlikeapp",
          storageBucket: "boltlikeapp.appspot.com",
          messagingSenderId: "295259306973",
          appId: "1:295259306973:web:2e2e7a509eea402daa9434",
          databaseURL: "https://boltlikeapp-default-rtdb.firebaseio.com",
        }

        // Initialize Firebase app
        let app
        if (getApps().length === 0) {
          app = initializeApp(firebaseConfig)
        } else {
          app = getApp()
        }

        // Initialize Firebase services
        // Important: We're using getAuth() directly instead of initializeAuth with persistence
        // This is more reliable in Expo environment
        const authInstance = getAuth(app)
        const firestoreInstance = getFirestore(app)
        const storageInstance = getStorage(app)
        
        // Only initialize Realtime Database if databaseURL is provided
        let databaseInstance = null
        if (firebaseConfig.databaseURL) {
          databaseInstance = getDatabase(app)
        }

        // Set state for Firebase services
        setAuth(authInstance)
        setDb(firestoreInstance)
        setStorage(storageInstance)
        setRtdb(databaseInstance)
        setIsFirebaseReady(true)

        console.log("Firebase initialized successfully")
      } catch (error) {
        console.error("Firebase initialization failed:", error)
        // Even if initialization fails, we'll set isFirebaseReady to true
        // so the app can continue and handle the absence of Firebase gracefully
        setIsFirebaseReady(true)
      }
    }

    initializeFirebase()
  }, [])

  return (
    <FirebaseContext.Provider value={{ isFirebaseReady, auth, db, storage, rtdb }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
