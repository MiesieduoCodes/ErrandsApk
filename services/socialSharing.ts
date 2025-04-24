import { Share, Platform } from "react-native"
import * as Linking from "expo-linking"
import { errandService } from "./database"

// Base URL for deep links
const BASE_URL = "errandsapp://"

// Generate deep link for an errand
export const generateErrandDeepLink = (errandId: string): string => {
  return `${BASE_URL}errand/${errandId}`
}

// Generate deep link for a user profile
export const generateProfileDeepLink = (userId: string): string => {
  return `${BASE_URL}profile/${userId}`
}

// Generate deep link for referral
export const generateReferralDeepLink = (referrerId: string, userType: string): string => {
  return `${BASE_URL}signup?referrer=${referrerId}&type=${userType}`
}

// Share an errand
export const shareErrand = async (errandId: string, customMessage?: string): Promise<boolean> => {
  try {
    const errand = await errandService.getErrandById(errandId)
    if (!errand) {
      throw new Error("Errand not found")
    }

    const errandType = errand.errandType.charAt(0).toUpperCase() + errand.errandType.slice(1)
    const deepLink = generateErrandDeepLink(errandId)

    const message =
      customMessage || `Check out this ${errandType} errand on Errands App! From ${errand.pickup} to ${errand.dropoff}.`

    const result = await Share.share({
      message: Platform.OS === "ios" ? message : `${message} ${deepLink}`,
      url: deepLink, // iOS only
      title: "Share Errand",
    })

    return result.action !== Share.dismissedAction
  } catch (error) {
    console.error("Error sharing errand:", error)
    return false
  }
}

// Share a profile
export const shareProfile = async (userId: string, userName: string, userType: string): Promise<boolean> => {
  try {
    const deepLink = generateProfileDeepLink(userId)
    const userTypeCapitalized = userType.charAt(0).toUpperCase() + userType.slice(1)

    const message = `Check out ${userName}'s profile on Errands App! They're a trusted ${userTypeCapitalized}.`

    const result = await Share.share({
      message: Platform.OS === "ios" ? message : `${message} ${deepLink}`,
      url: deepLink, // iOS only
      title: "Share Profile",
    })

    return result.action !== Share.dismissedAction
  } catch (error) {
    console.error("Error sharing profile:", error)
    return false
  }
}

// Share app with referral
export const shareAppReferral = async (userId: string, userType: string): Promise<boolean> => {
  try {
    const deepLink = generateReferralDeepLink(userId, userType)

    const message = `Join me on Errands App! Use my referral link to sign up and get a discount on your first errand.`

    const result = await Share.share({
      message: Platform.OS === "ios" ? message : `${message} ${deepLink}`,
      url: deepLink, // iOS only
      title: "Invite Friends",
    })

    return result.action !== Share.dismissedAction
  } catch (error) {
    console.error("Error sharing app referral:", error)
    return false
  }
}

// Handle incoming deep links - Fixed to handle null paths
export const handleDeepLink = (url: string): { type: string; id: string; params?: any } | null => {
  try {
    // Safety check for empty URL
    if (!url) return null

    const parsedUrl = Linking.parse(url)
    const path = parsedUrl.path || ""
    const queryParams = parsedUrl.queryParams

    // If path is empty, check if we have query params for a referral
    if (path === "" && queryParams && queryParams.referrer) {
      return {
        type: "referral",
        id: queryParams.referrer as string,
        params: { userType: queryParams.type },
      }
    }

    if (path.includes("errand")) {
      const segments = path.split("/")
      const errandId = segments[segments.length - 1] || ""
      return { type: "errand", id: errandId }
    } else if (path.includes("profile")) {
      const segments = path.split("/")
      const userId = segments[segments.length - 1] || ""
      return { type: "profile", id: userId }
    } else if (path.includes("signup") && queryParams) {
      return {
        type: "referral",
        id: queryParams.referrer as string,
        params: { userType: queryParams.type },
      }
    }

    return null
  } catch (error) {
    console.error("Error handling deep link:", error)
    return null
  }
}

// Setup deep link listener
export const setupDeepLinkListener = (callback: (data: any) => void): (() => void) => {
  // Handle deep link if app was opened with one
  Linking.getInitialURL()
    .then((url) => {
      if (url) {
        const data = handleDeepLink(url)
        if (data) callback(data)
      }
    })
    .catch((error) => {
      console.error("Error getting initial URL:", error)
    })

  // Listen for deep links while app is running
  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (!url) return
    const data = handleDeepLink(url)
    if (data) callback(data)
  })

  return () => subscription.remove()
}
