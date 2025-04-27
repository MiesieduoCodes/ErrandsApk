// User types
export interface User {
  id: string
  name?: string
  email?: string
  photoURL?: string
  userType: UserType
}

export type UserType = "buyer" | "runner" | "seller"

// Errand types
export interface Errand {
  id: string
  buyerId: string
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  errandType: "shopping" | "food" | "documents" | "pharmacy" | "other"
  description: string
  pickupLocation: LocationWithAddress
  dropoffLocation: LocationWithAddress
  priceEstimate: number
  transactionCode: string
  createdAt: string
  pickup: string
  dropoff: string
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationWithAddress extends Coordinates {
  address: string
}

export interface SavedAddress {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface Runner {
  id: string
  name: string
  photoURL?: string
  rating?: number
  isAvailable: boolean
  location: Coordinates
}

// Navigation types
export type RootStackParamList = {
  Main: undefined
  AuthScreen: undefined
  Onboarding: undefined
  PasswordReset: undefined
  SwitchRole: undefined
  ErrandDetails: { errandId: string }
  RunnerProfile: { runnerId: string }
  Errands: undefined
  SavedAddresses: undefined
  FavoriteRunners: undefined
  Search: undefined
  ContactSupport: undefined
  Wallet: undefined
  Messages: undefined
  Notification: undefined
  TermsAndPrivacy: undefined
  TabNavigator: undefined;
  HelpCenterScreen: undefined;
  Chat: { chatId: string }
  IdentityVerification: undefined
  Payment: undefined
  RequestErrand: undefined // Add RequestErrand to navigation types
}
