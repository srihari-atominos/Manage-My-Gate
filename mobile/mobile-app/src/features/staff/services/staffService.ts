import type { StaffCategory } from '../staffCategories';
import type { RoleData } from '../../roleBuilder/services/roleService';
import { Platform } from 'react-native';
import apiClient from '../../../services/apiClient';

/** A photo chosen on the device (or the browser File on web). */
export interface StaffPhotoFile {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
  file?: any;
}

/** Department as people should read it: "Others" with a typed trade shows that trade. */
export function getDepartmentLabel(staff?: { department?: string; departmentOther?: string } | null): string {
  if (!staff?.department) return '';
  return staff.department === 'Others' && staff.departmentOther?.trim()
    ? staff.departmentOther.trim()
    : staff.department;
}

/** Staff photo links are API-relative and signed by the server; resolve them against the API base. */
export function resolveStaffPhotoUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|file:|blob:|data:|content:)/i.test(url)) return url;
  const base = String((apiClient as any)?.defaults?.baseURL || '').replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function buildPhotoFormData(photo: StaffPhotoFile): Promise<FormData> {
  const formData = new FormData();
  const name = photo.name || `staff_${Date.now()}.jpg`;
  const type = photo.type || 'image/jpeg';
  if (Platform.OS === 'web') {
    if (photo.file) {
      formData.append('photo', photo.file, name);
    } else {
      const blob = await (await fetch(photo.uri)).blob();
      formData.append('photo', blob, name);
    }
  } else {
    formData.append('photo', { uri: photo.uri, name, type } as any);
  }
  return formData;
}

export type StaffDepartment =
  | 'Electrical'
  | 'Plumbing'
  | 'Housekeeping'
  | 'Security'
  | 'Carpentry'
  | 'Others';

export type StaffType = 'In-House Staff' | 'External Vendor' | 'Community Staff';
export type StaffStatus = 'Active' | 'Inactive' | 'Pending';

export interface StaffMember {
  _id: string;
  orgId: string;
  name: string;
  phone: string;
  email?: string;
  department: StaffDepartment;
  /** Typed trade, used when department is 'Others'. */
  departmentOther?: string;
  type: StaffType;
  /** Access role is managed in Role Builder; it controls the staff scope. */
  roleId?: string | Pick<RoleData, '_id' | 'id' | 'name'> | null;
  staffCategory?: StaffCategory;
  /** Community staff only: true hides them from residents' unit allocation. */
  communityOnly?: boolean;
  status: StaffStatus;
  designation?: string;
  staffCode?: string;
  photoUrl?: string | null;
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
  departmentOther?: string;
  /** Legacy staff type; new staff derive their scope from the selected role. */
  type?: StaffType;
  roleId: string;
  staffCategory?: StaffCategory;
  communityOnly?: boolean;
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
  departmentOther?: string;
  type?: StaffType;
  roleId?: string;
  staffCategory?: StaffCategory;
  communityOnly?: boolean;
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
  staffCategory?: StaffCategory;
  /** COMMUNITY: staff who may take complaints; UNIT: staff residents may allocate to a unit. */
  assignableFor?: 'COMMUNITY' | 'UNIT';
  search?: string;
  status?: string;
  limit?: number;
  page?: number;
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
  photoUrl?: string | null;
  name: string;
  department: string;
  departmentOther?: string;
  designation?: string;
  type: string;
  staffCategory?: StaffCategory;
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
  qrVersion?: number;
}

export interface StaffInsideNow {
  sessionId: string;
  technicianId: string;
  name: string;
  department?: string;
  designation?: string;
  checkInTime: string;
  checkInGate?: string;
  unitNumbers: string[];
  photoUrl?: string | null;
}

export interface StaffScanLookup {
  technician: EligibleStaff;
  associatedUnits: AuthorizedUnit[];
  isInside: boolean;
  openSession: { _id: string; checkInTime: string; checkInGate?: string } | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
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

  /** Attaches a photo right after the invite created the staff profile (looked up by user id). */
  uploadStaffPhotoForUser: async (userId: string, photo: StaffPhotoFile): Promise<StaffMember> => {
    const res: any = await apiClient.post(`${BASE_URL}/by-user/${userId}/photo`, await buildPhotoFormData(photo), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data?.data || res?.data || res;
  },

  uploadStaffPhoto: async (id: string, photo: StaffPhotoFile): Promise<StaffMember> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/photo`, await buildPhotoFormData(photo), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data?.data || res?.data || res;
  },

  removeStaffPhoto: async (id: string): Promise<StaffMember> => {
    const res: any = await apiClient.delete(`${BASE_URL}/${id}/photo`);
    return res?.data?.data || res?.data || res;
  },

  rotateStaffQr: async (id: string): Promise<StaffQrData> => {
    const res: any = await apiClient.post(`${BASE_URL}/${id}/qr/rotate`);
    return res?.data?.data || res?.data || res;
  },

  getStaffInsideMyUnits: async (): Promise<StaffInsideNow[]> => {
    const res: any = await apiClient.get(`${ATTENDANCE_BASE_URL}/my-units/active`);
    const data = res?.data?.data || res?.data || res || [];
    return Array.isArray(data) ? data : [];
  },

  /** Verifies a scanned staff pass and reports gate status without recording attendance. */
  lookupStaffScan: async (scannedPayload: string): Promise<StaffScanLookup> => {
    const res: any = await apiClient.post(ATTENDANCE_BASE_URL + '/lookup', { scannedPayload });
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

  /**
   * Server-built, user-friendly attendance report. The shared apiClient unwraps `response.data`,
   * so a blob request resolves to the file itself.
   */
  exportAttendanceReport: async (params: Record<string, any>, format: 'csv' | 'xlsx'): Promise<Blob> => {
    const res: any = await apiClient.get(`${ATTENDANCE_BASE_URL}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
    return res as Blob;
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

