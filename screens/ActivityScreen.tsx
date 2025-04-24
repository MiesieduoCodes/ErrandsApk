"use client"

import { useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"

// Sample data for errands
const errands = [
  {
    id: "1",
    date: "Today, 10:30 AM",
    type: "shopping",
    pickup: "123 Main St",
    dropoff: "456 Market St",
    price: "$12.50",
    status: "completed",
    items: "Groceries (5 items)",
  },
  {
    id: "2",
    date: "Yesterday, 2:15 PM",
    type: "food",
    pickup: "Tasty Restaurant",
    dropoff: "789 Oak Ave",
    price: "$8.75",
    status: "completed",
    items: "Food delivery",
  },
  {
    id: "3",
    date: "May 15, 9:00 AM",
    type: "documents",
    pickup: "Office Building",
    dropoff: "101 Pine St",
    price: "$15.20",
    status: "completed",
    items: "Important documents",
  },
  {
    id: "4",
    date: "May 10, 5:45 PM",
    type: "other",
    pickup: "444 Maple Dr",
    dropoff: "555 Walnut Ave",
    price: "$10.30",
    status: "cancelled",
    items: "Package delivery",
  },
]

const ActivityScreen = ({ route }) => {
  const { userType } = route.params || { userType: "buyer" }
  const [activeTab, setActiveTab] = useState("all") // 'all', 'completed', 'cancelled'
  const { theme, isDark } = useTheme()

  const filteredErrands = activeTab === "all" ? errands : errands.filter((errand) => errand.status === activeTab)

  const getIconForType = (type) => {
    switch (type) {
      case "shopping":
        return "cart"
      case "food":
        return "fast-food"
      case "documents":
        return "document-text"
      default:
        return "cube"
    }
  }

  const renderErrandItem = ({ item }) => (
    <TouchableOpacity style={[styles.errandItem, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={styles.errandHeader}>
        <Text style={[styles.errandDate, { color: theme.textSecondary }]}>{item.date}</Text>
        <Text
          style={[
            styles.errandStatus, 
            item.status === "completed" ? 
              { backgroundColor: theme.successBg, color: theme.successText } : 
              { backgroundColor: theme.errorBg, color: theme.errorText }
          ]}
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      <View style={styles.errandTypeContainer}>
        <Ionicons name={getIconForType(item.type)} size={20} color={theme.primary} />
        <Text style={[styles.errandType, { color: theme.text }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
      </View>

      <View style={styles.errandDetails}>
        <View style={styles.locationContainer}>
          <View style={styles.locationIcons}>
            <View style={[styles.greenDot, { backgroundColor: theme.primary }]} />
            <View style={[styles.locationLine, { backgroundColor: theme.border }]} />
            <View style={[styles.redDot, { backgroundColor: theme.accent }]} />
          </View>

          <View style={styles.locationTexts}>
            <Text style={[styles.locationText, { color: theme.text }]}>{item.pickup}</Text>
            <Text style={[styles.locationText, { color: theme.text }]}>{item.dropoff}</Text>
          </View>
        </View>
      </View>

      <View style={styles.errandFooter}>
        <Text style={[styles.errandItems, { color: theme.textSecondary }]}>{item.items}</Text>
        <Text style={[styles.errandPrice, { color: theme.text }]}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Your Activity</Text>
      </View>

      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === "all" && styles.activeTab,
              { backgroundColor: theme.tabBg },
              activeTab === "all" && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.tabText },
              activeTab === "all" && styles.activeTabText
            ]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === "completed" && styles.activeTab,
              { backgroundColor: theme.tabBg },
              activeTab === "completed" && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab("completed")}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.tabText },
              activeTab === "completed" && styles.activeTabText
            ]}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab, 
              activeTab === "cancelled" && styles.activeTab,
              { backgroundColor: theme.tabBg },
              activeTab === "cancelled" && { backgroundColor: theme.primary }
            ]}
            onPress={() => setActiveTab("cancelled")}
          >
            <Text style={[
              styles.tabText, 
              { color: theme.tabText },
              activeTab === "cancelled" && styles.activeTabText
            ]}>Cancelled</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {filteredErrands.length > 0 ? (
        <FlatList
          data={filteredErrands}
          renderItem={renderErrandItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.errandsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require("../assets/empty-errands.png")} 
            style={[styles.emptyImage, { tintColor: theme.textSecondary }]} 
            resizeMode="contain" 
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No errands found</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {activeTab === "all" ? "You haven't requested any errands yet" : `You don't have any ${activeTab} errands`}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  tabContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  errandsList: {
    padding: 20,
  },
  errandItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  errandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  errandDate: {
    fontSize: 14,
  },
  errandStatus: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  errandTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  errandType: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errandDetails: {
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: "row",
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
  errandFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errandItems: {
    fontSize: 14,
  },
  errandPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
})

export default ActivityScreen