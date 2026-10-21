import apiClient from '../../../services/apiClient';
import {
  EmergencySosAlert,
  TriggerSosPayload,
} from '../types/emergencySos.types';

export const emergencySosService = {
  /**
   * Trigger emergency SOS panic alert (1-tap resident action).
   */
  triggerSos: async (payload: TriggerSosPayload): Promise<EmergencySosAlert> => {
    const response: any = await apiClient.post('/emergency-sos', payload);
    return response?.data?.data || response?.data || response;
  },

  /**
   * Fetch current resident's active emergency SOS alert (if any).
   */
  getActiveSos: async (): Promise<EmergencySosAlert | null> => {
    const response: any = await apiClient.get('/emergency-sos/active');
    return response?.data?.data !== undefined ? response?.data?.data : (response?.data ?? null);
  },

  /**
   * Cancel active SOS (resident false alarm).
   */
  cancelSos: async (id: string): Promise<EmergencySosAlert> => {
    const response: any = await apiClient.patch(`/emergency-sos/${id}/cancel`);
    return response?.data?.data || response?.data || response;
  },

  /**
   * Fetch paginated list of alerts (for guard / security view).
   */
  listAlerts: async (params?: any) => {
    const response: any = await apiClient.get('/emergency-sos', { params });
    return response?.data || response;
  },
};

export default emergencySosService;
