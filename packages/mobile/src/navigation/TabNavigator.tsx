import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GameScreen } from '../screens/GameScreen';
import { ResultsStackNavigator } from './ResultsStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Game"
        component={GameScreen}
        options={{
          title: 'Game Types',
          tabBarLabel: 'Game Types',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tennis" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Results"
        component={ResultsStackNavigator}
        options={{
          title: 'Results',
          tabBarLabel: 'Results',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
