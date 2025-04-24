import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  Auth,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Make sure Firebase is only initialized once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth
const auth: Auth = getAuth(app);

// Initialize Database
const database = getDatabase(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, database, db, storage };