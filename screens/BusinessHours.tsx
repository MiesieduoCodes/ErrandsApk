import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const BusinessHoursScreen = () => {
  const { theme } = useTheme();
  const [hours, setHours] = useState([
    { day: 'Monday', open: true, start: '09:00', end: '17:00' },
    { day: 'Tuesday', open: true, start: '09:00', end: '17:00' },
    { day: 'Wednesday', open: true, start: '09:00', end: '17:00' },
    { day: 'Thursday', open: true, start: '09:00', end: '17:00' },
    { day: 'Friday', open: true, start: '09:00', end: '17:00' },
    { day: 'Saturday', open: false, start: '10:00', end: '14:00' },
    { day: 'Sunday', open: false, start: '10:00', end: '14:00' },
  ]);

  const toggleDay = (index: number) => {
    const newHours = [...hours];
    newHours[index].open = !newHours[index].open;
    setHours(newHours);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Business Hours</Text>
        <Text style={[styles.subtitle, { color: theme.secondary }]}>
          Set when customers can place orders
        </Text>
      </View>

      <View style={styles.hoursContainer}>
        {hours.map((day, index) => (
          <View key={day.day} style={[styles.dayRow, { borderBottomColor: theme.border }]}>
            <View style={styles.dayInfo}>
              <Text style={[styles.dayText, { color: theme.text }]}>{day.day}</Text>
              {day.open ? (
                <Text style={[styles.timeText, { color: theme.primary }]}>
                  {day.start} - {day.end}
                </Text>
              ) : (
                <Text style={[styles.closedText, { color: theme.secondary }]}>Closed</Text>
              )}
            </View>
            <Switch
              value={day.open}
              onValueChange={() => toggleDay(index)}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.switchThumb}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        onPress={() => console.log('Save hours')}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 15,
  },
  hoursContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
  },
  dayInfo: {
    flex: 1,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  timeText: {
    fontSize: 14,
  },
  closedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  saveButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BusinessHoursScreen;