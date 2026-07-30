import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CompassIcon, HomeIcon, ProfileIcon, StatsIcon } from '@/components/icons';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { LearnStack } from './LearnStack';
import { StatsScreen } from '@/screens/stats/StatsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { useTheme } from '@/theme/useTheme';
import { strings } from '@/i18n/strings';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: strings.tabs.home,
          tabBarIcon: ({ color }) => <HomeIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnStack}
        options={{
          tabBarLabel: strings.tabs.learn,
          tabBarIcon: ({ color }) => (
            <CompassIcon size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: strings.tabs.stats,
          tabBarIcon: ({ color }) => <StatsIcon size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: strings.tabs.profile,
          tabBarIcon: ({ color }) => <ProfileIcon size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
