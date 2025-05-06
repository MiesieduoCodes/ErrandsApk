
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import Constants from "expo-constants"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "boltlikeapp.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "boltlikeapp",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "boltlikeapp.appspot.com",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || "295259306973",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "1:295259306973:web:2e2e7a509eea402daa9434",
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseURL || "https://boltlikeapp-default-rtdb.firebaseio.com",
}

// Initialize Firebase
let app
let auth
let database
let db
let storage

try {
  // Initialize Firebase App
  app = initializeApp(firebaseConfig)

  // Initialize Firebase services
  auth = getAuth(app)
  db = getFirestore(app)
  database = getDatabase(app)
  storage = getStorage(app)
} catch (error) {
  console.error("Firebase initialization error", error)
}

// Export initialized services
export { app, auth, db, database, storage }
