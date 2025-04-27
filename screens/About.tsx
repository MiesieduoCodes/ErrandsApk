import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AboutAppScreen = () => {
  const { theme } = useTheme();
  const textColor = theme.text;
  const cardColor = theme.card;
  const borderColor = theme.border;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>About Errand App</Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <MaterialCommunityIcons name="information-outline" size={28} color={theme.primary} style={styles.icon} />
        <Text style={[styles.cardTitle, { color: textColor }]}>Our Story</Text>
        <Text style={[styles.cardText, { color: textColor }]}>
          Founded in 2023, Errand App connects local businesses with customers who need delivery services. 
          We're committed to supporting small businesses and making local commerce more accessible.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
        <MaterialCommunityIcons name="cellphone" size={28} color={theme.primary} style={styles.icon} />
        <Text style={[styles.cardTitle, { color: textColor }]}>App Version</Text>
        <Text style={[styles.versionText, { color: textColor }]}>v3.2.1 (Build 47)</Text>
        <Text style={[styles.updateText, { color: theme.primary }]}>Up to date</Text>
      </View>

      <View style={[styles.linksContainer, { borderColor }]}>
        <View style={styles.linkRow}>
          <Ionicons name="document-text-outline" size={22} color={textColor} />
          <Text style={[styles.linkText, { color: textColor }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={20} color={textColor} />
        </View>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <View style={styles.linkRow}>
          <Ionicons name="shield-checkmark-outline" size={22} color={textColor} />
          <Text style={[styles.linkText, { color: textColor }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={textColor} />
        </View>
      </View>

      <View style={[styles.socialContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.socialTitle, { color: textColor }]}>Connect With Us</Text>
        <View style={styles.socialIcons}>
          <Ionicons name="logo-twitter" size={28} color="#1DA1F2" style={styles.socialIcon} />
          <Ionicons name="logo-instagram" size={28} color="#E1306C" style={styles.socialIcon} />
          <Ionicons name="logo-facebook" size={28} color="#1877F2" style={styles.socialIcon} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    paddingTop: 90,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  icon: {
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
  },
  versionText: {
    fontSize: 16,
    marginBottom: 5,
  },
  updateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  linksContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  socialContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialIcon: {
    marginHorizontal: 15,
  },
});

export default AboutAppScreen;