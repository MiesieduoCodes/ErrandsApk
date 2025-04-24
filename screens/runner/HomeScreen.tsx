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
  FlatList,
  ActivityIndicator,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { runnerService, errandService, locationService, userService } from "../../services/database"
import OfflineIndicator from "../../components/OfflineIndicator"
import LiveTrackingMap from "../../components/LiveTrackingMap"
import OrderProgressTracker from "../../components/OrderProgressTracker"

const { width, height } = Dimensions.get("window")

const INITIAL_REGION = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

// Define types for our data structures
interface Coordinates {
  latitude: number
  longitude: number
}

interface LocationWithAddress {
  latitude: number
  longitude: number
  address: string
}

interface Errand {
  id: string
  buyerId: string
  runnerId?: string
  status: "pending" | "accepted" | "picked_up" | "on_the_way" | "delivered" | "completed"
  errandType: "shopping" | "food" | "documents" | "pharmacy" | "other"
  description: string
  pickup: string
  dropoff: string
  pickupLocation: LocationWithAddress
  dropoffLocation: LocationWithAddress
  priceEstimate: number
  transactionCode: string
  createdAt: string
  updatedAt: string
  distance?: number
}

interface Earnings {
  today: number
  week: number
  month: number
  total: number
  completedToday: number
  completedTotal: number
}

// Define navigation types
type RootStackParamList = {
  ErrandDetails: { errandId: string }
  Home: undefined
}

type NavigationProp = StackNavigationProp<RootStackParamList>

const RunnerHomeScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const mapRef = useRef<MapView | null>(null)

  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [transactionCode, setTransactionCode] = useState("")
  const [errandDetails, setErrandDetails] = useState<Errand | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [availableErrands, setAvailableErrands] = useState<Errand[]>([])
  const [pendingErrands, setPendingErrands] = useState<Errand[]>([])
  const [activeErrand, setActiveErrand] = useState<Errand | null>(null)
  const [buyerLocation, setBuyerLocation] = useState<Coordinates | null>(null)
  const [earnings, setEarnings] = useState<Earnings>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    completedToday: 0,
    completedTotal: 0,
  })
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const locationData = await Location.getCurrentPositionAsync({})
      setLocation(locationData)

      // Update user location in database
      if (user) {
        locationService.updateUserLocation(user.id, {
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        })
      }
    })()

    // Load runner data
    const loadRunnerData = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Check if runner is available
        const userData = await userService.getUserByFirebaseUid(user.id)
        setIsAvailable(userData?.isAvailable || false)

        // Load earnings
        const earningsData = await runnerService.getRunnerDailyEarnings(user.id)
        setEarnings(earningsData as Earnings)

        // Load pending errands
        const pendingErrandsData = await runnerService.getRunnerPendingErrands(user.id)
        setPendingErrands(pendingErrandsData as Errand[])

        // Check for active errand
        const activeErrandData = (pendingErrandsData as Errand[]).find((errand) =>
          ["accepted", "picked_up", "on_the_way"].includes(errand.status),
        )

        if (activeErrandData) {
          setActiveErrand(activeErrandData as Errand)
          // Fetch buyer location
          fetchBuyerLocation(activeErrandData.buyerId)
        }

        // Load available errands if location is available
        if (location) {
          const availableErrandsData = await runnerService.getAvailableErrands(
            user.id,
            location.coords.latitude,
            location.coords.longitude,
            10, // 10km radius
          )
          setAvailableErrands(availableErrandsData as Errand[])
        }
      } catch (error) {
        console.error("Error loading runner data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRunnerData()

    // Set up interval to refresh data
    const interval = setInterval(() => {
      if (location) {
        loadRunnerData()
      }
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [user, location])

  useEffect(() => {
    // If there's an active errand, set up location updates
    if (activeErrand && location && ["accepted", "picked_up", "on_the_way"].includes(activeErrand.status)) {
      // Update location every 10 seconds
      const interval = setInterval(() => {
        if (location && user) {
          locationService.updateUserLocation(user.id, {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          })
        }
      }, 10000)

      setRefreshInterval(interval)

      return () => clearInterval(interval)
    } else if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [activeErrand, location, user])

  const fetchBuyerLocation = async (buyerId: string) => {
    if (!buyerId) return

    try {
      const buyer = await userService.getUserByFirebaseUid(buyerId)
      if (buyer && buyer.location) {
        setBuyerLocation(buyer.location as Coordinates)
      }
    } catch (error) {
      console.error("Error fetching buyer location:", error)
    }
  }

  const handleSubmitCode = () => {
    if (transactionCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character code")
      return
    }

    // In a real app, you would validate this code against your backend
    const verifyCodeAsync = async () => {
      try {
        const errand = await errandService.getErrandByTransactionCode(transactionCode)

        if (errand && user) {
          const typedErrand = errand as Errand
          if (typedErrand.status === "pending") {
            // Accept the errand
            await runnerService.acceptErrand(typedErrand.id, user.id)
            Alert.alert("Success", `Errand with code ${transactionCode} accepted!`)
            setTransactionCode("")

            // Refresh pending errands
            const pendingErrandsData = await runnerService.getRunnerPendingErrands(user.id)
            setPendingErrands(pendingErrandsData as Errand[])

            // Set active errand
            const activeErrandData = (pendingErrandsData as Errand[]).find((e) => e.id === typedErrand.id)
            if (activeErrandData) {
              setActiveErrand(activeErrandData)
              fetchBuyerLocation(activeErrandData.buyerId)
            }
          } else if (typedErrand.runnerId === user.id) {
            // Navigate to errand details
            navigation.navigate("ErrandDetails", { errandId: typedErrand.id })
          } else {
            Alert.alert("Error", "This errand is already assigned to another runner.")
          }
        } else {
          Alert.alert("Error", "Invalid transaction code. Please check and try again.")
        }
      } catch (error) {
        console.error("Error verifying code:", error)
        Alert.alert("Error", "Failed to verify code. Please try again.")
      }
    }

    verifyCodeAsync()
  }

  const handleToggleAvailability = () => {
    const updateAvailabilityAsync = async () => {
      if (!user) return

      try {
        await runnerService.updateRunnerAvailability(user.id, !isAvailable)
        setIsAvailable(!isAvailable)

        if (!isAvailable) {
          Alert.alert("You're now available", "You'll receive errand requests in your area.")

          // Refresh available errands
          if (location) {
            const availableErrandsData = await runnerService.getAvailableErrands(
              user.id,
              location.coords.latitude,
              location.coords.longitude,
              10, // 10km radius
            )
            setAvailableErrands(availableErrandsData as Errand[])
          }
        } else {
          Alert.alert("You're now unavailable", "You won't receive new errand requests.")
        }
      } catch (error) {
        console.error("Error updating availability:", error)
        Alert.alert("Error", "Failed to update availability. Please try again.")
      }
    }

    updateAvailabilityAsync()
  }

  const handleAcceptErrand = (errand: Errand) => {
    const acceptErrandAsync = async () => {
      if (!user) return

      try {
        await runnerService.acceptErrand(errand.id, user.id)

        // Update errand details
        setErrandDetails(errand)

        // Refresh pending errands
        const pendingErrandsData = await runnerService.getRunnerPendingErrands(user.id)
        setPendingErrands(pendingErrandsData as Errand[])

        // Set active errand
        const activeErrandData = (pendingErrandsData as Errand[]).find((e) => e.id === errand.id)
        if (activeErrandData) {
          setActiveErrand(activeErrandData)
          fetchBuyerLocation(activeErrandData.buyerId)
        }

        // Remove from available errands
        setAvailableErrands(availableErrands.filter((e) => e.id !== errand.id))

        Alert.alert(
          "Errand Accepted",
          `You've accepted the ${errand.errandType} errand. Navigate to the pickup location.`,
          [{ text: "OK" }],
        )
      } catch (error) {
        console.error("Error accepting errand:", error)
        Alert.alert("Error", "Failed to accept errand. Please try again.")
      }
    }

    Alert.alert("Accept Errand", `Are you sure you want to accept this ${errand.errandType} errand?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Accept", onPress: acceptErrandAsync },
    ])
  }

  const handleUpdateErrandStatus = (newStatus: string) => {
    if (!activeErrand || !user) return

    const updateStatusAsync = async () => {
      try {
        await errandService.updateErrandStatus(activeErrand.id, newStatus, user.id)

        // Update active errand
        setActiveErrand({
          ...activeErrand,
          status: newStatus as Errand["status"],
        })

        // Show appropriate message
        let message = ""
        switch (newStatus) {
          case "picked_up":
            message = "You've marked the errand as picked up. Proceed to the dropoff location."
            break
          case "on_the_way":
            message = "You're now on the way to the dropoff location."
            break
          case "delivered":
            message = "You've marked the errand as delivered. Great job!"
            break
          case "completed":
            message = "Errand completed successfully!"
            setActiveErrand(null)
            break
        }

        Alert.alert("Status Updated", message)

        // Refresh pending errands
        const pendingErrandsData = await runnerService.getRunnerPendingErrands(user.id)
        setPendingErrands(pendingErrandsData as Errand[])

        // Refresh earnings if completed
        if (newStatus === "completed") {
          const earningsData = await runnerService.getRunnerDailyEarnings(user.id)
          setEarnings(earningsData as Earnings)
        }
      } catch (error) {
        console.error("Error updating errand status:", error)
        Alert.alert("Error", "Failed to update errand status. Please try again.")
      }
    }

    updateStatusAsync()
  }

  const renderErrandItem = ({ item }: { item: Errand }) => (
    <TouchableOpacity
      style={[styles.errandItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleAcceptErrand(item)}
    >
      <View style={styles.errandHeader}>
        <View style={styles.errandTypeContainer}>
          <Ionicons
            name={
              item.errandType === "shopping"
                ? "cart"
                : item.errandType === "food"
                  ? "fast-food"
                  : item.errandType === "documents"
                    ? "document-text"
                    : item.errandType === "pharmacy"
                      ? "medkit"
                      : "cube"
            }
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.errandType, { color: theme.text }]}>
            {item.errandType.charAt(0).toUpperCase() + item.errandType.slice(1)}
          </Text>
        </View>
        <Text style={[styles.errandPrice, { color: theme.primary }]}>₦{item.priceEstimate?.toFixed(2) || "0.00"}</Text>
      </View>

      <View style={styles.errandDetails}>
        <View style={styles.locationContainer}>
          <View style={styles.locationIcons}>
            <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
            <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
          </View>

          <View style={styles.locationTexts}>
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {item.pickup}
            </Text>
            <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
              {item.dropoff}
            </Text>
          </View>

          <Text style={[styles.distanceText, { color: theme.text + "80" }]}>
            {item.distance?.toFixed(1) || "0.0"} km
          </Text>
        </View>
      </View>

      <Text style={[styles.errandDescription, { color: theme.text + "80" }]} numberOfLines={2}>
        {item.description}
      </Text>

      <TouchableOpacity
        style={[styles.acceptButton, { backgroundColor: theme.primary }]}
        onPress={() => handleAcceptErrand(item)}
      >
        <Text style={styles.acceptButtonText}>Accept Errand</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderPendingErrandItem = ({ item }: { item: Errand }) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.pendingErrandItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate("ErrandDetails", { errandId: item.id })}
    >
      <View style={styles.pendingErrandHeader}>
        <View style={styles.errandTypeContainer}>
          <Ionicons
            name={
              item.errandType === "shopping"
                ? "cart"
                : item.errandType === "food"
                  ? "fast-food"
                  : item.errandType === "documents"
                    ? "document-text"
                    : item.errandType === "pharmacy"
                      ? "medkit"
                      : "cube"
            }
            size={20}
            color={theme.primary}
          />
          <Text style={[styles.errandType, { color: theme.text }]}>
            {item.errandType.charAt(0).toUpperCase() + item.errandType.slice(1)}
          </Text>
        </View>
        <View
          style={[
            styles.pendingErrandStatus,
            {
              backgroundColor: item.status === "accepted" ? "#2196F3" + "20" : "#9C27B0" + "20",
              borderColor: item.status === "accepted" ? "#2196F3" : "#9C27B0",
            },
          ]}
        >
          <Text style={[styles.pendingErrandStatusText, { color: item.status === "accepted" ? "#2196F3" : "#9C27B0" }]}>
            {item.status === "accepted" ? "Accepted" : item.status === "picked_up" ? "Picked Up" : "On The Way"}
          </Text>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <View style={styles.locationIcons}>
          <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
          <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
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

      <View style={styles.pendingErrandFooter}>
        <Text style={[styles.pendingErrandPrice, { color: theme.primary }]}>
          ₦{item.priceEstimate?.toFixed(2) || "0.00"}
        </Text>
        <Text style={[styles.pendingErrandCode, { color: theme.text + "80" }]}>Code: {item.transactionCode}</Text>
      </View>
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <OfflineIndicator />

      {activeErrand && ["accepted", "picked_up", "on_the_way"].includes(activeErrand.status) ? (
        // Show active errand view with live tracking
        <View style={styles.activeErrandContainer}>
          {/* Live Tracking Map */}
          <LiveTrackingMap
            pickupLocation={{
              ...activeErrand.pickupLocation,
              address: activeErrand.pickup,
            }}
            dropoffLocation={{
              ...activeErrand.dropoffLocation,
              address: activeErrand.dropoff,
            }}
            runnerLocation={
              location
                ? {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }
                : undefined
            }
            status={activeErrand.status}
            isRunner={true}
          />

          <View style={[styles.activeErrandOverlay, { backgroundColor: theme.background }]}>
            <View style={[styles.activeErrandCard, { backgroundColor: theme.card }]}>
              <View style={styles.activeErrandHeader}>
                <Text style={[styles.activeErrandTitle, { color: theme.text }]}>Active Errand</Text>
                <View
                  style={[
                    styles.activeErrandStatus,
                    {
                      backgroundColor:
                        activeErrand.status === "accepted"
                          ? "#2196F3" + "20"
                          : activeErrand.status === "picked_up"
                            ? "#9C27B0" + "20"
                            : activeErrand.status === "on_the_way"
                              ? "#9C27B0" + "20"
                              : "#4CAF50" + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.activeErrandStatusText,
                      {
                        color:
                          activeErrand.status === "accepted"
                            ? "#2196F3"
                            : activeErrand.status === "picked_up"
                              ? "#9C27B0"
                              : activeErrand.status === "on_the_way"
                                ? "#9C27B0"
                                : "#4CAF50",
                      },
                    ]}
                  >
                    {activeErrand.status === "accepted"
                      ? "Accepted"
                      : activeErrand.status === "picked_up"
                        ? "Picked Up"
                        : activeErrand.status === "on_the_way"
                          ? "On The Way"
                          : "Completed"}
                  </Text>
                </View>
              </View>

              {/* Order Progress Tracker */}
              <OrderProgressTracker status={activeErrand.status} />

              <View style={styles.activeErrandDetails}>
                <View style={styles.activeErrandLocations}>
                  <View style={styles.locationIcons}>
                    <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
                    <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
                    <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
                  </View>

                  <View style={styles.locationTexts}>
                    <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                      {activeErrand.pickup}
                    </Text>
                    <Text style={[styles.locationText, { color: theme.text }]} numberOfLines={1}>
                      {activeErrand.dropoff}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeErrandInfo}>
                  <View style={styles.activeErrandInfoItem}>
                    <Text style={[styles.activeErrandInfoLabel, { color: theme.text + "80" }]}>Type</Text>
                    <Text style={[styles.activeErrandInfoValue, { color: theme.text }]}>
                      {activeErrand.errandType.charAt(0).toUpperCase() + activeErrand.errandType.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.activeErrandInfoItem}>
                    <Text style={[styles.activeErrandInfoLabel, { color: theme.text + "80" }]}>Code</Text>
                    <Text style={[styles.activeErrandInfoValue, { color: theme.primary }]}>
                      {activeErrand.transactionCode}
                    </Text>
                  </View>
                  <View style={styles.activeErrandInfoItem}>
                    <Text style={[styles.activeErrandInfoLabel, { color: theme.text + "80" }]}>Price</Text>
                    <Text style={[styles.activeErrandInfoValue, { color: theme.text }]}>
                      ₦{activeErrand.priceEstimate?.toFixed(2) || "N/A"}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusUpdateButtons}>
                  {activeErrand.status === "accepted" && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: "#9C27B0" }]}
                      onPress={() => handleUpdateErrandStatus("picked_up")}
                    >
                      <Text style={styles.statusButtonText}>Mark as Picked Up</Text>
                    </TouchableOpacity>
                  )}

                  {activeErrand.status === "picked_up" && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: "#9C27B0" }]}
                      onPress={() => handleUpdateErrandStatus("on_the_way")}
                    >
                      <Text style={styles.statusButtonText}>Start Delivery</Text>
                    </TouchableOpacity>
                  )}

                  {activeErrand.status === "on_the_way" && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: "#4CAF50" }]}
                      onPress={() => handleUpdateErrandStatus("delivered")}
                    >
                      <Text style={styles.statusButtonText}>Mark as Delivered</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.detailsButton, { backgroundColor: theme.primary }]}
                    onPress={() => navigation.navigate("ErrandDetails", { errandId: activeErrand.id })}
                  >
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        // Show regular map view
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          region={
            location
              ? {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }
              : INITIAL_REGION
          }
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You are here"
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, { backgroundColor: theme.primary }]} />
              </View>
            </Marker>
          )}

          {/* Show available errands on map */}
          {isAvailable &&
            availableErrands.map((errand) => (
              <Marker
                key={errand.id}
                coordinate={{
                  latitude: errand.pickupLocation.latitude,
                  longitude: errand.pickupLocation.longitude,
                }}
                title={errand.errandType}
                description={`₦${errand.priceEstimate?.toFixed(2) || "0.00"}`}
                onPress={() => handleAcceptErrand(errand)}
              >
                <View style={styles.errandMarkerContainer}>
                  <View style={[styles.errandMarker, { backgroundColor: "#FF9800" }]} />
                </View>
              </Marker>
            ))}

          {/* Show pending errands on map */}
          {pendingErrands.map((errand) => (
            <Marker
              key={errand.id}
              coordinate={{
                latitude: errand.pickupLocation.latitude,
                longitude: errand.pickupLocation.longitude,
              }}
              title={errand.errandType}
              description={`₦${errand.priceEstimate?.toFixed(2) || "0.00"}`}
              onPress={() => navigation.navigate("ErrandDetails", { errandId: errand.id })}
            >
              <View style={styles.pendingMarkerContainer}>
                <View style={[styles.pendingMarker, { backgroundColor: "#2196F3" }]} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={[styles.greeting, { color: theme.text + "80" }]}>
            Hello {user?.displayName?.split(" ")[0] || "there"}
          </Text>
          <Text style={[styles.question, { color: theme.text }]}>Ready to pick up or deliver an errand?</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.availabilityButton,
            isAvailable
              ? [styles.availableButton, { backgroundColor: theme.primary }]
              : [styles.unavailableButton, { backgroundColor: theme.accent }],
          ]}
          onPress={handleToggleAvailability}
        >
          <Text style={styles.availabilityButtonText}>{isAvailable ? "Available" : "Unavailable"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomContainer, { backgroundColor: theme.background }]}>
        {/* Earnings Dashboard */}
        <View style={[styles.earningsContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.earningsTitle, { color: theme.text }]}>Today's Earnings</Text>
          <Text style={[styles.earningsAmount, { color: theme.primary }]}>₦{earnings.today?.toFixed(2) || "0.00"}</Text>
          <View style={styles.earningsStats}>
            <View style={styles.earningStat}>
              <Text style={[styles.earningStatValue, { color: theme.text }]}>{earnings.completedToday || 0}</Text>
              <Text style={[styles.earningStatLabel, { color: theme.text + "80" }]}>Completed</Text>
            </View>
            <View style={styles.earningStat}>
              <Text style={[styles.earningStatValue, { color: theme.text }]}>
                ₦{earnings.week?.toFixed(2) || "0.00"}
              </Text>
              <Text style={[styles.earningStatLabel, { color: theme.text + "80" }]}>This Week</Text>
            </View>
            <View style={styles.earningStat}>
              <Text style={[styles.earningStatValue, { color: theme.text }]}>
                ₦{earnings.month?.toFixed(2) || "0.00"}
              </Text>
              <Text style={[styles.earningStatLabel, { color: theme.text + "80" }]}>This Month</Text>
            </View>
          </View>
        </View>

        <View style={styles.codeContainer}>
          <Text style={[styles.codeTitle, { color: theme.text }]}>Have a transaction code?</Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Enter 6-character code"
              placeholderTextColor={theme.text + "50"}
              maxLength={6}
              autoCapitalize="characters"
              value={transactionCode}
              onChangeText={setTransactionCode}
            />
            <TouchableOpacity
              style={[styles.codeButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmitCode}
            >
              <Text style={styles.codeButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Errands */}
        {pendingErrands.length > 0 && (
          <View style={styles.pendingErrandsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pending Errands</Text>
            <FlatList
              data={pendingErrands}
              renderItem={renderPendingErrandItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pendingErrandsList}
            />
          </View>
        )}

        {isAvailable ? (
          <>
            <Text style={[styles.availableErrandsTitle, { color: theme.text }]}>Available Errands</Text>
            <FlatList
              data={availableErrands}
              renderItem={renderErrandItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.errandsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={50} color={theme.text + "50"} />
                  <Text style={[styles.emptyText, { color: theme.text + "80" }]}>No available errands nearby</Text>
                </View>
              }
            />
          </>
        ) : (
          <View style={styles.unavailableMessage}>
            <Ionicons name="alert-circle-outline" size={50} color={theme.text + "50"} />
            <Text style={[styles.unavailableTitle, { color: theme.text }]}>You're currently unavailable</Text>
            <Text style={[styles.unavailableText, { color: theme.text + "80" }]}>
              Toggle availability to start receiving errand requests
            </Text>
          </View>
        )}
      </View>
    </View>
  )
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  errandMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errandMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  pendingMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  header: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  welcomeContainer: {
    flex: 1,
    marginRight: 10,
  },
  greeting: {
    fontSize: 14,
  },
  question: {
    fontSize: 16,
    fontWeight: "bold",
  },
  availabilityButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  availableButton: {
    backgroundColor: "#34D186",
  },
  unavailableButton: {
    backgroundColor: "#FF5252",
  },
  availabilityButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  earningsContainer: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  earningsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  earningsStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  earningStat: {
    alignItems: "center",
  },
  earningStatValue: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  earningStatLabel: {
    fontSize: 12,
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
  pendingErrandsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  pendingErrandsList: {
    paddingRight: 20,
  },
  pendingErrandItem: {
    width: 250,
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
  },
  pendingErrandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pendingErrandStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingErrandStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  pendingErrandFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pendingErrandPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  pendingErrandCode: {
    fontSize: 12,
  },
  availableErrandsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  errandsList: {
    paddingBottom: 20,
  },
  errandItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
  },
  errandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  errandTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  errandType: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errandPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errandDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcons: {
    width: 20,
    alignItems: "center",
    marginRight: 10,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationLine: {
    width: 1,
    height: 20,
    marginVertical: 5,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  locationTexts: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 10,
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 5,
  },
  errandDescription: {
    fontSize: 14,
    marginBottom: 15,
  },
  acceptButton: {
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  unavailableMessage: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 50,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  unavailableText: {
    fontSize: 16,
    textAlign: "center",
  },
  activeErrandContainer: {
    flex: 1,
  },
  activeErrandOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  activeErrandCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  activeErrandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  activeErrandTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  activeErrandStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeErrandStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activeErrandDetails: {
    gap: 15,
  },
  activeErrandLocations: {
    flexDirection: "row",
  },
  activeErrandInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activeErrandInfoItem: {
    alignItems: "center",
  },
  activeErrandInfoLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  activeErrandInfoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusUpdateButtons: {
    gap: 10,
  },
  statusButton: {
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statusButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  detailsButton: {
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
})

export default RunnerHomeScreen
