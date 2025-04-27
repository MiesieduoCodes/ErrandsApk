import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const WalletPayoutsScreen = () => {
  const { theme } = useTheme();
  const [payoutMethod, setPayoutMethod] = useState('Bank Transfer');
  const [payoutDetails, setPayoutDetails] = useState({
    bankName: 'Chase Bank',
    accountNumber: '•••• •••• 4567',
    routingNumber: '•••••••890',
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Wallet & Payouts</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Manage your earnings and payment methods
        </Text>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>$1,245.50</Text>
        <TouchableOpacity style={styles.withdrawButton}>
          <Text style={styles.withdrawText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Payout Method</Text>
        <View style={styles.methodCard}>
          <MaterialCommunityIcons name="bank-outline" size={28} color={theme.text} />
          <View style={styles.methodInfo}>
            <Text style={[styles.methodName, { color: theme.text }]}>{payoutMethod}</Text>
            <Text style={[styles.methodDetails, { color: theme.secondaryText }]}>
              {payoutDetails.bankName} • {payoutDetails.accountNumber}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Payout History</Text>
        <View style={styles.historyItem}>
          <View style={styles.historyLeft}>
            <MaterialCommunityIcons name="bank-transfer-out" size={24} color={theme.primary} />
            <View style={styles.historyDetails}>
              <Text style={[styles.historyAmount, { color: theme.text }]}>$350.00</Text>
              <Text style={[styles.historyDate, { color: theme.secondaryText }]}>Jun 15, 2023</Text>
            </View>
          </View>
          <Text style={[styles.historyStatus, { color: '#4CAF50' }]}>Completed</Text>
        </View>
        <View style={styles.historyItem}>
          <View style={styles.historyLeft}>
            <MaterialCommunityIcons name="bank-transfer-out" size={24} color={theme.primary} />
            <View style={styles.historyDetails}>
              <Text style={[styles.historyAmount, { color: theme.text }]}>$275.50</Text>
              <Text style={[styles.historyDate, { color: theme.secondaryText }]}>May 28, 2023</Text>
            </View>
          </View>
          <Text style={[styles.historyStatus, { color: '#4CAF50' }]}>Completed</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.helpCard, { backgroundColor: theme.card }]}>
        <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
        <Text style={[styles.helpText, { color: theme.text }]}>Need help with payouts?</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 90,
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  withdrawButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  withdrawText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  methodInfo: {
    flex: 1,
    marginLeft: 15,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  methodDetails: {
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDetails: {
    marginLeft: 15,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  historyDate: {
    fontSize: 14,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  helpCard: {
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
});

export default WalletPayoutsScreen;