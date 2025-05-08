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

// Initialize Firebase
let app
let auth
let db
let storage
let database

// Ensure Firebase is initialized only once
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)

  // Use standard getAuth without persistence for now
  auth = getAuth(app)

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
