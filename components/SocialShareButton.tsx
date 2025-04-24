"use client"

import React from "react"
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { shareErrand, shareProfile, shareAppReferral } from "../services/socialSharing"
import { useAuth } from "../context/AuthContext"

interface SocialShareButtonProps {
  type: "errand" | "profile" | "referral"
  id?: string
  style?: any
  iconOnly?: boolean
  size?: "small" | "medium" | "large"
  onShareComplete?: (success: boolean) => void
}

const SocialShareButton: React.FC<SocialShareButtonProps> = ({
  type,
  id,
  style,
  iconOnly = false,
  size = "medium",
  onShareComplete,
}) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [isSharing, setIsSharing] = React.useState(false)

  const handleShare = async () => {
    if (!user) return

    setIsSharing(true)
    try {
      let success = false

      switch (type) {
        case "errand":
          if (id) {
            success = await shareErrand(id)
          }
          break
        case "profile":
          if (id) {
            // Get user details from your database
            // For this example, we'll use placeholder values
            success = await shareProfile(id, "User Name", "buyer")
          }
          break
        case "referral":
          success = await shareAppReferral(user.id, user.userType)
          break
      }

      if (onShareComplete) {
        onShareComplete(success)
      }
    } catch (error) {
      console.error("Error sharing:", error)
      if (onShareComplete) {
        onShareComplete(false)
      }
    } finally {
      setIsSharing(false)
    }
  }

  // Determine button size
  const buttonSize = {
    small: { width: 30, height: 30, iconSize: 16, fontSize: 12 },
    medium: { width: 40, height: 40, iconSize: 20, fontSize: 14 },
    large: { width: 50, height: 50, iconSize: 24, fontSize: 16 },
  }[size]

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.primary,
          width: iconOnly ? buttonSize.width : undefined,
          height: buttonSize.height,
          paddingHorizontal: iconOnly ? 0 : 15,
        },
        style,
      ]}
      onPress={handleShare}
      disabled={isSharing}
    >
      {isSharing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="share-social" size={buttonSize.iconSize} color="#fff" />
          {!iconOnly && (
            <Text style={[styles.text, { fontSize: buttonSize.fontSize }]}>
              {type === "errand" ? "Share Errand" : type === "profile" ? "Share Profile" : "Invite Friends"}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
})

export default SocialShareButton
