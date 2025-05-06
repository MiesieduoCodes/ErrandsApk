import { initializeApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getDatabase, type Database } from "firebase/database"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"
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
const app = initializeApp(firebaseConfig)

// Initialize Firebase services with proper typing
const auth = getAuth(app) as Auth
const db = getFirestore(app) as Firestore
const database = getDatabase(app) as Database
const storage = getStorage(app) as FirebaseStorage

// Export initialized services with their proper types
export { app, auth, db, database, storage }
export type { Auth, Firestore, Database, FirebaseStorage }
