// firebase.ts (or firebase.js)
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQLHTMNHexjbSJXsATVICgNSKVu1o4F8A",
  authDomain: "boltlikeapp.firebaseapp.com",
  databaseURL: "https://boltlikeapp-default-rtdb.firebaseio.com",
  projectId: "boltlikeapp",
  storageBucket: "boltlikeapp.appspot.com",
  messagingSenderId: "295259306973",
  appId: "1:295259306973:web:2e2e7a509eea402daa9434",
  measurementId: "G-DLM5G0NPFZ",
};

// Initialize Firebase
let app;
let auth;
let database;
let db;
let storage;

try {
  // Initialize Firebase App
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // Initialize Auth with AsyncStorage persistence
  auth = initializeAuth(app);

  // Initialize Realtime Database
  database = getDatabase(app);
  
  // Initialize Firestore with offline persistence
  db = getFirestore(app);
  enableIndexedDbPersistence(db)
    .then(() => console.log("Firestore offline persistence enabled"))
    .catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn(
          "Firestore persistence already enabled in another tab."
        );
      } else if (err.code === "unimplemented") {
        console.warn(
          "Current browser does not support all features required for Firestore persistence"
        );
      }
    });

  // Initialize Cloud Storage
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization error", error);
}

// Export initialized services
export { app, auth, database, db, storage };