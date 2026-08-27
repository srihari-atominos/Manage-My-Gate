import * as SecureStore from 'expo-secure-store';

const memoryCache: Record<string, string> = {};

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
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
