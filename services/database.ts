import { ref, set, get, update, query, orderByChild, equalTo, push } from "firebase/database"
import { database, auth } from "../firebase/config"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { UserType } from "../context/AuthContext"

// User Services
export const userService = {
  // Create or update user
  async upsertUser(userData: {
    firebaseUid: string
    email: string
    name?: string
    photoUrl?: string
    userType: UserType
    phone?: string
    isVerified?: boolean
    verificationLevel?: number
  }) {
    const { firebaseUid, email, name, photoUrl, userType, phone, isVerified, verificationLevel } = userData

    try {
      await set(ref(database, `users/${firebaseUid}`), {
        email,
        name: name || "",
        photoURL: photoUrl || "",
        userType,
        phone: phone || "",
        isVerified: isVerified || false,
        verificationLevel: verificationLevel || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Save user type to AsyncStorage for quick access
      await AsyncStorage.setItem("userType", userType)

      return { id: firebaseUid, ...userData }
    } catch (error) {
      console.error("Error upserting user:", error)
      throw error
    }
  },

  // Get user by Firebase UID
  async getUserByFirebaseUid(uid: string) {
    try {
      const snapshot = await get(ref(database, `users/${uid}`))
      if (snapshot.exists()) {
        return {
          id: uid,
          ...snapshot.val(),
        }
      }
      return null
    } catch (error) {
      console.error("Error getting user:", error)
      throw error
    }
  },

  // Update user type
  async updateUserType(uid: string, userType: UserType) {
    try {
      await update(ref(database, `users/${uid}`), {
        userType,
        updatedAt: new Date().toISOString(),
      })

      // Update AsyncStorage
      await AsyncStorage.setItem("userType", userType)

      return true
    } catch (error) {
      console.error("Error updating user type:", error)
      throw error
    }
  },

  // Update user profile
  async updateUserProfile(uid: string, profileData: any) {
    try {
      await update(ref(database, `users/${uid}`), {
        ...profileData,
        updatedAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  },

  // Get user settings
  async getUserSettings(uid: string) {
    try {
      const snapshot = await get(ref(database, `userSettings/${uid}`))
      if (snapshot.exists()) {
        return snapshot.val()
      }
      return null
    } catch (error) {
      console.error("Error getting user settings:", error)
      throw error
    }
  },

  // Update user settings
  async upsertUserSettings(uid: string, settings: any) {
    try {
      const userSettingsRef = ref(database, `userSettings/${uid}`)
      const snapshot = await get(userSettingsRef)

      if (snapshot.exists()) {
        await update(userSettingsRef, {
          ...settings,
          updatedAt: new Date().toISOString(),
        })
      } else {
        await set(userSettingsRef, {
          ...settings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      return true
    } catch (error) {
      console.error("Error updating user settings:", error)
      throw error
    }
  },

  // Get user saved addresses
  async getUserAddresses(uid: string) {
    try {
      const snapshot = await get(ref(database, `userAddresses/${uid}`))
      if (!snapshot.exists()) {
        return []
      }

      const addresses: Array<{
        id: string
        name: string
        address: string
        latitude: number
        longitude: number
        isDefault?: boolean
        createdAt?: string
      }> = []

      snapshot.forEach((childSnapshot) => {
        addresses.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      return addresses
    } catch (error) {
      console.error("Error getting user addresses:", error)
      throw error
    }
  },

  // Add user address
  async addUserAddress(
    uid: string,
    address: {
      name: string
      address: string
      latitude: number
      longitude: number
      isDefault?: boolean
    },
  ) {
    try {
      const addressesRef = ref(database, `userAddresses/${uid}`)
      const newAddressRef = push(addressesRef)

      await set(newAddressRef, {
        ...address,
        createdAt: new Date().toISOString(),
      })

      // If this is the default address, update other addresses
      if (address.isDefault) {
        const snapshot = await get(addressesRef)
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            if (childSnapshot.key !== newAddressRef.key) {
              update(ref(database, `userAddresses/${uid}/${childSnapshot.key}`), {
                isDefault: false,
              })
            }
          })
        }
      }

      return {
        id: newAddressRef.key,
        ...address,
      }
    } catch (error) {
      console.error("Error adding user address:", error)
      throw error
    }
  },

  // Update user address
  async updateUserAddress(
    uid: string,
    addressId: string,
    address: {
      name?: string
      address?: string
      latitude?: number
      longitude?: number
      isDefault?: boolean
    },
  ) {
    try {
      await update(ref(database, `userAddresses/${uid}/${addressId}`), {
        ...address,
        updatedAt: new Date().toISOString(),
      })

      // If this is the default address, update other addresses
      if (address.isDefault) {
        const addressesRef = ref(database, `userAddresses/${uid}`)
        const snapshot = await get(addressesRef)
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            if (childSnapshot.key !== addressId) {
              update(ref(database, `userAddresses/${uid}/${childSnapshot.key}`), {
                isDefault: false,
              })
            }
          })
        }
      }

      return true
    } catch (error) {
      console.error("Error updating user address:", error)
      throw error
    }
  },

  // Delete user address
  async deleteUserAddress(uid: string, addressId: string) {
    try {
      await set(ref(database, `userAddresses/${uid}/${addressId}`), null)
      return true
    } catch (error) {
      console.error("Error deleting user address:", error)
      throw error
    }
  },

  // Get user favorite runners
  async getUserFavoriteRunners(uid: string) {
    try {
      const snapshot = await get(ref(database, `userFavorites/${uid}/runners`))
      if (!snapshot.exists()) {
        return []
      }

      const favoriteRunners: Array<{
        id: string
        name?: string
        email?: string
        photoURL?: string
        userType?: string
        [key: string]: any
      }> = []

      const promises: Promise<void>[] = []

      snapshot.forEach((childSnapshot) => {
        const runnerId = childSnapshot.key
        promises.push(
          this.getUserByFirebaseUid(runnerId).then((runner) => {
            if (runner) {
              favoriteRunners.push(runner)
            }
          }),
        )
      })

      await Promise.all(promises)
      return favoriteRunners
    } catch (error) {
      console.error("Error getting user favorite runners:", error)
      throw error
    }
  },

  // Add user favorite runner
  async addUserFavoriteRunner(uid: string, runnerId: string) {
    try {
      await set(ref(database, `userFavorites/${uid}/runners/${runnerId}`), {
        addedAt: new Date().toISOString(),
      })
      return true
    } catch (error) {
      console.error("Error adding user favorite runner:", error)
      throw error
    }
  },

  // Remove user favorite runner
  async removeUserFavoriteRunner(uid: string, runnerId: string) {
    try {
      await set(ref(database, `userFavorites/${uid}/runners/${runnerId}`), null)
      return true
    } catch (error) {
      console.error("Error removing user favorite runner:", error)
      throw error
    }
  },
}

// Location Services
export const locationService = {
  // Update user location
  async updateUserLocation(uid: string, location: { latitude: number; longitude: number }) {
    try {
      await update(ref(database, `users/${uid}`), {
        location: {
          ...location,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating user location:", error)
      throw error
    }
  },

  // Get nearby users
  async getNearbyUsers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    currentUserId: string,
    userType?: UserType,
  ) {
    try {
      // In a real app, you would use a geospatial query
      // For Firebase Realtime Database, we'll fetch all users and filter client-side
      const snapshot = await get(ref(database, "users"))

      if (!snapshot.exists()) {
        return []
      }

      const users: Array<{
        id: string
        distance: number
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val()
        const userId = childSnapshot.key

        // Skip current user
        if (userId === currentUserId) {
          return
        }

        // Filter by user type if specified
        if (userType && user.userType !== userType) {
          return
        }

        // Skip users without location
        if (!user.location) {
          return
        }

        // Calculate distance (using Haversine formula)
        const distance = calculateDistance(latitude, longitude, user.location.latitude, user.location.longitude)

        // Only include users within the radius
        if (distance <= radiusKm) {
          users.push({
            id: userId,
            ...user,
            distance,
          })
        }
      })

      // Sort by distance
      return users.sort((a, b) => a.distance - b.distance)
    } catch (error) {
      console.error("Error getting nearby users:", error)
      throw error
    }
  },

  // Get nearby sellers
  async getNearbySellers(latitude: number, longitude: number, radiusKm: number, currentUserId: string) {
    return this.getNearbyUsers(latitude, longitude, radiusKm, currentUserId, "seller")
  },

  // Get nearby runners
  async getNearbyRunners(latitude: number, longitude: number, radiusKm: number, currentUserId: string) {
    return this.getNearbyUsers(latitude, longitude, radiusKm, currentUserId, "runner")
  },
}

// Errand Services
export const errandService = {
  // Create new errand
  async createErrand(errandData: {
    buyerId: string
    errandType: string
    description: string
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
    priceEstimate?: number
  }) {
    try {
      // Generate a random 6-character transaction code
      const transactionCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const errandsRef = ref(database, "errands")
      const newErrandRef = push(errandsRef)

      const errand = {
        buyerId: errandData.buyerId,
        errandType: errandData.errandType,
        description: errandData.description,
        pickup: errandData.pickupLocation.address,
        pickupLocation: {
          latitude: errandData.pickupLocation.latitude,
          longitude: errandData.pickupLocation.longitude,
        },
        dropoff: errandData.dropoffLocation.address,
        dropoffLocation: {
          latitude: errandData.dropoffLocation.latitude,
          longitude: errandData.dropoffLocation.longitude,
        },
        priceEstimate: errandData.priceEstimate || 0,
        status: "pending",
        transactionCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await set(newErrandRef, errand)

      return {
        id: newErrandRef.key,
        transaction_code: transactionCode,
        ...errand,
      }
    } catch (error) {
      console.error("Error creating errand:", error)
      throw error
    }
  },

  // Get errand by transaction code
  async getErrandByTransactionCode(code: string) {
    try {
      const errandsRef = ref(database, "errands")
      const errandQuery = query(errandsRef, orderByChild("transactionCode"), equalTo(code))
      const snapshot = await get(errandQuery)

      if (snapshot.exists()) {
        let errand = null
        snapshot.forEach((childSnapshot) => {
          errand = {
            id: childSnapshot.key,
            ...childSnapshot.val(),
          }
        })
        return errand
      }

      return null
    } catch (error) {
      console.error("Error getting errand by code:", error)
      throw error
    }
  },

  // Get errands by user
  async getErrandsByUser(userId: string, userType: UserType) {
    try {
      const errandsRef = ref(database, "errands")
      let errandQuery

      if (userType === "buyer") {
        errandQuery = query(errandsRef, orderByChild("buyerId"), equalTo(userId))
      } else if (userType === "runner") {
        errandQuery = query(errandsRef, orderByChild("runnerId"), equalTo(userId))
      } else {
        // For sellers or admins, return all errands
        errandQuery = errandsRef
      }

      const snapshot = await get(errandQuery)

      if (!snapshot.exists()) {
        return []
      }

      const errands: Array<{
        id: string
        status: string
        createdAt: string
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        errands.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      // Sort by creation date (newest first)
      return errands.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("Error getting errands by user:", error)
      throw error
    }
  },

  // Update errand status
  async updateErrandStatus(errandId: string, status: string, userId: string) {
    try {
      await update(ref(database, `errands/${errandId}`), {
        status,
        updatedAt: new Date().toISOString(),
        ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
      })

      // Add status history
      const historyRef = push(ref(database, `errandStatusHistory`))
      await set(historyRef, {
        errandId,
        status,
        changedBy: userId,
        createdAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating errand status:", error)
      throw error
    }
  },

  // Update errand with payment information
  async updateErrandPayment(errandId: string, paymentId: string): Promise<void> {
    try {
      await update(ref(database, `errands/${errandId}`), {
        paymentId,
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating errand payment:", error)
      throw error
    }
  },

  // Get errand by ID
  async getErrandById(errandId: string): Promise<any> {
    try {
      const errandRef = ref(database, `errands/${errandId}`)
      const snapshot = await get(errandRef)

      if (snapshot.exists()) {
        return {
          id: snapshot.key,
          ...snapshot.val(),
        }
      }

      return null
    } catch (error) {
      console.error("Error getting errand by ID:", error)
      throw error
    }
  },

  // Get recent errands
  async getRecentErrands(userId: string, limit = 5) {
    try {
      const errandsRef = ref(database, "errands")
      const errandQuery = query(errandsRef, orderByChild("buyerId"), equalTo(userId))
      const snapshot = await get(errandQuery)

      if (!snapshot.exists()) {
        return []
      }

      const errands: Array<{
        id: string
        createdAt: string
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        errands.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      // Sort by creation date (newest first) and limit
      return errands.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)
    } catch (error) {
      console.error("Error getting recent errands:", error)
      throw error
    }
  },
}

// Seller Services
export const sellerService = {
  // Get seller products
  async getSellerProducts(sellerId: string) {
    try {
      const productsRef = ref(database, `products`)
      const productQuery = query(productsRef, orderByChild("sellerId"), equalTo(sellerId))
      const snapshot = await get(productQuery)

      if (!snapshot.exists()) {
        return []
      }

      const products: Array<{
        id: string
        name: string
        description: string
        price: number
        category: string
        imageUrl?: string
        inStock: boolean
        quantity?: number
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        products.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      return products
    } catch (error) {
      console.error("Error getting seller products:", error)
      throw error
    }
  },

  // Add product
  async addProduct(
    sellerId: string,
    product: {
      name: string
      description: string
      price: number
      category: string
      imageUrl?: string
      inStock: boolean
      quantity?: number
    },
  ) {
    try {
      const productsRef = ref(database, "products")
      const newProductRef = push(productsRef)

      await set(newProductRef, {
        sellerId,
        ...product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      return {
        id: newProductRef.key,
        sellerId,
        ...product,
      }
    } catch (error) {
      console.error("Error adding product:", error)
      throw error
    }
  },

  // Update product
  async updateProduct(
productId: string, id: string, product: {
  name?: string
  description?: string
  price?: number
  category?: string
  imageUrl?: string
  inStock?: boolean
  quantity?: number
},
  ) {
    try {
      await update(ref(database, `products/${productId}`), {
        ...product,
        updatedAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating product:", error)
      throw error
    }
  },

  // Delete product
  async deleteProduct(productId?: string) {
    try {
      await set(ref(database, `products/${productId}`), null)
      return true
    } catch (error) {
      console.error("Error deleting product:", error)
      throw error
    }
  },

  // Get seller orders
  async getSellerOrders(sellerId: string) {
    try {
      const ordersRef = ref(database, `orders`)
      const orderQuery = query(ordersRef, orderByChild("sellerId"), equalTo(sellerId))
      const snapshot = await get(orderQuery)

      if (!snapshot.exists()) {
        return []
      }

      const orders: Array<{
        id: string
        status: string
        createdAt: string
        total: number
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        orders.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        })
      })

      // Sort by creation date (newest first)
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("Error getting seller orders:", error)
      throw error
    }
  },

  // Update order status - THIS IS THE MISSING METHOD
  async updateOrderStatus(orderId: string, newStatus: "pending" | "processing" | "ready" | "completed") {
    try {
      await update(ref(database, `orders/${orderId}`), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
      })

      // Add status history
      const historyRef = push(ref(database, `orderStatusHistory`))
      await set(historyRef, {
        orderId,
        status: newStatus,
        changedBy: auth.currentUser?.uid || "unknown",
        createdAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating order status:", error)
      throw error
    }
  },

  // Get sales summary
  async getSellerSalesSummary(sellerId: string) {
    try {
      const orders = await this.getSellerOrders(sellerId)

      // Calculate summary
      const totalSales = orders.reduce((total, order) => {
        if (order.status === "completed") {
          return total + order.total
        }
        return total
      }, 0)

      const totalOrders = orders.filter((order) => order.status === "completed").length

      // Get today's sales
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todaySales = orders.reduce((total, order) => {
        const orderDate = new Date(order.createdAt)
        if (order.status === "completed" && orderDate >= today) {
          return total + order.total
        }
        return total
      }, 0)

      // Get pending orders
      const pendingOrders = orders.filter((order) => ["pending", "processing"].includes(order.status)).length

      return {
        totalSales,
        totalOrders,
        todaySales,
        pendingOrders,
      }
    } catch (error) {
      console.error("Error getting sales summary:", error)
      throw error
    }
  },

  // Get inventory alerts
  async getInventoryAlerts(sellerId: string) {
    try {
      const products = await this.getSellerProducts(sellerId)

      // Find products with low inventory
      const lowInventory = products.filter((product) => {
        return product.quantity !== undefined && product.quantity <= 5 && product.inStock
      })

      // Find out of stock products
      const outOfStock = products.filter((product) => !product.inStock)

      return {
        lowInventory,
        outOfStock,
      }
    } catch (error) {
      console.error("Error getting inventory alerts:", error)
      throw error
    }
  },
}

// Runner Services
export const runnerService = {
  // Update runner availability
  async updateRunnerAvailability(runnerId: string, isAvailable: boolean) {
    try {
      await update(ref(database, `users/${runnerId}`), {
        isAvailable,
        updatedAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error updating runner availability:", error)
      throw error
    }
  },

  // Get available errands for runner
  async getAvailableErrands(runnerId: string, latitude: number, longitude: number, radiusKm = 10) {
    try {
      const errandsRef = ref(database, "errands")
      const errandQuery = query(errandsRef, orderByChild("status"), equalTo("pending"))
      const snapshot = await get(errandQuery)

      if (!snapshot.exists()) {
        return []
      }

      const errands: Array<{
        id: string
        distance: number
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        const errand = childSnapshot.val()

        // Skip errands that already have a runner
        if (errand.runnerId) {
          return
        }

        // Calculate distance to pickup location
        const distance = calculateDistance(
          latitude,
          longitude,
          errand.pickupLocation.latitude,
          errand.pickupLocation.longitude,
        )

        // Only include errands within the radius
        if (distance <= radiusKm) {
          errands.push({
            id: childSnapshot.key,
            ...errand,
            distance,
          })
        }
      })

      // Sort by distance
      return errands.sort((a, b) => a.distance - b.distance)
    } catch (error) {
      console.error("Error getting available errands:", error)
      throw error
    }
  },

  // Accept errand
  async acceptErrand(errandId: string, runnerId: string) {
    try {
      // Check if errand is still available
      const errand = await errandService.getErrandById(errandId)
      if (!errand || errand.status !== "pending" || errand.runnerId) {
        throw new Error("Errand is no longer available")
      }

      // Update errand with runner ID and status
      await update(ref(database, `errands/${errandId}`), {
        runnerId,
        status: "accepted",
        updatedAt: new Date().toISOString(),
      })

      // Add status history
      const historyRef = push(ref(database, `errandStatusHistory`))
      await set(historyRef, {
        errandId,
        status: "accepted",
        changedBy: runnerId,
        createdAt: new Date().toISOString(),
      })

      return true
    } catch (error) {
      console.error("Error accepting errand:", error)
      throw error
    }
  },

  // Get runner's daily earnings
  async getRunnerDailyEarnings(runnerId: string) {
    try {
      // Get completed errands for today
      const errandsRef = ref(database, "errands")
      const errandQuery = query(errandsRef, orderByChild("runnerId"), equalTo(runnerId))
      const snapshot = await get(errandQuery)

      if (!snapshot.exists()) {
        return {
          today: 0,
          week: 0,
          month: 0,
          total: 0,
          completedToday: 0,
          completedTotal: 0,
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      oneWeekAgo.setHours(0, 0, 0, 0)

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      oneMonthAgo.setHours(0, 0, 0, 0)

      let todayEarnings = 0
      let weekEarnings = 0
      let monthEarnings = 0
      let totalEarnings = 0
      let completedToday = 0
      let completedTotal = 0

      snapshot.forEach((childSnapshot) => {
        const errand = childSnapshot.val()

        if (errand.status === "completed") {
          const completedAt = new Date(errand.completedAt || errand.updatedAt)
          const earnings = errand.priceEstimate || 0

          totalEarnings += earnings
          completedTotal++

          if (completedAt >= today) {
            todayEarnings += earnings
            completedToday++
          }

          if (completedAt >= oneWeekAgo) {
            weekEarnings += earnings
          }

          if (completedAt >= oneMonthAgo) {
            monthEarnings += earnings
          }
        }
      })

      return {
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        total: totalEarnings,
        completedToday,
        completedTotal,
      }
    } catch (error) {
      console.error("Error getting runner earnings:", error)
      throw error
    }
  },

  // Get runner's pending errands
  async getRunnerPendingErrands(runnerId: string) {
    try {
      const errandsRef = ref(database, "errands")
      const errandQuery = query(errandsRef, orderByChild("runnerId"), equalTo(runnerId))
      const snapshot = await get(errandQuery)

      if (!snapshot.exists()) {
        return []
      }

      const pendingErrands: Array<{
        id: string
        status: string
        [key: string]: any
      }> = []

      snapshot.forEach((childSnapshot) => {
        const errand = childSnapshot.val()

        if (["accepted", "in_progress"].includes(errand.status)) {
          pendingErrands.push({
            id: childSnapshot.key,
            ...errand,
          })
        }
      })

      return pendingErrands
    } catch (error) {
      console.error("Error getting pending errands:", error)
      throw error
    }
  },
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km
  return distance
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Helper function to get the current user's database ID
export async function getCurrentUserId() {
  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error("No authenticated user")
  }

  const user = await userService.getUserByFirebaseUid(currentUser.uid)
  if (!user) {
    throw new Error("User not found in database")
  }

  return user.id
}

export default {
  userService,
  locationService,
  errandService,
  sellerService,
  runnerService,
  getCurrentUserId,
}
