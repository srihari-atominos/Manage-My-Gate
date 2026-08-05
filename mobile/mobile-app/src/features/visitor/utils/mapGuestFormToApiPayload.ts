import { GuestDetailsData } from '../components/guest/GuestDetailsStep';
import { GuestScheduleData } from '../components/guest/GuestScheduleStep';
import { GuestPassOptionsData } from '../components/guest/GuestPassOptionsStep';

export interface UserAuthContext {
  orgId?: string;
  createdById?: string;
  villaId?: string;
}

export interface ApiVisitorPassPayload {
  orgId?: string;
  createdById?: string;
  villaId?: string;
  passType: 'GUEST';
  visitorDetails: {
    name: string;
    phone?: string;
  };
  purpose?: string;
  validity: {
    startDate: string;
    endDate: string;
    timeWindowStart?: string;
    timeWindowEnd?: string;
  };
  vehicleDetails?: {
    number?: string;
  };
  usageLimit: {
    maxUses: number;
  };
}

export const mapGuestFormToApiPayload = (
  details: GuestDetailsData,
  schedule: GuestScheduleData,
  options: GuestPassOptionsData,
  context: UserAuthContext = {}
): ApiVisitorPassPayload => {
  const now = new Date();
  
  let startDateObj = now;
  if (schedule.visitDate && schedule.visitDate.trim() !== '') {
    const parsedDate = new Date(schedule.visitDate);
    if (!isNaN(parsedDate.getTime())) {
      startDateObj = parsedDate;
    }
  }

  // Set start date to beginning of day
  const startDate = new Date(startDateObj);
  startDate.setHours(0, 0, 0, 0);

  // Set end date to end of day
  const endDate = new Date(startDateObj);
  endDate.setHours(23, 59, 59, 999);

  let timeWindowStart: string | undefined = undefined;
  let timeWindowEnd: string | undefined = undefined;

  if (schedule.timeSlot === 'TODAY_EVENING') {
    timeWindowStart = '17:00';
    timeWindowEnd = '23:00';
  } else if (schedule.timeSlot === 'TOMORROW') {
    timeWindowStart = '08:00';
    timeWindowEnd = '22:00';
  }

  // Combine purpose and gate instructions into single string if present
  const purposeParts = [];
  if (details.purpose && details.purpose.trim()) {
    purposeParts.push(details.purpose.trim());
  }
  if (options.gateInstructions && options.gateInstructions.trim()) {
    purposeParts.push(`Instructions: ${options.gateInstructions.trim()}`);
  }
  const purpose = purposeParts.length > 0 ? purposeParts.join(' | ') : undefined;

  const payload: ApiVisitorPassPayload = {
    passType: 'GUEST',
    visitorDetails: {
      name: details.visitorName.trim(),
      phone: details.phone ? details.phone.trim() : undefined,
    },
    purpose,
    validity: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...(timeWindowStart ? { timeWindowStart } : {}),
      ...(timeWindowEnd ? { timeWindowEnd } : {}),
    },
    usageLimit: {
      maxUses: options.entryMode === 'SINGLE' ? 1 : 99,
    },
  };

  if (options.vehicleNo && options.vehicleNo.trim()) {
    payload.vehicleDetails = {
      number: options.vehicleNo.trim().toUpperCase(),
    };
  }

  if (context.orgId) {
    payload.orgId = context.orgId;
  }
  if (context.createdById) {
    payload.createdById = context.createdById;
  }
  if (context.villaId) {
    payload.villaId = context.villaId;
  }

  return payload;
};
