import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase } from "firebase/database"

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Firebase services
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const database = getDatabase(app)

export { app, auth, db, storage, database }



  // databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseURL || "https://boltlikeapp-default-rtdb.firebaseio.com",


