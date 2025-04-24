"use client"

import React, { useEffect, useState } from "react"
import { View, Image, StyleSheet, ActivityIndicator } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useTheme } from "../context/ThemeContext"

const SplashScreen = () => {
  const { theme } = useTheme()
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    // Show the logo for 6 flippin' seconds before showing the loader
    const timer = setTimeout(() => {
      setShowLoader(true)
    }, 6000) // Adjust the duration as needed

    return () => clearTimeout(timer) // Cleanup timer on unmount
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: theme?.primary || "#02A54D" }]}>
      <StatusBar style="light" />
      <Image
        source={require('../assets/logo.png')} // Adjust the path to your logo image
        style={styles.logo}
        resizeMode="contain" // Ensure the image scales correctly
      />
      {showLoader && (
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
})

export default SplashScreen