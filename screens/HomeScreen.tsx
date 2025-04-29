"use client"

import { useState, useEffect, useRef } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Dimensions, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  FlatList,
  Pressable
} from "react-native"
import { StatusBar } from "expo-status-bar"
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapPressEvent } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import { locationService, errandService } from "../services/database"
import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { BlurView } from "expo-blur"
import * as Haptics from 'expo-haptics'
import LottieView from "lottie-react-native"

const { width, height } = Dimensions.get("window")

// Define navigation types
type RootStackParamList = {
  Payment: { errandId: string; amount: number };
  ErrandDetails: { errandId: string };
  SavedLocations: undefined;
  // Add other screens here as needed
};

// Define types for location
type LocationObject = Location.LocationObject;

// Define types for nearby users
type NearbyUser = {
  id: string;
  latitude: string;
  longitude: string;
  name?: string;
  user_type: string;
  distance: number;
};

// Define types for errand details
type ErrandType = "shopping" | "food" | "documents" | "pharmacy" | "other";
type PaymentMethod = "cash" | "card";

interface ErrandDetails {
  pickup: string;
  dropoff: string;
  description: string;
  errandType: ErrandType;
  paymentMethod: PaymentMethod;
  items?: Array<{name: string, quantity: number, price?: number}>;
  scheduledTime?: Date | null;
  priority: "normal" | "express";
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: "home" | "work" | "other";
  icon: string;
}

interface RecentErrand {
  id: string;
  errandType: string;
  status: string;
  createdAt: string;
  pickup: string;
  dropoff: string;
  transactionCode?: string;
}

const INITIAL_REGION = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

const HomeScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [location, setLocation] = useState<LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isErrandModalVisible, setIsErrandModalVisible] = useState(false)
  const [errandDetails, setErrandDetails] = useState<ErrandDetails>({
    pickup: "",
    dropoff: "",
    description: "",
    errandType: "shopping",
    paymentMethod: "cash",
    items: [],
    scheduledTime: null,
    priority: "normal"
  })
  const [transactionCode, setTransactionCode] = useState("")
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"map" | "recent" | "saved">("map")
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [recentErrands, setRecentErrands] = useState<RecentErrand[]>([])
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, price: undefined })
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard")
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapRegion, setMapRegion] = useState<Region>(INITIAL_REGION)
  const [isPickingLocation, setIsPickingLocation] = useState<"pickup" | "dropoff" | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null)
  
  // Animation refs
  const mapViewRef = useRef<MapView>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const lottieRef = useRef<LottieView>(null)
  const bottomSheetHeight = useRef(new Animated.Value(250)).current
  const errandModalY = useRef(new Animated.Value(height)).current
  
  // Load user data and location
  useEffect(() => {
    (async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        setIsLoading(false)
        return
      }

      try {
        // Get current location
        const location = await Location.getCurrentPositionAsync({})
        setLocation(location)
        
        // Update map region
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        })

        // Update user location in database
        if (user.id) {
          await locationService.updateUserLocation(user.id, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          })

          // Get nearby users
          const nearby = await locationService.getNearbyUsers(
            location.coords.latitude,
            location.coords.longitude,
            10, // 10km radius
            user.id,
          )
          const formattedNearby = nearby.map((user: any) => ({
            id: user.id,
            latitude: user.latitude,
            longitude: user.longitude,
            name: user.name,
            user_type: user.user_type,
            distance: user.distance,
          }))
          setNearbyUsers(formattedNearby)
          
          // Load saved locations
          const savedLocs = await locationService.getSavedLocations(user.id)
          setSavedLocations(savedLocs || [])
          
          // Load recent errands
          const recentErrs = await errandService.getRecentErrands(user.id, 5)
          setRecentErrands(recentErrs || [])
        }
      } catch (error) {
        console.error("Error getting location:", error)
        setErrorMsg("Failed to get location")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user])
  
  // Calculate estimated time and distance when pickup and dropoff are set
  useEffect(() => {
    if (errandDetails.pickup && errandDetails.dropoff) {
      calculateEstimates()
    } else {
      setEstimatedTime(null)
      setEstimatedDistance(null)
    }
  }, [errandDetails.pickup, errandDetails.dropoff])
  
  const calculateEstimates = async () => {
    try {
      // In a real app, you would use a service like Google Distance Matrix API
      // For this example, we'll simulate with random values
      const distance = Math.random() * 10 + 1 // 1-11 km
      const time = Math.round(distance * 5 + 10) // 15-65 minutes
      
      setEstimatedDistance(parseFloat(distance.toFixed(1)))
      setEstimatedTime(time)
    } catch (error) {
      console.error("Error calculating estimates:", error)
    }
  }

  const handleRequestErrand = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to request an errand")
      return
    }

    if (!errandDetails.pickup || !errandDetails.dropoff || !errandDetails.description) {
      Alert.alert("Error", "Please fill in all required errand details")
      return
    }

    try {
      setIsSubmitting(true)

      // Create new errand in database
      const result = await errandService.createErrand({
        buyerId: user.id,
        errandType: errandDetails.errandType,
        description: errandDetails.description,
        pickupLocation: {
          latitude: location ? location.coords.latitude : INITIAL_REGION.latitude,
          longitude: location ? location.coords.longitude : INITIAL_REGION.longitude,
          address: errandDetails.pickup,
        },
        dropoffLocation: {
          latitude: location ? location.coords.latitude : INITIAL_REGION.latitude,
          longitude: location ? location.coords.longitude : INITIAL_REGION.longitude,
          address: errandDetails.dropoff,
        },
        items: errandDetails.items,
        scheduledTime: errandDetails.scheduledTime,
        priority: errandDetails.priority
      })

      setTransactionCode(result.transaction_code)
      
      // Show success animation
      setShowSuccessAnimation(true)
      if (lottieRef.current) {
        lottieRef.current.play()
      }
      
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }

      // If payment method is card, navigate to payment screen
      if (errandDetails.paymentMethod === "card") {
        setTimeout(() => {
          setShowSuccessAnimation(false)
          setIsErrandModalVisible(false)
          
          // Reset errand details
          setErrandDetails({
            pickup: "",
            dropoff: "",
            description: "",
            errandType: "shopping",
            paymentMethod: "cash",
            items: [],
            scheduledTime: null,
            priority: "normal"
          })
          
          navigation.navigate("Payment", {
            errandId: result.id,
            amount: result.priceEstimate || 1500, // Default to 1500 if no estimate
          })
        }, 2000)
      } else {
        // For cash payment, just show success message
        setTimeout(() => {
          setShowSuccessAnimation(false)
          setIsErrandModalVisible(false)
          
          // Reset errand details
          setErrandDetails({
            pickup: "",
            dropoff: "",
            description: "",
            errandType: "shopping",
            paymentMethod: "cash",
            items: [],
            scheduledTime: null,
            priority: "normal"
          })
          
          Alert.alert(
            "Errand Requested",
            `Your errand has been requested successfully. Your transaction code is: ${result.transaction_code}`,
            [{ text: "OK" }],
          )
          
          // Refresh recent errands
          const recentErrs = await errandService.getRecentErrands(user.id, 5)
          setRecentErrands(recentErrs || [])
        }, 2000)
      }
    } catch (error) {
      console.error("Error creating errand:", error)
      Alert.alert("Error", "Failed to create errand. Please try again.")
      setShowSuccessAnimation(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLookupTransactionCode = async () => {
    if (!transactionCode || transactionCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-character transaction code")
      return
    }

    try {
      setIsSubmitting(true)
      const errand = await errandService.getErrandByTransactionCode(transactionCode)

      if (!errand) {
        Alert.alert("Error", "No errand found with this transaction code")
        return
      }

      // Navigate to errand details
      navigation.navigate("ErrandDetails", { errandId: errand.id })
    } catch (error) {
      console.error("Error looking up transaction code:", error)
      Alert.alert("Error", "Failed to look up transaction code. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleAddItem = () => {
    if (!newItem.name || newItem.quantity <= 0) {
      Alert.alert("Error", "Please enter a valid item name and quantity")
      return
    }
    
    const updatedItems = [...(errandDetails.items || []), {
      name: newItem.name,
      quantity: newItem.quantity,
      price: newItem.price
    }]
    
    setErrandDetails({
      ...errandDetails,
      items: updatedItems
    })
    
    // Reset new item form
    setNewItem({ name: "", quantity: 1, price: undefined })
    setShowAddItemModal(false)
  }
  
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...(errandDetails.items || [])]
    updatedItems.splice(index, 1)
    
    setErrandDetails({
      ...errandDetails,
      items: updatedItems
    })
  }
  
  const handleScheduleErrand = () => {
    setErrandDetails({
      ...errandDetails,
      scheduledTime: selectedDate
    })
    
    setShowScheduleModal(false)
  }
  
  const handleMapPress = (event: MapPressEvent) => {
    if (isPickingLocation) {
      // Get address from coordinates (reverse geocoding)
      // In a real app, you would use a service like Google Geocoding API
      // For this example, we'll simulate with a fake address
      const { latitude, longitude } = event.nativeEvent.coordinate
      const fakeAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      
      if (isPickingLocation === "pickup") {
        setErrandDetails({
          ...errandDetails,
          pickup: fakeAddress
        })
      } else {
        setErrandDetails({
          ...errandDetails,
          dropoff: fakeAddress
        })
      }
      
      setIsPickingLocation(null)
      
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      }
    }
  }
  
  const handleSavedLocationSelect = (location: SavedLocation) => {
    if (isPickingLocation === "pickup") {
      setErrandDetails({
        ...errandDetails,
        pickup: location.address
      })
    } else if (isPickingLocation === "dropoff") {
      setErrandDetails({
        ...errandDetails,
        dropoff: location.address
      })
    }
    
    setIsPickingLocation(null)
  }
  
  const handleOpenErrandModal = () => {
    setIsErrandModalVisible(true)
    
    Animated.timing(errandModalY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start()
  }
  
  const handleCloseErrandModal = () => {
    Animated.timing(errandModalY, {
      toValue: height,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setIsErrandModalVisible(false)
    })
  }
  
  const handleTabChange = (tab: "map" | "recent" | "saved") => {
    setActiveTab(tab)
    
    // Adjust bottom sheet height based on tab
    Animated.timing(bottomSheetHeight, {
      toValue: tab === "map" ? 250 : 400,
      duration: 300,
      useNativeDriver: false
    }).start()
  }
  
  const handleErrandTypePress = (type: ErrandType) => {
    setErrandDetails({ ...errandDetails, errandType: type })
    
    // Provide haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync()
    }
  }
  
  const handleQuickActionPress = (type: ErrandType) => {
    handleOpenErrandModal()
    setErrandDetails({ ...errandDetails, errandType: type })
  }
  
  const handleRecentErrandPress = (errand: RecentErrand) => {
    navigation.navigate("ErrandDetails", { errandId: errand.id })
  }
  
  const handleMapTypeToggle = () => {
    setMapType(mapType === "standard" ? "satellite" : "standard")
  }
  
  const handleCenterOnUser = () => {
    if (location && mapViewRef.current) {
      mapViewRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000)
    }
  }
  
  const renderErrandTypeButton = (type: ErrandType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.errandTypeButton,
        errandDetails.errandType === type && styles.selectedErrandType,
        {
          borderColor: theme.border,
          backgroundColor: errandDetails.errandType === type ? theme.primary + '20' : theme.card,
        },
      ]}
      onPress={() => handleErrandTypePress(type)}
    >
      <Ionicons name={icon as any} size={24} color={errandDetails.errandType === type ? theme.primary : theme.text + "80"} />
      <Text
        style={[
          styles.errandTypeText,
          errandDetails.errandType === type && styles.selectedErrandTypeText,
          { color: errandDetails.errandType === type ? theme.primary : theme.text + "80" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
  
  const renderAddItemModal = () => (
    <Modal
      visible={showAddItemModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowAddItemModal(false)}
    >
      <BlurView intensity={80} style={styles.modalContainer} tint={isDark ? "dark" : "light"}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Item</Text>
            <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Item Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }
              ]}
              placeholder="Enter item name"
              placeholderTextColor={theme.text + "50"}
              value={newItem.name}
              onChangeText={(text) => setNewItem({...newItem, name: text})}
            />
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                onPress={() => setNewItem({...newItem, quantity: Math.max(1, newItem.quantity - 1)})}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TextInput
                style={[
                  styles.quantityInput,
                  { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }
                ]}
                keyboardType="number-pad"
                value={newItem.quantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text)
                  if (!isNaN(num) && num > 0) {
                    setNewItem({...newItem, quantity: num})
                  }
                }}
              />
              
              <TouchableOpacity 
                style={[styles.quantityButton, { backgroundColor: theme.primary }]}
                onPress={() => setNewItem({...newItem, quantity: newItem.quantity + 1})}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Price (Optional)</Text>
            <TextInput
              style={[
                styles.modalInput,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }
              ]}
              placeholder="Enter price (optional)"
              placeholderTextColor={theme.text + "50"}
              keyboardType="decimal-pad"
              value={newItem.price !== undefined ? newItem.price.toString() : ""}
              onChangeText={(text) => {
                const num = parseFloat(text)
                if (text === "" || !isNaN(num)) {
                  setNewItem({...newItem, price: text === "" ? undefined : num})
                }
              }}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={handleAddItem}
          >
            <Text style={styles.modalButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  )
  
  const renderScheduleModal = () => (
    <Modal
      visible={showScheduleModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowScheduleModal(false)}
    >
      <BlurView intensity={80} style={styles.modalContainer} tint={isDark ? "dark" : "light"}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Delivery</Text>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Select Date & Time</Text>
            
            {/* In a real app, you would use a date picker component */}
            {/* For this example, we'll use buttons for common times */}
            <View style={styles.timeOptions}>
              <TouchableOpacity
                style={[
                  styles.timeOption,
                  selectedDate && isSameTime(selectedDate, getTimeOption(1)) && styles.selectedTimeOption,
                  { 
                    borderColor: theme.border,
                    backgroundColor: selectedDate && isSameTime(selectedDate, getTimeOption(1)) 
                      ? theme.primary + '20' 
                      : theme.background
                  }
                ]}
                onPress={() => setSelectedDate(getTimeOption(1))}
              >
                <Text style={[
                  styles.timeOptionText, 
                  { 
                    color: selectedDate && isSameTime(selectedDate, getTimeOption(1))
                      ? theme.primary
                      : theme.text
                  }
                ]}>
                  Today, ASAP
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.timeOption,
                  selectedDate && isSameTime(selectedDate, getTimeOption(2)) && styles.selectedTimeOption,
                  { 
                    borderColor: theme.border,
                    backgroundColor: selectedDate && isSameTime(selectedDate, getTimeOption(2)) 
                      ? theme.primary + '20' 
                      : theme.background
                  }
                ]}
                onPress={() => setSelectedDate(getTimeOption(2))}
              >
                <Text style={[
                  styles.timeOptionText, 
                  { 
                    color: selectedDate && isSameTime(selectedDate, getTimeOption(2))
                      ? theme.primary
                      : theme.text
                  }
                ]}>
                  Today, Evening
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.timeOption,
                  selectedDate && isSameTime(selectedDate, getTimeOption(3)) && styles.selectedTimeOption,
                  { 
                    borderColor: theme.border,
                    backgroundColor: selectedDate && isSameTime(selectedDate, getTimeOption(3)) 
                      ? theme.primary + '20' 
                      : theme.background
                  }
                ]}
                onPress={() => setSelectedDate(getTimeOption(3))}
              >
                <Text style={[
                  styles.timeOptionText, 
                  { 
                    color: selectedDate && isSameTime(selectedDate, getTimeOption(3))
                      ? theme.primary
                      : theme.text
                  }
                ]}>
                  Tomorrow, Morning
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.timeOption,
                  selectedDate && isSameTime(selectedDate, getTimeOption(4)) && styles.selectedTimeOption,
                  { 
                    borderColor: theme.border,
                    backgroundColor: selectedDate && isSameTime(selectedDate, getTimeOption(4)) 
                      ? theme.primary + '20' 
                      : theme.background
                  }
                ]}
                onPress={() => setSelectedDate(getTimeOption(4))}
              >
                <Text style={[
                  styles.timeOptionText, 
                  { 
                    color: selectedDate && isSameTime(selectedDate, getTimeOption(4))
                      ? theme.primary
                      : theme.text
                  }
                ]}>
                  Tomorrow, Afternoon
                </Text>
              </TouchableOpacity>
            </View>
            
            {selectedDate && (
              <View style={[styles.selectedTimeContainer, { backgroundColor: theme.primary + '10' }]}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <Text style={[styles.selectedTimeText, { color: theme.text }]}>
                  {formatScheduledTime(selectedDate)}
                </Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={handleScheduleErrand}
            disabled={!selectedDate}
          >
            <Text style={styles.modalButtonText}>Confirm Schedule</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  )
  
  // Helper functions for scheduling
  const getTimeOption = (option: number): Date => {
    const now = new Date()
    const result = new Date()
    
    switch (option) {
      case 1: // Today, ASAP
        result.setHours(now.getHours() + 1, 0, 0, 0)
        break
      case 2: // Today, Evening
        result.setHours(18, 0, 0, 0)
        break
      case 3: // Tomorrow, Morning
        result.setDate(now.getDate() + 1)
        result.setHours(9, 0, 0, 0)
        break
      case 4: // Tomorrow, Afternoon
        result.setDate(now.getDate() + 1)
        result.setHours(14, 0, 0, 0)
        break
    }
    
    return result
  }
  
  const isSameTime = (date1: Date, date2: Date): boolean => {
    return date1.getTime() === date2.getTime()
  }
  
  const formatScheduledTime = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const dayName = days[date.getDay()]
    const monthName = months[date.getMonth()]
    const day = date.getDate()
    
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes
    
    return `${dayName}, ${monthName} ${day} at ${hours}:${minutesStr} ${ampm}`
  }
  
  const renderSuccessAnimation = () => (
    showSuccessAnimation && (
      <View style={styles.successAnimationContainer}>
        <LottieView
          ref={lottieRef}
          source={{ uri: 'https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json' }}
          style={styles.successAnimation}
          loop={false}
        />
        <Text style={styles.successText}>Errand Requested Successfully!</Text>
      </View>
    )
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <LottieView
          source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json' }}
          style={styles.loadingAnimation}
          autoPlay
          loop
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>Getting your location...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapViewRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          region={mapRegion}
          mapType={mapType}
          customMapStyle={isDark ? darkMapStyle : []}
          onMapReady={() => setIsMapReady(true)}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {/* Render nearby users */}
          {nearbyUsers.map((nearbyUser) => (
            <Marker
              key={nearbyUser.id}
              coordinate={{
                latitude: Number.parseFloat(nearbyUser.latitude),
                longitude: Number.parseFloat(nearbyUser.longitude),
              }}
              title={nearbyUser.name || "User"}
              description={`${nearbyUser.user_type} (${Math.round(nearbyUser.distance * 10) / 10} km away)`}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor:
                        nearbyUser.user_type === "runner"
                          ? "#FF9800"
                          : nearbyUser.user_type === "seller"
                            ? "#2196F3"
                            : "#9C27B0",
                    },
                  ]}
                />
              </View>
            </Marker>
          ))}
          
          {/* Render saved locations */}
          {activeTab === "saved" && savedLocations.map((loc) => (
            <Marker
              key={loc.id}
              coordinate={{
                latitude: loc.latitude,
                longitude: loc.longitude,
              }}
              title={loc.name}
              description={loc.address}
              pinColor={loc.type === "home" ? "green" : loc.type === "work" ? "blue" : "purple"}
            />
          ))}
        </MapView>
        
        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: theme.card }]}
            onPress={handleCenterOnUser}
          >
            <Ionicons name="locate" size={22} color={theme.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.mapControlButton, { backgroundColor: theme.card }]}
            onPress={handleMapTypeToggle}
          >
            <Ionicons 
              name={mapType === "standard" ? "map" : "earth"} 
              size={22} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Location picking indicator */}
        {isPickingLocation && (
          <View style={styles.pickingLocationContainer}>
            <View style={[styles.pickingLocationBanner, { backgroundColor: theme.primary }]}>
              <Text style={styles.pickingLocationText}>
                Tap on the map to select {isPickingLocation === "pickup" ? "pickup" : "dropoff"} location
              </Text>
              <TouchableOpacity onPress={() => setIsPickingLocation(null)}>
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom sheet with tabs */}
      <Animated.View 
        style={[
          styles.bottomSheet, 
          { 
            backgroundColor: theme.card,
            height: bottomSheetHeight 
          }
        ]}
      >
        <View style={styles.bottomSheetHandle} />
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === "map" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => handleTabChange("map")}
          >
            <Ionicons 
              name="map" 
              size={20} 
              color={activeTab === "map" ? theme.primary : theme.text + "70"} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: activeTab === "map" ? theme.primary : theme.text + "70" }
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === "recent" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => handleTabChange("recent")}
          >
            <Ionicons 
              name="time" 
              size={20} 
              color={activeTab === "recent" ? theme.primary : theme.text + "70"} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: activeTab === "recent" ? theme.primary : theme.text + "70" }
              ]}
            >
              Recent
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === "saved" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => handleTabChange("saved")}
          >
            <Ionicons 
              name="bookmark" 
              size={20} 
              color={activeTab === "saved" ? theme.primary : theme.text + "70"} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: activeTab === "saved" ? theme.primary : theme.text + "70" }
              ]}
            >
              Saved
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.tabContent}>
          {activeTab === "map" && (
            <View style={styles.mapTabContent}>
              <View style={styles.searchHeader}>
                <Text style={[styles.greeting, { color: theme.text + "80" }]}>Hello, {user?.displayName || "User"}!</Text>
                <Text style={[styles.question, { color: theme.text }]}>What errand do you need done?</Text>
              </View>

              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenErrandModal}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.requestButtonText}>Request New Errand</Text>
              </TouchableOpacity>

              <View style={[styles.codeContainer, { backgroundColor: theme.secondary + '30' }]}>
                <Text style={[styles.codeTitle, { color: theme.text }]}>Have a transaction code?</Text>
                <View style={styles.codeInputContainer}>
                  <TextInput
                    style={[
                      styles.codeInput,
                      { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                    ]}
                    placeholder="Enter 6-character code"
                    placeholderTextColor={theme.text + "50"}
                    maxLength={6}
                    autoCapitalize="characters"
                    value={transactionCode}
                    onChangeText={setTransactionCode}
                  />
                  <TouchableOpacity
                    style={[styles.codeButton, { backgroundColor: theme.primary }]}
                    onPress={handleLookupTransactionCode}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.codeButtonText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => handleQuickActionPress("shopping")}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary + '50' }]}>
                    <Ionicons name="cart" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>Shopping</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => handleQuickActionPress("food")}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary + '50' }]}>
                    <Ionicons name="fast-food" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>Food</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => handleQuickActionPress("documents")}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary + '50' }]}>
                    <Ionicons name="document-text" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>Documents</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickAction}
                  onPress={() => handleQuickActionPress("pharmacy")}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary + '50' }]}>
                    <Ionicons name="medkit" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>Pharmacy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {activeTab === "recent" && (
            <View style={styles.recentTabContent}>
              <View style={styles.recentHeader}>
                <Text style={[styles.recentTitle, { color: theme.text }]}>Recent Errands</Text>
                <TouchableOpacity>
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {recentErrands.length > 0 ? (
                recentErrands.map((errand) => (
                  <TouchableOpacity 
                    key={errand.id}
                    style={[styles.recentErrandItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleRecentErrandPress(errand)}
                  >
                    <View style={styles.recentErrandHeader}>
                      <View style={styles.recentErrandType}>
                        <Ionicons 
                          name={getIconForErrandType(errand.errandType)} 
                          size={18} 
                          color={theme.primary} 
                        />
                        <Text style={[styles.recentErrandTypeText, { color: theme.text }]}>
                          {capitalizeFirst(errand.errandType)}
                        </Text>
                      </View>
                      
                      <View 
                        style={[
                          styles.recentErrandStatus, 
                          { backgroundColor: getStatusColor(errand.status) + '20' }
                        ]}
                      >
                        <Text 
                          style={[
                            styles.recentErrandStatusText, 
                            { color: getStatusColor(errand.status) }
                          ]}
                        >
                          {capitalizeFirst(errand.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.recentErrandLocations}>
                      <View style={styles.recentErrandLocation}>
                        <View style={[styles.locationDot, { backgroundColor: theme.primary }]} />
                        <Text 
                          style={[styles.recentErrandLocationText, { color: theme.text + '80' }]}
                          numberOfLines={1}
                        >
                          {errand.pickup}
                        </Text>
                      </View>
                      
                      <View style={styles.recentErrandLocation}>
                        <View style={[styles.locationDot, { backgroundColor: theme.accent || '#F44336' }]} />
                        <Text 
                          style={[styles.recentErrandLocationText, { color: theme.text + '80' }]}
                          numberOfLines={1}
                        >
                          {errand.dropoff}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.recentErrandFooter}>
                      <Text style={[styles.recentErrandDate, { color: theme.text + '60' }]}>
                        {formatDate(errand.createdAt)}
                      </Text>
                      
                      {errand.transactionCode && (
                        <Text style={[styles.recentErrandCode, { color: theme.primary }]}>
                          #{errand.transactionCode}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="time" size={50} color={theme.text + '30'} />
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No recent errands</Text>
                  <Text style={[styles.emptyStateText, { color: theme.text + '70' }]}>
                    Your recent errands will appear here
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                    onPress={handleOpenErrandModal}
                  >
                    <Text style={styles.emptyStateButtonText}>Request an Errand</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {activeTab === "saved" && (
            <View style={styles.savedTabContent}>
              <View style={styles.savedHeader}>
                <Text style={[styles.savedTitle, { color: theme.text }]}>Saved Locations</Text>
                <TouchableOpacity onPress={() => navigation.navigate("SavedLocations")}>
                  <Text style={[styles.viewAllText, { color: theme.primary }]}>Manage</Text>
                </TouchableOpacity>
              </View>
              
              {savedLocations.length > 0 ? (
                savedLocations.map((location) => (
                  <TouchableOpacity 
                    key={location.id}
                    style={[styles.savedLocationItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleSavedLocationSelect(location)}
                  >
                    <View 
                      style={[
                        styles.savedLocationIcon, 
                        { 
                          backgroundColor: location.type === "home" 
                            ? "#4CAF50" + '20' 
                            : location.type === "work" 
                              ? "#2196F3" + '20' 
                              : theme.primary + '20' 
                        }
                      ]}
                    >
                      <Ionicons 
                        name={location.icon} 
                        size={20} 
                        color={
                          location.type === "home" 
                            ? "#4CAF50" 
                            : location.type === "work" 
                              ? "#2196F3" 
                              : theme.primary
                        } 
                      />
                    </View>
                    
                    <View style={styles.savedLocationDetails}>
                      <Text style={[styles.savedLocationName, { color: theme.text }]}>
                        {location.name}
                      </Text>
                      <Text 
                        style={[styles.savedLocationAddress, { color: theme.text + '70' }]}
                        numberOfLines={1}
                      >
                        {location.address}
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.useLocationButton, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => handleSavedLocationSelect(location)}
                    >
                      <Text style={[styles.useLocationButtonText, { color: theme.primary }]}>Use</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="bookmark" size={50} color={theme.text + '30'} />
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No saved locations</Text>
                  <Text style={[styles.emptyStateText, { color: theme.text + '70' }]}>
                    Save locations for quick access
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate("SavedLocations")}
                  >
                    <Text style={styles.emptyStateButtonText}>Add Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* Errand Request Modal */}
      <Modal
        visible={isErrandModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseErrandModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View 
            style={[
              styles.modalOverlay,
              {
                transform: [
                  {
                    translateY: errandModalY
                  }
                ]
              }
            ]}
          >
            <Pressable 
              style={styles.modalBackdrop}
              onPress={handleCloseErrandModal}
            />
            
            <View style={[styles.errandModal, { backgroundColor: theme.card }]}>
              <View style={styles.errandModalHeader}>
                <TouchableOpacity
                  style={[styles.backButton, { backgroundColor: theme.secondary + '50' }]}
                  onPress={handleCloseErrandModal}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.errandTitle, { color: theme.text }]}>Request an Errand</Text>
                <View style={{ width: 40 }} />
              </View>
              
              <ScrollView style={styles.errandModalContent}>
                <View style={styles.errandTypes}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.errandTypeScroll}
                  >
                    {renderErrandTypeButton("shopping", "Shopping", "cart")}
                    {renderErrandTypeButton("food", "Food", "fast-food")}
                    {renderErrandTypeButton("documents", "Documents", "document-text")}
                    {renderErrandTypeButton("pharmacy", "Pharmacy", "medkit")}
                    {renderErrandTypeButton("other", "Other", "ellipsis-horizontal")}
                  </ScrollView>
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <View style={styles.dotContainer}>
                      <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
                    </View>
                    <View style={styles.inputWithButton}>
                      <TextInput
                        style={[
                          styles.input,
                          { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
                        ]}
                        placeholder="Pickup location"
                        placeholderTextColor={theme.text + "50"}
                        value={errandDetails.pickup}
                        onChangeText={(text) => setErrandDetails({ ...errandDetails, pickup: text })}
                      />
                      <TouchableOpacity 
                        style={[styles.locationButton, { backgroundColor: theme.primary }]}
                        onPress={() => setIsPickingLocation("pickup")}
                      >
                        <Ionicons name="locate" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.dotContainer}>
                      <View style={[styles.redDot, { backgroundColor: theme.accent || '#F44336' }]} />
                    </View>
                    <View style={styles.inputWithButton}>
                      <TextInput
                        style={[
                          styles.input,
                          { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
                        ]}
                        placeholder="Dropoff location"
                        placeholderTextColor={theme.text + "50"}
                        value={errandDetails.dropoff}
                        onChangeText={(text) => setErrandDetails({ ...errandDetails, dropoff: text })}
                      />
                      <TouchableOpacity 
                        style={[styles.locationButton, { backgroundColor: theme.primary }]}
                        onPress={() => setIsPickingLocation("dropoff")}
                      >
                        <Ionicons name="locate" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.descriptionContainer}>
                  <Text style={[styles.descriptionLabel, { color: theme.text }]}>Errand Description</Text>
                  <TextInput
                    style={[
                      styles.descriptionInput,
                      { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
                    ]}
                    placeholder="Describe what you need done in detail..."
                    placeholderTextColor={theme.text + "50"}
                    multiline
                    numberOfLines={4}
                    value={errandDetails.description}
                    onChangeText={(text) => setErrandDetails({ ...errandDetails, description: text })}
                  />
                </View>
                
                {/* Items section */}
                <View style={styles.itemsContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Items</Text>
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => setShowAddItemModal(true)}
                    >
                      <Ionicons name="add" size={18} color={theme.primary} />
                      <Text style={[styles.addButtonText, { color: theme.primary }]}>Add Item</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {errandDetails.items && errandDetails.items.length > 0 ? (
                    <View style={styles.itemsList}>
                      {errandDetails.items.map((item, index) => (
                        <View 
                          key={index} 
                          style={[styles.itemRow, { borderBottomColor: theme.border }]}
                        >
                          <View style={styles.itemInfo}>
                            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.itemQuantity, { color: theme.text + '70' }]}>
                              Qty: {item.quantity}
                            </Text>
                          </View>
                          
                          <View style={styles.itemActions}>
                            {item.price !== undefined && (
                              <Text style={[styles.itemPrice, { color: theme.primary }]}>
                                ${item.price.toFixed(2)}
                              </Text>
                            )}
                            
                            <TouchableOpacity 
                              style={styles.removeItemButton}
                              onPress={() => handleRemoveItem(index)}
                            >
                              <Ionicons name="close-circle" size={22} color={theme.accent || '#F44336'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.emptyItems, { backgroundColor: theme.background }]}>
                      <Text style={[styles.emptyItemsText, { color: theme.text + '70' }]}>
                        No items added yet
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Scheduling section */}
                <View style={styles.schedulingContainer}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Time</Text>
                    <TouchableOpacity 
                      style={[styles.scheduleButton, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => setShowScheduleModal(true)}
                    >
                      <Ionicons name="calendar" size={18} color={theme.primary} />
                      <Text style={[styles.scheduleButtonText, { color: theme.primary }]}>
                        {errandDetails.scheduledTime ? 'Change' : 'Schedule'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {errandDetails.scheduledTime ? (
                    <View style={[styles.scheduledTimeContainer, { backgroundColor: theme.background }]}>
                      <Ionicons name="time" size={20} color={theme.primary} />
                      <Text style={[styles.scheduledTimeText, { color: theme.text }]}>
                        {formatScheduledTime(errandDetails.scheduledTime)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.defaultTimeContainer, { backgroundColor: theme.background }]}>
                      <Ionicons name="flash" size={20} color="#FF9800" />
                      <Text style={[styles.defaultTimeText, { color: theme.text }]}>
                        As soon as possible
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Priority section */}
                <View style={styles.priorityContainer}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Priority</Text>
                  
                  <View style={styles.priorityOptions}>
                    <TouchableOpacity
                      style={[
                        styles.priorityOption,
                        errandDetails.priority === "normal" && styles.selectedPriorityOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: errandDetails.priority === "normal" ? theme.primary + '20' : theme.background,
                        },
                      ]}
                      onPress={() => setErrandDetails({ ...errandDetails, priority: "normal" })}
                    >
                      <Ionicons 
                        name="bicycle" 
                        size={24} 
                        color={errandDetails.priority === "normal" ? theme.primary : theme.text + "80"} 
                      />
                      <View style={styles.priorityOptionContent}>
                        <Text
                          style={[
                            styles.priorityOptionTitle,
                            { color: errandDetails.priority === "normal" ? theme.primary : theme.text },
                          ]}
                        >
                          Normal
                        </Text>
                        <Text
                          style={[
                            styles.priorityOptionDescription,
                            { color: theme.text + "70" },
                          ]}
                        >
                          Standard delivery
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.priorityOptionPrice,
                          { color: errandDetails.priority === "normal" ? theme.primary : theme.text },
                        ]}
                      >
                        Base price
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.priorityOption,
                        errandDetails.priority === "express" && styles.selectedPriorityOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: errandDetails.priority === "express" ? "#FF9800" + '20' : theme.background,
                        },
                      ]}
                      onPress={() => setErrandDetails({ ...errandDetails, priority: "express" })}
                    >
                      <Ionicons 
                        name="flash" 
                        size={24} 
                        color={errandDetails.priority === "express" ? "#FF9800" : theme.text + "80"} 
                      />
                      <View style={styles.priorityOptionContent}>
                        <Text
                          style={[
                            styles.priorityOptionTitle,
                            { color: errandDetails.priority === "express" ? "#FF9800" : theme.text },
                          ]}
                        >
                          Express
                        </Text>
                        <Text
                          style={[
                            styles.priorityOptionDescription,
                            { color: theme.text + "70" },
                          ]}
                        >
                          Priority handling
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.priorityOptionPrice,
                          { color: errandDetails.priority === "express" ? "#FF9800" : theme.text },
                        ]}
                      >
                        +$5.00
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Estimated price and time */}
                {(estimatedTime !== null || estimatedDistance !== null) && (
                  <View style={[styles.estimatesContainer, { backgroundColor: theme.secondary + '30' }]}>
                      { backgroundColor: theme.secondary + '30' }]}>
                    <View style={styles.estimateRow}>
                      {estimatedDistance !== null && (
                        <View style={styles.estimateItem}>
                          <Ionicons name="navigate" size={18} color={theme.primary} />
                          <Text style={[styles.estimateText, { color: theme.text }]}>
                            {estimatedDistance} km
                          </Text>
                        </View>
                      )}
                      
                      {estimatedTime !== null && (
                        <View style={styles.estimateItem}>
                          <Ionicons name="time" size={18} color={theme.primary} />
                          <Text style={[styles.estimateText, { color: theme.text }]}>
                            ~{estimatedTime} min
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <View style={[styles.priceEstimate, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                  <Text style={[styles.priceLabel, { color: theme.text }]}>Estimated Price</Text>
                  <Text style={[styles.priceValue, { color: theme.primary }]}>
                    ${calculatePrice()}
                  </Text>
                </View>

                <View style={styles.paymentMethod}>
                  <Text style={[styles.paymentLabel, { color: theme.text }]}>Payment Method</Text>
                  <View style={styles.paymentOptions}>
                    <TouchableOpacity
                      style={[
                        styles.paymentOption,
                        errandDetails.paymentMethod === "cash" && styles.selectedPaymentOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: errandDetails.paymentMethod === "cash" ? theme.secondary + '50' : theme.background,
                        },
                      ]}
                      onPress={() => setErrandDetails({ ...errandDetails, paymentMethod: "cash" })}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={20}
                        color={errandDetails.paymentMethod === "cash" ? theme.primary : theme.text + "80"}
                      />
                      <Text
                        style={[
                          styles.paymentOptionText,
                          {
                            color: errandDetails.paymentMethod === "cash" ? theme.primary : theme.text,
                          },
                        ]}
                      >
                        Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentOption,
                        errandDetails.paymentMethod === "card" && styles.selectedPaymentOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: errandDetails.paymentMethod === "card" ? theme.secondary + '50' : theme.background,
                        },
                      ]}
                      onPress={() => setErrandDetails({ ...errandDetails, paymentMethod: "card" })}
                    >
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={errandDetails.paymentMethod === "card" ? theme.primary : theme.text + "80"}
                      />
                      <Text
                        style={[
                          styles.paymentOptionText,
                          {
                            color: errandDetails.paymentMethod === "card" ? theme.primary : theme.text,
                          },
                        ]}
                      >
                        Card
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Add some space at the bottom for better scrolling */}
                <View style={{ height: 100 }} />
              </ScrollView>
              
              <View style={[styles.errandModalFooter, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.requestErrandButton, { backgroundColor: theme.primary }]}
                  onPress={handleRequestErrand}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.requestErrandButtonText}>Request Errand</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      
      {renderAddItemModal()}
      {renderScheduleModal()}
      {renderSuccessAnimation()}
    </SafeAreaView>
  )
}

// Helper function to calculate price based on errand details
const calculatePrice = () => {
  // Base price
  let price = 10
  
  // Add express fee if applicable
  if (errandDetails.priority === "express") {
    price += 5
  }
  
  // Add estimated price range
  return `${price.toFixed(2)}-${(price + 5).toFixed(2)}`
}

// Helper function to get icon for errand type
const getIconForErrandType = (type: string): string => {
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

// Helper function to get color for status
const getStatusColor = (status: string): string => {
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

// Helper function to capitalize first letter
const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  
  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // If yesterday, show "Yesterday"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // Otherwise show date
  return date.toLocaleDateString()
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: "100%",
    height: "100%",
  },
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pickingLocationContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  pickingLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pickingLocationText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 10,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  tabContent: {
    flex: 1,
  },
  mapTabContent: {
    padding: 20,
  },
  recentTabContent: {
    padding: 20,
  },
  savedTabContent: {
    padding: 20,
  },
  searchHeader: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
  },
  question: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  requestButton: {
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  requestButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 10,
  },
  codeContainer: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  codeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  codeInput: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 16,
    borderWidth: 1,
  },
  codeButton: {
    height: 45,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  codeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAction: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentErrandItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  recentErrandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentErrandType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentErrandTypeText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  recentErrandStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  recentErrandStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentErrandLocations: {
    marginBottom: 10,
  },
  recentErrandLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  recentErrandLocationText: {
    fontSize: 14,
  },
  recentErrandFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentErrandDate: {
    fontSize: 12,
  },
  recentErrandCode: {
    fontSize: 12,
    fontWeight: '600',
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  savedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  savedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  savedLocationDetails: {
    flex: 1,
  },
  savedLocationName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  savedLocationAddress: {
    fontSize: 14,
  },
  useLocationButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  useLocationButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errandModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  errandModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  errandModalContent: {
    padding: 20,
  },
  errandModalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errandTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  errandTypes: {
    marginBottom: 20,
  },
  errandTypeScroll: {
    paddingRight: 20,
  },
  errandTypeButton: {
    alignItems: "center",
    marginRight: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedErrandType: {
    borderColor: "#34D186",
  },
  errandTypeText: {
    fontSize: 12,
    marginTop: 5,
  },
  selectedErrandTypeText: {
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dotContainer: {
    width: 30,
    alignItems: "center",
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inputWithButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  descriptionInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingTop: 15,
    fontSize: 16,
    textAlignVertical: "top",
  },
  itemsContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  itemsList: {
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  itemQuantity: {
    fontSize: 13,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 10,
  },
  removeItemButton: {
    padding: 5,
  },
  emptyItems: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 14,
  },
  schedulingContainer: {
    marginBottom: 20,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scheduleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  scheduledTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  scheduledTimeText: {
    fontSize: 14,
    marginLeft: 10,
  },
  defaultTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  defaultTimeText: {
    fontSize: 14,
    marginLeft: 10,
  },
  priorityContainer: {
    marginBottom: 20,
  },
  priorityOptions: {
    marginTop: 10,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  selectedPriorityOption: {
    borderColor: '#34D186',
  },
  priorityOptionContent: {
    flex: 1,
    marginLeft: 10,
  },
  priorityOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  priorityOptionDescription: {
    fontSize: 13,
  },
  priorityOptionPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  estimatesContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimateText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  priceEstimate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentMethod: {
    marginBottom: 20,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  paymentOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  selectedPaymentOption: {
    borderColor: "#34D186",
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  requestErrandButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  requestErrandButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 15,
  },
  modalButton: {
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 10,
  },
  timeOptions: {
    marginBottom: 15,
  },
  timeOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  selectedTimeOption: {
    borderColor: '#34D186',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  selectedTimeText: {
    fontSize: 14,
    marginLeft: 10,
  },
  successAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 100,
  },
  successAnimation: {
    width: 150,
    height: 150,
  },
  successText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
})

// Dark mode map style
const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#212121",
      },
    ],
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#bdbdbd",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#181818",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#1b1b1b",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#2c2c2c",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#8a8a8a",
      },
    ],
  },
  {
    featureType: "road.