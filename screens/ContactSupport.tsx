import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

const ContactSupportScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [message, setMessage] = React.useState('');

  const isDark = theme.type === 'dark';
  const textColor = isDark ? theme.text : theme.text;
  const cardColor = isDark ? theme.card : theme.card;
  const borderColor = isDark ? theme.border : theme.border;

  const handleSendMessage = () => {
    Alert.alert('Message Sent', 'Thank you for contacting support. We will get back to you soon.');
    setMessage('');
    navigation.goBack();
  };

  const openPhone = () => Linking.openURL('tel:+1234567890');
  const openEmail = () => Linking.openURL('mailto:support@errandapp.com');
  const openWebsite = () => Linking.openURL('https://errandapp.com/support');

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
        <Text style={[styles.headerTitle, { color: textColor }]}>Contact Support</Text>
      </View>

      {/* Contact Methods */}
      <View style={[styles.contactMethodsContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Contact</Text>
        
        <TouchableOpacity 
          style={[styles.contactMethod, { borderColor }]}
          onPress={openPhone}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="call" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.contactText, { color: textColor }]}>Call Us: +1 (234) 567-890</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.contactMethod, { borderColor }]}
          onPress={openEmail}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="mail" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.contactText, { color: textColor }]}>Email Us: support@errandapp.com</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.contactMethod, { borderBottomWidth: 0 }]}
          onPress={openWebsite}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="globe" size={20} color={theme.primary} />
          </View>
          <Text style={[styles.contactText, { color: textColor }]}>Visit Help Center</Text>
          <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Message Form */}
      <View style={[styles.messageContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Send Us a Message</Text>
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: isDark ? '#2A2A2A' : '#FFF', 
            color: textColor,
            borderColor
          }]}
          placeholder="Your message..."
          placeholderTextColor={isDark ? '#888' : '#999'}
          multiline
          numberOfLines={5}
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: theme.primary }]}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Section */}
      <View style={[styles.faqContainer, { backgroundColor: cardColor, borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Frequently Asked Questions</Text>
        
        {[
          'How do I reset my password?',
          'What payment methods do you accept?',
          'How do I change my account type?',
          'Where can I see my order history?'
        ].map((question, index) => (
          <TouchableOpacity 
            key={index}
            style={[styles.faqItem, { 
              borderBottomWidth: index < 3 ? 1 : 0,
              borderColor 
            }]}
          >
            <Text style={[styles.faqText, { color: textColor }]}>{question}</Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 25,
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
  contactMethodsContainer: {
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
  },
  messageContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginTop: 20,
  },
  faqContainer: {
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
  },
  input: {
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
  },
  sendButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  faqText: {
    flex: 1,
    fontSize: 16,
  },
});

export default ContactSupportScreen;