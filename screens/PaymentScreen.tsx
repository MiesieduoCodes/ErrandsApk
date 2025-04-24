"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { paymentService, type PaymentMethod } from "../services/payment"
import { errandService } from "../services/database"

const PaymentScreen = ({ route, navigation }) => {
  const { errandId, amount, receiverId } = route.params
  const { theme, isDark } = useTheme()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [savedCards, setSavedCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [errand, setErrand] = useState(null)

  // Card details for new card
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardHolderName, setCardHolderName] = useState("")
  const [saveCard, setSaveCard] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get errand details
        if (errandId) {
          const errandData = await errandService.getErrandById(errandId)
          setErrand(errandData)
        }

        // Get saved payment methods
        if (user?.id) {
          const paymentMethods = await paymentService.getSavedPaymentMethods(user.id)
          const cards = paymentMethods.filter((method) => method.type === "card")
          setSavedCards(cards)

          // Set default card if available
          const defaultCard = cards.find((card) => card.isDefault)
          if (defaultCard) {
            setSelectedCard(defaultCard)
          }
        }
      } catch (error) {
        console.error("Error fetching payment data:", error)
        Alert.alert("Error", "Failed to load payment information")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [errandId, user?.id])

  const handlePayment = async () => {
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to make a payment")
      return
    }

    try {
      setIsProcessing(true)

      // Create payment record
      const payment = await paymentService.createPayment({
        errandId,
        amount,
        currency: "NGN", // Nigerian Naira
        method: paymentMethod,
        payerId: user.id,
        receiverId: receiverId || "",
      })

      if (paymentMethod === "cash") {
        // For cash payments, just mark as pending and return
        Alert.alert("Cash Payment", "Please pay the runner in cash when your errand is completed.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ])
      } else if (paymentMethod === "card") {
        // For card payments, process with Flutterwave
        const result = await paymentService.processFlutterwavePayment(payment, {
          email: user.email,
          name: user.displayName || "User",
        })

        if (result.success) {
          // If user wants to save the card and it's a new card
          if (saveCard && !selectedCard && cardNumber && expiryDate) {
            const [expiryMonth, expiryYear] = expiryDate.split("/")
            await paymentService.savePaymentMethod(user.id, {
              type: "card",
              last4: cardNumber.slice(-4),
              expiryMonth,
              expiryYear,
              cardType: getCardType(cardNumber),
              isDefault: savedCards.length === 0, // Make default if it's the first card
            })
          }

          Alert.alert("Payment Successful", "Your payment has been processed successfully.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ])
        } else {
          Alert.alert("Payment Failed", result.error || "Failed to process payment")
        }
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      Alert.alert("Payment Error", "An error occurred while processing your payment")
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to determine card type from number
  const getCardType = (number: string): string => {
    const firstDigit = number.charAt(0)
    const firstTwoDigits = number.substring(0, 2)

    if (firstDigit === "4") return "Visa"
    if (firstTwoDigits >= "51" && firstTwoDigits <= "55") return "Mastercard"
    if (firstTwoDigits === "34" || firstTwoDigits === "37") return "American Express"
    return "Unknown"
  }

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned
    return formatted.substring(0, 19) // Limit to 16 digits + 3 spaces
  }

  // Format expiry date as MM/YY
  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "")
    if (cleaned.length >= 3) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`
    }
    return cleaned
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading payment options...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Payment</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.amountContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.amountLabel, { color: theme.text + "80" }]}>Amount to Pay</Text>
          <Text style={[styles.amount, { color: theme.text }]}>₦{amount.toFixed(2)}</Text>
          <Text style={[styles.errandInfo, { color: theme.text + "80" }]}>
            {errand?.errandType.charAt(0).toUpperCase() + errand?.errandType.slice(1)} Errand
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Method</Text>

        <View style={[styles.paymentMethodsContainer, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[
              styles.paymentMethodOption,
              paymentMethod === "cash" && styles.selectedPaymentMethod,
              {
                borderBottomColor: theme.border,
                backgroundColor: paymentMethod === "cash" ? theme.secondary : "transparent",
              },
            ]}
            onPress={() => setPaymentMethod("cash")}
          >
            <View style={styles.paymentMethodIcon}>
              <Ionicons name="cash-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: theme.text }]}>Cash</Text>
              <Text style={[styles.paymentMethodDescription, { color: theme.text + "80" }]}>
                Pay with cash on delivery
              </Text>
            </View>
            <View style={styles.paymentMethodRadio}>
              <View
                style={[styles.radioOuter, { borderColor: paymentMethod === "cash" ? theme.primary : theme.border }]}
              >
                {paymentMethod === "cash" && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodOption,
              paymentMethod === "card" && styles.selectedPaymentMethod,
              { backgroundColor: paymentMethod === "card" ? theme.secondary : "transparent" },
            ]}
            onPress={() => setPaymentMethod("card")}
          >
            <View style={styles.paymentMethodIcon}>
              <Ionicons name="card-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodTitle, { color: theme.text }]}>Card</Text>
              <Text style={[styles.paymentMethodDescription, { color: theme.text + "80" }]}>
                Pay with debit/credit card
              </Text>
            </View>
            <View style={styles.paymentMethodRadio}>
              <View
                style={[styles.radioOuter, { borderColor: paymentMethod === "card" ? theme.primary : theme.border }]}
              >
                {paymentMethod === "card" && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {paymentMethod === "card" && (
          <>
            {savedCards.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Cards</Text>
                <View style={[styles.savedCardsContainer, { backgroundColor: theme.card }]}>
                  {savedCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.savedCardOption,
                        selectedCard?.id === card.id && styles.selectedCard,
                        {
                          borderBottomColor: theme.border,
                          backgroundColor: selectedCard?.id === card.id ? theme.secondary : "transparent",
                        },
                      ]}
                      onPress={() => setSelectedCard(card)}
                    >
                      <View style={styles.cardTypeIcon}>
                        <Ionicons
                          name={
                            card.cardType === "Visa" ? "card" : card.cardType === "Mastercard" ? "card" : "card-outline"
                          }
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardType, { color: theme.text }]}>{card.cardType}</Text>
                        <Text style={[styles.cardNumber, { color: theme.text + "80" }]}>
                          •••• •••• •••• {card.last4}
                        </Text>
                        <Text style={[styles.cardExpiry, { color: theme.text + "80" }]}>
                          Expires {card.expiryMonth}/{card.expiryYear}
                        </Text>
                      </View>
                      <View style={styles.cardRadio}>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: selectedCard?.id === card.id ? theme.primary : theme.border },
                          ]}
                        >
                          {selectedCard?.id === card.id && (
                            <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.savedCardOption,
                      !selectedCard && styles.selectedCard,
                      {
                        backgroundColor: !selectedCard ? theme.secondary : "transparent",
                      },
                    ]}
                    onPress={() => setSelectedCard(null)}
                  >
                    <View style={styles.cardTypeIcon}>
                      <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardType, { color: theme.text }]}>Add New Card</Text>
                      <Text style={[styles.cardNumber, { color: theme.text + "80" }]}>Use a new debit/credit card</Text>
                    </View>
                    <View style={styles.cardRadio}>
                      <View style={[styles.radioOuter, { borderColor: !selectedCard ? theme.primary : theme.border }]}>
                        {!selectedCard && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {(!savedCards.length || !selectedCard) && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Card Details</Text>
                <View style={[styles.cardFormContainer, { backgroundColor: theme.card }]}>
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Card Number</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                      ]}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor={theme.text + "50"}
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                      maxLength={19}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={[styles.inputLabel, { color: theme.text }]}>Expiry Date</Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                        ]}
                        placeholder="MM/YY"
                        placeholderTextColor={theme.text + "50"}
                        keyboardType="numeric"
                        value={expiryDate}
                        onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                        maxLength={5}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: theme.text }]}>CVV</Text>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                        ]}
                        placeholder="123"
                        placeholderTextColor={theme.text + "50"}
                        keyboardType="numeric"
                        value={cvv}
                        onChangeText={setCvv}
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Card Holder Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                      ]}
                      placeholder="John Doe"
                      placeholderTextColor={theme.text + "50"}
                      value={cardHolderName}
                      onChangeText={setCardHolderName}
                    />
                  </View>

                  <TouchableOpacity style={styles.saveCardContainer} onPress={() => setSaveCard(!saveCard)}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: theme.border, backgroundColor: saveCard ? theme.primary : "transparent" },
                      ]}
                    >
                      {saveCard && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={[styles.saveCardText, { color: theme.text }]}>Save card for future payments</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: theme.primary }]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay ₦{amount.toFixed(2)}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.payButtonIcon} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.securePaymentInfo}>
          <Ionicons name="lock-closed" size={16} color={theme.text + "80"} />
          <Text style={[styles.securePaymentText, { color: theme.text + "80" }]}>
            Secure payment powered by Flutterwave
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  amountContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  amount: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
  },
  errandInfo: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  paymentMethodsContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  paymentMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  selectedPaymentMethod: {},
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 10,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  paymentMethodDescription: {
    fontSize: 14,
  },
  paymentMethodRadio: {
    marginLeft: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  savedCardsContainer: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },
  savedCardOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  selectedCard: {},
  cardTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  cardType: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
  },
  cardNumber: {
    fontSize: 14,
    marginBottom: 5,
  },
  cardExpiry: {
    fontSize: 12,
  },
  cardRadio: {
    marginLeft: 10,
  },
  cardFormContainer: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  saveCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  saveCardText: {
    fontSize: 14,
  },
  payButton: {
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  payButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  payButtonIcon: {
    marginLeft: 10,
  },
  securePaymentInfo: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  securePaymentText: {
    fontSize: 12,
    marginLeft: 5,
  },
})

export default PaymentScreen
