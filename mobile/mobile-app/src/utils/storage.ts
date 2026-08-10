import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryCache: Record<string, string> = {};

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryCache[key] || null;
      }
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        return await SecureStore.getItemAsync(key);
      }
    } catch (err) {
      console.warn(`SecureStore getItem failed for key: ${key}, falling back to memory.`, err);
    }
    return memoryCache[key] || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        memoryCache[key] = value;
        return;
      }
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (err) {
      console.warn(`SecureStore setItem failed for key: ${key}, falling back to memory.`, err);
    }
    memoryCache[key] = value;
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        delete memoryCache[key];
        return;
      }
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch (err) {
      console.warn(`SecureStore deleteItem failed for key: ${key}, falling back to memory.`, err);
    }
    delete memoryCache[key];
  },
};
export default storage;

