import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const BusinessLocationsScreen = () => {
  const { theme } = useTheme();
  const [locations, setLocations] = useState([
    { id: 1, address: '123 Main Street, Cityville', isPrimary: true },
    { id: 2, address: '456 Market Avenue, Townsville', isPrimary: false },
  ]);
  const [newAddress, setNewAddress] = useState('');

  const addLocation = () => {
    if (newAddress.trim()) {
      setLocations([
        ...locations,
        { id: Date.now(), address: newAddress, isPrimary: false },
      ]);
      setNewAddress('');
    }
  };

  const removeLocation = (id: number) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const setPrimary = (id: number) => {
    setLocations(locations.map(loc => ({
      ...loc,
      isPrimary: loc.id === id,
    })));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Business Locations</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Manage your store locations
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Add new address"
          placeholderTextColor={theme.placeholderText}
          value={newAddress}
          onChangeText={setNewAddress}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={addLocation}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.locationsContainer}>
        {locations.map(location => (
          <View 
            key={location.id} 
            style={[styles.locationCard, { 
              backgroundColor: theme.card,
              borderColor: location.isPrimary ? theme.primary : theme.border,
            }]}
          >
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setPrimary(location.id)}
            >
              <Ionicons 
                name={location.isPrimary ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color={location.isPrimary ? theme.primary : theme.text} 
              />
              <Text style={[styles.primaryText, { 
                color: location.isPrimary ? theme.primary : theme.text 
              }]}>
                {location.isPrimary ? 'Primary Location' : 'Set as Primary'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.addressText, { color: theme.text }]}>
              {location.address}
            </Text>

            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => removeLocation(location.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 95,
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
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    fontSize: 16,
  },
  addButton: {
    width: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationsContainer: {
    marginBottom: 20,
  },
  locationCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 15,
    marginBottom: 15,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 15,
    marginBottom: 10,
  },
  deleteButton: {
    alignSelf: 'flex-end',
  },
});

export default BusinessLocationsScreen;