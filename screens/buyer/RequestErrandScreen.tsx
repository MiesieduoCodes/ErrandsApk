"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../../context/ThemeContext"

// Create the transaction code utility function inline
const generateTransactionCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const RequestErrandScreen = () => {
  const { theme, isDark } = useTheme()
  const navigation = useNavigation()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [budget, setBudget] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("wallet")
  const [urgency, setUrgency] = useState("normal")

  // Payment methods
  const paymentMethods = [
    { id: "wallet", label: "Wallet", icon: "wallet-outline" },
    { id: "bank", label: "Bank Transfer", icon: "card-outline" },
    { id: "cash", label: "Pay on Delivery", icon: "cash-outline" },
  ]

  // Urgency options
  const urgencyOptions = [
    { id: "low", label: "Low Priority", color: "#4CAF50" },
    { id: "normal", label: "Normal", color: "#2196F3" },
    { id: "high", label: "Urgent", color: "#FF9800" },
    { id: "asap", label: "ASAP", color: "#F44336" },
  ]

  const handleSubmit = () => {
    if (!title || !description || !location || !budget) {
      Alert.alert("Missing Information", "Please fill in all required fields")
      return
    }

    // Generate a transaction code for this errand
    const transactionCode = generateTransactionCode()

    // Here you would normally save the errand to your database
    Alert.alert(
      "Errand Requested",
      `Your errand has been requested successfully!

Transaction Code: ${transactionCode}

Keep this code safe - you'll need it to verify your errand with the runner.`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ],
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, styles.contentContainer]}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Request an Errand</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text + "80" }]}>Tell us what you need help with</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Errand Details</Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Title</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="What do you need help with?"
              placeholderTextColor={theme.text + "50"}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text }]}
              placeholder="Provide details about your errand"
              placeholderTextColor={theme.text + "50"}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Location</Text>
            <View style={styles.locationInput}>
              <TextInput
                style={[styles.input, { color: theme.text, flex: 1 }]}
                placeholder="Where should this errand be done?"
                placeholderTextColor={theme.text + "50"}
                value={location}
                onChangeText={setLocation}
              />
              <TouchableOpacity style={styles.locationButton}>
                <Ionicons name="location-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Budget</Text>
            <View style={styles.budgetInput}>
              <Text style={[styles.currencySymbol, { color: theme.text }]}>₦</Text>
              <TextInput
                style={[styles.input, { color: theme.text, flex: 1 }]}
                placeholder="0.00"
                placeholderTextColor={theme.text + "50"}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  {
                    backgroundColor: paymentMethod === method.id ? theme.primary : theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={paymentMethod === method.id ? "#FFFFFF" : theme.text}
                />
                <Text style={[styles.paymentLabel, { color: paymentMethod === method.id ? "#FFFFFF" : theme.text }]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Urgency</Text>
          <View style={styles.urgencyOptions}>
            {urgencyOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.urgencyOption,
                  {
                    borderColor: option.color,
                    backgroundColor: urgency === option.id ? option.color : "transparent",
                  },
                ]}
                onPress={() => setUrgency(option.id)}
              >
                <Text style={[styles.urgencyLabel, { color: urgency === option.id ? "#FFFFFF" : option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Request Errand</Text>
          <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    fontSize: 16,
  },
  textArea: {
    fontSize: 16,
    height: 100,
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationButton: {
    marginLeft: 8,
  },
  budgetInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
  paymentOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  paymentLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  urgencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  urgencyOption: {
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    minWidth: "48%",
    alignItems: "center",
  },
  urgencyLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
})

export default RequestErrandScreen
