import type { User } from "firebase/auth"

export type UserType = "buyer" | "seller" | "runner" | "admin"

export type ThemeType = "light" | "dark"

export interface ThemeColors {
  type: ThemeType
  background: string
  text: string
  primary: string
  secondary: string
  accent: string
  card: string
  border: string
}

export interface ThemeContextType {
  theme: ThemeColors
  toggleTheme: () => void
  isDark: boolean
}

export interface AuthContextType {
  user: User | null
  userType: UserType | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
  switchUserType: (newType: UserType) => Promise<void>
}
