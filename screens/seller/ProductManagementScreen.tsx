"use client"

import { useState } from "react"
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, Modal, ScrollView, Alert, StyleSheet } from "react-native"
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons"
import { useTheme, getThemeColors } from "../../context/ThemeContext"

// Mock data for products
const initialProducts = [
  {
    id: "1",
    name: "Fresh Tomatoes",
    price: 1500,
    quantity: 50,
    category: "Groceries",
    image: "https://via.placeholder.com/100",
    description: "Fresh, ripe tomatoes from local farms",
  },
  {
    id: "2",
    name: "Bread Loaf",
    price: 800,
    quantity: 20,
    category: "Bakery",
    image: "https://via.placeholder.com/100",
    description: "Freshly baked bread loaf",
  },
  {
    id: "3",
    name: "Chicken (Whole)",
    price: 3500,
    quantity: 15,
    category: "Meat",
    image: "https://via.placeholder.com/100",
    description: "Farm-raised whole chicken",
  },
]

// Product categories
const categories = ["All", "Groceries", "Bakery", "Meat", "Dairy", "Beverages", "Household", "Other"]

const ProductManagementScreen = () => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  const [products, setProducts] = useState(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // New product form state
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productCategory, setProductCategory] = useState('Groceries');
  const [productDescription, setProductDescription] = useState('');

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductQuantity('');
    setProductCategory('Groceries');
    setProductDescription('');
    setModalVisible(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductQuantity(product.quantity.toString());
    setProductCategory(product.category);
    setProductDescription(product.description);
    setModalVisible(true);
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            setProducts(products.filter((product) => product.id !== productId));
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSaveProduct = () => {
    if (!productName || !productPrice || !productQuantity) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (editingProduct) {
      // Update existing product
      setProducts(
        products.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                name: productName,
                price: Number.parseFloat(productPrice),
                quantity: Number.parseInt(productQuantity),
                category: productCategory,
                description: productDescription,
              }
            : product
        )
      );
    } else {
      // Add new product
      const newProduct = {
        id: Date.now().toString(),
        name: productName,
        price: Number.parseFloat(productPrice),
        quantity: Number.parseInt(productQuantity),
        category: productCategory,
        image: 'https://via.placeholder.com/100',
        description: productDescription,
      };
      setProducts([...products, newProduct]);
    }

    setModalVisible(false);
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <View style={[styles.productItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>₦{item.price.toLocaleString()}</Text>
        <View style={styles.productMeta}>
          <Text style={[styles.productQuantity, { color: colors.text }]}>
            Qty: {item.quantity}
          </Text>
          <Text style={[styles.productCategory, { color: colors.placeholder }]}>
            {item.category}
          </Text>
        </View>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={() => handleEditProduct(item)}
        >
          <Feather name="edit-2" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => handleDeleteProduct(item.id)}
        >
          <Feather name="trash-2" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Product Management</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              {
                backgroundColor:
                  selectedCategory === category ? colors.primary : 'transparent',
                borderColor: colors.primary,
              },
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                { color: selectedCategory === category ? '#FFFFFF' : colors.primary },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inventory" size={64} color={colors.placeholder} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No products found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>
              Add your first product to get started
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Product Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  placeholder="Enter product name"
                  placeholderTextColor={colors.placeholder}
                  value={productName}
                  onChangeText={setProductName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Price (₦)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    value={productPrice}
                    onChangeText={setProductPrice}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Quantity</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    value={productQuantity}
                    onChangeText={setProductQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryPickerContent}
                  >
                    {categories.slice(1).map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryPickerItem,
                          {
                            backgroundColor:
                              productCategory === category ? colors.primary : 'transparent',
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() => setProductCategory(category)}
                      >
                        <Text
                          style={[
                            styles.categoryPickerText,
                            {
                              color:
                                productCategory === category ? '#FFFFFF' : colors.primary,
                            },
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.textArea,
                    { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
                  ]}
                  placeholder="Enter product description"
                  placeholderTextColor={colors.placeholder}
                  value={productDescription}
                  onChangeText={setProductDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveProduct}
              >
                <Text style={styles.saveButtonText}>
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: 24,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontWeight: '500',
  },
  productsList: {
    paddingBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productQuantity: {
    fontSize: 14,
  },
  productCategory: {
    fontSize: 14,
  },
  productActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalForm: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  categoryPickerContent: {
    paddingVertical: 4,
  },
  categoryPickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPickerText: {
    fontWeight: '500',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProductManagementScreen;