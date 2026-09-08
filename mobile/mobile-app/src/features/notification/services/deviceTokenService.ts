import apiClient from '../../../services/apiClient';

export interface DeviceTokenPayload {
  pushToken: string;
  platform?: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
}

export const deviceTokenService = {
  /**
   * Register or refresh a push notification device token on the backend.
   */
  async registerToken(payload: DeviceTokenPayload): Promise<any> {
    try {
      const response: any = await apiClient.post('/device-tokens', payload);
      return response?.data || response;
    } catch (error) {
      console.warn('[DeviceTokenService] Failed to register push token with backend:', error);
      throw error;
    }
  },

  /**
   * Unregister / deactivate a push token on user logout.
   */
  async unregisterToken(pushToken: string): Promise<any> {
    try {
      const response: any = await apiClient.delete(`/device-tokens/${encodeURIComponent(pushToken)}`);
      return response?.data || response;
    } catch (error) {
      console.warn('[DeviceTokenService] Failed to unregister push token with backend:', error);
      throw error;
    }
  },
};

export default deviceTokenService;
