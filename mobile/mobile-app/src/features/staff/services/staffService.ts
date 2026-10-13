import apiClient from '../../../services/apiClient';

export type StaffDepartment =
  | 'Electrical'
  | 'Plumbing'
  | 'Housekeeping'
  | 'Security'
  | 'Carpentry'
  | 'Others';

export type StaffType = 'In-House Staff' | 'External Vendor';
export type StaffStatus = 'Active' | 'Inactive' | 'Pending';

export interface StaffMember {
  _id: string;
  orgId: string;
  name: string;
  phone: string;
  email?: string;
  department: StaffDepartment;
  type: StaffType;
  status: StaffStatus;
  designation?: string;
  staffCode?: string;
  userId?: string | null;
  whatsappEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffPayload {
  name: string;
  phone: string;
  email?: string;
  department: StaffDepartment;
  type: StaffType;
  status?: StaffStatus;
  designation?: string;
  staffCode?: string;
  qrValidFrom?: string;
  qrValidUntil?: string;
  shiftWindow?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
}

export interface UpdateStaffPayload {
  name?: string;
  phone?: string;
  email?: string;
  department?: StaffDepartment;
  type?: StaffType;
  status?: StaffStatus;
  designation?: string;
  staffCode?: string;
  qrValidFrom?: string;
  qrValidUntil?: string;
  shiftWindow?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
  };
}

export interface GetStaffParams {
  department?: string;
  search?: string;
}

export interface AuthorizedUnit {
  _id: string;
  unitNumber: string;
  blockOrBuilding?: string;
  type?: string;
  status?: string;
  floor?: string;
}

export interface EligibleStaff {
  _id: string;
  name: string;
  department: string;
  designation?: string;
  type: string;
  staffCode?: string;
  phone?: string;
  email?: string;
  status: string;
}

