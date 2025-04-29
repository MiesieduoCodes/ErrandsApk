"use client"

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { searchService, User } from "../services/search";
import type { Product } from "../services/search";
import { formatDistance } from "../utils/location";
import { BlurView } from "expo-blur";

type SearchResult = (User & { type: 'user' }) | (Product & { type: 'product' });
type SearchCategory = 'runner' | 'seller' | 'product' | 'all';
type SortOption = 'distance' | 'rating' | 'price' | 'newest';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const SearchScreen = () => {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [maxDistance, setMaxDistance] = useState<number>(50); // in miles/km
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  
  // Animation values
  const filterAnimation = useState(new Animated.Value(0))[0];
  const searchBarAnimation = useState(new Animated.Value(0))[0];

  // Load recent searches from storage on mount
  useEffect(() => {
    // Mock implementation - in a real app, you'd use AsyncStorage
    setRecentSearches(['coffee', 'delivery', 'groceries', 'electronics']);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getLocation();
      return () => {};
    }, [])
  );

  const getLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // Show a UI message about limited functionality
        setUserLocation(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      // Show a user-friendly error message
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getLocation();
    await handleSearch();
    setRefreshing(false);
  }, [userLocation, searchQuery, selectedCategory, sortBy, maxDistance, minRating, priceRange]);

  const toggleFilters = () => {
    // Animate filter panel
    Animated.timing(filterAnimation, {
      toValue: showFilters ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setShowFilters(!showFilters);
    Keyboard.dismiss();
  };

  const handleSearch = async () => {
    if (!user) return;
    Keyboard.dismiss();
    setShowRecentSearches(false);

    try {
      setIsSearching(true);
      let results: SearchResult[] = [];

      // Add search query to recent searches if not empty
      if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
        const newRecentSearches = [searchQuery.trim(), ...recentSearches.slice(0, 4)];
        setRecentSearches(newRecentSearches);
        // In a real app, save to AsyncStorage here
      }

      // Fetch results based on selected category
      if (selectedCategory === 'product' || selectedCategory === 'all') {
        const products = await searchService.searchProducts(
          searchQuery,
          userLocation || undefined,
          {
            sortBy,
            maxDistance,
            priceRange,
          }
        );
        results = [...results, ...products.map(p => ({ ...p, type: 'product' }))];
      }
      
      if (selectedCategory === 'runner' || selectedCategory === 'seller' || selectedCategory === 'all') {
        const userTypes = selectedCategory === 'all' 
          ? ['runner', 'seller'] 
          : [selectedCategory];
          
        for (const userType of userTypes) {
          const users = await searchService.searchUsers(
            { userType: userType as 'runner' | 'seller' },
            userLocation || undefined,
            {
              sortBy,
              maxDistance,
              minRating,
            }
          );
          results = [...results, ...users.map(u => ({ ...u, type: 'user' }))];
        }
      }

      // Filter by search query if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        results = results.filter(item => {
          if (item.type === 'user') return item.name.toLowerCase().includes(query);
          if (item.type === 'product') return item.title.toLowerCase().includes(query);
          return false;
        });
      }

      // Sort results
      results = sortResults(results, sortBy);

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching:", error);
      // Show user-friendly error message
    } finally {
      setIsSearching(false);
    }
  };

  const sortResults = (results: SearchResult[], sortOption: SortOption): SearchResult[] => {
    return [...results].sort((a, b) => {
      switch (sortOption) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'rating':
          return ((b.type === 'user' ? b.rating : 0) || 0) - ((a.type === 'user' ? a.rating : 0) || 0);
        case 'price':
          return ((a.type === 'product' ? a.price : 999) || 999) - 
                 ((b.type === 'product' ? b.price : 999) || 999);
        case 'newest':
          return ((b.type === 'product' ? b.createdAt : 0) || 0) - 
                 ((a.type === 'product' ? a.createdAt : 0) || 0);
        default:
          return 0;
      }
    });
  };

  const handleUserPress = (user: User) => {
    if (!user.id) return;
    navigation.navigate("UserProfile", { userId: user.id });
  };

  const handleProductPress = (product: Product) => {
    if (!product.id) return;
    navigation.navigate("ProductDetail", { productId: product.id });
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim() === '' && recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
    
    // Animate search bar
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    // Only hide recent searches if query is empty
    if (searchQuery.trim() === '') {
      setShowRecentSearches(false);
    }
    
    // Animate search bar back
    Animated.timing(searchBarAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const selectRecentSearch = (search: string) => {
    setSearchQuery(search);
    setShowRecentSearches(false);
    handleSearch();
  };

  const isUser = (item: SearchResult): item is User & { type: 'user' } => item.type === 'user';
  const isProduct = (item: SearchResult): item is Product & { type: 'product' } => item.type === 'product';

  const renderItem = ({ item }: { item: SearchResult }) => {
    if (isUser(item)) {
      return (
        <TouchableOpacity
          style={[styles.userItem, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.userImageContainer}>
            {item.photoURL ? (
              <Image source={{ uri: item.photoURL }} style={styles.userImage} />
            ) : (
              <View style={[styles.userImage, { backgroundColor: theme.primary }]}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}
            {item.isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
              {item.isVerified && (
                <MaterialIcons name="verified" size={16} color={theme.primary} style={styles.verifiedIcon} />
              )}
            </View>
            
            <Text style={[styles.userType, { color: theme.primary }]}>
              {item.userType === 'runner' ? 'Errand Runner' : 'Seller'}
            </Text>
            
            <View style={styles.userMetaRow}>
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
                    {item.rating.toFixed(1)} ({item.reviewCount || 0})
                  </Text>
                </View>
              )}
            </View>
            
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 2).map((tag, index) => (
                  <View 
                    key={index} 
                    style={[styles.tagPill, { backgroundColor: theme.primary + '20' }]}
                  >
                    <Text style={[styles.tagText, { color: theme.primary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
                {item.tags.length > 2 && (
                  <Text style={[styles.moreTagsText, { color: theme.text + '70' }]}>
                    +{item.tags.length - 2} more
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={theme.text + '50'} 
            style={styles.chevronIcon} 
          />
        </TouchableOpacity>
      );
    }

    if (isProduct(item)) {
      return (
        <TouchableOpacity
          style={[styles.productItem, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => handleProductPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.productImageContainer}>
            <Image source={{ uri: item.image }} style={styles.productImage} />
            {item.discount > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.discountText}>-{item.discount}%</Text>
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text 
              style={[styles.productTitle, { color: theme.text }]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={[styles.productPrice, { color: theme.primary }]}>
                ${item.price.toFixed(2)}
              </Text>
              {item.originalPrice && item.originalPrice > item.price && (
                <Text style={styles.originalPrice}>
                  ${item.originalPrice.toFixed(2)}
                </Text>
              )}
            </View>
            
            <View style={styles.productSeller}>
              <Ionicons name="person-circle" size={14} color={theme.text + "80"} />
              <Text 
                style={[styles.sellerName, { color: theme.text + "80" }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.sellerName}
              </Text>
            </View>
            
            <View style={styles.productMetaRow}>
              {item.distance !== undefined && (
                <View style={styles.distanceContainer}>
                  <Ionicons name="location" size={14} color={theme.text + "80"} />
                  <Text style={[styles.distanceText, { color: theme.text + "80" }]}>
                    {formatDistance(item.distance)} away
                  </Text>
                </View>
              )}
              
              {item.inStock !== undefined && (
                <View style={styles.stockContainer}>
                  <Ionicons 
                    name={item.inStock ? "checkmark-circle" : "alert-circle"} 
                    size={14} 
                    color={item.inStock ? "#4CAF50" : "#FF9800"} 
                  />
                  <Text 
                    style={[
                      styles.stockText, 
                      { color: item.inStock ? "#4CAF50" : "#FF9800" }
                    ]}
                  >
                    {item.inStock ? "In Stock" : "Low Stock"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderSortOption = (option: SortOption, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.sortOption,
        sortBy === option && { backgroundColor: theme.primary + '20' }
      ]}
      onPress={() => {
        setSortBy(option);
        // Re-sort results immediately
        setSearchResults(sortResults(searchResults, option));
      }}
    >
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={sortBy === option ? theme.primary : theme.text + '70'} 
      />
      <Text 
        style={[
          styles.sortOptionText, 
          { color: sortBy === option ? theme.primary : theme.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentSearchItem = (search: string) => (
    <TouchableOpacity 
      style={styles.recentSearchItem}
      onPress={() => selectRecentSearch(search)}
    >
      <Ionicons name="time-outline" size={16} color={theme.text + '70'} />
      <Text style={[styles.recentSearchText, { color: theme.text }]}>{search}</Text>
    </TouchableOpacity>
  );

  const filterHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });

  const searchBarWidth = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['85%', '100%']
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          {selectedCategory === 'all' && 'Search'}
          {selectedCategory === 'runner' && 'Find Runners'}
          {selectedCategory === 'seller' && 'Find Sellers'}
          {selectedCategory === 'product' && 'Browse Products'}
        </Text>
        
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: theme.card }]}
          onPress={toggleFilters}
        >
          <Ionicons 
            name="options-outline" 
            size={20} 
            color={showFilters ? theme.primary : theme.text} 
          />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.filtersContainer, 
          { 
            height: filterHeight,
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
            overflow: 'hidden'
          }
        ]}
      >
        <Text style={[styles.filterTitle, { color: theme.text }]}>Sort By</Text>
        <View style={styles.sortOptionsContainer}>
          {renderSortOption('distance', 'Nearest', 'location-outline')}
          {renderSortOption('rating', 'Top Rated', 'star-outline')}
          {renderSortOption('price', 'Price', 'pricetag-outline')}
          {renderSortOption('newest', 'Newest', 'time-outline')}
        </View>
        
        {/* Additional filters could be added here */}
        
        <TouchableOpacity 
          style={[styles.applyFiltersButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            toggleFilters();
            handleSearch();
          }}
        >
          <Text style={styles.applyFiltersText}>Apply Filters</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.toggleContainer, { borderColor: theme.border }]}>
        {(['all', 'runner', 'seller', 'product'] as SearchCategory[]).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.toggleButton,
              selectedCategory === category && styles.activeToggleButton,
              { 
                backgroundColor: selectedCategory === category ? theme.primary : 'transparent',
                borderColor: selectedCategory === category ? theme.primary : theme.border
              }
            ]}
            onPress={() => {
              setSelectedCategory(category);
              // Trigger search with new category
              setTimeout(handleSearch, 100);
            }}
          >
            <Text style={[
              styles.toggleButtonText,
              { 
                color: selectedCategory === category ? '#fff' : theme.text,
                fontWeight: selectedCategory === category ? '600' : '500'
              }
            ]}>
              {category === 'all' ? 'All' : 
               category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchContainer}>
        <Animated.View 
          style={[
            styles.searchInputContainer, 
            { 
              backgroundColor: theme.card, 
              borderColor: theme.border,
              width: searchBarWidth
            }
          ]}
        >
          <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={
              selectedCategory === 'runner' ? 'Search runners...' :
              selectedCategory === 'seller' ? 'Search sellers...' :
              selectedCategory === 'product' ? 'Search products...' :
              'Search anything...'
            }
            placeholderTextColor={theme.text + "50"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
            </TouchableOpacity>
          ) : null}
        </Animated.View>
        
        <Animated.View style={{ opacity: searchBarAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: theme.primary }]}
            onPress={handleSearch}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {showRecentSearches && (
        <View style={[styles.recentSearchesContainer, { backgroundColor: theme.card }]}>
          <View style={styles.recentSearchesHeader}>
            <Text style={[styles.recentSearchesTitle, { color: theme.text }]}>Recent Searches</Text>
            <TouchableOpacity onPress={() => setRecentSearches([])}>
              <Text style={[styles.clearRecentText, { color: theme.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => renderRecentSearchItem(search))}
        </View>
      )}

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={60} color={theme.text + "30"} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {searchQuery.trim() ? 'No results found' : 'Start searching'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                {searchQuery.trim() 
                  ? 'Try adjusting your search terms or filters'
                  : 'Search for runners, sellers, or products'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            searchResults.length > 0 ? (
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: theme.text }]}>
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Quick action floating button */}
      <TouchableOpacity 
        style={[styles.floatingButton, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate("CreateRequest")}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  sortOptionText: {
    fontSize: 14,
    marginLeft: 5,
  },
  applyFiltersButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    marginHorizontal: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
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
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 45,
    borderRadius: 22.5,
    borderWidth: 1,
    paddingHorizontal: 15,
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
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  recentSearchesContainer: {
    position: 'absolute',
    top: 175,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentSearchesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearRecentText: {
    fontSize: 12,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  recentSearchText: {
    marginLeft: 10,
    fontSize: 14,
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
    paddingBottom: 80, // Space for floating button
  },
  resultsHeader: {
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
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
    color: "#666",
    maxWidth: 250,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  userType: {
    fontSize: 14,
    marginBottom: 5,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 5,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    marginLeft: 3,
  },
  chevronIcon: {
    marginLeft: 10,
  },
  productItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 5,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: '#999',
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
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 5,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 5,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default SearchScreen;