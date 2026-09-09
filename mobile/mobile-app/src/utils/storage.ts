import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryCache: Record<string, string | null> = {};
const sessionMemoryCache: Record<string, string> = {};

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (key in memoryCache) {
      return memoryCache[key];
    }
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const val = window.localStorage.getItem(key);
          memoryCache[key] = val;
          return val;
        }
      } catch (err) {
        console.warn(`localStorage getItem failed for key: ${key}`, err);
      }
      return null;
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        const val = await SecureStore.getItemAsync(key);
        memoryCache[key] = val;
        return val;
      }
    } catch (err) {
      console.warn(`SecureStore getItem failed for key: ${key}, falling back to memory.`, err);
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryCache[key] = value;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (err) {
        console.warn(`localStorage setItem failed for key: ${key}`, err);
      }
      return;
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (err) {
      console.warn(`SecureStore setItem failed for key: ${key}, falling back to memory.`, err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    delete memoryCache[key];
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (err) {
        console.warn(`localStorage removeItem failed for key: ${key}`, err);
      }
      return;
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch (err) {
      console.warn(`SecureStore deleteItem failed for key: ${key}, falling back to memory.`, err);
    }
  },
};

export const sessionStore = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        return window.sessionStorage.getItem(key);
      } catch (err) {
        console.warn(`sessionStorage getItem failed for key: ${key}`, err);
      }
    }
    return sessionMemoryCache[key] || null;
  },

  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        window.sessionStorage.setItem(key, value);
        return;
      } catch (err) {
        console.warn(`sessionStorage setItem failed for key: ${key}`, err);
      }
    }
    sessionMemoryCache[key] = value;
  },

  removeItem: (key: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        window.sessionStorage.removeItem(key);
        return;
      } catch (err) {
        console.warn(`sessionStorage removeItem failed for key: ${key}`, err);
      }
    }
    delete sessionMemoryCache[key];
  },
};

export default storage;
