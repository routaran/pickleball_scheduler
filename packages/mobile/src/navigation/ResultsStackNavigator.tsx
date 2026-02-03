/**
 * Results Stack Navigator
 * Handles navigation between Results screen and Report View screen
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ResultsScreen } from '../screens/ResultsScreen';
import { ReportViewScreen } from '../screens/ReportViewScreen';

const Stack = createNativeStackNavigator();

export function ResultsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ResultsList"
        component={ResultsScreen}
        options={{
          title: 'Results',
          headerShown: false, // Hide header since TabNavigator already shows one
        }}
      />
      <Stack.Screen
        name="ReportView"
        component={ReportViewScreen}
        options={{
          title: 'HTML Report',
          headerShown: true, // Show header for back navigation
        }}
      />
    </Stack.Navigator>
  );
}
