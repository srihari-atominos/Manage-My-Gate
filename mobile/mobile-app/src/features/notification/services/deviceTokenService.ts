import apiClient from '../../../services/apiClient';
import storage from '../../../utils/storage';

export interface DeviceTokenPayload {
  pushToken: string;
  platform?: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
}

const CACHE_KEY_PREFIX = 'registered_push_token_';

export const deviceTokenService = {
  /**
   * Register or refresh a push notification device token on the backend.
   * Caches successful registration in local storage to prevent duplicate API requests.
   */
  async registerToken(payload: DeviceTokenPayload, userId?: string): Promise<any> {
    try {
      const cacheKey = userId ? `${CACHE_KEY_PREFIX}${userId}` : null;
      if (cacheKey) {
        const cached = await storage.getItem(cacheKey);
        if (cached === payload.pushToken) {
          console.log('[DeviceTokenService] Push token already registered and cached for user; skipping redundant API call.');
          return { cached: true, pushToken: payload.pushToken };
        }
      }

      console.log('[DeviceTokenService] Registering device token with backend API...');
      const response: any = await apiClient.post('/device-tokens', payload);
      const data = response?.data || response;

      if (cacheKey) {
        await storage.setItem(cacheKey, payload.pushToken);
      }

      return data;
    } catch (error) {
      console.warn('[DeviceTokenService] Failed to register push token with backend:', error);
      throw error;
    }
  },

  /**
   * Unregister / deactivate a push token on user logout.
   */
  async unregisterToken(pushToken: string, userId?: string): Promise<any> {
    try {
      if (userId) {
        await storage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      }
      const response: any = await apiClient.delete(`/device-tokens/${encodeURIComponent(pushToken)}`);
      return response?.data || response;
    } catch (error) {
      console.warn('[DeviceTokenService] Failed to unregister push token with backend:', error);
      throw error;
    }
  },
};

export default deviceTokenService;

