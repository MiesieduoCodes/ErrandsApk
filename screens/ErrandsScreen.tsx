"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  RefreshControl,
  Image,
  Modal,
  Platform,
  Pressable,
  Alert
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { ref, onValue, update, query, orderByChild, equalTo } from "firebase/database"
import { database } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Haptics from 'expo-haptics'
import { Swipeable } from "react-native-gesture-handler"
import { BlurView } from "expo-blur"
import LottieView from "lottie-react-native"
import { PieChart } from "react-native-chart-kit"
import type { Errand } from "../types"

interface ErrandItem extends Errand {
  [key: string]: any
}

interface ErrandStats {
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
}

const { width, height } = Dimensions.get('window')

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Distance: Near to Far", value: "distance_asc" },
]

const FILTER_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Shopping", value: "shopping" },
  { label: "Food", value: "food" },
  { label: "Documents", value: "documents" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Other", value: "other" },
]

const ErrandsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const [errands, setErrands] = useState<ErrandItem[]>([])
  const [filteredErrands, setFilteredErrands] = useState<ErrandItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("active") // 'active', 'completed', 'cancelled'
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [selectedSort, setSelectedSort] = useState("newest")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedErrand, setSelectedErrand] = useState<ErrandItem | null>(null)
  const [errandStats, setErrandStats] = useState<ErrandStats>({
    pending: 0,
    accepted: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total: 0
  })
  const [showStats, setShowStats] = useState(false)
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current
  const searchBarAnimation = useRef(new Animated.Value(0)).current
  const mapViewAnimation = useRef(new Animated.Value(0)).current
  const sortOptionsAnimation = useRef(new Animated.Value(0)).current
  const filterOptionsAnimation = useRef(new Animated.Value(0)).current
  const lottieRef = useRef<LottieView>(null)
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({})

  useEffect(() => {
    if (!user) return

    // Listen for errands from Realtime Database
    const errandsRef = ref(database, "errands")
    const unsubscribe = onValue(errandsRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) {
        setErrands([])
        setIsLoading(false)
        return
      }

      const errandsList: ErrandItem[] = []
      Object.keys(data).forEach((key) => {
        // Filter errands based on user type
        if (
          (user.userType === "buyer" && data[key].userId === user.uid) ||
          (user.userType === "runner" && data[key].status !== "cancelled") ||
          (user.userType === "seller" && data[key].status !== "cancelled")
        ) {
          errandsList.push({
            id: key,
            ...data[key],
          })
        }
      })

      // Sort by creation date (newest first)
      errandsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setErrands(errandsList)
      calculateStats(errandsList)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Apply filters and search whenever dependencies change
  useEffect(() => {
    applyFiltersAndSort()
  }, [errands, activeTab, searchQuery, selectedSort, selectedFilter])

  const calculateStats = (errandsList: ErrandItem[]) => {
    const stats = {
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      total: errandsList.length
    }

    errandsList.forEach(errand => {
      if (stats[errand.status as keyof typeof stats] !== undefined) {
        stats[errand.status as keyof typeof stats]++
      }
    })

    setErrandStats(stats)
  }

  const applyFiltersAndSort = () => {
    // First filter by tab (status)
    let result = [...errands]
    
    if (activeTab === "active") {
      result = result.filter((errand) => ["pending", "accepted", "in_progress"].includes(errand.status))
    } else if (activeTab === "completed") {
      result = result.filter((errand) => errand.status === "completed")
    } else {
      result = result.filter((errand) => errand.status === "cancelled")
    }
    
    // Then apply errand type filter
    if (selectedFilter !== "all") {
      result = result.filter(errand => errand.errandType === selectedFilter)
    }
    
    // Then apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        errand => 
          errand.description?.toLowerCase().includes(query) ||
          errand.pickup?.toLowerCase().includes(query) ||
          errand.dropoff?.toLowerCase().includes(query) ||
          errand.errandType?.toLowerCase().includes(query)
      )
    }
    
    // Finally, apply sorting
    switch (selectedSort) {
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case "price_desc":
        result.sort((a, b) => (b.price || 0) - (a.price || 0))
        break
      case "price_asc":
        result.sort((a, b) => (a.price || 0) - (b.price || 0))
        break
      case "distance_asc":
        result.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        break
      default: // newest first
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    
    setFilteredErrands(result)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Re-fetch data from Firebase
    try {
      const errandsRef = ref(database, "errands")
      onValue(errandsRef, (snapshot) => {
        const data = snapshot.val()
        if (!data) {
          setErrands([])
          setIsRefreshing(false)
          return
        }

        const errandsList: ErrandItem[] = []
        Object.keys(data).forEach((key) => {
          if (
            (user?.userType === "buyer" && data[key].userId === user.uid) ||
            (user?.userType === "runner" && data[key].status !== "cancelled") ||
            (user?.userType === "seller" && data[key].status !== "cancelled")
          ) {
            errandsList.push({
              id: key,
              ...data[key],
            })
          }
        })

        errandsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setErrands(errandsList)
        calculateStats(errandsList)
        setIsRefreshing(false)
      }, {
        onlyOnce: true
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      setIsRefreshing(false)
    }
  }

  const handleUpdateStatus = async (errandId: string, newStatus: string) => {
    try {
      // Close any open swipeable
      if (swipeableRefs.current[errandId]) {
        swipeableRefs.current[errandId]?.close()
      }
      
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      
      await update(ref(database, `errands/${errandId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      
      // If we're showing detail modal, update the selected errand
      if (showDetailModal && selectedErrand && selectedErrand.id === errandId) {
        setSelectedErrand({
          ...selectedErrand,
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      }
      
      // Show success animation
      if (lottieRef.current) {
        lottieRef.current.play()
      }
    } catch (error) {
      console.error("Error updating errand status:", error)
      Alert.alert("Error", "Failed to update errand status. Please try again.")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF9800"
      case "accepted":
        return "#2196F3"
      case "in_progress":
        return "#9C27B0"
      case "completed":
        return "#4CAF50"
      case "cancelled":
        return "#F44336"
      default:
        return "#757575"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending"
      case "accepted":
        return "Accepted"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      default:
        return "Unknown"
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "shopping":
        return "cart"
      case "food":
        return "fast-food"
      case "documents":
        return "document-text"
      case "pharmacy":
        return "medkit"
      default:
        return "cube"
    }
  }
  
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    
    Animated.timing(searchBarAnimation, {
      toValue: showSearch ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      if (!showSearch) {
        // Focus the search input when opening
        setTimeout(() => {
          const searchInput = document.getElementById('errand-search-input')
          if (searchInput) {
            searchInput.focus()
          }
        }, 100)
      } else {
        // Clear search when closing
        setSearchQuery('')
      }
    })
  }
  
  const toggleMapView = () => {
    setShowMapView(!showMapView)
    
    Animated.timing(mapViewAnimation, {
      toValue: showMapView ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }
  
  const toggleSortOptions = () => {
    setShowSortOptions(!showSortOptions)
    
    Animated.timing(sortOptionsAnimation, {
      toValue: showSortOptions ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
    
    // Close filter options if open
    if (showFilterOptions) {
      setShowFilterOptions(false)
      Animated.timing(filterOptionsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start()
    }
  }
  
  const toggleFilterOptions = () => {
    setShowFilterOptions(!showFilterOptions)
    
    Animated.timing(filterOptionsAnimation, {
      toValue: showFilterOptions ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
    
    // Close sort options if open
    if (showSortOptions) {
      setShowSortOptions(false)
      Animated.timing(sortOptionsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start()
    }
  }
  
  const handleErrandPress = (errand: ErrandItem) => {
    setSelectedErrand(errand)
    setShowDetailModal(true)
  }
  
  const formatPrice = (price?: number) => {
    if (price === undefined) return 'N/A'
    return `$${price.toFixed(2)}`
  }
  
  const formatDistance = (distance?: number) => {
    if (distance === undefined) return 'N/A'
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`
    }
    return `${distance.toFixed(1)} km`
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  const searchBarHeight = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60]
  })
  
  const mapViewHeight = mapViewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  })
  
  const sortOptionsHeight = sortOptionsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240]
  })
  
  const filterOptionsHeight = filterOptionsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  })
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  })
  
  const headerElevation = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 5],
    extrapolate: 'clamp',
  })

  const renderRightActions = useCallback((errand: ErrandItem) => {
    // Different swipe actions based on user type and errand status
    if (user?.userType === "runner") {
      if (errand.status === "pending") {
        return (
          <TouchableOpacity 
            style={[styles.swipeAction, { backgroundColor: "#2196F3" }]}
            onPress={() => handleUpdateStatus(errand.id, "accepted")}
          >
            <Ionicons name="checkmark" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Accept</Text>
          </TouchableOpacity>
        )
      } else if (errand.status === "accepted") {
        return (
          <TouchableOpacity 
            style={[styles.swipeAction, { backgroundColor: "#9C27B0" }]}
            onPress={() => handleUpdateStatus(errand.id, "in_progress")}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Start</Text>
          </TouchableOpacity>
        )
      } else if (errand.status === "in_progress") {
        return (
          <TouchableOpacity 
            style={[styles.swipeAction, { backgroundColor: "#4CAF50" }]}
            onPress={() => handleUpdateStatus(errand.id, "completed")}
          >
            <Ionicons name="checkmark-done" size={24} color="#fff" />
            <Text style={styles.swipeActionText}>Complete</Text>
          </TouchableOpacity>
        )
      }
    } else if (user?.userType === "buyer" && ["pending", "accepted"].includes(errand.status)) {
      return (
        <TouchableOpacity 
          style={[styles.swipeAction, { backgroundColor: "#F44336" }]}
          onPress={() => handleUpdateStatus(errand.id, "cancelled")}
        >
          <Ionicons name="close" size={24} color="#fff" />
          <Text style={styles.swipeActionText}>Cancel</Text>
        </TouchableOpacity>
      )
    }
    
    return null
  }, [user])

  const renderErrandItem = ({ item }: { item: ErrandItem }) => (
    <Swipeable
      ref={ref => swipeableRefs.current[item.id] = ref}
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <TouchableOpacity 
        style={[
          styles.errandItem, 
          { 
            backgroundColor: theme.card, 
            borderColor: theme.border,
            shadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
          }
        ]}
        onPress={() => handleErrandPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.errandHeader}>
          <Text style={[styles.errandDate, { color: theme.text + "80" }]}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.errandTypeContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name={getIconForType(item.errandType)} size={20} color={theme.primary} />
          </View>
          <Text style={[styles.errandType, { color: theme.text }]}>
            {item.errandType.charAt(0).toUpperCase() + item.errandType.slice(1)}
          </Text>
          
          {item.price !== undefined && (
            <Text style={[styles.priceTag, { color: theme.primary }]}>
              {formatPrice(item.price)}
            </Text>
          )}
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationIcons}>
            <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
            <View style={[styles.redDot, { backgroundColor: theme.accent || '#F44336' }]} />
          </View>

          <View style={styles.locationTexts}>
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {item.pickup}
            </Text>
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {item.dropoff}
            </Text>
          </View>
        </View>

        <Text style={[styles.errandDescription, { color: theme.text + "80" }]} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.errandFooter}>
          {item.distance !== undefined && (
            <View style={styles.footerItem}>
              <Ionicons name="navigate" size={14} color={theme.text + "60"} />
              <Text style={[styles.footerText, { color: theme.text + "60" }]}>
                {formatDistance(item.distance)}
              </Text>
            </View>
          )}
          
          {item.estimatedTime !== undefined && (
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color={theme.text + "60"} />
              <Text style={[styles.footerText, { color: theme.text + "60" }]}>
                {item.estimatedTime} min
              </Text>
            </View>
          )}
          
          {item.items && (
            <View style={styles.footerItem}>
              <Ionicons name="list" size={14} color={theme.text + "60"} />
              <Text style={[styles.footerText, { color: theme.text + "60" }]}>
                {item.items.length} items
              </Text>
            </View>
          )}
        </View>

        {user?.userType === "runner" && item.status === "pending" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleUpdateStatus(item.id, "accepted")}
          >
            <Text style={styles.actionButtonText}>Accept Errand</Text>
          </TouchableOpacity>
        )}

        {user?.userType === "runner" && item.status === "accepted" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleUpdateStatus(item.id, "in_progress")}
          >
            <Text style={styles.actionButtonText}>Start Errand</Text>
          </TouchableOpacity>
        )}

        {user?.userType === "runner" && item.status === "in_progress" && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => handleUpdateStatus(item.id, "completed")}
          >
            <Text style={styles.actionButtonText}>Complete Errand</Text>
          </TouchableOpacity>
        )}

        {user?.userType === "buyer" && ["pending", "accepted"].includes(item.status) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.accent || '#F44336' }]}
            onPress={() => handleUpdateStatus(item.id, "cancelled")}
          >
            <Text style={styles.actionButtonText}>Cancel Errand</Text>
          </TouchableOpacity>
        )}

        {item.transactionCode && (
          <View style={[styles.codeContainer, { backgroundColor: theme.secondary + '40' }]}>
            <Text style={[styles.codeLabel, { color: theme.text + "80" }]}>Transaction Code:</Text>
            <Text style={[styles.codeValue, { color: theme.text }]}>{item.transactionCode}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  )
  
  const renderDetailModal = () => {
    if (!selectedErrand) return null
    
    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <BlurView intensity={80} style={styles.modalContainer} tint={isDark ? "dark" : "light"}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Errand Details</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={[styles.detailStatusCard, { backgroundColor: getStatusColor(selectedErrand.status) }]}>
                <Text style={styles.detailStatusLabel}>Status</Text>
                <Text style={styles.detailStatusText}>{getStatusLabel(selectedErrand.status)}</Text>
              </View>
              
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name={getIconForType(selectedErrand.errandType)} size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                    {selectedErrand.errandType.charAt(0).toUpperCase() + selectedErrand.errandType.slice(1)} Errand
                  </Text>
                </View>
                
                <Text style={[styles.detailDescription, { color: theme.text + "80" }]}>
                  {selectedErrand.description}
                </Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: theme.text }]}>Locations</Text>
                
                <View style={[styles.detailLocationCard, { backgroundColor: theme.background }]}>
                  <View style={styles.detailLocationHeader}>
                    <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.detailLocationTitle, { color: theme.text }]}>Pickup</Text>
                  </View>
                  <Text style={[styles.detailLocationAddress, { color: theme.text + "80" }]}>
                    {selectedErrand.pickup}
                  </Text>
                </View>
                
                <View style={[styles.detailLocationCard, { backgroundColor: theme.background }]}>
                  <View style={styles.detailLocationHeader}>
                    <View style={[styles.redDot, { backgroundColor: theme.accent || '#F44336' }]} />
                    <Text style={[styles.detailLocationTitle, { color: theme.text }]}>Dropoff</Text>
                  </View>
                  <Text style={[styles.detailLocationAddress, { color: theme.text + "80" }]}>
                    {selectedErrand.dropoff}
                  </Text>
                </View>
                
                {selectedErrand.pickupCoordinates && selectedErrand.dropoffCoordinates && (
                  <View style={styles.detailMapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.detailMap}
                      initialRegion={{
                        latitude: (selectedErrand.pickupCoordinates.latitude + selectedErrand.dropoffCoordinates.latitude) / 2,
                        longitude: (selectedErrand.pickupCoordinates.longitude + selectedErrand.dropoffCoordinates.longitude) / 2,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}
                    >
                      <Marker
                        coordinate={selectedErrand.pickupCoordinates}
                        title="Pickup"
                        description={selectedErrand.pickup}
                        pinColor="green"
                      />
                      <Marker
                        coordinate={selectedErrand.dropoffCoordinates}
                        title="Dropoff"
                        description={selectedErrand.dropoff}
                        pinColor="red"
                      />
                    </MapView>
                  </View>
                )}
              </View>
              
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: theme.text }]}>Information</Text>
                
                <View style={styles.detailInfoGrid}>
                  <View style={[styles.detailInfoItem, { backgroundColor: theme.background }]}>
                    <Ionicons name="cash-outline" size={20} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.text + "70" }]}>Price</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {formatPrice(selectedErrand.price)}
                    </Text>
                  </View>
                  
                  <View style={[styles.detailInfoItem, { backgroundColor: theme.background }]}>
                    <Ionicons name="navigate-outline" size={20} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.text + "70" }]}>Distance</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {formatDistance(selectedErrand.distance)}
                    </Text>
                  </View>
                  
                  <View style={[styles.detailInfoItem, { backgroundColor: theme.background }]}>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.text + "70" }]}>Est. Time</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {selectedErrand.estimatedTime ? `${selectedErrand.estimatedTime} min` : 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={[styles.detailInfoItem, { backgroundColor: theme.background }]}>
                    <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                    <Text style={[styles.detailInfoLabel, { color: theme.text + "70" }]}>Created</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {new Date(selectedErrand.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
              
              {selectedErrand.items && selectedErrand.items.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>Items</Text>
                  
                  {selectedErrand.items.map((item, index) => (
                    <View key={index} style={[styles.detailItemRow, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.detailItemName, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.detailItemQuantity, { color: theme.text + '70' }]}>x{item.quantity}</Text>
                      {item.price && (
                        <Text style={[styles.detailItemPrice, { color: theme.primary }]}>
                          ${item.price.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {selectedErrand.transactionCode && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: theme.text }]}>Transaction</Text>
                  <View style={[styles.detailCodeContainer, { backgroundColor: theme.secondary + '40' }]}>
                    <Text style={[styles.detailCodeLabel, { color: theme.text + "80" }]}>Transaction Code:</Text>
                    <Text style={[styles.detailCodeValue, { color: theme.text }]}>{selectedErrand.transactionCode}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
            
            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              {user?.userType === "runner" && selectedErrand.status === "pending" && (
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    handleUpdateStatus(selectedErrand.id, "accepted")
                    setShowDetailModal(false)
                  }}
                >
                  <Text style={styles.modalActionButtonText}>Accept Errand</Text>
                </TouchableOpacity>
              )}

              {user?.userType === "runner" && selectedErrand.status === "accepted" && (
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    handleUpdateStatus(selectedErrand.id, "in_progress")
                    setShowDetailModal(false)
                  }}
                >
                  <Text style={styles.modalActionButtonText}>Start Errand</Text>
                </TouchableOpacity>
              )}

              {user?.userType === "runner" && selectedErrand.status === "in_progress" && (
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    handleUpdateStatus(selectedErrand.id, "completed")
                    setShowDetailModal(false)
                  }}
                >
                  <Text style={styles.modalActionButtonText}>Complete Errand</Text>
                </TouchableOpacity>
              )}

              {user?.userType === "buyer" && ["pending", "accepted"].includes(selectedErrand.status) && (
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: theme.accent || '#F44336' }]}
                  onPress={() => {
                    handleUpdateStatus(selectedErrand.id, "cancelled")
                    setShowDetailModal(false)
                  }}
                >
                  <Text style={styles.modalActionButtonText}>Cancel Errand</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>
    )
  }
  
  const renderStatsModal = () => {
    const chartData = [
      {
        name: "Pending",
        population: errandStats.pending,
        color: "#FF9800",
        legendFontColor: theme.text,
      },
      {
        name: "Accepted",
        population: errandStats.accepted,
        color: "#2196F3",
        legendFontColor: theme.text,
      },
      {
        name: "In Progress",
        population: errandStats.in_progress,
        color: "#9C27B0",
        legendFontColor: theme.text,
      },
      {
        name: "Completed",
        population: errandStats.completed,
        color: "#4CAF50",
        legendFontColor: theme.text,
      },
      {
        name: "Cancelled",
        population: errandStats.cancelled,
        color: "#F44336",
        legendFontColor: theme.text,
      },
    ].filter(item => item.population > 0)
    
    return (
      <Modal
        visible={showStats}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStats(false)}
      >
        <BlurView intensity={80} style={styles.modalContainer} tint={isDark ? "dark" : "light"}>
          <View style={[styles.statsModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStats(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Errand Statistics</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.statsModalBody}>
              <Text style={[styles.statsTotalText, { color: theme.text }]}>
                Total Errands: {errandStats.total}
              </Text>
              
              {chartData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={chartData}
                    width={width - 60}
                    height={220}
                    chartConfig={{
                      backgroundColor: theme.card,
                      backgroundGradientFrom: theme.card,
                      backgroundGradientTo: theme.card,
                      color: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              ) : (
                <View style={styles.noStatsContainer}>
                  <Ionicons name="analytics" size={60} color={theme.text + "30"} />
                  <Text style={[styles.noStatsText, { color: theme.text }]}>No data to display</Text>
                </View>
              )}
              
              <View style={styles.statsGrid}>
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: "#FF9800" + "20" }]}>
                    <Ionicons name="hourglass-outline" size={24} color="#FF9800" />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.pending}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>Pending</Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: "#2196F3" + "20" }]}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#2196F3" />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.accepted}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>Accepted</Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: "#9C27B0" + "20" }]}>
                    <Ionicons name="bicycle" size={24} color="#9C27B0" />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.in_progress}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>In Progress</Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: "#4CAF50" + "20" }]}>
                    <Ionicons name="checkmark-done-outline" size={24} color="#4CAF50" />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.completed}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>Completed</Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: "#F44336" + "20" }]}>
                    <Ionicons name="close-circle-outline" size={24} color="#F44336" />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.cancelled}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>Cancelled</Text>
                </View>
                
                <View style={[styles.statsCard, { backgroundColor: theme.background }]}>
                  <View style={[styles.statsIconContainer, { backgroundColor: theme.primary + "20" }]}>
                    <Ionicons name="analytics-outline" size={24} color={theme.primary} />
                  </View>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{errandStats.total}</Text>
                  <Text style={[styles.statsLabel, { color: theme.text + "70" }]}>Total</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <Animated.View 
        style={[
          styles.headerContainer, 
          { 
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            opacity: headerOpacity,
            elevation: headerElevation,
            shadowOpacity: headerElevation.interpolate({
              inputRange: [0, 5],
              outputRange: [0, 0.1]
            })
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Your Errands</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={toggleSearch}
            >
              <Ionicons name="search" size={22} color={theme.text + "80"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={toggleFilterOptions}
            >
              <Ionicons 
                name="filter" 
                size={22} 
                color={selectedFilter !== 'all' ? theme.primary : theme.text + "80"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={toggleSortOptions}
            >
              <Ionicons name="swap-vertical" size={22} color={theme.text + "80"} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={toggleMapView}
            >
              <Ionicons 
                name="map" 
                size={22} 
                color={showMapView ? theme.primary : theme.text + "80"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowStats(true)}
            >
              <Ionicons name="stats-chart" size={22} color={theme.text + "80"} />
            </TouchableOpacity>
          </View>
        </View>
        
        <Animated.View 
          style={[
            styles.searchBarContainer, 
            { 
              height: searchBarHeight, 
              borderBottomColor: theme.border,
              backgroundColor: theme.card,
              overflow: 'hidden'
            }
          ]}
        >
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={theme.text + "50"} style={styles.searchIcon} />
            <TextInput
              id="errand-search-input"
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search errands..."
              placeholderTextColor={theme.text + "50"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={20} color={theme.text + "50"} />
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.sortOptionsContainer, 
            { 
              height: sortOptionsHeight, 
              borderBottomColor: theme.border,
              backgroundColor: theme.card,
              overflow: 'hidden'
            }
          ]}
        >
          <View style={styles.optionsHeader}>
            <Text style={[styles.optionsTitle, { color: theme.text }]}>Sort By</Text>
            <TouchableOpacity onPress={toggleSortOptions}>
              <Ionicons name="close" size={20} color={theme.text + '70'} />
            </TouchableOpacity>
          </View>
          
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                selectedSort === option.value && { backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => {
                setSelectedSort(option.value)
                toggleSortOptions()
              }}
            >
              <Text 
                style={[
                  styles.sortOptionText, 
                  { 
                    color: selectedSort === option.value ? theme.primary : theme.text,
                    fontWeight: selectedSort === option.value ? '600' : '400'
                  }
                ]}
              >
                {option.label}
              </Text>
              {selectedSort === option.value && (
                <Ionicons name="checkmark" size={18} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.filterOptionsContainer, 
            { 
              height: filterOptionsHeight, 
              borderBottomColor: theme.border,
              backgroundColor: theme.card,
              overflow: 'hidden'
            }
          ]}
        >
          <View style={styles.optionsHeader}>
            <Text style={[styles.optionsTitle, { color: theme.text }]}>Filter By Type</Text>
            <TouchableOpacity onPress={toggleFilterOptions}>
              <Ionicons name="close" size={20} color={theme.text + '70'} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterOptionsGrid}>
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  selectedFilter === option.value && { 
                    backgroundColor: theme.primary + '20',
                    borderColor: theme.primary
                  },
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setSelectedFilter(option.value)
                  toggleFilterOptions()
                }}
              >
                <Ionicons 
                  name={option.value === 'all' ? 'apps' : getIconForType(option.value)} 
                  size={18} 
                  color={selectedFilter === option.value ? theme.primary : theme.text + '70'} 
                />
                <Text 
                  style={[
                    styles.filterOptionText, 
                    { 
                      color: selectedFilter === option.value ? theme.primary : theme.text,
                      fontWeight: selectedFilter === option.value ? '600' : '400'
                    }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "active" && styles.activeTab,
              { backgroundColor: activeTab === "active" ? theme.primary : theme.secondary + '40' }
            ]}
            onPress={() => setActiveTab("active")}
          >
            <Text style={[styles.tabText, { color: activeTab === "active" ? "#fff" : theme.text + "80" }]}>Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "completed" && styles.activeTab,
              { backgroundColor: activeTab === "completed" ? theme.primary : theme.secondary + '40' }
            ]}
            onPress={() => setActiveTab("completed")}
          >
            <Text style={[styles.tabText, { color: activeTab === "completed" ? "#fff" : theme.text + "80" }]}>
              Completed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "cancelled" && styles.activeTab,
              { backgroundColor: activeTab === "cancelled" ? theme.primary : theme.secondary + '40' }
            ]}
            onPress={() => setActiveTab("cancelled")}
          >
            <Text style={[styles.tabText, { color: activeTab === "cancelled" ? "#fff" : theme.text + "80" }]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.mapViewContainer, 
          { 
            height: mapViewHeight, 
            borderBottomColor: theme.border,
            overflow: 'hidden'
          }
        ]}
      >
        {showMapView && (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapView}
            initialRegion={{
              latitude: 37.78825,
              longitude: -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {filteredErrands.map((errand) => {
              if (errand.pickupCoordinates) {
                return (
                  <Marker
                    key={`pickup-${errand.id}`}
                    coordinate={errand.pickupCoordinates}
                    title={`Pickup: ${errand.errandType}`}
                    description={errand.pickup}
                    pinColor="green"
                    onPress={() => handleErrandPress(errand)}
                  />
                )
              }
              return null
            })}
            
            {filteredErrands.map((errand) => {
              if (errand.dropoffCoordinates) {
                return (
                  <Marker
                    key={`dropoff-${errand.id}`}
                    coordinate={errand.dropoffCoordinates}
                    title={`Dropoff: ${errand.errandType}`}
                    description={errand.dropoff}
                    pinColor="red"
                    onPress={() => handleErrandPress(errand)}
                  />
                )
              }
              return null
            })}
          </MapView>
        )}
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LottieView
              source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json' }}
              style={styles.loadingAnimation}
              autoPlay
              loop
            />
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading errands...</Text>
          </View>
        ) : (
          <View style={styles.errandsContainer}>
            {filteredErrands.length > 0 ? (
              filteredErrands.map((item) => (
                <View key={item.id}>
                  {renderErrandItem({ item })}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <LottieView
                  source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_qm8ief3i.json' }}
                  style={styles.emptyAnimation}
                  autoPlay
                  loop
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No errands found</Text>
                <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                  {searchQuery ? 
                    `No results found for "${searchQuery}"` :
                    activeTab === "active"
                      ? "You don't have any active errands"
                      : activeTab === "completed"
                        ? "You don't have any completed errands"
                        : "You don't have any cancelled errands"}
                </Text>
                <TouchableOpacity 
                  style={[styles.refreshButton, { backgroundColor: theme.primary }]}
                  onPress={handleRefresh}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Animated.ScrollView>
      
      {/* Success animation overlay */}
      <View style={styles.lottieContainer} pointerEvents="none">
        <LottieView
          ref={lottieRef}
          source={{ uri: 'https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json' }}
          style={styles.lottieAnimation}
          loop={false}
        />
      </View>
      
      {renderDetailModal()}
      {renderStatsModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
    marginLeft: 5,
  },
  searchBarContainer: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  sortOptionsContainer: {
    padding: 15,
  },
  filterOptionsContainer: {
    padding: 15,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  sortOptionText: {
    fontSize: 16,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  filterOptionText: {
    fontSize: 14,
    marginLeft: 6,
  },
  mapViewContainer: {
    width: '100%',
    borderBottomWidth: 1,
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errandsContainer: {
    width: "100%",
    paddingTop: 10,
  },
  errandItem: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  errandDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  errandTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  errandType: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  priceTag: {
    fontSize: 16,
    fontWeight: "700",
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  locationIcons: {
    width: 20,
    alignItems: "center",
    marginRight: 10,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationLine: {
    width: 1,
    height: 20,
    marginVertical: 5,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationTexts: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 10,
  },
  errandDescription: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  errandFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  footerText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  codeLabel: {
    fontSize: 12,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
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
    marginBottom: 20,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 15,
    maxHeight: height * 0.6,
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  modalActionButton: {
    width: '100%',
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailStatusCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  detailStatusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  detailStatusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailLocationCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  detailLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailLocationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  detailLocationAddress: {
    fontSize: 14,
    marginLeft: 20,
  },
  detailMapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  detailMap: {
    width: '100%',
    height: '100%',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailInfoItem: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  detailInfoLabel: {
    fontSize: 12,
    marginTop: 5,
    marginBottom: 2,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailItemName: {
    fontSize: 15,
    flex: 1,
  },
  detailItemQuantity: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  detailItemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailCodeContainer: {
    padding: 15,
    borderRadius: 10,
  },
  detailCodeLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  detailCodeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  lottieContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  lottieAnimation: {
    width: 150,
    height: 150,
  },
  statsModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  statsModalBody: {
    padding: 15,
  },
  statsTotalText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    width: '48%',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  statsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 14,
  },
  noStatsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noStatsText: {
    fontSize: 16,
    marginTop: 10,
  },
})

export default ErrandsScreen