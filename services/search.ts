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
  lastActive?: string;
  tags?: string[];
}

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  sellerId: string;
  sellerName: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  
  distance?: number;
  inStock?: boolean;
}

export interface SearchFilters {
  userType?: 'runner' | 'seller';
  maxDistance?: number;
  minRating?: number;
  query?: string;
}

export const searchService = {
  async searchUsers(
filters: SearchFilters, userLocation?: { latitude: number; longitude: number; }, p0?: { sortBy: "distance" | "rating" | "price" | "newest"; maxDistance: number; minRating: number; }  ): Promise<User[]> {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) return [];

      let users: User[] = [];
      snapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        users.push({
          id: childSnapshot.key,
          ...userData,
        } as User);
      });

      if (filters?.userType) {
        users = users.filter(user => user.userType === filters.userType);
      }

      if (filters?.minRating) {
        users = users.filter(user => (user.rating || 0) >= filters.minRating!);
      }

      if (userLocation) {
        users = users.map(user => ({
          ...user,
          distance: user.location ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            user.location.latitude,
            user.location.longitude
          ) : Infinity
        }));

        if (filters?.maxDistance) {
          users = users.filter(user => (user.distance || Infinity) <= filters.maxDistance!);
        }

        users.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },

  async searchProducts(
query: string, userLocation?: { latitude: number; longitude: number; }, p0?: { sortBy: "distance" | "rating" | "price" | "newest"; maxDistance: number; priceRange: [number, number]; }  ): Promise<Product[]> {
    try {
      const productsRef = ref(database, "products");
      const snapshot = await get(productsRef);

      if (!snapshot.exists()) return [];

      let products: Product[] = [];
      snapshot.forEach((childSnapshot) => {
        const productData = childSnapshot.val();
        products.push({
          id: childSnapshot.key,
          ...productData,
        } as Product);
      });

      if (userLocation) {
        products = products.map(product => ({
          ...product,
          distance: product.location ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            product.location.latitude,
            product.location.longitude
          ) : Infinity
        }));

        products.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      }

      return products;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },
};