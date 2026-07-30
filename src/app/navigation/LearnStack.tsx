import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TrackOverviewScreen } from '@/screens/learn/TrackOverviewScreen';
import { CategoryTopicsScreen } from '@/screens/learn/CategoryTopicsScreen';
import { AllDrillsScreen } from '@/screens/learn/AllDrillsScreen';
import type { LearnStackParamList } from './types';

const Stack = createNativeStackNavigator<LearnStackParamList>();

/** The Learn tab: track overview → category topics → the full drill catalog. */
export function LearnStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackOverview" component={TrackOverviewScreen} />
      <Stack.Screen name="CategoryTopics" component={CategoryTopicsScreen} />
      <Stack.Screen name="AllDrills" component={AllDrillsScreen} />
    </Stack.Navigator>
  );
}
