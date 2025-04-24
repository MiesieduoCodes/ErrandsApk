"use client"

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Alert, Modal } from "react-native"
import { useState, useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { sellerService } from "../../services/database"
import { StackNavigationProp } from "@react-navigation/stack"
import { RootStackParamList } from "../../navigation/types"

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  quantity: number;
}

interface CategoryItem {
  id: string;
  label: string;
}

const ProductsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isEditingProduct, setIsEditingProduct] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "general",
    inStock: true,
    quantity: "10",
  })
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadProducts()
  }, [user])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      if (!user) return;
      const productsData = await sellerService.getSellerProducts(user.id)
      setProducts(productsData as Product[])
    } catch (error) {
      console.error("Error loading products:", error)
      Alert.alert("Error", "Failed to load products. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProduct = () => {
    if (!productForm.name || !productForm.price) {
      Alert.alert("Error", "Product name and price are required")
      return
    }

    const addProductAsync = async () => {
      try {
        if (!user) {
          Alert.alert("Error", "User is not authenticated.")
          return
        }
        
        await sellerService.addProduct(user.id, {
          name: productForm.name,
          description: productForm.description,
          price: Number.parseFloat(productForm.price),
          category: productForm.category,
          inStock: productForm.inStock,
          quantity: Number.parseInt(productForm.quantity),
        })

        Alert.alert("Success", `${productForm.name} has been added to your inventory.`, [
          {
            text: "OK",
            onPress: () => {
              resetForm()
              setIsAddingProduct(false)
              loadProducts()
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

  const handleEditProduct = () => {
    if (!currentProduct || !productForm.name || !productForm.price) {
      Alert.alert("Error", "Product name and price are required")
      return
    }

    const editProductAsync = async () => {
      try {
        if (!user || !currentProduct) {
          Alert.alert("Error", "User is not authenticated or product not selected.")
          return
        }
        
        await sellerService.updateProduct(user.id, currentProduct.id, {
          name: productForm.name,
          description: productForm.description,
          price: Number.parseFloat(productForm.price),
          category: productForm.category,
          inStock: productForm.inStock,
          quantity: Number.parseInt(productForm.quantity),
        })

        Alert.alert("Success", `${productForm.name} has been updated.`, [
          {
            text: "OK",
            onPress: () => {
              resetForm()
              setIsEditingProduct(false)
              loadProducts()
            },
          },
        ])
      } catch (error) {
        console.error("Error updating product:", error)
        Alert.alert("Error", "Failed to update product. Please try again.")
      }
    }

    editProductAsync()
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      if (!user) {
        Alert.alert("Error", "User is not authenticated.")
        return
      }
      
      await sellerService.deleteProduct(productId)
      Alert.alert("Success", "Product has been deleted.")
      loadProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      Alert.alert("Error", "Failed to delete product. Please try again.")
    } finally {
      setDeleteModalVisible(false)
      setProductToDelete(null)
    }
  }

  const resetForm = () => {
    setProductForm({
      name: "",
      price: "",
      description: "",
      category: "general",
      inStock: true,
      quantity: "10",
    })
    setCurrentProduct(null)
  }

  const prepareEditForm = (product: Product) => {
    setCurrentProduct(product)
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      category: product.category,
      inStock: product.inStock,
      quantity: product.quantity.toString(),
    })
    setIsEditingProduct(true)
  }

  const renderCategoryButton = (id: string, label: string) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        id === activeCategory && styles.activeCategoryButton,
        { borderColor: theme.border, backgroundColor: id === activeCategory ? theme.primary : theme.card },
      ]}
      onPress={() => setActiveCategory(id)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          { color: id === activeCategory ? "#fff" : theme.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )

  const filteredProducts =
    activeCategory === "all" 
      ? products 
      : products.filter((product) => product.category === activeCategory)

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={[styles.productItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={styles.productHeader}>
        <Text style={[styles.productName, { color: theme.text }]}>{item.name}</Text>
        <View style={styles.productActions}>
          <TouchableOpacity onPress={() => prepareEditForm(item)}>
            <Ionicons name="create-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              setProductToDelete(item.id)
              setDeleteModalVisible(true)
            }}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.productStockRow}>
        <View
          style={[
            styles.stockIndicator,
            { backgroundColor: item.inStock ? "#34D186" : "#FF6B6B" },
          ]}
        >
          <Text style={[styles.stockText, { color: "#fff" }]}>
            {item.inStock ? "In Stock" : "Out of Stock"}
          </Text>
        </View>
        <Text style={[styles.productCategory, { color: theme.text + "80" }]}>
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </Text>
      </View>
      {item.description ? (
        <Text style={[styles.productDescription, { color: theme.text }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.productFooter}>
        <Text style={[styles.productPrice, { color: theme.text }]}>
          ₦{item.price.toFixed(2)}
        </Text>
        <Text style={[styles.productQuantity, { color: theme.text + "80" }]}>
          Qty: {item.quantity}
        </Text>
      </View>
    </View>
  )

  const categories: CategoryItem[] = [
    { id: "all", label: "All" },
    { id: "general", label: "General" },
    { id: "food", label: "Food" },
    { id: "electronics", label: "Electronics" },
    { id: "clothing", label: "Clothing" },
  ]

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading Products...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Product</Text>
            <Text style={[styles.modalText, { color: theme.text }]}>
              Are you sure you want to delete this product? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.secondary }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#FF6B6B" }]}
                onPress={() => productToDelete && handleDeleteProduct(productToDelete)}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product List View */}
      {!isAddingProduct && !isEditingProduct ? (
        <>
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <Text style={styles.headerTitle}>My Products</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => {
                resetForm()
                setIsAddingProduct(true)
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderCategoryButton(item.id, item.label)}
              contentContainerStyle={styles.categoriesList}
            />
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={50} color={theme.text + "50"} />
                <Text style={[styles.emptyText, { color: theme.text + "80" }]}>No products found</Text>
                <TouchableOpacity
                  style={[styles.addProductButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    resetForm()
                    setIsAddingProduct(true)
                  }}
                >
                  <Text style={styles.addProductButtonText}>Add Product</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      ) : (
        /* Add/Edit Product Form */
        <ScrollView 
          contentContainerStyle={[styles.addProductContainer, { backgroundColor: theme.background }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.secondary }]}
            onPress={() => {
              resetForm()
              isEditingProduct ? setIsEditingProduct(false) : setIsAddingProduct(false)
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.addProductTitle, { color: theme.text }]}>
            {isEditingProduct ? "Edit Product" : "Add New Product"}
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card, 
                color: theme.text, 
                borderColor: theme.border 
              }]}
              value={productForm.name}
              onChangeText={(text) => setProductForm({ ...productForm, name: text })}
              placeholder="Enter product name"
              placeholderTextColor={theme.text + "50"}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Price (₦) *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card, 
                color: theme.text, 
                borderColor: theme.border 
              }]}
              value={productForm.price}
              onChangeText={(text) => setProductForm({ ...productForm, price: text })}
              placeholder="Enter price"
              placeholderTextColor={theme.text + "50"}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryContainer}>
              {["general", "food", "electronics", "clothing"].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    {
                      borderColor: theme.border,
                      backgroundColor: productForm.category === category ? theme.primary : theme.card,
                    },
                  ]}
                  onPress={() => setProductForm({ ...productForm, category })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { color: productForm.category === category ? "#fff" : theme.text },
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
              style={[styles.input, { 
                backgroundColor: theme.card, 
                color: theme.text, 
                borderColor: theme.border 
              }]}
              value={productForm.quantity}
              onChangeText={(text) => setProductForm({ ...productForm, quantity: text })}
              placeholder="Enter quantity"
              placeholderTextColor={theme.text + "50"}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Stock Status</Text>
            <TouchableOpacity
              style={[
                styles.stockToggle,
                {
                  backgroundColor: productForm.inStock ? theme.primary + "20" : "#FF6B6B" + "20",
                  borderColor: productForm.inStock ? theme.primary : "#FF6B6B",
                },
              ]}
              onPress={() => setProductForm({ ...productForm, inStock: !productForm.inStock })}
            >
              <Ionicons
                name={productForm.inStock ? "checkmark-circle" : "close-circle"}
                size={24}
                color={productForm.inStock ? theme.primary : "#FF6B6B"}
              />
              <Text 
                style={[
                  styles.stockToggleText, 
                  { color: productForm.inStock ? theme.primary : "#FF6B6B" }
                ]}
              >
                {productForm.inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { 
                  backgroundColor: theme.card, 
                  color: theme.text, 
                  borderColor: theme.border 
                }
              ]}
              value={productForm.description}
              onChangeText={(text) => setProductForm({ ...productForm, description: text })}
              placeholder="Enter product description"
              placeholderTextColor={theme.text + "50"}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={isEditingProduct ? handleEditProduct : handleAddProduct}
          >
            <Text style={styles.submitButtonText}>
              {isEditingProduct ? "Update Product" : "Add Product"}
            </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoriesContainer: {
    paddingVertical: 15,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  activeCategoryButton: {
    borderColor: "transparent",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  productsList: {
    padding: 20,
    paddingBottom: 40,
  },
  productItem: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  productActions: {
    flexDirection: "row",
  },
  productStockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  stockIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  stockText: {
    fontSize: 10,
    fontWeight: "600",
  },
  productCategory: {
    fontSize: 12,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  productQuantity: {
    fontSize: 12,
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
    marginBottom: 20,
  },
  addProductButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addProductButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  addProductContainer: {
    padding: 20,
    marginTop: 37,
    paddingBottom: 40,
  },
  backButton: {
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  addProductTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  categoryOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    margin: 5,
  },
  categoryOptionText: {
    fontSize: 14,
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
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
})

export default ProductsScreen