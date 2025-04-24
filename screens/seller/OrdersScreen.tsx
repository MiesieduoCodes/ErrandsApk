"use client"

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"

import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { sellerService } from "../../services/database"
import type { SellerStackParamList } from "../../types/navigation" // adjust path as needed

type OrderStatus = "pending" | "processing" | "ready" | "completed"

interface Order {
  id: string
  status: OrderStatus
  customer?: string
  date?: string
  itemCount?: number
  total?: number
}

type NavigationProp = StackNavigationProp<SellerStackParamList, "Orders">

const OrdersScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")

  useEffect(() => {
    if (!user) return

    const loadOrders = async () => {
      try {
        setIsLoading(true)
        const ordersData = await sellerService.getSellerOrders(user.id)
        setOrders(ordersData as Order[])
      } catch (error) {
        console.error("Error loading orders:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()

    const interval = setInterval(() => {
      loadOrders()
    }, 60000)

    return () => clearInterval(interval)
  }, [user])

  const activeOrders = orders.filter((order) => ["pending", "processing", "ready"].includes(order.status))
  const completedOrders = orders.filter((order) => order.status === "completed")

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      if (!user) return
      await sellerService.updateOrderStatus(orderId, newStatus)
      const ordersData = await sellerService.getSellerOrders(user.id)
      setOrders(ordersData as Order[])
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={[styles.orderItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={[styles.orderNumber, { color: theme.text }]}>Order #{item.id}</Text>
        <Text
          style={[
            styles.orderStatus,
            {
              color:
                item.status === "pending"
                  ? "#FF9800"
                  : item.status === "processing"
                    ? "#2196F3"
                    : item.status === "ready"
                      ? "#9C27B0"
                      : "#4CAF50",
              backgroundColor:
                item.status === "pending"
                  ? "#FF980020"
                  : item.status === "processing"
                    ? "#2196F320"
                    : item.status === "ready"
                      ? "#9C27B020"
                      : "#4CAF5020",
            },
          ]}
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.orderInfoItem}>
          <Text style={[styles.orderInfoLabel, { color: theme.text + "80" }]}>Customer</Text>
          <Text style={[styles.orderInfoValue, { color: theme.text }]}>{item.customer || "Customer"}</Text>
        </View>
        <View style={styles.orderInfoItem}>
          <Text style={[styles.orderInfoLabel, { color: theme.text + "80" }]}>Date</Text>
          <Text style={[styles.orderInfoValue, { color: theme.text }]}>{item.date || "Today"}</Text>
        </View>
        <View style={styles.orderInfoItem}>
          <Text style={[styles.orderInfoLabel, { color: theme.text + "80" }]}>Items</Text>
          <Text style={[styles.orderInfoValue, { color: theme.text }]}>{item.itemCount || 0}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={[styles.orderTotal, { color: theme.primary }]}>₦{item.total?.toFixed(2) || "0.00"}</Text>

        {activeTab === "active" && (
          <View style={styles.actionButtons}>
            {item.status === "pending" && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleUpdateOrderStatus(item.id, "processing")}
              >
                <Text style={styles.actionButtonText}>Process</Text>
              </TouchableOpacity>
            )}
            {item.status === "processing" && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleUpdateOrderStatus(item.id, "ready")}
              >
                <Text style={styles.actionButtonText}>Mark Ready</Text>
              </TouchableOpacity>
            )}
            {item.status === "ready" && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleUpdateOrderStatus(item.id, "completed")}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading orders...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>

      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "active" ? theme.primary : theme.text + "80" },
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Active Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "completed" ? theme.primary : theme.text + "80" },
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "active" ? activeOrders : completedOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={50} color={theme.text + "50"} />
            <Text style={[styles.emptyText, { color: theme.text + "80" }]}>No {activeTab} orders found</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  tabContainer: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 15, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#34D186" },
  tabText: { fontSize: 16 },
  activeTabText: { fontWeight: "600" },
  ordersList: { padding: 20, paddingBottom: 40 },
  orderItem: { borderRadius: 10, padding: 15, marginBottom: 15, borderWidth: 1 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumber: { fontSize: 16, fontWeight: "600" },
  orderStatus: { fontSize: 12, fontWeight: "500", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  orderInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  orderInfoItem: { alignItems: "center" },
  orderInfoLabel: { fontSize: 12, marginBottom: 5 },
  orderInfoValue: { fontSize: 14, fontWeight: "500" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderTotal: { fontSize: 16, fontWeight: "bold" },
  actionButtons: { flexDirection: "row" },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginLeft: 10 },
  actionButtonText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  emptyContainer: { alignItems: "center", justifyContent: "center", padding: 30, marginTop: 50 },
  emptyText: { fontSize: 16, marginTop: 10 },
})

export default OrdersScreen
