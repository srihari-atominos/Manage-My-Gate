import apiClient from '../../../services/apiClient';
import storage from '../../../utils/storage';

export interface DeviceTokenPayload {
  pushToken: string;
  platform?: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
  appVersion?: string;
  versionCode?: number;
}

const CACHE_KEY_PREFIX = 'registered_push_token_';

export const deviceTokenService = {
  /**
   * Register or refresh a push notification device token on the backend.
   * Caches successful registration in local storage to prevent duplicate API requests.
   */
  async registerToken(payload: DeviceTokenPayload, userId?: string): Promise<any> {
    try {
      if (!payload?.pushToken || typeof payload.pushToken !== 'string') {
        console.warn('[DeviceTokenService] Cannot register device token: Invalid or empty pushToken provided.');
        return null;
      }

      const cleanToken = payload.pushToken.trim();
      if (!cleanToken) {
        console.warn('[DeviceTokenService] Cannot register device token: Empty pushToken string.');
        return null;
      }

      const cacheKey = userId ? `${CACHE_KEY_PREFIX}${userId}` : null;
      if (cacheKey) {
        const cached = await storage.getItem(cacheKey);
        if (cached === cleanToken) {
          console.log('[DeviceTokenService] Push token already registered and cached for current user; skipping redundant API call.');
          return { cached: true, pushToken: cleanToken };
        }
      }

      console.log('[DeviceTokenService] Submitting device push token to backend (/device-tokens)... Platform:', payload.platform || 'android');
      const response: any = await apiClient.post('/device-tokens', {
        ...payload,
        pushToken: cleanToken,
      });

      const responseData = response?.data || response;
      const isConfirmed = response?.status === 200 || response?.status === 201 || responseData?.success === true || !!responseData?._id || !!responseData?.data?._id;

      if (isConfirmed && cacheKey) {
        await storage.setItem(cacheKey, cleanToken);
        console.log('[DeviceTokenService] Push token successfully cached locally for user:', userId);
      }

      return responseData;
    } catch (err: any) {
      console.warn('[DeviceTokenService] Failed to register push token with backend:', err?.response?.data || err?.message || err);
      throw err;
    }
  },

  /**
   * Unregister / deactivate a device token on logout.
   */
  async unregisterToken(pushToken: string, userId?: string): Promise<any> {
    try {
      if (!pushToken) return null;
      const response = await apiClient.delete(`/device-tokens/${encodeURIComponent(pushToken)}`);
      if (userId) {
        await storage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
      }
      return response.data;
    } catch (err: any) {
      console.warn('[DeviceTokenService] Failed to unregister push token:', err?.message || err);
      return null;
    }
  },
};

export default deviceTokenService;
