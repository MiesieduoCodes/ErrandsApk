import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const TermsAndPrivacyScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const isDark = theme.type === 'dark';
  const textColor = isDark ? theme.text : theme.text;
  const cardColor = isDark ? theme.card : theme.card;
  const borderColor = isDark ? theme.border : theme.border;

  const openExternalLink = (url: string) => Linking.openURL(url);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Terms & Privacy</Text>
      </View>

      {/* Main Content */}
      <View style={[styles.contentCard, { backgroundColor: cardColor, borderColor }]}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Text style={[styles.tabText, { color: theme.primary }]}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton}>
            <Text style={[styles.tabText, { color: textColor }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.lastUpdated, { color: textColor }]}>Last updated: June 2023</Text>

        <Text style={[styles.sectionTitle, { color: textColor }]}>1. Terms of Service</Text>
        <Text style={[styles.bodyText, { color: textColor }]}>
          By accessing or using the Errand App, you agree to be bound by these Terms. 
          If you disagree with any part of the terms, you may not access the service.
        </Text>

        <Text style={[styles.sectionTitle, { color: textColor }]}>2. User Responsibilities</Text>
        <Text style={[styles.bodyText, { color: textColor }]}>
          You are responsible for maintaining the confidentiality of your account and password. 
          You agree to accept responsibility for all activities that occur under your account.
        </Text>

        <Text style={[styles.sectionTitle, { color: textColor }]}>3. Prohibited Uses</Text>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="close-circle" size={16} color="#FF5252" style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Violating any laws or regulations</Text>
        </View>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="close-circle" size={16} color="#FF5252" style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Infringing intellectual property rights</Text>
        </View>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="close-circle" size={16} color="#FF5252" style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Harassing other users</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: textColor }]}>4. Privacy Policy</Text>
        <Text style={[styles.bodyText, { color: textColor }]}>
          We collect personal information to provide and improve our service. 
          Your data will not be shared with third parties except as described in this policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: textColor }]}>5. Data Collection</Text>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color={theme.primary} style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Account registration details</Text>
        </View>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color={theme.primary} style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Transaction history</Text>
        </View>
        <View style={styles.listItem}>
          <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color={theme.primary} style={styles.listIcon} />
          <Text style={[styles.listText, { color: textColor }]}>Device information for analytics</Text>
        </View>

        <TouchableOpacity 
          style={[styles.fullPolicyButton, { borderColor }]}
          onPress={() => openExternalLink('https://errandapp.com/terms')}
        >
          <Text style={[styles.fullPolicyText, { color: theme.primary }]}>View Full Policy Document</Text>
          <Ionicons name="open-outline" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={[styles.contactCard, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.contactTitle, { color: textColor }]}>Contact Us</Text>
        <Text style={[styles.contactText, { color: textColor }]}>
          For questions about these terms or our privacy practices:
        </Text>
        
        <TouchableOpacity 
          style={styles.contactMethod}
          onPress={() => openExternalLink('mailto:legal@errandapp.com')}
        >
          <Ionicons name="mail" size={20} color={theme.primary} style={styles.contactIcon} />
          <Text style={[styles.contactMethodText, { color: textColor }]}>legal@errandapp.com</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  contentCard: {
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 15,
  },
  tabButton: {
    paddingBottom: 10,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B00',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 12,
    marginBottom: 20,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  listIcon: {
    marginRight: 10,
  },
  listText: {
    fontSize: 15,
    flex: 1,
  },
  fullPolicyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 25,
  },
  fullPolicyText: {
    fontWeight: '500',
    marginRight: 8,
  },
  contactCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginTop: 15,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  contactIcon: {
    marginRight: 10,
  },
  contactMethodText: {
    fontSize: 15,
  },
});

export default TermsAndPrivacyScreen;