export interface StaffUnitAssociation {
  _id: string;
  orgId: string;
  villaId: AuthorizedUnit;
  technicianId: EligibleStaff;
  userId?: string | null;
  associatedBy?: { _id: string; name?: string; username?: string; email?: string };
  status: 'Pending' | 'Active' | 'Inactive' | 'Suspended' | 'Rejected';
  roleOrTrade?: string;
  accessSchedule?: {
    days?: string[];
    timeWindow?: { start?: string; end?: string };
    notes?: string;
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffAssociationPayload {
  villaId: string;
  technicianId: string;
  roleOrTrade?: string;
  notes?: string;
  accessSchedule?: {
    days?: string[];
    timeWindow?: { start?: string; end?: string };
    validFrom?: string;
    validUntil?: string;
    notes?: string;
  };
}

export interface StaffQrData {
  technicianId: string;
  staffCode?: string;
  name: string;
  department: string;
  designation?: string;
  type: string;
  status: string;
  barcodePayload: string;
  signature?: string;
  token: string;
  qrDataUrl?: string | null;
}

export interface StaffAttendanceRecord {
  _id: string;
  orgId: string;
  technicianId: string | EligibleStaff;
  staffCode?: string;
  status: 'Open' | 'Closed';
  checkInTime: string;
  checkInGate: string;
  checkInGuardId?: any;
  checkOutTime?: string | null;
  exitGate?: string | null;
  exitGuardId?: any;
  durationMinutes?: number | null;
  isMissingCheckout?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAttendanceStats {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  missingCheckoutSessions: number;
  distinctStaffCount: number;
}

export interface ScanStaffAttendancePayload {
  scannedPayload: string;
  gateId?: string;
  action?: 'ENTRY' | 'EXIT' | 'AUTO';
  idempotencyKey?: string;
  notes?: string;
}

export interface ScanStaffAttendanceResponse {
  action: 'ENTRY' | 'EXIT';
  session: StaffAttendanceRecord;
  technician: EligibleStaff;
  associatedUnits: AuthorizedUnit[];
  isDuplicate?: boolean;
  message?: string;
}

const BASE_URL = '/technicians';
const ASSOC_BASE_URL = '/staff-associations';
const ATTENDANCE_BASE_URL = '/staff-attendance';

export const staffService = {
  getStaffList: async (params?: GetStaffParams): Promise<StaffMember[]> => {
    const res: any = await apiClient.get(BASE_URL, { params });
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  getStaffById: async (id: string): Promise<StaffMember> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}`);
    return res?.data?.data || res?.data || res;
  },

  createStaff: async (payload: CreateStaffPayload): Promise<StaffMember> => {
    const res: any = await apiClient.post(BASE_URL, payload);
    return res?.data?.data || res?.data || res;
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<StaffMember> => {
    const res: any = await apiClient.put(`${BASE_URL}/${id}`, payload);
    return res?.data?.data || res?.data || res;
  },

  deleteStaff: async (id: string): Promise<{ success: boolean }> => {
    const res: any = await apiClient.delete(`${BASE_URL}/${id}`);
    return res?.data || { success: true };
  },

  getMyProfile: async (): Promise<StaffMember> => {
    const res: any = await apiClient.get(`${BASE_URL}/me`);
    return res?.data?.data || res?.data || res;
  },

  getMyAuthorizedUnits: async (): Promise<AuthorizedUnit[]> => {
    const res: any = await apiClient.get(`${ASSOC_BASE_URL}/my-units`);
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  getEligibleStaff: async (): Promise<EligibleStaff[]> => {
    const res: any = await apiClient.get(`${ASSOC_BASE_URL}/eligible-staff`);
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  getUnitAssociations: async (params?: { villaId?: string; technicianId?: string; status?: string } | string): Promise<StaffUnitAssociation[]> => {
    const queryParams = typeof params === 'string' ? { villaId: params } : params;
    const res: any = await apiClient.get(ASSOC_BASE_URL, { params: queryParams });
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  createAssociation: async (payload: CreateStaffAssociationPayload): Promise<StaffUnitAssociation> => {
    const res: any = await apiClient.post(ASSOC_BASE_URL, payload);
    return res?.data?.data || res?.data || res;
  },

  removeAssociation: async (id: string, reason?: string): Promise<StaffUnitAssociation> => {
    const res: any = await apiClient.delete(`${ASSOC_BASE_URL}/${id}`, { data: { reason } });
    return res?.data?.data || res?.data || res;
  },

  acceptAssociation: async (id: string): Promise<StaffUnitAssociation> => {
    const res: any = await apiClient.post(`${ASSOC_BASE_URL}/${id}/accept`);
    return res?.data?.data || res?.data || res;
  },

  rejectAssociation: async (id: string, reason?: string): Promise<StaffUnitAssociation> => {
    const res: any = await apiClient.post(`${ASSOC_BASE_URL}/${id}/reject`, { reason });
    return res?.data?.data || res?.data || res;
  },

  getMyAllocatedUnits: async (): Promise<StaffUnitAssociation[]> => {
    const res: any = await apiClient.get(`${ASSOC_BASE_URL}/my-allocations`);
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  checkConflict: async (payload: {
    technicianId: string;
    accessSchedule: any;
    excludeVillaId?: string;
  }): Promise<{ hasConflict: boolean; conflictMessage?: string }> => {
    const res: any = await apiClient.post(`${ASSOC_BASE_URL}/check-conflict`, payload);
    return res?.data?.data || res?.data || { hasConflict: false };
  },

  getMyQr: async (): Promise<StaffQrData> => {
    const res: any = await apiClient.get(`${BASE_URL}/me/qr`);
    return res?.data?.data || res?.data || res;
  },

  getStaffQrById: async (id: string): Promise<StaffQrData> => {
    const res: any = await apiClient.get(`${BASE_URL}/${id}/qr`);
    return res?.data?.data || res?.data || res;
  },

  scanAttendance: async (payload: ScanStaffAttendancePayload): Promise<ScanStaffAttendanceResponse> => {
    const res: any = await apiClient.post(ATTENDANCE_BASE_URL + '/scan', payload);
    return res?.data?.data || res?.data || res;
  },

  getActiveAttendanceSessions: async (): Promise<StaffAttendanceRecord[]> => {
    const res: any = await apiClient.get(`${ATTENDANCE_BASE_URL}/active`);
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  getMyAttendance: async (params?: any): Promise<{ records: StaffAttendanceRecord[]; pagination: any }> => {
    const res: any = await apiClient.get(`${ATTENDANCE_BASE_URL}/me`, { params });
    return res?.data?.data || res?.data || { records: [], pagination: {} };
  },

  getAttendanceHistory: async (params?: any): Promise<{ records: StaffAttendanceRecord[]; pagination: any }> => {
    const res: any = await apiClient.get(ATTENDANCE_BASE_URL, { params });
    return res?.data?.data || res?.data || { records: [], pagination: {} };
  },

  getAttendanceStats: async (params?: any): Promise<StaffAttendanceStats> => {
    const res: any = await apiClient.get(`${ATTENDANCE_BASE_URL}/stats`, { params });
    return (
      res?.data?.data ||
      res?.data || {
        totalSessions: 0,
        openSessions: 0,
        closedSessions: 0,
        missingCheckoutSessions: 0,
        distinctStaffCount: 0,
      }
    );
  },
};

export default staffService;

