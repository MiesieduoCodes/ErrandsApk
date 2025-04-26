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
import Product from "../services/search";
import { formatDistance } from "../utils/location";

type SearchResult = User | Product;
type SearchCategory = 'runner' | 'seller' | 'product';

const SearchScreen = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('runner');

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
      let results: SearchResult[] = [];

      if (selectedCategory === 'product') {
        // Mock product search - replace with actual API call
        results = await searchService.searchProducts(
          searchQuery,
          userLocation || undefined
        );
      } else {
        const users = await searchService.searchUsers(
          { userType: selectedCategory },
          userLocation || undefined
        );
        results = users;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        results = results.filter(item => {
          if ('name' in item) return item.name.toLowerCase().includes(query);
          if ('title' in item) return item.title.toLowerCase().includes(query);
          return false;
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserPress = (user: User) => {
    navigation.navigate("UserProfile", { userId: user.id });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate("ProductDetail", { productId: product.id });
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    if ('userType' in item) {
      return (
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
    }

    return (
      <TouchableOpacity
        style={[styles.productItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => handleProductPress(item)}
      >
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={[styles.productTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.productPrice, { color: theme.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
          <View style={styles.productSeller}>
            <Ionicons name="person-circle" size={14} color={theme.text + "80"} />
            <Text style={[styles.sellerName, { color: theme.text + "80" }]}>
              {item.sellerName}
            </Text>
          </View>
          {item.distance !== undefined && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color={theme.text + "80"} />
              <Text style={[styles.distanceText, { color: theme.text + "80" }]}>
                {formatDistance(item.distance)} away
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          {selectedCategory === 'runner' && 'Find Runners'}
          {selectedCategory === 'seller' && 'Find Sellers'}
          {selectedCategory === 'product' && 'Browse Products'}
        </Text>
      </View>

      <View style={[styles.toggleContainer, { borderColor: theme.border }]}>
        {(['runner', 'seller', 'product'] as SearchCategory[]).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.toggleButton,
              selectedCategory === category && styles.activeToggleButton,
              { 
                backgroundColor: selectedCategory === category ? theme.primary : theme.card,
                borderColor: selectedCategory === category ? theme.primary : theme.border
              }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.toggleButtonText,
              { 
                color: selectedCategory === category ? '#fff' : theme.text,
                fontWeight: selectedCategory === category ? '600' : '500'
              }
            ]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={
              selectedCategory === 'runner' ? 'Search runners...' :
              selectedCategory === 'seller' ? 'Search sellers...' :
              'Search products...'
            }
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
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {selectedCategory === 'product' ? 'No products found' : `No ${selectedCategory}s found`}
              </Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                Try adjusting your search terms or location
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
    borderWidth: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  activeToggleButton: {
    borderColor: '#fff',
  },
  toggleButtonText: {
    fontSize: 14,
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
  productItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  productSeller: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 12,
    marginLeft: 5,
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