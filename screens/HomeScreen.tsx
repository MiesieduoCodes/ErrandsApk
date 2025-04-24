"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, ActivityIndicator } from "react-native"
import { StatusBar } from "expo-status-bar"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import { locationService, errandService } from "../services/database"
import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"

const { width, height } = Dimensions.get("window")

// Define navigation types
type RootStackParamList = {
  Payment: { errandId: string; amount: number };
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
  const [isErrandView, setIsErrandView] = useState(false)
  const [errandDetails, setErrandDetails] = useState<ErrandDetails>({
    pickup: "",
    dropoff: "",
    description: "",
    errandType: "shopping",
    paymentMethod: "cash",
  })
  const [transactionCode, setTransactionCode] = useState("")
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
          setNearbyUsers(nearby)
        }
      } catch (error) {
        console.error("Error getting location:", error)
        setErrorMsg("Failed to get location")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user])

  const handleRequestErrand = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to request an errand")
      return
    }

    if (!errandDetails.pickup || !errandDetails.dropoff || !errandDetails.description) {
      Alert.alert("Error", "Please fill in all errand details")
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
      })

      setTransactionCode(result.transaction_code)

      // If payment method is card, navigate to payment screen
      if (errandDetails.paymentMethod === "card") {
        navigation.navigate("Payment", {
          errandId: result.id,
          amount: result.priceEstimate || 1500, // Default to 1500 if no estimate
        })
      } else {
        // For cash payment, just show success message
        Alert.alert(
          "Errand Requested",
          `Your errand has been requested successfully. Your transaction code is: ${result.transaction_code}`,
          [{ text: "OK", onPress: () => setIsErrandView(false) }],
        )
      }
    } catch (error) {
      console.error("Error creating errand:", error)
      Alert.alert("Error", "Failed to create errand. Please try again.")
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

      Alert.alert(
        "Errand Found",
        `Errand Type: ${errand.errand_type}\nStatus: ${errand.status}\nPickup: ${errand.pickup_address || "Not specified"}\nDropoff: ${errand.dropoff_address || "Not specified"}`,
        [{ text: "OK" }],
      )
    } catch (error) {
      console.error("Error looking up transaction code:", error)
      Alert.alert("Error", "Failed to look up transaction code. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderErrandTypeButton = (type: ErrandType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.errandTypeButton,
        errandDetails.errandType === type && styles.selectedErrandType,
        {
          borderColor: theme.border,
          backgroundColor: errandDetails.errandType === type ? theme.secondary : theme.card,
        },
      ]}
      onPress={() => setErrandDetails({ ...errandDetails, errandType: type })}
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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Getting your location...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

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
        customMapStyle={isDark ? darkMapStyle : []}
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
      </MapView>

      {!isErrandView ? (
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <View style={styles.searchHeader}>
            <Text style={[styles.greeting, { color: theme.text + "80" }]}>Hello, {user?.displayName || "User"}!</Text>
            <Text style={[styles.question, { color: theme.text }]}>What errand do you need done?</Text>
          </View>

          <TouchableOpacity
            style={[styles.requestButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsErrandView(true)}
            disabled={isSubmitting}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.requestButtonText}>Request New Errand</Text>
          </TouchableOpacity>

          <View style={[styles.codeContainer, { backgroundColor: theme.secondary }]}>
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
            <TouchableOpacity style={styles.quickAction}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                <Ionicons name="cart" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.text }]}>Shopping</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                <Ionicons name="fast-food" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.text }]}>Food</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction}>
              <View style={[styles.quickActionIcon, { backgroundColor: theme.secondary }]}>
                <Ionicons name="document-text" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.text }]}>Documents</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.errandContainer, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.secondary }]}
            onPress={() => setIsErrandView(false)}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.errandTitle, { color: theme.text }]}>Request an Errand</Text>

          <View style={styles.errandTypes}>
            <View style={styles.errandTypeScroll}>
              {renderErrandTypeButton("shopping", "Shopping", "cart")}
              {renderErrandTypeButton("food", "Food", "fast-food")}
              {renderErrandTypeButton("documents", "Documents", "document-text")}
              {renderErrandTypeButton("pharmacy", "Pharmacy", "medkit")}
              {renderErrandTypeButton("other", "Other", "ellipsis-horizontal")}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <View style={styles.dotContainer}>
                <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
              </View>
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
            </View>

            <View style={styles.inputRow}>
              <View style={styles.dotContainer}>
                <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
              </View>
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

          <View style={[styles.priceEstimate, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>Estimated Price</Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>$10-15</Text>
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
                    backgroundColor: errandDetails.paymentMethod === "cash" ? theme.secondary : theme.background,
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
                    backgroundColor: errandDetails.paymentMethod === "card" ? theme.secondary : theme.background,
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
      )}
    </SafeAreaView>
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
  searchContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  errandContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  errandContent: {
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
  errandTypeScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  errandTypeButton: {
    alignItems: "center",
    marginRight: 10,
    marginBottom: 10,
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
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#373737",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#3c3c3c",
      },
    ],
  },
  {
    featureType: "road.highway.controlled_access",
    elementType: "geometry",
    stylers: [
      {
        color: "#4e4e4e",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "transit",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#3d3d3d",
      },
    ],
  },
]

export default HomeScreen
