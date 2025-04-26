import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getFirestore, enableIndexedDbPersistence, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

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

// Initialize Firebase with type
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with type
const auth: Auth = getAuth(app);

// Initialize Realtime Database with type and offline persistence
const database: Database = getDatabase(app);
// Note: RTDB offline persistence is not supported in the Web SDK.
console.warn("RTDB offline persistence is not supported in the Web SDK.");

// Initialize Firestore with type and offline persistence
const db: Firestore = getFirestore(app);
enableIndexedDbPersistence(db)
  .then(() => console.log("Firestore persistence enabled"))
  .catch((err: { code: string }) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence already enabled in another tab.");
    } else if (err.code === "unimplemented") {
      console.warn("This browser doesn't support Firestore offline persistence.");
    }
  });

// Initialize Storage with type
const storage: FirebaseStorage = getStorage(app);

export { app, auth, database, db, storage };
