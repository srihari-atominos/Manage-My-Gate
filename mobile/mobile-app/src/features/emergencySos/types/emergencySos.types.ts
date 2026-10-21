export type SosAlertType = 'Fire' | 'Medical' | 'Security' | 'General';
export type SosStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface EmergencySosAlert {
  _id: string;
  orgId: string;
  userId: string;
  residentName: string;
  residentPhone?: string;
  unitNumber: string;
  blockOrBuilding?: string;
  alertType: SosAlertType;
  status: SosStatus;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
  };
  address?: string;
  notes?: string;
  acknowledgedBy?: any;
  acknowledgedAt?: string;
  resolvedBy?: any;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerSosPayload {
  alertType: SosAlertType;
  unitNumber?: string;
  blockOrBuilding?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  notes?: string;
}

export interface EmergencySosState {
  activeAlert: EmergencySosAlert | null;
  history: EmergencySosAlert[];
  isLoading: boolean;
  isTriggering: boolean;
  error: string | null;
  isModalOpen: boolean;
}
