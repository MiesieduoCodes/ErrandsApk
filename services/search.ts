import { ref, get } from "firebase/database";
import { database } from "../firebase/config";
import { calculateDistance } from "../utils/location";

export interface User {
  id: string;
  name: string;
  email?: string;
  userType: 'runner' | 'seller';
  photoURL?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  distance?: number;
}

export interface SearchFilters {
  userType?: 'runner' | 'seller';
  maxDistance?: number;
  minRating?: number;
}

export const searchService = {
  async searchUsers(
    filters: SearchFilters,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<User[]> {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        return [];
      }

      let users: User[] = [];
      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        users.push({
          id: childSnapshot.key,
          ...userData,
        } as User);
      });

      // Apply filters
      if (filters) {
        // Filter by user type
        if (filters.userType) {
          users = users.filter((user) => user.userType === filters.userType);
        }

        // Filter by rating
        if (filters.minRating) {
          users = users.filter((user) => (user.rating || 0) >= filters.minRating!);
        }

        // Calculate and filter by distance
        if (userLocation) {
          users = users.map((user) => {
            if (user.location) {
              user.distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                user.location.latitude,
                user.location.longitude
              );
            } else {
              user.distance = Infinity;
            }
            return user;
          });

          if (filters.maxDistance) {
            users = users.filter((user) => (user.distance ?? Infinity) <= filters.maxDistance!);
          }

          // Sort by distance (nearest first)
          users.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }
      }

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },
};

export default searchService;