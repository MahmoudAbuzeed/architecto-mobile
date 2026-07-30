/* eslint-env jest */
// Native modules mocked for unit tests — screens/hooks are exercised against
// these stubs; real-device behavior is covered by the manual smoke script.

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: jest.fn(() => ({
      getString: (k) => store.get(k),
      set: (k, v) => store.set(k, v),
      delete: (k) => store.delete(k),
      clearAll: () => store.clear(),
    })),
  };
});

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    removeAllListeners: jest.fn(),
    isAvailable: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {
    startPlayer: jest.fn().mockResolvedValue(''),
    stopPlayer: jest.fn().mockResolvedValue(''),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    config: jest.fn(() => ({ fetch: jest.fn() })),
    fs: {
      dirs: { CacheDir: '/tmp' },
      exists: jest.fn().mockResolvedValue(false),
      unlink: jest.fn(),
      ls: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  },
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue('daily-reminder'),
    createTriggerNotification: jest.fn().mockResolvedValue('daily-lesson-reminder'),
    cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onForegroundEvent: jest.fn(() => jest.fn()),
    onBackgroundEvent: jest.fn(),
  },
  TriggerType: { TIMESTAMP: 0, INTERVAL: 1 },
  RepeatFrequency: { NONE: -1, HOURLY: 0, DAILY: 1, WEEKLY: 2 },
  EventType: { DISMISSED: 0, PRESS: 1, DELIVERED: 3 },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  AndroidImportance: { NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 },
}));
