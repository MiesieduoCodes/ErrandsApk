// Make sure the Firebase app is initialized correctly and exported
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"
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
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApp()
}

// Initialize Firebase services
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const database = getDatabase(app)

export { app, auth, db, storage, database }
