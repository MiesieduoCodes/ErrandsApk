"use client"

import { useState, useEffect, useRef } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image, 
  Alert,
  Animated,
  Dimensions,
  Linking,
  Share,
  Platform,
  Modal
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { errandService } from "../services/database"
import { notificationService } from "../services/notification"
import { formatDistance } from "../utils/location"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Haptics from 'expo-haptics'
// If lottie-react-native is not installed, you'll need to install it:
// npm install lottie-react-native
import LottieView from "lottie-react-native"
import { BlurView } from "expo-blur"

// Define the route param types
type RootStackParamList = {
  ErrandDetails: { errandId: string }
  Chat: { chatId: string }
  UserProfile: { userId: string }
  PaymentDetails: { paymentId: string }
}

type ErrandDetailsRouteProp = RouteProp<RootStackParamList, 'ErrandDetails'>

// Define the Errand type
interface Errand {
  id: string
  errandType: string
  description: string
  pickup: string
  dropoff: string
  status: string
  priceEstimate: number
  distance: number
  createdAt: string
  requesterId: string
  runnerId?: string
  requesterName?: string
  runnerName?: string
  requesterPhoto?: string
  runnerPhoto?: string
  estimatedTime?: number
  items?: Array<{
    name: string
    quantity: number
    price?: number
  }>
  paymentId?: string
  pickupCoordinates?: {
    latitude: number
    longitude: number
  }
  dropoffCoordinates?: {
    latitude: number
    longitude: number
  }
}

// Define status history type
interface StatusHistoryItem {
  status: string
  timestamp: string
}

// Status colors
const STATUS_COLORS = {
  pending: "#FF9800",
  accepted: "#2196F3",
  started: "#9C27B0",
  completed: "#4CAF50",
  cancelled: "#F44336"
}

const { width } = Dimensions.get('window')

const ErrandDetailsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<ErrandDetailsRouteProp>()
  const { errandId } = route.params

  const [errand, setErrand] = useState<Errand | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([])
  const [isUserRequester, setIsUserRequester] = useState(false)
  const [isUserRunner, setIsUserRunner] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<string>('')
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const mapHeight = useRef(new Animated.Value(0)).current
  const lottieRef = useRef<LottieView>(null)

  useEffect(() => {
    loadErrand()
  }, [errandId])
  
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start()
  }, [errand])
  
  useEffect(() => {
    // Animate map height
    Animated.timing(mapHeight, {
      toValue: showMap ? 200 : 0,
      duration: 300,
      useNativeDriver: false
    }).start()
  }, [showMap])

  const loadErrand = async () => {
    try {
      setIsLoading(true)
      const errandData = await errandService.getErrandById(errandId)
      setErrand(errandData as Errand)
      
      // Check if current user is requester or runner
      if (user) {
        setIsUserRequester(errandData.requesterId === user.id)
        setIsUserRunner(errandData.runnerId === user.id)
      }
      
      // Load status history
      // If getErrandStatusHistory doesn't exist in your service, you'll need to implement it
      // For now, let's create a mock history based on the current status
      try {
        // Try to use the service method if it exists
        // Fallback to create a mock history since getErrandStatusHistory does not exist
        const mockHistory: StatusHistoryItem[] = [
          { status: 'pending', timestamp: errandData.createdAt }
        ]
        
        if (errandData.status !== 'pending') {
          mockHistory.push({
            status: errandData.status,
            timestamp: new Date().toISOString()
          })
        }
        
        setStatusHistory(mockHistory)
      } catch (error) {
        // Fallback to create a mock history
        const mockHistory: StatusHistoryItem[] = [
          { status: 'pending', timestamp: errandData.createdAt }
        ]
        
        if (errandData.status !== 'pending') {
          mockHistory.push({
            status: errandData.status,
            timestamp: new Date().toISOString()
          })
        }
        
        setStatusHistory(mockHistory)
      }
    } catch (error) {
      console.error("Error loading errand:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const updateErrandStatus = async (newStatus: string) => {
    if (!errand || !user) return
    
    try {
      setIsUpdating(true)
      
      // Update errand status
      // Make sure updateErrandStatus has the correct parameters
      // If it requires userId, add it as the first parameter
      if (user.id) {
        await errandService.updateErrandStatus(user.id, errandId, newStatus)
      } else {
        // Fallback if the method signature is different
        await errandService.updateErrandStatus(user.id, errandId, newStatus)
      }
      
      // Send notification to the other party
      const recipientId = isUserRequester ? errand.runnerId : errand.requesterId
      
      if (recipientId) {
        await notificationService.sendErrandStatusNotification(
          errandId,
          newStatus,
          user.id,
          recipientId
        )
      }
      
      // Update local state
      setErrand({...errand, status: newStatus})
      
      // Add to status history
      setStatusHistory([
        ...statusHistory,
        {status: newStatus, timestamp: new Date().toISOString()}
      ])
      
      // Show success animation
      if (lottieRef.current) {
        lottieRef.current.play()
      }
      
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      
    } catch (error) {
      console.error("Error updating errand status:", error)
      Alert.alert("Error", "Failed to update errand status")
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleStatusUpdate = (newStatus: string) => {
    setConfirmationAction(newStatus)
    setShowConfirmation(true)
  }
  
  const confirmStatusUpdate = () => {
    updateErrandStatus(confirmationAction)
    setShowConfirmation(false)
  }
  
  const cancelStatusUpdate = () => {
    setShowConfirmation(false)
    setConfirmationAction('')
  }
  
  const getStatusActionButton = () => {
    if (!errand || (!isUserRequester && !isUserRunner)) return null
    
    const { status } = errand
    
    if (isUserRequester) {
      if (status === 'pending') {
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: STATUS_COLORS.cancelled }]}
            onPress={() => handleStatusUpdate('cancelled')}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel Errand</Text>
          </TouchableOpacity>
        )
      } else if (status === 'completed') {
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (errand.paymentId) {
                navigation.navigate('PaymentDetails', { paymentId: errand.paymentId })
              } else {
                Alert.alert("No Payment", "No payment information available for this errand")
              }
            }}
          >
            <Ionicons name="card" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>View Payment</Text>
          </TouchableOpacity>
        )
      }
    }
    
    if (isUserRunner) {
      if (status === 'pending') {
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: STATUS_COLORS.accepted }]}
            onPress={() => handleStatusUpdate('accepted')}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Accept Errand</Text>
          </TouchableOpacity>
        )
      } else if (status === 'accepted') {
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: STATUS_COLORS.started }]}
            onPress={() => handleStatusUpdate('started')}
          >
            <Ionicons name="play-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Start Errand</Text>
          </TouchableOpacity>
        )
      } else if (status === 'started') {
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: STATUS_COLORS.completed }]}
            onPress={() => handleStatusUpdate('completed')}
          >
            <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Complete Errand</Text>
          </TouchableOpacity>
        )
      }
    }
    
    return null
  }
  
  const getStatusSteps = () => {
    const steps = [
      { status: 'pending', label: 'Requested', icon: 'create-outline' },
      { status: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
      { status: 'started', label: 'In Progress', icon: 'bicycle-outline' },
      { status: 'completed', label: 'Completed', icon: 'checkmark-done-outline' }
    ]
    
    if (!errand) return steps
    
    // If cancelled, show different steps
    if (errand.status === 'cancelled') {
      return [
        { status: 'pending', label: 'Requested', icon: 'create-outline' },
        { status: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' }
      ]
    }
    
    return steps
  }
  
  const getCurrentStepIndex = () => {
    if (!errand) return 0
    
    const steps = getStatusSteps()
    const currentIndex = steps.findIndex(step => step.status === errand.status)
    return currentIndex >= 0 ? currentIndex : 0
  }
  
  const handleContactPress = () => {
    if (!errand) return
    
    const contactId = isUserRequester ? errand.runnerId : errand.requesterId
    const contactName = isUserRequester ? errand.runnerName : errand.requesterName
    
    if (!contactId) {
      if (errand.status === 'pending') {
        Alert.alert("No Runner", "This errand hasn't been accepted by a runner yet")
      } else {
        Alert.alert("Error", "Contact information not available")
      }
      return
    }
    
    Alert.alert(
      `Contact ${contactName}`,
      "Choose how you want to contact",
      [
        {
          text: "Message",
          onPress: () => {
            // Navigate to chat with this user
            navigation.navigate("Chat", { chatId: `${user?.id}_${contactId}` })
          }
        },
        {
          text: "View Profile",
          onPress: () => {
            navigation.navigate("UserProfile", { userId: contactId })
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    )
  }
  
  const handleShareErrand = async () => {
    if (!errand) return
    
    try {
      await Share.share({
        message: `Check out this errand: ${errand.errandType} from ${errand.pickup} to ${errand.dropoff}. Price estimate: $${errand.priceEstimate.toFixed(2)}`,
        title: 'Share Errand'
      })
    } catch (error) {
      console.error("Error sharing errand:", error)
    }
  }
  
  const handleOpenMaps = (location: string, coordinates?: {latitude: number, longitude: number}) => {
    if (coordinates) {
      const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:'
      const url = Platform.OS === 'ios' 
        ? `${scheme}?q=${coordinates.latitude},${coordinates.longitude}` 
        : `${scheme}${coordinates.latitude},${coordinates.longitude}`
      
      Linking.openURL(url).catch(err => {
        console.error('Error opening maps:', err)
        Alert.alert('Error', 'Could not open maps application')
      })
    } else {
      const encodedLocation = encodeURIComponent(location)
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`
      
      Linking.openURL(url).catch(err => {
        console.error('Error opening maps:', err)
        Alert.alert('Error', 'Could not open maps application')
      })
    }
  }
  
  const renderStatusConfirmation = () => {
    if (!showConfirmation) return null
    
    const getConfirmationMessage = () => {
      switch (confirmationAction) {
        case 'accepted':
          return "Are you sure you want to accept this errand? You'll be responsible for completing it."
        case 'started':
          return "Are you sure you want to mark this errand as started? This will notify the requester."
        case 'completed':
          return "Are you sure you want to mark this errand as completed? This will finalize the errand."
        case 'cancelled':
          return "Are you sure you want to cancel this errand? This action cannot be undone."
        default:
          return "Are you sure you want to update the status of this errand?"
      }
    }
    
    const getConfirmationColor = () => {
      return STATUS_COLORS[confirmationAction as keyof typeof STATUS_COLORS] || theme.primary
    }
    
    return (
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelStatusUpdate}
      >
        <BlurView intensity={80} style={styles.confirmationContainer} tint={isDark ? "dark" : "light"}>
          <View style={[styles.confirmationContent, { backgroundColor: theme.card }]}>
            <View style={[styles.confirmationHeader, { backgroundColor: getConfirmationColor() }]}>
              <Text style={styles.confirmationTitle}>Confirm Status Update</Text>
            </View>
            
            <Text style={[styles.confirmationMessage, { color: theme.text }]}>
              {getConfirmationMessage()}
            </Text>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={[styles.confirmationButton, { borderColor: theme.border }]}
                onPress={cancelStatusUpdate}
              >
                <Text style={[styles.confirmationButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmationButton, { backgroundColor: getConfirmationColor() }]}
                onPress={confirmStatusUpdate}
              >
                <Text style={styles.confirmationButtonTextPrimary}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    )
  }
  
  const renderStatusHistory = () => {
    if (!showStatusHistory || statusHistory.length === 0) return null
    
    return (
      <Modal
        visible={showStatusHistory}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusHistory(false)}
      >
        <BlurView intensity={80} style={styles.historyContainer} tint={isDark ? "dark" : "light"}>
          <View style={[styles.historyContent, { backgroundColor: theme.card }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>Status History</Text>
              <TouchableOpacity onPress={() => setShowStatusHistory(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.historyList}>
              {statusHistory.map((item: StatusHistoryItem, index: number) => (
                <View key={index} style={styles.historyItem}>
                  <View style={[styles.historyDot, { backgroundColor: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || theme.primary }]} />
                  <View style={styles.historyItemContent}>
                    <Text style={[styles.historyStatus, { color: theme.text }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                    <Text style={[styles.historyTime, { color: theme.text + '70' }]}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    )
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <LottieView
          source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_usmfx6bp.json' }}
          style={styles.loadingAnimation}
          autoPlay
          loop
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading errand details...</Text>
      </View>
    )
  }

  if (!errand) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Errand Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <LottieView
            source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_qm8ief3i.json' }}
            style={styles.emptyAnimation}
            autoPlay
            loop
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Errand not found</Text>
          <Text style={[styles.emptyText, { color: theme.text + '70' }]}>
            The errand you're looking for doesn't exist or has been deleted
          </Text>
          <TouchableOpacity 
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Errand Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShareErrand}>
            <Ionicons name="share-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Animated.View 
          style={[
            styles.statusCard, 
            { 
              backgroundColor: STATUS_COLORS[errand.status as keyof typeof STATUS_COLORS] || theme.primary,
              opacity: fadeAnim
            }
          ]}
        >
          <View style={styles.statusCardContent}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusText}>
              {errand.status.charAt(0).toUpperCase() + errand.status.slice(1)}
            </Text>
            
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={() => setShowStatusHistory(true)}
            >
              <Text style={styles.historyButtonText}>View History</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusIconContainer}>
            <LottieView
              ref={lottieRef}
              source={{ 
                uri: errand.status === 'completed' 
                  ? 'https://assets1.lottiefiles.com/packages/lf20_jbrw3hcz.json' // Success animation
                  : errand.status === 'cancelled'
                  ? 'https://assets9.lottiefiles.com/packages/lf20_qpwbiyxf.json' // Cancel animation
                  : 'https://assets3.lottiefiles.com/packages/lf20_x62chJ.json' // In progress animation
              }}
              style={styles.statusAnimation}
              autoPlay={errand.status === 'completed' || errand.status === 'cancelled'}
              loop={!(errand.status === 'completed' || errand.status === 'cancelled')}
            />
          </View>
        </Animated.View>
        
        <View style={styles.progressContainer}>
          {getStatusSteps().map((step, index) => {
            const isActive = index <= getCurrentStepIndex()
            const isLast = index === getStatusSteps().length - 1
            
            return (
              <View key={index} style={styles.progressStep}>
                <View 
                  style={[
                    styles.progressDot, 
                    { 
                      backgroundColor: isActive 
                        ? STATUS_COLORS[errand.status as keyof typeof STATUS_COLORS] || theme.primary
                        : theme.text + '30'
                    }
                  ]}
                >
                  <Ionicons name={step.icon as any} size={16} color="#fff" />
                </View>
                
                <Text 
                  style={[
                    styles.progressLabel, 
                    { 
                      color: isActive ? theme.text : theme.text + '50',
                      fontWeight: isActive ? '600' : '400'
                    }
                  ]}
                >
                  {step.label}
                </Text>
                
                {!isLast && (
                  <View 
                    style={[
                      styles.progressLine, 
                      { 
                        backgroundColor: index < getCurrentStepIndex() 
                          ? STATUS_COLORS[errand.status as keyof typeof STATUS_COLORS] || theme.primary
                          : theme.text + '30'
                      }
                    ]} 
                  />
                )}
              </View>
            )
          })}
        </View>

        <Animated.View 
          style={[
            styles.detailContainer, 
            { 
              backgroundColor: theme.card, 
              borderColor: theme.border,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>
              {errand.errandType.charAt(0).toUpperCase() + errand.errandType.slice(1)} Errand
            </Text>
            
            <View 
              style={[
                styles.errandTypeBadge, 
                { backgroundColor: theme.primary + '20' }
              ]}
            >
              <Text style={[styles.errandTypeBadgeText, { color: theme.primary }]}>
                {errand.errandType}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.detailDescription, { color: theme.text + "80" }]}>{errand.description}</Text>

          <View style={styles.locationContainer}>
            <View style={styles.locationIcons}>
              <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
              <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
              <View style={[styles.redDot, { backgroundColor: theme.accent || '#F44336' }]} />
            </View>

            <View style={styles.locationTexts}>
              <TouchableOpacity 
                style={styles.locationTextContainer}
                onPress={() => handleOpenMaps(errand.pickup, errand.pickupCoordinates)}
              >
                <Text style={[styles.locationText, { color: theme.text }]}>{errand.pickup}</Text>
                <Ionicons name="navigate-circle-outline" size={18} color={theme.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.locationTextContainer}
                onPress={() => handleOpenMaps(errand.dropoff, errand.dropoffCoordinates)}
              >
                <Text style={[styles.locationText, { color: theme.text }]}>{errand.dropoff}</Text>
                <Ionicons name="navigate-circle-outline" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.mapToggle, { borderColor: theme.border }]}
            onPress={() => setShowMap(!showMap)}
          >
            <Text style={[styles.mapToggleText, { color: theme.primary }]}>
              {showMap ? 'Hide Map' : 'Show Map'}
            </Text>
            <Ionicons 
              name={showMap ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              color={theme.primary} 
            />
          </TouchableOpacity>
          
          <Animated.View style={[styles.mapContainer, { height: mapHeight }]}>
            {showMap && errand.pickupCoordinates && errand.dropoffCoordinates && (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: (errand.pickupCoordinates.latitude + errand.dropoffCoordinates.latitude) / 2,
                  longitude: (errand.pickupCoordinates.longitude + errand.dropoffCoordinates.longitude) / 2,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={errand.pickupCoordinates}
                  title="Pickup"
                  description={errand.pickup}
                  pinColor="green"
                />
                <Marker
                  coordinate={errand.dropoffCoordinates}
                  title="Dropoff"
                  description={errand.dropoff}
                  pinColor="red"
                />
              </MapView>
            )}
          </Animated.View>

          <View style={styles.detailsGrid}>
            <View style={[styles.detailItem, { borderColor: theme.border }]}>
              <View style={[styles.detailItemIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="cash-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.detailItemLabel, { color: theme.text + '70' }]}>Price</Text>
              <Text style={[styles.detailItemValue, { color: theme.text }]}>
                ${errand.priceEstimate.toFixed(2)}
              </Text>
            </View>
            
            <View style={[styles.detailItem, { borderColor: theme.border }]}>
              <View style={[styles.detailItemIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="navigate-outline" style={{ backgroundColor: theme.primary + '20' }} />
                <Ionicons name="navigate-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.detailItemLabel, { color: theme.text + '70' }]}>Distance</Text>
              <Text style={[styles.detailItemValue, { color: theme.text }]}>
                {formatDistance(errand.distance)}
              </Text>
            </View>
            
            <View style={[styles.detailItem, { borderColor: theme.border }]}>
              <View style={[styles.detailItemIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="time-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.detailItemLabel, { color: theme.text + '70' }]}>Est. Time</Text>
              <Text style={[styles.detailItemValue, { color: theme.text }]}>
                {errand.estimatedTime ? `${errand.estimatedTime} min` : 'N/A'}
              </Text>
            </View>
            
            <View style={[styles.detailItem, { borderColor: theme.border }]}>
              <View style={[styles.detailItemIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.detailItemLabel, { color: theme.text + '70' }]}>Created</Text>
              <Text style={[styles.detailItemValue, { color: theme.text }]}>
                {new Date(errand.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          {errand.items && errand.items.length > 0 && (
            <View style={styles.itemsContainer}>
              <Text style={[styles.itemsTitle, { color: theme.text }]}>Items</Text>
              
              {errand.items.map((item, index) => (
                <View key={index} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.itemQuantity, { color: theme.text + '70' }]}>x{item.quantity}</Text>
                  {item.price && (
                    <Text style={[styles.itemPrice, { color: theme.primary }]}>
                      ${item.price.toFixed(2)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.peopleContainer, 
            { 
              backgroundColor: theme.card, 
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
              })}]
            }
          ]}
        >
          <Text style={[styles.peopleTitle, { color: theme.text }]}>People</Text>
          
          <View style={styles.personRow}>
            <View style={styles.personImageContainer}>
              {errand.requesterPhoto ? (
                <Image source={{ uri: errand.requesterPhoto }} style={styles.personImage} />
              ) : (
                <View style={[styles.personImagePlaceholder, { backgroundColor: theme.primary + '30' }]}>
                  <Ionicons name="person" size={20} color={theme.primary} />
                </View>
              )}
            </View>
            
            <View style={styles.personInfo}>
              <Text style={[styles.personName, { color: theme.text }]}>
                {errand.requesterName || 'Unknown Requester'}
              </Text>
              <Text style={[styles.personRole, { color: theme.text + '70' }]}>Requester</Text>
            </View>
            
            {!isUserRequester && (
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: theme.primary }]}
                onPress={handleContactPress}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {errand.runnerId && (
            <View style={[styles.personRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={styles.personImageContainer}>
                {errand.runnerPhoto ? (
                  <Image source={{ uri: errand.runnerPhoto }} style={styles.personImage} />
                ) : (
                  <View style={[styles.personImagePlaceholder, { backgroundColor: theme.primary + '30' }]}>
                    <Ionicons name="bicycle" size={20} color={theme.primary} />
                  </View>
                )}
              </View>
              
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: theme.text }]}>
                  {errand.runnerName || 'Unknown Runner'}
                </Text>
                <Text style={[styles.personRole, { color: theme.text + '70' }]}>Runner</Text>
              </View>
              
              {!isUserRunner && (
                <TouchableOpacity 
                  style={[styles.contactButton, { backgroundColor: theme.primary }]}
                  onPress={handleContactPress}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  <Text style={styles.contactButtonText}>Contact</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
      
      {getStatusActionButton() && (
        <View style={[styles.actionContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          {getStatusActionButton()}
        </View>
      )}
      
      {renderStatusConfirmation()}
      {renderStatusHistory()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statusCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  historyButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusAnimation: {
    width: 60,
    height: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  progressStep: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    zIndex: 1,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressLine: {
    position: 'absolute',
    top: 15,
    right: '50%',
    left: '50%',
    height: 2,
    zIndex: 0,
  },
  detailContainer: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  errandTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errandTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailDescription: {
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 15,
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
    height: 30,
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
  locationTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    flex: 1,
  },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 15,
  },
  mapToggleText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  mapContainer: {
    overflow: 'hidden',
    marginBottom: 15,
    borderRadius: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
  },
  detailItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailItemLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 15,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  peopleContainer: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  peopleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  personImageContainer: {
    marginRight: 15,
  },
  personImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  personImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  personRole: {
    fontSize: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionContainer: {
    padding: 15,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmationContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmationHeader: {
    padding: 15,
    alignItems: 'center',
  },
  confirmationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confirmationMessage: {
    fontSize: 16,
    lineHeight: 24,
    padding: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  confirmationButtonText: {
    fontSize: 16,
  },
  confirmationButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    width: '90%',
    height: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyList: {
    flex: 1,
    padding: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
    marginRight: 10,
  },
  historyItemContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  historyTime: {
    fontSize: 14,
  },
})

export default ErrandDetailsScreen