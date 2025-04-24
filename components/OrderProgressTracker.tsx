"use client"
import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"

type OrderProgressTrackerProps = {
  status: "pending" | "accepted" | "picked_up" | "on_the_way" | "delivered" | "completed"
}

const OrderProgressTracker = ({ status }: OrderProgressTrackerProps) => {
  const { theme } = useTheme()

  const steps = [
    { key: "accepted", label: "Accepted", icon: "checkmark-circle" },
    { key: "picked_up", label: "Picked Up", icon: "cube" },
    { key: "on_the_way", label: "On The Way", icon: "bicycle" },
    { key: "delivered", label: "Delivered", icon: "flag" },
  ]

  // Determine current step index
  const getCurrentStepIndex = () => {
    const statusIndex = steps.findIndex((step) => step.key === status)
    if (statusIndex === -1) {
      // If status is pending, return -1
      // If status is completed, return the last step index
      return status === "completed" ? steps.length - 1 : -1
    }
    return statusIndex
  }

  const currentStepIndex = getCurrentStepIndex()

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentStepIndex
        const isActive = index === currentStepIndex
        const isLast = index === steps.length - 1

        return (
          <View key={step.key} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isCompleted ? theme.primary : theme.card,
                    borderColor: isCompleted ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons name={step.icon as any} size={16} color={isCompleted ? "#fff" : theme.text + "50"} />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isActive ? theme.primary : isCompleted ? theme.text : theme.text + "50",
                    fontWeight: isActive ? "700" : "400",
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>

            {!isLast && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: index < currentStepIndex ? theme.primary : theme.border,
                  },
                ]}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepContent: {
    alignItems: "center",
    zIndex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  connector: {
    position: "absolute",
    top: 16,
    right: "-50%", // Keep as string with percentage
    left: "50%",   // Keep as string with percentage
    height: 2,
    zIndex: 0,
},
})

export default OrderProgressTracker
