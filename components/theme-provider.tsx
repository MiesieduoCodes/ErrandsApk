"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

type ThemeMode = "light" | "dark" | "system"

export interface ThemeColors {
  type: string
  primary: string
  secondary: string
  accent: string
  isDarkMode?: boolean
  background: string
  card: string
  text: string
  border: string
  placeholder: string
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
  primary: "#34D186",
  secondary: "#F5F5F5",
  accent: "#FF5252",
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#333333",
  border: "#E0E0E0",
  placeholder: "#8E8E93",
}

const darkTheme: ThemeColors = {
  type: "dark",
  primary: "#34D186",
  secondary: "#2A2A2A",
  accent: "#FF5252",
  background: "#121212",
  card: "#1E1E1E",
  text: "#F5F5F5",
  border: "#333333",
  placeholder: "#A8A8A8",
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  isDarkMode: false,
  themeMode: "system",
  setThemeMode: () => {},
  toggleTheme: () => {},
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
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
