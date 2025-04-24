"use client"

import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  TextInput, 
  Alert 
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, NavigationProp } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { locationService, userService } from "../services/database";
import OfflineIndicator from "../components/OfflineIndicator";

type RootStackParamList = {
  Nearby: {
    filter?: string;
  };
  RunnerProfile: {
    runnerId: string;
  };
  SellerProfile: {
    sellerId: string;
  };
  ChatScreen: {
    recipientId: string;
    recipientName: string;
  };
};

type NearbyScreenRouteProp = RouteProp<RootStackParamList, "Nearby">;

interface User {
  id: string;
  name: string;
  photoURL?: string;
  userType: "runner" | "seller";
  rating?: number;
  distance: number;
  isAvailable?: boolean;
  isFavorite?: boolean;
}

const NearbyScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<NearbyScreenRouteProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

  const initialFilter = route.params?.filter || "runners";
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [distanceFilter, setDistanceFilter] = useState<number>(10);
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission to access location was denied");
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        await loadNearbyUsers(loc, activeFilter);
      } catch (error) {
        console.error("Error getting location:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (location) {
      loadNearbyUsers(location, activeFilter);
    }
  }, [activeFilter, distanceFilter, ratingFilter, location]);

  const loadNearbyUsers = async (loc: Location.LocationObject, filter: string) => {
    if (!loc || !user) return;

    try {
      setIsLoading(true);
      let users: User[] = [];
      const userType = filter === "runners" ? "runner" : filter === "sellers" ? "seller" : null;

      if (userType) {
        const result = await locationService.getNearbyUsers(
          loc.coords.latitude,
          loc.coords.longitude,
          distanceFilter,
          user.id,
          userType,
        );
        users = result.map((u: any) => ({
          id: u.id,
          name: u.name || "Unknown",
          photoURL: u.photoURL,
          userType: u.userType,
          rating: u.rating,
          distance: u.distance,
          isAvailable: u.isAvailable,
          isFavorite: u.isFavorite
        }));
      } else if (filter === "top-rated") {
        const runners = await locationService.getNearbyUsers(
          loc.coords.latitude,
          loc.coords.longitude,
          distanceFilter,
          user.id,
          "runner",
        );
        const sellers = await locationService.getNearbyUsers(
          loc.coords.latitude,
          loc.coords.longitude,
          distanceFilter,
          user.id,
          "seller",
        );
        users = [...runners, ...sellers].map((u: any) => ({
          id: u.id,
          name: u.name || "Unknown",
          photoURL: u.photoURL,
          userType: u.userType,
          rating: u.rating,
          distance: u.distance,
          isAvailable: u.isAvailable,
          isFavorite: u.isFavorite
        }));
      }

      if (ratingFilter > 0) {
        users = users.filter((u) => (u.rating || 0) >= ratingFilter);
      }

      users = users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
    } catch (error) {
      console.error("Error loading nearby users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToFavorites = async (userId: string) => {
    if (!user) return;
    
    try {
      await userService.addUserFavoriteRunner(user.id, userId);
      Alert.alert("Success", "Added to favorites!");
      setNearbyUsers(nearbyUsers.map((item) => 
        item.id === userId ? { ...item, isFavorite: true } : item
      ));
    } catch (error) {
      console.error("Error adding to favorites:", error);
      Alert.alert("Error", "Failed to add to favorites. Please try again.");
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isRunner = item.userType === "runner";

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
          if (isRunner) {
            navigation.navigate("RunnerProfile", { runnerId: item.id });
          } else {
            navigation.navigate("SellerProfile", { sellerId: item.id });
          }
        }}
      >
        <Image
          source={item.photoURL ? { uri: item.photoURL } : require("../assets/profile-avatar.png")}
          style={styles.userImage}
        />

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
            <View
              style={[
                styles.userType,
                {
                  backgroundColor: isRunner ? theme.primary + "20" : theme.accent + "20",
                  borderColor: isRunner ? theme.primary : theme.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.userTypeText,
                  {
                    color: isRunner ? theme.primary : theme.accent,
                  },
                ]}
              >
                {isRunner ? "Runner" : "Seller"}
              </Text>
            </View>
          </View>

          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={[styles.userStatText, { color: theme.text }]}>{item.rating?.toFixed(1) || "New"}</Text>
            </View>

            <View style={styles.userStat}>
              <Ionicons name="location" size={16} color={theme.primary} />
              <Text style={[styles.userStatText, { color: theme.text }]}>{item.distance.toFixed(1)} km</Text>
            </View>

            {isRunner && (
              <View style={styles.userStat}>
                <Ionicons
                  name={item.isAvailable ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={item.isAvailable ? "#4CAF50" : "#F44336"}
                />
                <Text style={[styles.userStatText, { color: theme.text }]}>
                  {item.isAvailable ? "Available" : "Unavailable"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.userAction, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (isRunner) {
                  navigation.navigate("RunnerProfile", { runnerId: item.id });
                } else {
                  navigation.navigate("SellerProfile", { sellerId: item.id });
                }
              }}
            >
              <Text style={styles.userActionText}>View Profile</Text>
            </TouchableOpacity>

            {isRunner && !item.isFavorite && (
              <TouchableOpacity
                style={[styles.userAction, { backgroundColor: theme.secondary }]}
                onPress={() => handleAddToFavorites(item.id)}
              >
                <Ionicons name="heart-outline" size={16} color={theme.text} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.userAction, { backgroundColor: theme.secondary }]}
              onPress={() =>
                navigation.navigate("ChatScreen", {
                  recipientId: item.id,
                  recipientName: item.name,
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredUsers = nearbyUsers.filter((user) => {
    if (!searchQuery) return true;
    return user.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <OfflineIndicator />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Nearby</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={[styles.filterTabs, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === "runners" && { backgroundColor: theme.primary }]}
            onPress={() => setActiveFilter("runners")}
          >
            <Ionicons name="bicycle" size={18} color={activeFilter === "runners" ? "#fff" : theme.text} />
            <Text style={[styles.filterTabText, { color: activeFilter === "runners" ? "#fff" : theme.text }]}>
              Runners
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === "sellers" && { backgroundColor: theme.primary }]}
            onPress={() => setActiveFilter("sellers")}
          >
            <Ionicons name="storefront" size={18} color={activeFilter === "sellers" ? "#fff" : theme.text} />
            <Text style={[styles.filterTabText, { color: activeFilter === "sellers" ? "#fff" : theme.text }]}>
              Sellers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === "top-rated" && { backgroundColor: theme.primary }]}
            onPress={() => setActiveFilter("top-rated")}
          >
            <Ionicons name="star" size={18} color={activeFilter === "top-rated" ? "#fff" : theme.text} />
            <Text style={[styles.filterTabText, { color: activeFilter === "top-rated" ? "#fff" : theme.text }]}>
              Top Rated
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterOptions}>
          <View style={styles.filterOption}>
            <Text style={[styles.filterLabel, { color: theme.text }]}>Distance: {distanceFilter} km</Text>
            <View style={styles.filterButtons}>
              {[5, 10, 20, 50].map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.filterButton,
                    distanceFilter === distance && { backgroundColor: theme.primary },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => setDistanceFilter(distance)}
                >
                  <Text style={[styles.filterButtonText, { color: distanceFilter === distance ? "#fff" : theme.text }]}>
                    {distance}km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterOption}>
            <Text style={[styles.filterLabel, { color: theme.text }]}>
              Rating: {ratingFilter === 0 ? "All" : `${ratingFilter}+`}
            </Text>
            <View style={styles.filterButtons}>
              {[0, 3, 4, 4.5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.filterButton,
                    ratingFilter === rating && { backgroundColor: theme.primary },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => setRatingFilter(rating)}
                >
                  <Text style={[styles.filterButtonText, { color: ratingFilter === rating ? "#fff" : theme.text }]}>
                    {rating === 0 ? "All" : `${rating}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading nearby users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No users found</Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                Try adjusting your filters or search criteria
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterTabs: {
    flexDirection: "row",
    borderRadius: 8,
    marginBottom: 15,
    overflow: "hidden",
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 5,
  },
  filterOptions: {
    gap: 15,
  },
  filterOption: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  usersList: {
    padding: 20,
  },
  userItem: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  userImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  userTypeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  userStats: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 15,
  },
  userStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  userStatText: {
    fontSize: 12,
    marginLeft: 5,
  },
  userActions: {
    flexDirection: "row",
    gap: 10,
  },
  userAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  userActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});

export default NearbyScreen;