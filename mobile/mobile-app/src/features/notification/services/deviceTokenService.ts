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
        console.log('[DeviceTokenService] Device token registration confirmed by backend and cached locally.');
      } else if (!isConfirmed) {
        console.warn('[DeviceTokenService] Backend responded without clear registration confirmation:', responseData);
      }

      return responseData;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.message;
      console.warn(`[DeviceTokenService] Failed to register push token with backend (Status: ${status || 'Network/Timeout'}):`, message);
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

