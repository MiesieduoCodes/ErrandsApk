"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { sellerService, errandService } from "../../services/database"
import OfflineIndicator from "../../components/OfflineIndicator"

const { width, height } = Dimensions.get("window")

interface Order {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  customer?: string;
  items?: string;
  time?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  quantity: number;
}

interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  todaySales: number;
  pendingOrders: number;
}

interface InventoryAlerts {
  lowInventory: Product[];
  outOfStock: Product[];
}

const SellerHomeScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<any>()

  const [transactionCode, setTransactionCode] = useState("")
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    description: "",
    category: "general",
    inStock: true,
    quantity: "10",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalOrders: 0,
    todaySales: 0,
    pendingOrders: 0,
  })
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlerts>({
    lowInventory: [],
    outOfStock: [],
  })

  useEffect(() => {
    if (!user) return

    const loadSellerData = async () => {
      try {
        setIsLoading(true)

        // Load orders
        const orders = await sellerService.getSellerOrders(user.id)
        setActiveOrders(orders.filter((order: Order) => ["pending", "processing", "ready"].includes(order.status)))
        setCompletedOrders(orders.filter((order: Order) => order.status === "completed"))

        // Load sales summary
        const summary = await sellerService.getSellerSalesSummary(user.id)
        setSalesSummary(summary as SalesSummary)

        // Load inventory alerts
        const alerts = await sellerService.getInventoryAlerts(user.id)
        setInventoryAlerts(alerts as InventoryAlerts)
      } catch (error) {
        console.error("Error loading seller data:", error)
        Alert.alert("Error", "Failed to load seller data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadSellerData()
  }, [user])

  const handleSubmitCode = () => {
    if (transactionCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a valid 6-character code")
      return
    }

    const verifyCodeAsync = async () => {
          try {
            const errand = await errandService.getErrandByTransactionCode(transactionCode) as { id: string; status: string } | null;
    
            if (errand) {
              Alert.alert("Success", `Order found! Status: ${errand.status}`)
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

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      Alert.alert("Error", "Product name and price are required")
      return
    }

    if (!user) {
      Alert.alert("Error", "User not authenticated")
      return
    }

    const addProductAsync = async () => {
      try {
        await sellerService.addProduct(user.id, {
          name: newProduct.name,
          description: newProduct.description,
          price: Number.parseFloat(newProduct.price),
          category: newProduct.category,
          inStock: newProduct.inStock,
          quantity: Number.parseInt(newProduct.quantity),
        })

        Alert.alert("Product Added", `${newProduct.name} has been added to your products list.`, [
          {
            text: "OK",
            onPress: () => {
              setNewProduct({
                name: "",
                price: "",
                description: "",
                category: "general",
                inStock: true,
                quantity: "10",
              })
              setIsAddingProduct(false)
            },
          },
        ])
      } catch (error) {
        console.error("Error adding product:", error)
        Alert.alert("Error", "Failed to add product. Please try again.")
      }
    }

    addProductAsync()
  }

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated")
      return
    }

    const updateOrderAsync = async () => {
      try {
        await errandService.updateErrandStatus(orderId, newStatus, user.id)
        Alert.alert("Status Updated", `Order #${orderId} status updated to ${newStatus}`)

        // Refresh orders
        const orders = await sellerService.getSellerOrders(user.id)
        setActiveOrders(orders.filter((order: Order) => ["pending", "processing", "ready"].includes(order.status)))
        setCompletedOrders(orders.filter((order: Order) => order.status === "completed"))
      } catch (error) {
        console.error("Error updating order status:", error)
        Alert.alert("Error", "Failed to update order status. Please try again.")
      }
    }

    updateOrderAsync()
  }

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={[styles.orderItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.orderHeader}>
        <Text style={[styles.customerName, { color: theme.text }]}>{item.customer || "Customer"}</Text>
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
                  ? "#FF9800" + "20"
                  : item.status === "processing"
                    ? "#2196F3" + "20"
                    : item.status === "ready"
                      ? "#9C27B0" + "20"
                      : "#4CAF50" + "20",
            },
          ]}
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      <Text style={[styles.orderItems, { color: theme.text }]}>{item.items || "Items"}</Text>
      <Text style={[styles.orderTime, { color: theme.text + "80" }]}>{item.time || "Today"}</Text>

      <View style={styles.orderFooter}>
        <Text style={[styles.orderTotal, { color: theme.text }]}>₦{item.total || "0.00"}</Text>

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
    </View>
  )

  const renderInventoryAlert = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={[styles.alertItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
    >
      <View style={styles.alertItemContent}>
        <Text style={[styles.alertItemName, { color: theme.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.alertItemCategory, { color: theme.text + "80" }]}>
          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
        </Text>
      </View>
      <View style={styles.alertItemStatus}>
        {product.inStock ? (
          <Text style={[styles.lowStockText, { color: "#FF9800" }]}>Low Stock: {product.quantity}</Text>
        ) : (
          <Text style={[styles.outOfStockText, { color: "#F44336" }]}>Out of Stock</Text>
        )}
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

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
      </View>

      {!isAddingProduct ? (
        <View style={styles.content}>
          <View style={styles.welcomeContainer}>
            <Text style={[styles.greeting, { color: theme.text + "80" }]}>
              Hello {user?.displayName?.split(" ")[0] || "there"}
            </Text>
            <Text style={[styles.question, { color: theme.text }]}>What product or service do you have to sell?</Text>
          </View>

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
                onPress={handleSubmitCode}
              >
                <Text style={styles.codeButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.statItem, { backgroundColor: theme.card }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                ₦{salesSummary.todaySales?.toFixed(2) || "0.00"}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Today's Sales</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.card }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{salesSummary.totalOrders || "0"}</Text>
              <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Total Orders</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.card }]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{salesSummary.pendingOrders || "0"}</Text>
              <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Pending</Text>
            </View>
          </View>

          {/* Inventory Alerts */}
          {(inventoryAlerts.lowInventory.length > 0 || inventoryAlerts.outOfStock.length > 0) && (
            <View style={[styles.alertsContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.alertsTitle, { color: theme.text }]}>Inventory Alerts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.alertsScroll}>
                {inventoryAlerts.outOfStock.map(renderInventoryAlert)}
                {inventoryAlerts.lowInventory.map(renderInventoryAlert)}
              </ScrollView>
            </View>
          )}

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
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={70} color={theme.text + "50"} />
                <Text style={[styles.emptyText, { color: theme.text + "80" }]}>No orders found</Text>
              </View>
            }
          />

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => setIsAddingProduct(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.addProductContent}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.secondary }]}
            onPress={() => setIsAddingProduct(false)}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.addProductTitle, { color: theme.text }]}>Add New Product</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Product Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              placeholder="Enter product name"
              placeholderTextColor={theme.text + "50"}
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Price (₦)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              placeholder="Enter price"
              placeholderTextColor={theme.text + "50"}
              keyboardType="numeric"
              value={newProduct.price}
              onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryContainer}>
              {["general", "food", "electronics", "clothing"].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    {
                      borderColor: theme.border,
                      backgroundColor: newProduct.category === category ? theme.primary : theme.card,
                    },
                    newProduct.category === category && styles.selectedCategory,
                  ]}
                  onPress={() => setNewProduct({ ...newProduct, category })}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: newProduct.category === category ? "#fff" : theme.text },
                      newProduct.category === category && styles.selectedCategoryText,
                    ]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
              placeholder="Enter quantity"
              placeholderTextColor={theme.text + "50"}
              keyboardType="numeric"
              value={newProduct.quantity}
              onChangeText={(text) => setNewProduct({ ...newProduct, quantity: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>In Stock</Text>
            <TouchableOpacity
              style={[
                styles.stockToggle,
                {
                  backgroundColor: newProduct.inStock ? theme.primary + "20" : theme.accent + "20",
                  borderColor: newProduct.inStock ? theme.primary : theme.accent,
                },
              ]}
              onPress={() => setNewProduct({ ...newProduct, inStock: !newProduct.inStock })}
            >
              <Ionicons
                name={newProduct.inStock ? "checkmark-circle" : "close-circle"}
                size={24}
                color={newProduct.inStock ? theme.primary : theme.accent}
              />
              <Text style={[styles.stockToggleText, { color: newProduct.inStock ? theme.primary : theme.accent }]}>
                {newProduct.inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { borderColor: theme.border, backgroundColor: theme.card, color: theme.text },
              ]}
              placeholder="Enter product description"
              placeholderTextColor={theme.text + "50"}
              multiline
              numberOfLines={4}
              value={newProduct.description}
              onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.addProductButton, { backgroundColor: theme.primary }]}
            onPress={handleAddProduct}
          >
            <Text style={styles.addProductButtonText}>Add Product</Text>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeContainer: {
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
  addProductContent: {
    paddingBottom: 40,
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
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  alertsContainer: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  alertsScroll: {
    flexDirection: "row",
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    width: 200,
  },
  alertItemContent: {
    flex: 1,
    marginRight: 10,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
  },
  alertItemCategory: {
    fontSize: 12,
  },
  alertItemStatus: {
    alignItems: "flex-end",
  },
  lowStockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#34D186",
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: "600",
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderItem: {
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  orderItems: {
    fontSize: 14,
    marginBottom: 5,
  },
  orderTime: {
    fontSize: 12,
    marginBottom: 10,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  backButton: {
    marginBottom: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addProductTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 15,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    margin: 5,
  },
  selectedCategory: {
    borderColor: "transparent",
  },
  categoryText: {
    fontSize: 14,
  },
  selectedCategoryText: {
    fontWeight: "600",
  },
  stockToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  stockToggleText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
  },
  addProductButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  addProductButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
})

export default SellerHomeScreen