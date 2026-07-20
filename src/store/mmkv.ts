import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

// Non-sensitive persistence only (settings, cached payloads). Tokens live in
// the Keychain (lib/tokenStorage.ts), never here.
export const storage = createMMKV({ id: 'architecto' });

export const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};
