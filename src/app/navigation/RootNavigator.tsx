import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/auth.store';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { EmailAuthScreen } from '@/screens/auth/EmailAuthScreen';
import { MainTabs } from './MainTabs';
import { RepSessionScreen } from '@/screens/rep/RepSessionScreen';
import { FeedbackScreen } from '@/screens/feedback/FeedbackScreen';
import { CelebrationScreen } from '@/screens/celebration/CelebrationScreen';
import { TrackPickerScreen } from '@/screens/learn/TrackPickerScreen';
import { DailyLessonScreen } from '@/screens/daily/DailyLessonScreen';
import { DailyQuizScreen } from '@/screens/daily/DailyQuizScreen';
import { PaywallScreen } from '@/screens/paywall/PaywallScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen
            name="EmailAuth"
            component={EmailAuthScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Group
            screenOptions={{
              // Card push (not fullScreenModal): UIKit modal dismissal races
              // Fabric reconciliation and can strand the screen with dead
              // touches (react-native-screens #3648/#4361).
              presentation: 'card',
              animation: 'slide_from_bottom',
              // A swipe must not kill a live rep — leaving is explicit (the X).
              gestureEnabled: false,
            }}
          >
            <Stack.Screen name="RepSession" component={RepSessionScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="Celebration" component={CelebrationScreen} />
          </Stack.Group>
          {/* Daily lesson: reading is safely dismissible (gestures on). */}
          <Stack.Screen
            name="DailyLesson"
            component={DailyLessonScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          {/* Quiz follows the lesson laterally; exit guarded by usePreventRemove. */}
          <Stack.Screen
            name="DailyQuiz"
            component={DailyQuizScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_right',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="TrackPicker"
            component={TrackPickerScreen}
            // Same card-not-modal presentation as the rep group (see above),
            // but a picker is safely dismissible — gestures stay on.
            options={{
              presentation: 'card',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          {/* Paywall: dismissible card (same pattern as TrackPicker). */}
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{
              presentation: 'card',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
