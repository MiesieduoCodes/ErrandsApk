// DO NOT import firebase/auth or other Firebase services here
// This file only initializes the Firebase app
import { initializeApp } from "firebase/app"
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

// Initialize Firebase app only
const app = initializeApp(firebaseConfig)

export { app }
