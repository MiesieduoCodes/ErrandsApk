"use client"

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { searchService, User } from "../services/search";
import { formatDistance } from "../utils/location";

const SearchScreen = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<'runner' | 'seller'>('runner');

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Error getting location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user) return;

    try {
      setIsSearching(true);

      const results = await searchService.searchUsers(
        {
          userType: selectedUserType,
        },
        userLocation || undefined
      );

      // Filter by search query if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        setSearchResults(
          results.filter(
            (user) =>
              user.name.toLowerCase().includes(query) ||
              (user.email && user.email.toLowerCase().includes(query))
          )
        );
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserPress = (user: User) => {
    navigation.navigate("UserProfile", { userId: user.id });
  };

  const renderUserItem = ({ item }: {item: User}) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleUserPress(item)}
    >
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.userImage} />
      ) : (
        <View style={[styles.userImage, { backgroundColor: theme.primary }]}>
          <Ionicons name="person" size={24} color="#fff" />
        </View>
      )}
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
        <Text style={[styles.userType, { color: theme.primary }]}>
          {item.userType === 'runner' ? 'Errand Runner' : 'Seller'}
        </Text>
        
        {item.distance !== undefined && (
          <View style={styles.distanceContainer}>
            <Ionicons name="location" size={14} color={theme.text + "80"} />
            <Text style={[styles.distanceText, { color: theme.text + "80" }]}>
              {formatDistance(item.distance)} away
            </Text>
          </View>
        )}
        
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={[styles.ratingText, { color: theme.text + "80" }]}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Find {selectedUserType === 'runner' ? 'Runners' : 'Sellers'}</Text>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedUserType === 'runner' && styles.activeToggleButton,
            { backgroundColor: selectedUserType === 'runner' ? theme.primary : theme.card }
          ]}
          onPress={() => setSelectedUserType('runner')}
        >
          <Text style={[
            styles.toggleButtonText,
            { color: selectedUserType === 'runner' ? '#fff' : theme.text }
          ]}>
            Runners
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            selectedUserType === 'seller' && styles.activeToggleButton,
            { backgroundColor: selectedUserType === 'seller' ? theme.primary : theme.card }
          ]}
          onPress={() => setSelectedUserType('seller')}
        >
          <Text style={[
            styles.toggleButtonText,
            { color: selectedUserType === 'seller' ? '#fff' : theme.text }
          ]}>
            Sellers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={`Search ${selectedUserType === 'runner' ? 'runners' : 'sellers'}...`}
            placeholderTextColor={theme.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.primary }]}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No {selectedUserType === 'runner' ? 'runners' : 'sellers'} found
              </Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                Try adjusting your search
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeToggleButton: {},
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flex: 1,
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
  searchButton: {
    width: 45,
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
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
  resultsList: {
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 40,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userType: {
    fontSize: 14,
    marginBottom: 5,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 5,
  },
});

export default SearchScreen;