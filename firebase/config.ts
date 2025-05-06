import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Ensure you're using getAuth
import { getDatabase } from "firebase/database";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

  // Initialize Auth
  auth = getAuth(app); // Correctly initialize auth

  // Initialize other services
  database = getDatabase(app);
  db = getFirestore(app);
  enableIndexedDbPersistence(db)
    .then(() => console.log("Firestore offline persistence enabled"))
    .catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Firestore persistence already enabled in another tab.");
      } else if (err.code === "unimplemented") {
        console.warn("Current browser does not support Firestore persistence");
      }
    });
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization error", error);
}

// Export initialized services
export { app, auth, database, db, storage };

// Example usage of onAuthStateChanged
if (auth) {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("User is signed in:", user);
    } else {
      console.log("No user is signed in.");
    }
  });
} else {
  console.error("Auth has not been initialized");
}