import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import { database } from "../firebase/config"
import { ref, set, update } from "firebase/database"

// Types for offline data
export interface OfflineErrand {
  id?: string
  tempId?: string
  type: "create" | "update"
  data: any
  timestamp: number
  synced: boolean
  userType: "buyer" | "seller" | "runner"
}

export interface OfflineMessage {
  id?: string
  tempId?: string
  chatId: string
  data: any
  timestamp: number
  synced: boolean
}

export interface OfflineProfile {
  userId: string
  data: any
  timestamp: number
  synced: boolean
}

// Keys for AsyncStorage
const OFFLINE_ERRANDS_KEY = "offline_errands"
const OFFLINE_MESSAGES_KEY = "offline_messages"
const OFFLINE_PROFILES_KEY = "offline_profiles"

// Save data to AsyncStorage
export const saveOfflineData = async (key: string, data: any): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data)
    await AsyncStorage.setItem(key, jsonData)
  } catch (error) {
    console.error(`Error saving offline data for ${key}:`, error)
  }
}

// Get data from AsyncStorage
export const getOfflineData = async (key: string): Promise<any> => {
  try {
    const jsonData = await AsyncStorage.getItem(key)
    return jsonData ? JSON.parse(jsonData) : null
  } catch (error) {
    console.error(`Error getting offline data for ${key}:`, error)
    return null
  }
}

// Save errand for offline use
export const saveOfflineErrand = async (errand: OfflineErrand): Promise<string> => {
  try {
    // Generate a temporary ID if not provided
    if (!errand.id && !errand.tempId) {
      errand.tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }

    // Get existing offline errands
    const existingErrands = (await getOfflineData(OFFLINE_ERRANDS_KEY)) || []

    // Add new errand
    existingErrands.push(errand)

    // Save updated list
    await saveOfflineData(OFFLINE_ERRANDS_KEY, existingErrands)

    return errand.tempId || errand.id || ""
  } catch (error) {
    console.error("Error saving offline errand:", error)
    return ""
  }
}

// Save message for offline use
export const saveOfflineMessage = async (message: OfflineMessage): Promise<void> => {
  try {
    const existingMessages = (await getOfflineData(OFFLINE_MESSAGES_KEY)) || []
    existingMessages.push(message)
    await saveOfflineData(OFFLINE_MESSAGES_KEY, existingMessages)
  } catch (error) {
    console.error("Error saving offline message:", error)
  }
}

// Save profile updates for offline use
export const saveOfflineProfile = async (profile: OfflineProfile): Promise<void> => {
  try {
    const existingProfiles = (await getOfflineData(OFFLINE_PROFILES_KEY)) || []
    existingProfiles.push(profile)
    await saveOfflineData(OFFLINE_PROFILES_KEY, existingProfiles)
  } catch (error) {
    console.error("Error saving offline profile:", error)
  }
}

// Sync all offline data when connection is restored
export const syncOfflineData = async (userId: string): Promise<void> => {
  try {
    // Check if we're online
    const netInfo = await NetInfo.fetch()
    if (!netInfo.isConnected) {
      console.log("Cannot sync: Device is offline")
      return
    }

    // Sync errands
    const offlineErrands = (await getOfflineData(OFFLINE_ERRANDS_KEY)) || []
    const syncedErrands = []

    for (const errand of offlineErrands) {
      try {
        if (errand.synced) continue

        if (errand.type === "create") {
          // Create new errand in Firebase
          const errandRef = ref(database, `errands/${errand.id || ""}`)
          await set(errandRef, {
            ...errand.data,
            createdAt: errand.data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncedFromOffline: true,
          })
        } else if (errand.type === "update") {
          // Update existing errand
          const errandRef = ref(database, `errands/${errand.id}`)
          await update(errandRef, {
            ...errand.data,
            updatedAt: new Date().toISOString(),
            syncedFromOffline: true,
          })
        }

        // Mark as synced
        errand.synced = true
        syncedErrands.push(errand)
      } catch (error) {
        console.error(`Error syncing errand ${errand.id || errand.tempId}:`, error)
      }
    }

    // Update AsyncStorage with synced status
    await saveOfflineData(OFFLINE_ERRANDS_KEY, offlineErrands)

    console.log("Offline data sync completed")
  } catch (error) {
    console.error("Error syncing offline data:", error)
  }
}

// Listen for network changes and sync when online
export const setupOfflineSyncListener = (userId: string): (() => void) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncOfflineData(userId).catch((error) => {
        console.error("Error in auto-sync:", error)
      })
    }
  })

  return unsubscribe
}

// Clear synced offline data
export const clearSyncedOfflineData = async (): Promise<void> => {
  try {
    // Get existing data
    const offlineErrands = (await getOfflineData(OFFLINE_ERRANDS_KEY)) || []
    const offlineMessages = (await getOfflineData(OFFLINE_MESSAGES_KEY)) || []
    const offlineProfiles = (await getOfflineData(OFFLINE_PROFILES_KEY)) || []

    // Filter out synced items
    const pendingErrands = offlineErrands.filter((errand: OfflineErrand) => !errand.synced)
    const pendingMessages = offlineMessages.filter((message: OfflineMessage) => !message.synced)
    const pendingProfiles = offlineProfiles.filter((profile: OfflineProfile) => !profile.synced)

    // Save filtered lists
    await saveOfflineData(OFFLINE_ERRANDS_KEY, pendingErrands)
    await saveOfflineData(OFFLINE_MESSAGES_KEY, pendingMessages)
    await saveOfflineData(OFFLINE_PROFILES_KEY, pendingProfiles)
  } catch (error) {
    console.error("Error clearing synced offline data:", error)
  }
}
