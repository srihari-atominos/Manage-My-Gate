import { CabVehicleData } from '../components/cab/CabVehicleStep';
import { CabScheduleData } from '../components/cab/CabScheduleStep';
import { UserAuthContext } from './mapGuestFormToApiPayload';

export interface ApiCabVisitorPassPayload {
  orgId?: string;
  createdById?: string;
  villaId?: string;
  passType: 'CAB';
  visitorDetails: {
    name: string;
    phone?: string;
  };
  vehicleDetails: {
    vendor: string;
    number: string;
    vehicleType: string;
  };
  purpose?: string;
  validity: {
    startDate: string;
    endDate: string;
  };
  usageLimit: {
    maxUses: number;
  };
}

export const mapCabFormToApiPayload = (
  provider: string,
  vehicle: CabVehicleData,
  schedule: CabScheduleData,
  context: UserAuthContext = {}
): ApiCabVisitorPassPayload => {
  const now = new Date();
  const startDate = new Date(now);

  let endDate = new Date(now);
  if (schedule.arrivalWindow === 'IMMEDIATE') {
    endDate = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins
  } else if (schedule.arrivalWindow === 'THIRTY_MINS') {
    endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  } else if (schedule.arrivalWindow === 'ONE_HOUR') {
    endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  } else if (schedule.arrivalWindow === 'TODAY_LATER') {
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const vendorName = (provider || 'CAB').toUpperCase();
  const vehicleType = (vehicle.vehicleType || 'CAB').toUpperCase();
  const visitorName = `${vendorName} Driver`;

  const purpose = `${vehicleType} Pre-Approval via ${vendorName}`;

  const payload: ApiCabVisitorPassPayload = {
    passType: 'CAB',
    visitorDetails: {
      name: visitorName,
      phone: vehicle.driverPhone && vehicle.driverPhone.trim() !== '' ? vehicle.driverPhone.trim() : undefined,
    },
    vehicleDetails: {
      vendor: vendorName,
      number: vehicle.vehicleNo ? vehicle.vehicleNo.trim().toUpperCase() : 'UNKNOWN',
      vehicleType,
    },
    purpose,
    validity: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    usageLimit: {
      maxUses: 1,
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

  return payload;
};
