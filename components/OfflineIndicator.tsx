"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native"
import NetInfo from "@react-native-community/netinfo"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { syncOfflineData } from "../utils/offlineSync"
import { useAuth } from "../context/AuthContext"

const BANNER_HEIGHT = 60

const OfflineIndicator = () => {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [isOffline, setIsOffline] = useState(false)
  const [hasPendingSync, setHasPendingSync] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)

  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Animate banner slide in
  const showBanner = useCallback(() => {
    setBannerVisible(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [slideAnim])

  // Animate banner slide out
  const hideBanner = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -BANNER_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setBannerVisible(false))
  }, [slideAnim])

  // Check for pending sync data (replace with real logic)
  const checkPendingSync = useCallback(async () => {
    // TODO: Replace with actual check for pending offline data
    // Simulate pending sync for demo
    setHasPendingSync(true)
  }, [])

  // Sync offline data handler
  const handleSync = useCallback(async () => {
    if (!user) return
    setIsSyncing(true)
    try {
      await syncOfflineData(user.id)
      setHasPendingSync(false)
      // Announce sync success for accessibility
      AccessibilityInfo.announceForAccessibility("Data synchronized successfully.")
    } catch (error) {
      console.error("Error syncing data:", error)
      AccessibilityInfo.announceForAccessibility("Error syncing data.")
    } finally {
      setIsSyncing(false)
    }
  }, [user])

  // Listen to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable)
      setIsOffline(offline)

      if (!offline) {
        checkPendingSync()
      }

      // Show banner if offline or has pending sync
      if (offline || hasPendingSync) {
        showBanner()
      } else {
        hideBanner()
      }
    })

    return () => unsubscribe()
  }, [checkPendingSync, hasPendingSync, showBanner, hideBanner])

  // Auto-hide sync banner after 8 seconds if offline is false
  useEffect(() => {
    if (!isOffline && hasPendingSync) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        hideBanner()
      }, 8000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isOffline, hasPendingSync, hideBanner])

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -20 || Math.abs(gestureState.dx) > 20) {
          hideBanner()
        }
      },
    })
  ).current

  if (!bannerVisible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOffline ? "red" : theme.primary,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...panResponder.panHandlers}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.inner}>
        {isOffline && (
          <View style={styles.row}>
            <Ionicons name="cloud-offline" size={20} color="#fff" />
            <Text style={styles.text} accessibilityLabel="Offline status">
              You're offline. Changes will be saved locally.
            </Text>
          </View>
        )}
  
        {!isOffline && hasPendingSync && (
          <View style={styles.syncContainer}>
            <Text style={styles.text} accessibilityLabel="Pending sync notification">
              You have unsynchronized data.
            </Text>
            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleSync}
              disabled={isSyncing}
              accessibilityLabel="Sync data now"
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color="#fff" />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  )
  
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1000,
    elevation: 10,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 14,
    flexShrink: 1,
  },
  syncContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 10,
  },
  syncButtonText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 12,
  },
})

export default OfflineIndicator
