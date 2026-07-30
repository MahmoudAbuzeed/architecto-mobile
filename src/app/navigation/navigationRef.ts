import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Container ref so non-React code (notification taps) can navigate. Wired onto
 * the NavigationContainer in App.tsx. Guard with `navigationRef.isReady()`
 * before dispatching from a cold start.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
