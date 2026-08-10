import { StaffDetailsData } from '../components/service/StaffDetailsStep';
import { ServiceDateRangeData } from '../components/service/ServiceDateRangeStep';
import { ServiceTimeWindowData } from '../components/service/ServiceTimeWindowStep';
import { UserAuthContext } from './mapGuestFormToApiPayload';

export interface ApiServiceVisitorPassPayload {
  orgId?: string;
  createdById?: string;
  villaId?: string;
  roleId?: string;
  passType: 'SERVICE';
  isIdProofPass?: boolean;
  visitorDetails: {
    name: string;
    phone?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  serviceDetails: {
    category: string;
    notes?: string;
  };
  purpose?: string;
  validity: {
    startDate: string;
    endDate: string;
    timeWindowStart: string;
    timeWindowEnd: string;
    allowedDays: number[];
  };
  usageLimit: {
    maxUses: number;
  };
}

const WEEKDAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export const convert12To24Time = (timeStr: string): string => {
  if (!timeStr || !timeStr.trim()) return '08:00';
  const clean = timeStr.trim();

  // If already valid 24-hr format (e.g. "08:00" or "13:00")
  if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(clean)) {
    return clean;
  }

  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (!match) return '08:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  const hStr = String(hours).padStart(2, '0');
  return `${hStr}:${minutes}`;
};

export const mapServiceFormToApiPayload = (
  staff: StaffDetailsData,
  category: string,
  dateRange: ServiceDateRangeData,
  weekdays: string[],
  timeWindow: ServiceTimeWindowData,
  context: UserAuthContext = {}
): ApiServiceVisitorPassPayload => {
  let startDateObj = new Date();
  if (dateRange.startDate && dateRange.startDate.trim() !== '') {
    const parsed = new Date(dateRange.startDate);
    if (!isNaN(parsed.getTime())) startDateObj = parsed;
  }
  const startDate = new Date(startDateObj);
  startDate.setHours(0, 0, 0, 0);

  let endDateObj = new Date(startDateObj.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days fallback
  if (dateRange.endDate && dateRange.endDate.trim() !== '') {
    const parsed = new Date(dateRange.endDate);
    if (!isNaN(parsed.getTime())) endDateObj = parsed;
  }
  const endDate = new Date(endDateObj);
  endDate.setHours(23, 59, 59, 999);

  const allowedDays = weekdays
    .map((d) => WEEKDAY_MAP[d.toUpperCase()])
    .filter((n) => n !== undefined)
    .sort((a, b) => a - b);

  const timeWindowStart = convert12To24Time(timeWindow.startTime);
  const timeWindowEnd = convert12To24Time(timeWindow.endTime);

  const serviceCategoryLabel = (category || 'Staff').toUpperCase();
  const staffName = staff.staffName.trim();
  const isIdProofPass = !!staff.isIdProofPass;
  const purpose = `${serviceCategoryLabel} - ${staffName} (${allowedDays.length} Days/wk | ${timeWindowStart}-${timeWindowEnd})`;

  const payload: ApiServiceVisitorPassPayload = {
    passType: 'SERVICE',
    isIdProofPass,
    visitorDetails: {
      name: staffName,
      phone: staff.phone && staff.phone.trim() !== '' ? staff.phone.trim() : undefined,
      idProofType: isIdProofPass ? (staff.idProofType || 'Aadhaar Card') : undefined,
      idProofNumber: isIdProofPass && staff.idProofNumber ? staff.idProofNumber.trim() : undefined,
    },
    serviceDetails: {
      category: serviceCategoryLabel,
      notes: staff.notes && staff.notes.trim() !== '' ? staff.notes.trim() : undefined,
    },
    purpose,
    validity: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timeWindowStart,
      timeWindowEnd,
      allowedDays: allowedDays.length > 0 ? allowedDays : [1, 2, 3, 4, 5],
    },
    usageLimit: {
      maxUses: 999, // Recurring staff pass
    },
  };

  if (context.orgId) {
    payload.orgId = context.orgId;
  }
  if (context.createdById) {
    payload.createdById = context.createdById;
  }
  if (context.villaId) {
    payload.villaId = context.villaId;
  }
  if (context.roleId) {
    payload.roleId = context.roleId;
  }

  return payload;
};
