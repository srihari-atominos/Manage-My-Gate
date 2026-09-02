import apiClient from '../../../services/apiClient';

export interface SecurityLogFilterParams {
  search?: string;
  status?: string;
  scanType?: string;
  amenityId?: string;
  dateRange?: string;
  page?: number;
  limit?: number;
}

export interface SecurityLog {
  _id: string;
  id?: string;
  residentId?: string;
  residentName?: string;
  residentPhoto?: string;
  amenityId?: string;
  amenityName?: string;
  guardId?: string;
  guardName?: string;
  bookingId?: string;
  bookingReference?: string;
  scanType: 'Entry' | 'Exit' | 'Denied' | 'Manual Verification' | 'Refund' | 'QR Expired' | 'Booking Cancelled' | string;
  status: 'Success' | 'Denied' | string;
  reason?: string;
  remarks?: string;
  scanTime: string;
  createdAt?: string;
}

export interface SecurityDashboardStats {
  entries: number;
  exits: number;
  denied: number;
  manualVerifications: number;
  cancelled: number;
  refunds: number;
  qrExpired: number;
}

export const fetchSecurityLogs = async (params?: SecurityLogFilterParams) => {
  const response: any = await apiClient.get('/security-logs', { params });
  return response?.logs ? response : (response?.data || response);
};

export const fetchDashboardStats = async () => {
  const response: any = await apiClient.get('/security-logs/dashboard');
  return response?.stats ? response : (response?.data || response);
};

export const createManualVerification = async (payload: { bookingId: string; reason?: string }) => {
  const response: any = await apiClient.post('/security-logs/manual', payload);
  return response?.data || response;
};

export const deleteSecurityLog = async (id: string) => {
  const response: any = await apiClient.delete(`/security-logs/${id}`);
  return response?.data || response;
};
