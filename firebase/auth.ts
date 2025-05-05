// auth.ts
import { 
  sendPasswordResetEmail, 
  signOut, 
  type User,
  type Auth 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  type Firestore 
} from "firebase/firestore";
import { auth, db } from "./config";

// Explicitly type the imported auth and db
const typedAuth: Auth = auth;
const typedDb: Firestore = db;

// User role types
export type UserRole = "buyer" | "runner" | "seller" | "admin";

// Permission types
export type Permission =
  | "create_errand"
  | "run_errand"
  | "manage_products"
  | "view_analytics"
  | "manage_users"
  | "access_admin";

// Role definitions with associated permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  buyer: ["create_errand"],
  runner: ["run_errand"],
  seller: ["manage_products"],
  admin: ["create_errand", "run_errand", "manage_products", "view_analytics", "manage_users", "access_admin"],
};

// Check if user has a specific permission
export const hasPermission = async (user: User, permission: Permission): Promise<boolean> => {
  if (!user) return false;

  try {
    const userDoc = await getDoc(doc(typedDb, "users", user.uid));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const userRole = userData.userType as UserRole;

    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
};

// Set user role
export const setUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    await updateDoc(doc(typedDb, "users", userId), {
      userType: role,
    });
  } catch (error) {
    console.error("Error setting user role:", error);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(typedAuth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(typedAuth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Get user role
export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const userDoc = await getDoc(doc(typedDb, "users", userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    return userData.userType as UserRole;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};

// Create or update role in Firestore
export const syncRolePermissions = async (): Promise<void> => {
  try {
    // Create a roles collection with documents for each role
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      await setDoc(
        doc(typedDb, "roles", role),
        {
          name: role,
          permissions,
          updatedAt: new Date(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    console.error("Error syncing role permissions:", error);
    throw error;
  }
};