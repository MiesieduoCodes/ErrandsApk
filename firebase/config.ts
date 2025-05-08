import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, initializeAuth } from "firebase/auth"
import { getReactNativePersistence } from "@react-native-firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage"


const firebaseConfig = {
  apiKey: "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
  authDomain: "boltlikeapp.firebaseapp.com",
  projectId: "boltlikeapp",
  storageBucket: "boltlikeapp.appspot.com",
  messagingSenderId: "295259306973",
  appId: "1:295259306973:web:2e2e7a509eea402daa9434",
  measurementId: "G-DLM5G0NPFZ",
}


// Initialize Firebase
let app
let auth
let db
let storage
let database

// Ensure Firebase is initialized only once
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)

  // Initialize auth with persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  })

  db = getFirestore(app)
  storage = getStorage(app)
  database = getDatabase(app)
} else {
  app = getApp()
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  database = getDatabase(app)
}

export { app, auth, db, storage, database }
