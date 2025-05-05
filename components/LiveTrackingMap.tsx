"use client"

import { useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native"
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { calculateDistance } from "../utils/location"

const { width } = Dimensions.get("window")

type LiveTrackingMapProps = {
  pickupLocation: {
    latitude: number
    longitude: number
    address: string
  }
  dropoffLocation: {
    latitude: number
    longitude: number
    address: string
  }
  runnerLocation?: {
    latitude: number
    longitude: number
  }
  status: "pending" | "accepted" | "picked_up" | "on_the_way" | "delivered" | "completed"
  isRunner?: boolean
}

const LiveTrackingMap = ({
  pickupLocation,
  dropoffLocation,
  runnerLocation,
  status,
  isRunner = false,
}: LiveTrackingMapProps) => {
  const { theme } = useTheme()
  const mapRef = useRef<MapView>(null)
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null)
  const [distance, setDistance] = useState<number>(0)
  const [eta, setEta] = useState<number>(0)
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([])
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    // Get user's current location
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          console.log("Permission to access location was denied")
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        setUserLocation(location)
      } catch (error) {
        console.error("Error getting location:", error)
        setMapError("Unable to access location services")
      }
    }

    getUserLocation()

    // Simulate route coordinates (in a real app, you'd use a routing API)
    try {
      simulateRoute()
    } catch (error) {
      console.error("Error simulating route:", error)
    }

    // Update distance and ETA
    try {
      updateDistanceAndEta()
    } catch (error) {
      console.error("Error updating distance:", error)
    }

    // Set up interval to update distance and ETA
    const interval = setInterval(() => {
      try {
        updateDistanceAndEta()
      } catch (error) {
        console.error("Error updating distance in interval:", error)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [runnerLocation, status])

  useEffect(() => {
    // Fit map to show all markers
    if (mapRef.current && pickupLocation && dropoffLocation) {
      try {
        const coordinates = [
          { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
          { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
        ]

        if (runnerLocation) {
          coordinates.push({ latitude: runnerLocation.latitude, longitude: runnerLocation.longitude })
        }

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      } catch (error) {
        console.error("Error fitting map to coordinates:", error)
      }
    }
  }, [pickupLocation, dropoffLocation, runnerLocation])

  const simulateRoute = () => {
    // In a real app, you would use a routing API like Google Directions
    // For this example, we'll create a simple straight line between points
    const coordinates = []

    if (status === "accepted" && runnerLocation && pickupLocation) {
      // Route from runner to pickup
      coordinates.push({ latitude: runnerLocation.latitude, longitude: runnerLocation.longitude })
      coordinates.push({ latitude: pickupLocation.latitude, longitude: pickupLocation.longitude })
    } else if ((status === "picked_up" || status === "on_the_way") && runnerLocation && dropoffLocation) {
      // Route from pickup to dropoff
      coordinates.push({ latitude: runnerLocation.latitude, longitude: runnerLocation.longitude })
      coordinates.push({ latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude })
    }

    setRouteCoordinates(coordinates)
  }

  const updateDistanceAndEta = () => {
    if (!runnerLocation) return

    let distanceValue = 0
    let targetLocation

    if (status === "accepted") {
      // Calculate distance to pickup
      targetLocation = pickupLocation
    } else if (status === "picked_up" || status === "on_the_way") {
      // Calculate distance to dropoff
      targetLocation = dropoffLocation
    } else {
      return
    }

    distanceValue = calculateDistance(
      runnerLocation.latitude,
      runnerLocation.longitude,
      targetLocation.latitude,
      targetLocation.longitude,
    )

    setDistance(distanceValue)

    // Estimate ETA (assuming average speed of 20 km/h)
    // Convert distance to minutes: (distance in km / speed in km/h) * 60 minutes
    const etaMinutes = Math.round((distanceValue / 20) * 60)
    setEta(etaMinutes)
  }

  const formatEta = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours} hr ${mins} min`
    }
  }

  // Fallback UI in case of map errors
  if (mapError) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: theme.text }}>Unable to load map: {mapError}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: theme.text }}>Maps are not supported in web preview</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "ios" ? PROVIDER_GOOGLE : undefined}
            style={styles.map}
            initialRegion={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={{
                latitude: pickupLocation.latitude,
                longitude: pickupLocation.longitude,
              }}
              title="Pickup"
            >
              <View style={styles.markerContainer}>
                <View style={[styles.pickupMarker, { backgroundColor: theme.primary }]} />
              </View>
            </Marker>

            {/* Dropoff Marker */}
            <Marker
              coordinate={{
                latitude: dropoffLocation.latitude,
                longitude: dropoffLocation.longitude,
              }}
              title="Dropoff"
            >
              <View style={styles.markerContainer}>
                <View style={[styles.dropoffMarker, { backgroundColor: theme.accent }]} />
              </View>
            </Marker>

            {/* Runner Marker */}
            {runnerLocation && (
              <Marker
                coordinate={{
                  latitude: runnerLocation.latitude,
                  longitude: runnerLocation.longitude,
                }}
                title="Runner"
              >
                <View style={styles.runnerMarkerContainer}>
                  <Ionicons name="bicycle" size={20} color={theme.primary} />
                </View>
              </Marker>
            )}

            {/* Route Line */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={4}
                strokeColor={theme.primary}
                lineDashPattern={[1, 3]}
              />
            )}
          </MapView>

          {/* Distance and ETA Overlay */}
          {runnerLocation && (status === "accepted" || status === "picked_up" || status === "on_the_way") && (
            <View style={[styles.etaContainer, { backgroundColor: theme.card }]}>
              <View style={styles.etaRow}>
                <Ionicons name="location" size={20} color={theme.primary} />
                <Text style={[styles.etaText, { color: theme.text }]}>
                  {distance.toFixed(1)} km away • ETA: {formatEta(eta)}
                </Text>
              </View>
              <Text style={[styles.etaDestination, { color: theme.text + "80" }]}>
                {status === "accepted"
                  ? `Runner is heading to pickup at ${pickupLocation.address}`
                  : `Runner is heading to dropoff at ${dropoffLocation.address}`}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  runnerMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  etaContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  etaText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  etaDestination: {
    fontSize: 12,
  },
})

export default LiveTrackingMap
