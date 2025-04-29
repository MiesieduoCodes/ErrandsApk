"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { ref, onValue, update } from "firebase/database"
import { database } from "../firebase/config"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import type { Errand } from "../types"

interface ErrandItem extends Errand {
  [key: string]: any
}

const ErrandsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const [errands, setErrands] = useState<ErrandItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("active") // 'active', 'completed', 'cancelled'

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
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const getFilteredErrands = () => {
    if (activeTab === "active") {
      return errands.filter((errand) => ["pending", "accepted", "in_progress"].includes(errand.status))
    } else if (activeTab === "completed") {
      return errands.filter((errand) => errand.status === "completed")
    } else {
      return errands.filter((errand) => errand.status === "cancelled")
    }
  }

  const handleUpdateStatus = async (errandId: string, newStatus: string) => {
    try {
      await update(ref(database, `errands/${errandId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating errand status:", error)
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

  const renderErrandItem = ({ item }: { item: ErrandItem }) => (
    <TouchableOpacity style={[styles.errandItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.errandHeader}>
        <Text style={[styles.errandDate, { color: theme.text + "80" }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.errandTypeContainer}>
        <Ionicons name={getIconForType(item.errandType)} size={20} color={theme.primary} />
        <Text style={[styles.errandType, { color: theme.text }]}>
          {item.errandType.charAt(0).toUpperCase() + item.errandType.slice(1)}
        </Text>
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

      <Text style={[styles.errandDescription, { color: theme.text + "80" }]} numberOfLines={2}>
        {item.description}
      </Text>

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
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={() => handleUpdateStatus(item.id, "cancelled")}
        >
          <Text style={styles.actionButtonText}>Cancel Errand</Text>
        </TouchableOpacity>
      )}

      {item.transactionCode && (
        <View style={[styles.codeContainer, { backgroundColor: theme.secondary }]}>
          <Text style={[styles.codeLabel, { color: theme.text + "80" }]}>Transaction Code:</Text>
          <Text style={[styles.codeValue, { color: theme.text }]}>{item.transactionCode}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Your Errands</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "active" && styles.activeTab,
              { backgroundColor: activeTab === "active" ? theme.primary : theme.secondary },
            ]}
            onPress={() => setActiveTab("active")}
          >
            <Text style={[styles.tabText, { color: activeTab === "active" ? "#fff" : theme.text + "80" }]}>Active</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "completed" && styles.activeTab,
              { backgroundColor: activeTab === "completed" ? theme.primary : theme.secondary },
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
              { backgroundColor: activeTab === "cancelled" ? theme.primary : theme.secondary },
            ]}
            onPress={() => setActiveTab("cancelled")}
          >
            <Text style={[styles.tabText, { color: activeTab === "cancelled" ? "#fff" : theme.text + "80" }]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>Loading errands...</Text>
          </View>
        ) : (
          <View style={styles.errandsContainer}>
            <FlatList
              data={getFilteredErrands()}
              renderItem={renderErrandItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.errandsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="list" size={60} color={theme.text + "30"} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No errands found</Text>
                  <Text style={[styles.emptyText, { color: theme.text + "80" }]}>
                    {activeTab === "active"
                      ? "You don't have any active errands"
                      : activeTab === "completed"
                        ? "You don't have any completed errands"
                        : "You don't have any cancelled errands"}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
  },
  activeTab: {
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errandsContainer: {
    width: "100%",
  },
  errandsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  errandItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
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
    marginBottom: 10,
  },
  errandType: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 10,
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
})

export default ErrandsScreen
