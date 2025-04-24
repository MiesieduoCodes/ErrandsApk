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
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, type NavigationProp } from "@react-navigation/native"
import { hasPermission } from "../../firebase/auth"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { errandService, userService, locationService } from "../../services/database"
import OfflineIndicator from "../../components/OfflineIndicator"
import type { Errand, Runner, SavedAddress, RootStackParamList } from "../../types"

const { width, height } = Dimensions.get("window")

const INITIAL_REGION = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

interface ErrandDetails {
  pickup: string
  dropoff: string
  description: string
  errandType: "shopping" | "food" | "documents" | "pharmacy" | "other"
}

type BuyerHomeScreenProps = {
  navigation: NavigationProp<RootStackParamList>
}

const BuyerHomeScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const mapRef = useRef<MapView | null>(null)

  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isErrandView, setIsErrandView] = useState(false)
  const [errandDetails, setErrandDetails] = useState<ErrandDetails>({
    pickup: "",
    dropoff: "",
    description: "",
    errandType: "shopping",
  })
  const [transactionCode, setTransactionCode] = useState("")
  const [hasCreatePermission, setHasCreatePermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recentErrands, setRecentErrands] = useState<Errand[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [favoriteRunners, setFavoriteRunners] = useState<Runner[]>([])
  const [nearbyRunners, setNearbyRunners] = useState<Runner[]>([])
  const [activeErrand, setActiveErrand] = useState<Errand | null>(null)

  useEffect(() => {
    // Check location permissions
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

    // Check user permissions
    const checkPermissions = async () => {
      if (!user) return

      try {
        // Cast user to any to resolve type mismatch between your User type and Firebase User
        const canCreateErrand = await hasPermission(user as any, "create_errand")
        setHasCreatePermission(canCreateErrand)

        // Load user data
        await loadUserData()

        // Check for active errands
        await checkActiveErrands()
      } catch (error) {
        console.error("Error checking permissions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermissions()
  }, [user])

  const loadUserData = async () => {
    if (!user) return

    try {
      // Load recent errands
      const errands = await errandService.getRecentErrands(user.id, 3)
      setRecentErrands(errands as Errand[])

      // Load saved addresses
      const addresses = await userService.getUserAddresses(user.id)
      setSavedAddresses(addresses as SavedAddress[])

      // Load favorite runners
      const favorites = await userService.getUserFavoriteRunners(user.id)
      setFavoriteRunners(favorites as Runner[])

      // Load nearby runners if location is available
      if (location) {
        const nearby = await locationService.getNearbyRunners(
          location.coords.latitude,
          location.coords.longitude,
          5, // 5km radius
          user.id,
        )
        setNearbyRunners(nearby.filter((runner: any) => runner.isAvailable) as unknown as Runner[])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  const checkActiveErrands = async () => {
    if (!user) return

    try {
      const errands = await errandService.getErrandsByUser(user.id, "buyer")
      const active = errands.find((errand: any) => ["accepted", "in_progress"].includes(errand.status))

      if (active) {
        setActiveErrand(active as Errand)
      }
    } catch (error) {
      console.error("Error checking active errands:", error)
    }
  }

  const handleRequestErrand = () => {
    if (!hasCreatePermission) {
      Alert.alert("Permission Denied", "You don't have permission to create errands.")
      return
    }

    if (!errandDetails.pickup || !errandDetails.dropoff || !errandDetails.description) {
      Alert.alert("Error", "Please fill in all errand details")
      return
    }

    if (!user || !location) {
      Alert.alert("Error", "Unable to determine your location")
      return
    }

    // In a real app, you would create the errand in your backend
    // For this example, we'll simulate it
    const createErrandAsync = async () => {
      try {
        // Generate a random 6-character code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()

        // Create errand in database
        const errand = await errandService.createErrand({
          buyerId: user.id,
          errandType: errandDetails.errandType,
          description: errandDetails.description,
          pickupLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: errandDetails.pickup,
          },
          dropoffLocation: {
            latitude: location.coords.latitude + 0.01, // Simulated location
            longitude: location.coords.longitude + 0.01, // Simulated location
            address: errandDetails.dropoff,
          },
          priceEstimate: Math.floor(Math.random() * 1000) + 500, // Random price between 500-1500 Naira
        })

        setTransactionCode(errand.transaction_code)

        Alert.alert(
          "Errand Requested",
          `Your errand has been requested successfully. Your transaction code is: ${errand.transaction_code}`,
          [
            {
              text: "OK",
              onPress: () => {
                setIsErrandView(false)
                loadUserData() // Reload user data
              },
            },
          ],
        )
      } catch (error) {
        console.error("Error creating errand:", error)
        Alert.alert("Error", "Failed to create errand. Please try again.")
      }
    }

    createErrandAsync()
  }

  const handleVerifyCode = () => {
    if (!transactionCode || transactionCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character code")
      return
    }

    // In a real app, you would verify this code against your backend
    const verifyCodeAsync = async () => {
      try {
        const errand = (await errandService.getErrandByTransactionCode(transactionCode)) as Errand | null

        if (errand) {
          Alert.alert("Success", `Errand found! Status: ${errand.status}`)
          // Navigate to errand details
          navigation.navigate("ErrandDetails", { errandId: errand.id })
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

  const renderErrandTypeButton = (type: ErrandDetails["errandType"], label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.errandTypeButton,
        errandDetails.errandType === type && styles.selectedErrandType,
        {
          borderColor: theme.border,
          backgroundColor: errandDetails.errandType === type ? theme.primary : theme.card,
        },
      ]}
      onPress={() => setErrandDetails({ ...errandDetails, errandType: type })}
    >
      <Ionicons name={icon as any} size={24} color={errandDetails.errandType === type ? "#fff" : theme.text} />
      <Text style={[styles.errandTypeText, { color: errandDetails.errandType === type ? "#fff" : theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  const renderRecentErrand = (errand: Errand) => (
    <TouchableOpacity
      key={errand.id}
      style={[styles.recentErrandItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate("ErrandDetails", { errandId: errand.id })}
    >
      <View style={styles.recentErrandHeader}>
        <View style={styles.recentErrandTypeContainer}>
          <Ionicons
            name={
              errand.errandType === "shopping"
                ? "cart"
                : errand.errandType === "food"
                  ? "fast-food"
                  : errand.errandType === "documents"
                    ? "document-text"
                    : errand.errandType === "pharmacy"
                      ? "medkit"
                      : "cube"
            }
            size={18}
            color={theme.primary}
          />
          <Text style={[styles.recentErrandType, { color: theme.text }]}>
            {errand.errandType.charAt(0).toUpperCase() + errand.errandType.slice(1)}
          </Text>
        </View>
        <Text
          style={[
            styles.recentErrandStatus,
            {
              color:
                errand.status === "pending"
                  ? "#FF9800"
                  : errand.status === "accepted"
                    ? "#2196F3"
                    : errand.status === "in_progress"
                      ? "#9C27B0"
                      : errand.status === "completed"
                        ? "#4CAF50"
                        : "#F44336",
            },
          ]}
        >
          {errand.status.charAt(0).toUpperCase() + errand.status.slice(1)}
        </Text>
      </View>
      <Text style={[styles.recentErrandDescription, { color: theme.text }]} numberOfLines={1}>
        {errand.description}
      </Text>
      <View style={styles.recentErrandFooter}>
        <Text style={[styles.recentErrandDate, { color: theme.text + "80" }]}>
          {new Date(errand.createdAt).toLocaleDateString()}
        </Text>
        <Text style={[styles.recentErrandCode, { color: theme.primary }]}>{errand.transactionCode}</Text>
      </View>
    </TouchableOpacity>
  )

  const renderSavedAddress = (address: SavedAddress) => (
    <TouchableOpacity
      key={address.id}
      style={[styles.savedAddressItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        // Use this address for errand
        setErrandDetails({
          ...errandDetails,
          pickup: address.address,
        })
        setIsErrandView(true)
      }}
    >
      <Ionicons name="location" size={20} color={theme.primary} />
      <View style={styles.savedAddressContent}>
        <Text style={[styles.savedAddressName, { color: theme.text }]}>{address.name}</Text>
        <Text style={[styles.savedAddressText, { color: theme.text + "80" }]} numberOfLines={1}>
          {address.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.text + "50"} />
    </TouchableOpacity>
  )

  const renderFavoriteRunner = (runner: Runner) => (
    <TouchableOpacity
      key={runner.id}
      style={[styles.favoriteRunnerItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        // Navigate to runner profile
        navigation.navigate("RunnerProfile", { runnerId: runner.id })
      }}
    >
      <Image
        source={runner.photoURL ? { uri: runner.photoURL } : require("../../assets/profile-avatar.png")}
        style={styles.favoriteRunnerImage}
      />
      <Text style={[styles.favoriteRunnerName, { color: theme.text }]}>{runner.name}</Text>
      <View style={[styles.favoriteRunnerRating, { backgroundColor: theme.primary + "20" }]}>
        <Ionicons name="star" size={12} color={theme.primary} />
        <Text style={[styles.favoriteRunnerRatingText, { color: theme.primary }]}>{runner.rating || "4.8"}</Text>
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

      {activeErrand ? (
        // Show active errand view with map
        <View style={styles.activeErrandContainer}>
          <MapView
            ref={mapRef}
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
                title="Your location"
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.marker, { backgroundColor: theme.primary }]} />
                </View>
              </Marker>
            )}

            {activeErrand && (
              <>
                <Marker
                  coordinate={{
                    latitude: activeErrand.pickupLocation.latitude,
                    longitude: activeErrand.pickupLocation.longitude,
                  }}
                  title="Pickup"
                >
                  <View style={styles.markerContainer}>
                    <View style={[styles.pickupMarker, { backgroundColor: theme.primary }]} />
                  </View>
                </Marker>
                <Marker
                  coordinate={{
                    latitude: activeErrand.dropoffLocation.latitude,
                    longitude: activeErrand.dropoffLocation.longitude,
                  }}
                  title="Dropoff"
                >
                  <View style={styles.markerContainer}>
                    <View style={[styles.dropoffMarker, { backgroundColor: theme.accent }]} />
                  </View>
                </Marker>
              </>
            )}
          </MapView>

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
                          : activeErrand.status === "in_progress"
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
                            : activeErrand.status === "in_progress"
                              ? "#9C27B0"
                              : "#4CAF50",
                      },
                    ]}
                  >
                    {activeErrand.status === "accepted"
                      ? "Runner Accepted"
                      : activeErrand.status === "in_progress"
                        ? "In Progress"
                        : "Completed"}
                  </Text>
                </View>
              </View>

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

                <TouchableOpacity
                  style={[styles.activeErrandButton, { backgroundColor: theme.primary }]}
                  onPress={() => navigation.navigate("ErrandDetails", { errandId: activeErrand.id })}
                >
                  <Text style={styles.activeErrandButtonText}>View Details</Text>
                </TouchableOpacity>
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

          {/* Show nearby runners on map */}
          {nearbyRunners.map((runner) => (
            <Marker
              key={runner.id}
              coordinate={{
                latitude: runner.location.latitude,
                longitude: runner.location.longitude,
              }}
              title={runner.name}
            >
              <View style={styles.runnerMarkerContainer}>
                <View style={[styles.runnerMarker, { backgroundColor: "#2196F3" }]} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {!isErrandView ? (
        <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
          <View style={styles.searchHeader}>
            <Text style={[styles.greeting, { color: theme.text + "80" }]}>
              Hello {user?.displayName?.split(" ")[0] || "there"}
            </Text>
            <Text style={[styles.question, { color: theme.text }]}>What errand do you need done?</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.requestButton,
              !hasCreatePermission && styles.disabledButton,
              { backgroundColor: hasCreatePermission ? theme.primary : "#cccccc" },
            ]}
            onPress={() => setIsErrandView(true)}
            disabled={!hasCreatePermission}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.requestButtonText}>Request New Errand</Text>
          </TouchableOpacity>

          {!hasCreatePermission && (
            <Text style={[styles.permissionWarning, { color: theme.accent }]}>
              You don't have permission to create errands. Please contact support.
            </Text>
          )}

          <View style={[styles.codeContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.codeTitle, { color: theme.text }]}>Have a transaction code?</Text>
            <View style={styles.codeInputContainer}>
              <TextInput
                style={[
                  styles.codeInput,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
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
                onPress={handleVerifyCode}
              >
                <Text style={styles.codeButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dashboard Widgets */}
          <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
            {/* Recent Errands */}
            {recentErrands.length > 0 && (
              <View style={styles.dashboardSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Errands</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Errands")}>
                    <Text style={[styles.sectionAction, { color: theme.primary }]}>See All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentErrandsContainer}>{recentErrands.map(renderRecentErrand)}</View>
              </View>
            )}

            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <View style={styles.dashboardSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Addresses</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("SavedAddresses")}>
                    <Text style={[styles.sectionAction, { color: theme.primary }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.savedAddressesContainer}>{savedAddresses.map(renderSavedAddress)}</View>
              </View>
            )}

            {/* Favorite Runners */}
            {favoriteRunners.length > 0 && (
              <View style={styles.dashboardSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Favorite Runners</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("FavoriteRunners")}>
                    <Text style={[styles.sectionAction, { color: theme.primary }]}>See All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoriteRunnersContainer}>
                  {favoriteRunners.map(renderFavoriteRunner)}
                </ScrollView>
              </View>
            )}

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate("Search")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                  <Ionicons name="search" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: theme.text }]}>Find Services</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate("Messages")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                  <Ionicons name="chatbubbles" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: theme.text }]}>Messages</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: theme.card }]}
                onPress={() => navigation.navigate("HelpCenterScreen")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                  <Ionicons name="help-circle" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: theme.text }]}>Help</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          style={[styles.errandContainer, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.errandContent}
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.secondary }]}
            onPress={() => setIsErrandView(false)}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.errandTitle, { color: theme.text }]}>Request an Errand</Text>

          <View style={styles.errandTypes}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              <TextInput
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
                placeholder="Pickup location"
                placeholderTextColor={theme.text + "50"}
                value={errandDetails.pickup}
                onChangeText={(text) => setErrandDetails({ ...errandDetails, pickup: text })}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.dotContainer}>
                <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
              </View>
              <TextInput
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
                placeholder="Dropoff location"
                placeholderTextColor={theme.text + "50"}
                value={errandDetails.dropoff}
                onChangeText={(text) => setErrandDetails({ ...errandDetails, dropoff: text })}
              />
            </View>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionLabel, { color: theme.text }]}>Errand Description</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { borderColor: theme.border, backgroundColor: theme.card, color: theme.text },
              ]}
              placeholder="Describe what you need done in detail..."
              placeholderTextColor={theme.text + "50"}
              multiline
              numberOfLines={4}
              value={errandDetails.description}
              onChangeText={(text) => setErrandDetails({ ...errandDetails, description: text })}
            />
          </View>

          <View style={[styles.priceEstimate, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>Estimated Price</Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>₦500-1,500</Text>
          </View>

          <View style={[styles.paymentMethod, { borderBottomColor: theme.border }]}>
            <Ionicons name="card-outline" size={24} color={theme.text} />
            <Text style={[styles.paymentText, { color: theme.text }]}>Cash</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.text + "50"} style={{ marginLeft: "auto" }} />
          </View>

          <TouchableOpacity
            style={[styles.requestErrandButton, { backgroundColor: theme.primary }]}
            onPress={handleRequestErrand}
          >
            <Text style={styles.requestErrandButtonText}>Request Errand</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  runnerMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  runnerMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  pickupMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  dropoffMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
  },
  searchContainer: {
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
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  requestButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 10,
  },
  permissionWarning: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
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
  dashboardContainer: {
    maxHeight: height * 0.4,
  },
  dashboardSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionAction: {
    fontSize: 14,
  },
  recentErrandsContainer: {
    gap: 10,
  },
  recentErrandItem: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  recentErrandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  recentErrandTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentErrandType: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 5,
  },
  recentErrandStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  recentErrandDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  recentErrandFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentErrandDate: {
    fontSize: 12,
  },
  recentErrandCode: {
    fontSize: 12,
    fontWeight: "600",
  },
  savedAddressesContainer: {
    gap: 10,
  },
  savedAddressItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  savedAddressContent: {
    flex: 1,
    marginLeft: 10,
  },
  savedAddressName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  savedAddressText: {
    fontSize: 12,
  },
  favoriteRunnersContainer: {
    flexDirection: "row",
  },
  favoriteRunnerItem: {
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginRight: 10,
    width: 100,
  },
  favoriteRunnerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  favoriteRunnerName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    textAlign: "center",
  },
  favoriteRunnerRating: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  favoriteRunnerRatingText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 3,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickAction: {
    alignItems: "center",
    width: "30%",
    borderRadius: 8,
    padding: 12,
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
  errandContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  errandContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errandTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  errandTypes: {
    marginBottom: 20,
  },
  errandTypeButton: {
    alignItems: "center",
    marginRight: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
  },
  selectedErrandType: {
    borderColor: "transparent",
  },
  errandTypeText: {
    fontSize: 12,
    marginTop: 5,
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
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  paymentText: {
    fontSize: 16,
    marginLeft: 10,
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
  locationIcons: {
    width: 20,
    alignItems: "center",
    marginRight: 10,
  },
  locationLine: {
    width: 1,
    height: 20,
    marginVertical: 5,
  },
  locationTexts: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 10,
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
  activeErrandButton: {
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  activeErrandButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
})

export default BuyerHomeScreen
