"use client"

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { runnerService } from "../../services/database"

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  completedToday: number;
  completedTotal: number;
}

interface Payment {
  id: string;
  type: 'errand' | 'bonus';
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  errandType?: string;
  distance?: number;
  description?: string;
}

type Timeframe = 'day' | 'week' | 'month' | 'year';

const EarningsScreen = () => {
  const { user } = useAuth()
  const { theme, isDark } = useTheme()

  const [isLoading, setIsLoading] = useState(true)
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    completedToday: 0,
    completedTotal: 0,
  })
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("week")

  useEffect(() => {
    if (!user) return

    const loadEarningsData = async () => {
      try {
        setIsLoading(true)

        // Load earnings data
        const earningsData = await runnerService.getRunnerDailyEarnings(user.id)
        setEarnings({
          today: earningsData.today || 0,
          week: earningsData.week || 0,
          month: earningsData.month || 0,
          total: earningsData.total || 0,
          completedToday: earningsData.completedToday || 0,
          completedTotal: earningsData.completedTotal || 0,
        })

        // Load recent payments (assuming a different method exists)
        // If getRunnerRecentPayments doesn't exist, you'll need to implement it
        // For now, we'll use an empty array
        setRecentPayments([])
      } catch (error) {
        console.error("Error loading earnings data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEarningsData()
  }, [user])

  const renderTimeframeButton = (timeframe: Timeframe, label: string) => (
    <TouchableOpacity
      style={[
        styles.timeframeButton,
        activeTimeframe === timeframe && styles.activeTimeframeButton,
        {
          backgroundColor: activeTimeframe === timeframe ? theme.primary : theme.card,
          borderColor: theme.border,
        },
      ]}
      onPress={() => setActiveTimeframe(timeframe)}
    >
      <Text style={[styles.timeframeButtonText, { color: activeTimeframe === timeframe ? "#fff" : theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  const renderPaymentItem = (payment: Payment) => (
    <View key={payment.id} style={[styles.paymentItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentTypeContainer}>
          <Ionicons name="wallet-outline" size={20} color={theme.primary} />
          <Text style={[styles.paymentType, { color: theme.text }]}>
            {payment.type === "errand" ? "Errand Payment" : "Bonus Payment"}
          </Text>
        </View>
        <Text style={[styles.paymentDate, { color: theme.text + "80" }]}>{payment.date}</Text>
      </View>

      <View style={styles.paymentDetails}>
        {payment.type === "errand" && (
          <Text style={[styles.paymentDescription, { color: theme.text }]}>
            {payment.errandType} Errand - {payment.distance}km
          </Text>
        )}
        {payment.type === "bonus" && (
          <Text style={[styles.paymentDescription, { color: theme.text }]}>{payment.description}</Text>
        )}
      </View>

      <View style={styles.paymentFooter}>
        <Text style={[styles.paymentAmount, { color: theme.primary }]}>₦{payment.amount.toFixed(2)}</Text>
        <View
          style={[
            styles.paymentStatus,
            {
              backgroundColor: payment.status === "completed" ? "#4CAF50" + "20" : "#FF9800" + "20",
              borderColor: payment.status === "completed" ? "#4CAF50" : "#FF9800",
            },
          ]}
        >
          <Text style={[styles.paymentStatusText, { color: payment.status === "completed" ? "#4CAF50" : "#FF9800" }]}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading earnings data...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.earningsSummary, { backgroundColor: theme.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {activeTimeframe === "day"
              ? "Today's"
              : activeTimeframe === "week"
                ? "This Week's"
                : activeTimeframe === "month"
                  ? "This Month's"
                  : "Total"}{" "}
            Earnings
          </Text>
          <Text style={[styles.summaryAmount, { color: theme.primary }]}>
            ₦
            {(activeTimeframe === "day"
              ? earnings.today
              : activeTimeframe === "week"
                ? earnings.week
                : activeTimeframe === "month"
                  ? earnings.month
                  : earnings.total
            ).toFixed(2)}
          </Text>

          <View style={styles.timeframeButtons}>
            {renderTimeframeButton("day", "Day")}
            {renderTimeframeButton("week", "Week")}
            {renderTimeframeButton("month", "Month")}
            {renderTimeframeButton("year", "Year")}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{earnings.completedToday}</Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Today's Errands</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{earnings.completedTotal}</Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Total Errands</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="star" size={24} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>4.8</Text>
            <Text style={[styles.statLabel, { color: theme.text + "80" }]}>Rating</Text>
          </View>
        </View>

        <View style={styles.recentPaymentsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Payments</Text>

          {recentPayments.length > 0 ? (
            <View style={styles.paymentsContainer}>{recentPayments.map(renderPaymentItem)}</View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
              <Ionicons name="wallet-outline" size={50} color={theme.text + "50"} />
              <Text style={[styles.emptyText, { color: theme.text + "80" }]}>No recent payments found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  earningsSummary: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  timeframeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
  },
  activeTimeframeButton: {
    backgroundColor: "#34D186",
  },
  timeframeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(52, 209, 134, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  recentPaymentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  paymentsContainer: {
    gap: 15,
  },
  paymentItem: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentType: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentDetails: {
    marginBottom: 10,
  },
  paymentDescription: {
    fontSize: 14,
  },
  paymentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
})

export default EarningsScreen