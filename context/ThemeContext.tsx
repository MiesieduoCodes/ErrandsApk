"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { ColorValue, useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ThemeMode = "light" | "dark" | "system"

export interface ThemeColors {
  [x: string]: ColorValue | undefined
  shadow: ColorValue | undefined
  textSecondary: string
  dark: any
  type: string
  primary: string
  secondary: string
  accent: string
  background: string
  card: string
  text: string
  border: string
}

interface ThemeContextType {
  theme: ThemeColors
  isDark: boolean
  themeMode: ThemeMode
   isDarkMode?: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const lightTheme: ThemeColors = {
  type: "light",
  primary: "#4CAF50", // Main green
  secondary: "#E8F5E9", // Very light green (background tint)
  accent: "#81C784", // Lighter green
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#333333",
  border: "#A5D6A7", // Light green border
  shadow: undefined,
  textSecondary: "",
  dark: undefined
}

const darkTheme: ThemeColors = {
  type: "dark",
  primary: "#388E3C", // Dark green
  secondary: "#1B5E20", // Darker green
  accent: "#66BB6A", // Slightly lighter green
  background: "#121212",
  card: "#1E1A16", // Dark card with green tint
  text: "#E0E0E0",
  border: "#4A3A2B", // Dark border (unchanged)
  shadow: undefined,
  textSecondary: "",
  dark: undefined
}
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  isDarkMode: false,
  themeMode: "system",
  setThemeMode: () => {},
  toggleTheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeMode] = useState<ThemeMode>("system")
  const [isDark, setIsDark] = useState(systemColorScheme === "dark")

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem("themeMode")
        if (savedThemeMode && ["light", "dark", "system"].includes(savedThemeMode)) {
          setThemeMode(savedThemeMode as ThemeMode)
        }
      } catch (error) {
        console.error("Error loading theme preference:", error)
      }
    }

    loadThemePreference()
  }, [])

  // Update isDark based on themeMode and system preference
  useEffect(() => {
    if (themeMode === "system") {
      setIsDark(systemColorScheme === "dark")
    } else {
      setIsDark(themeMode === "dark")
    }
  }, [themeMode, systemColorScheme])

  // Save theme preference when it changes
  const handleSetThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode)
      setThemeMode(mode)
    } catch (error) {
      console.error("Error saving theme preference:", error)
    }
  }

  const toggleTheme = () => {
    const newMode = themeMode === "light" ? "dark" : "light"
    handleSetThemeMode(newMode)
  }

  const theme = isDark ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        themeMode,
        setThemeMode: handleSetThemeMode,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}