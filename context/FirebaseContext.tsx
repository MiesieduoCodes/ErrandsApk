"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getStorage, FirebaseStorage } from "firebase/storage"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface FirebaseContextType {
  isFirebaseReady: boolean
  auth: Auth | null
  db: Firestore | null
  storage: FirebaseStorage | null
  initializeFirebase: () => Promise<void>
}

const FirebaseContext = createContext<FirebaseContextType>({
  isFirebaseReady: false,
  auth: null,
  db: null,
  storage: null,
  initializeFirebase: async () => {},
})

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)
  const [auth, setAuth] = useState<Auth | null>(null)
  const [db, setDb] = useState<Firestore | null>(null)
  const [storage, setStorage] = useState<FirebaseStorage | null>(null)

  const initializeFirebase = async () => {
    try {
      let app: FirebaseApp
      if (getApps().length === 0) {
        app = initializeApp({
          apiKey: "AIzaSyDfUOYw5tJrRLZAkzN8MWyqzxUbADjz8dE",
          authDomain: "airands-app.firebaseapp.com",
          projectId: "airands-app",
          storageBucket: "airands-app.appspot.com",
          messagingSenderId: "917138938207",
          appId: "1:917138938207:web:c5d3d7c1a8b4b1b1b1b1b1"
        })
      } else {
        app = getApp()
      }

      setAuth(getAuth(app))
      setDb(getFirestore(app))
      setStorage(getStorage(app))
      setIsFirebaseReady(true)
    } catch (error) {
      console.error("Firebase initialization error", error)
    }
  }

  useEffect(() => {
    initializeFirebase()
  }, [])

  return (
    <FirebaseContext.Provider value={{ isFirebaseReady, auth, db, storage, initializeFirebase }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext)