"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { errandService } from "../services/database"
import { formatDistance } from "../utils/location"

const ErrandDetailsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation()
  const route = useRoute()
  const { errandId } = route.params

  const [errand, setErrand] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadErrand()
  }, [errandId])

  const loadErrand = async () => {
    try {
      setIsLoading(true)
      const errandData = await errandService.getErrandById(errandId)
      setErrand(errandData)
    } catch (error) {
      console.error("Error loading errand:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
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
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={theme.text + "30"} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Errand not found</Text>
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
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.detailContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.detailTitle, { color: theme.text }]}>
            {errand.errandType.charAt(0).toUpperCase() + errand.errandType.slice(1)} Errand
          </Text>
          <Text style={[styles.detailDescription, { color: theme.text + "80" }]}>{errand.description}</Text>

          <View style={styles.locationContainer}>
            <View style={styles.locationIcons}>
              <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
              <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
              <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
            </View>

            <View style={styles.locationTexts}>
              <Text style={[styles.locationText, { color: theme.text }]}>{errand.pickup}</Text>
              <Text style={[styles.locationText, { color: theme.text }]}>{errand.dropoff}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: theme.text }]}>Status:</Text>
            <Text style={[styles.statusText, { color: theme.primary }]}>
              {errand.status.charAt(0).toUpperCase() + errand.status.slice(1)}
            </Text>
          </View>

          {errand.priceEstimate && (
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: theme.text }]}>Estimated Price:</Text>
              <Text style={[styles.priceValue, { color: theme.primary }]}>₦{errand.priceEstimate.toFixed(2)}</Text>
            </View>
          )}

          {errand.distance && (
            <View style={styles.distanceContainer}>
              <Text style={[styles.distanceLabel, { color: theme.text }]}>Distance:</Text>
              <Text style={[styles.distanceValue, { color: theme.primary }]}>{formatDistance(errand.distance)}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 15,
  },
  detailContainer: {
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 14,
    marginBottom: 15,
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
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 5,
  },
  priceValue: {
    fontSize: 14,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 5,
  },
  distanceValue: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
})

export default ErrandDetailsScreen
