import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"


const firebaseConfig = {
  apiKey: "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
  authDomain: "boltlikeapp.firebaseapp.com",
  projectId: "boltlikeapp",
  storageBucket: "boltlikeapp.appspot.com",
  messagingSenderId: "295259306973",
  appId: "1:295259306973:web:2e2e7a509eea402daa9434",
  measurementId: "G-DLM5G0NPFZ",
}
// Initialize Firebase - using a more robust initialization pattern
let firebaseApp
let firebaseAuth
let firebaseDb
let firebaseStorage
let firebaseDatabase

// Ensure Firebase is initialized only once and properly
try {
  if (!getApps().length) {
    console.log("Initializing Firebase for the first time")
    firebaseApp = initializeApp(firebaseConfig)
  } else {
    console.log("Firebase already initialized, getting existing app")
    firebaseApp = getApp()
  }

  // Initialize Firebase services
  firebaseAuth = getAuth(firebaseApp)
  firebaseDb = getFirestore(firebaseApp)
  firebaseStorage = getStorage(firebaseApp)
  firebaseDatabase = getDatabase(firebaseApp)

  console.log("Firebase services initialized successfully")
} catch (error) {
  console.error("Error initializing Firebase:", error)
}

// Export the initialized services
export const app = firebaseApp
export const auth = firebaseAuth
export const db = firebaseDb
export const storage = firebaseStorage
export const database = firebaseDatabase
