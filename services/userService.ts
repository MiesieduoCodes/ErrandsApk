import { ref, set, onDisconnect, onValue, off, get, update, remove, Unsubscribe } from "firebase/database";
import { database } from "../firebase/config";

export const userService = {
  // Basic user operations
  async getUser(userId: string): Promise<any> {
    try {
      const snapshot = await get(ref(database, `users/${userId}`));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  },

  async createUser(userId: string, userData: any): Promise<void> {
    try {
      await set(ref(database, `users/${userId}`), userData);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  async updateUser(userId: string, updates: any): Promise<void> {
    try {
      await update(ref(database, `users/${userId}`), updates);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await remove(ref(database, `users/${userId}`));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  // Presence tracking functions
  /**
   * Sets up real-time presence tracking for the current user
   * @param userId - The ID of the current user
   */
  setupPresence(userId: string): Unsubscribe {
    // Reference to Firebase's connection state
    const presenceRef = ref(database, '.info/connected');
    // Reference to store user's status
    const userStatusRef = ref(database, `status/${userId}`);

    // Listen for connection state changes
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online - prepare data to set
        const statusData = {
          state: 'online',
          lastChanged: new Date().toISOString(),
        };

        // First set up what happens when user disconnects
        onDisconnect(userStatusRef).set({
          state: 'offline',
          lastChanged: new Date().toISOString(),
        }).then(() => {
          // Only set online status after onDisconnect is configured
          set(userStatusRef, statusData)
            .catch((error) => {
              console.error("Error setting online status:", error);
            });
        }).catch((error) => {
          console.error("Error setting up onDisconnect:", error);
        });
      }
    });

    // Store the unsubscribe function if needed
    return unsubscribePresence;
  },

  /**
   * Subscribes to another user's online status changes
   * @param userId - The user ID to track
   * @param callback - Function to call when status changes
   * @returns Function to unsubscribe
   */
  subscribeToUserStatus(
    userId: string,
    callback: (isOnline: boolean, lastSeen?: Date) => void
  ): () => void {
    // Reference to the user's status in Firebase
    const statusRef = ref(database, `status/${userId}`);

    // Callback function that handles status changes
    const statusCallback = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const { state, lastChanged } = snapshot.val();
        const isOnline = state === 'online';
        const lastSeen = lastChanged ? new Date(lastChanged) : undefined;
        callback(isOnline, lastSeen);
      } else {
        // If no status exists, assume offline
        callback(false);
      }
    });

    // Return cleanup function to unsubscribe
    return () => {
      try {
        off(statusRef, 'value', statusCallback);
      } catch (error) {
        console.error("Error unsubscribing from user status:", error);
      }
    };
  },

  /**
   * Manually set user status (for testing or special cases)
   * @param userId - The user ID
   * @param status - The status to set ('online' or 'offline')
   */
  async setUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      await set(ref(database, `status/${userId}`), {
        state: status,
        lastChanged: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error setting user status:", error);
      throw error;
    }
  },

  /**
   * Get the current status of a user
   * @param userId - The user ID to check
   * @returns Promise with status object or null if not found
   */
  async getUserStatus(userId: string): Promise<{state: string, lastChanged: string} | null> {
    try {
      const snapshot = await get(ref(database, `status/${userId}`));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("Error getting user status:", error);
      throw error;
    }
  },

  // Additional utility functions
  async searchUsers(query: string): Promise<any[]> {
    try {
      const snapshot = await get(ref(database, 'users'));
      if (!snapshot.exists()) return [];

      const users: any[] = [];
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (
          user.name?.toLowerCase().includes(query.toLowerCase()) ||
          user.email?.toLowerCase().includes(query.toLowerCase())
        ) {
          users.push({
            id: childSnapshot.key,
            ...user
          });
        }
      });

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const snapshot = await get(ref(database, 'users'));
      if (!snapshot.exists()) return null;

      let foundUser = null;
      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.email === email) {
          foundUser = {
            id: childSnapshot.key,
            ...user
          };
          return true; // Break the loop
        }
      });

      return foundUser;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }
};