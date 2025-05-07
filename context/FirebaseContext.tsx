"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { 
  initializeAuth,
  getReactNativePersistence,
  Auth,
  browserLocalPersistence
} from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getStorage, FirebaseStorage } from "firebase/storage"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface FirebaseContextType {
  isFirebaseReady: boolean
  auth: Auth | null
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
  const [auth, setAuth] = useState<Auth | null>(null)
  const [db, setDb] = useState<Firestore | null>(null)
  const [storage, setStorage] = useState<FirebaseStorage | null>(null)

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        console.log("Initializing Firebase...")
        
        // Initialize Firebase App
        const app = getApps().length === 0 
          ? initializeApp({
            apiKey: "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
            authDomain: "boltlikeapp.firebaseapp.com",
            projectId: "boltlikeapp",
            storageBucket: "boltlikeapp.firebasestorage.app",
            messagingSenderId: "295259306973",
            appId: "1:295259306973:web:2e2e7a509eea402daa9434"
            })
          : getApp()

        // Initialize Auth with persistence
        const authInstance = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        })

        // Initialize other services
        const firestore = getFirestore(app)
        const storageInstance = getStorage(app)

        setAuth(authInstance)
        setDb(firestore)
        setStorage(storageInstance)
        setIsFirebaseReady(true)
        
        console.log("Firebase initialized successfully")
      } catch (error) {
        console.error("Firebase initialization failed:", error)
        // Implement your error handling strategy here
      }
    }

    initializeFirebase()
  }, [])

  return (
    <FirebaseContext.Provider value={{ isFirebaseReady, auth, db, storage }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)
