import { DeliveryDetailsData } from '../components/delivery/DeliveryDetailsStep';
import { DeliveryValidityData } from '../components/delivery/DeliveryValidityStep';
import { UserAuthContext } from './mapGuestFormToApiPayload';

export interface ApiDeliveryVisitorPassPayload {
  orgId?: string;
  createdById?: string;
  villaId?: string;
  passType: 'DELIVERY';
  isPrivate: boolean;
  visitorDetails: {
    name: string;
  };
  deliveryDetails: {
    partner: string;
    orderId?: string;
    packageCount: number;
    deliveryAction: 'DOORSTEP' | 'LEAVE_AT_GATE';
    instructions?: string;
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

export const mapDeliveryFormToApiPayload = (
  partner: string,
  details: DeliveryDetailsData,
  validity: DeliveryValidityData,
  context: UserAuthContext = {}
): ApiDeliveryVisitorPassPayload => {
  const now = new Date();
  const startDate = new Date(now);

  let endDate = new Date(now);
  if (validity.validityDuration === 'ONE_HOUR') {
    endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  } else if (validity.validityDuration === 'TWO_HOURS') {
    endDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  } else if (validity.validityDuration === 'END_OF_DAY') {
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const partnerName = (partner || 'DELIVERY').toUpperCase();
  const visitorName = `${partnerName} Delivery Agent`;
  const parsedCount = parseInt(details.packageCount, 10);
  const packageCount = !isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1;

  const isLeaveAtGate = details.deliveryAction === 'LEAVE_AT_GATE';
  const actionLabel = isLeaveAtGate ? 'Leave at Gate' : 'Doorstep Delivery';
  const orderRef = details.orderId && details.orderId.trim() !== '' ? `Order ${details.orderId.trim()}` : 'Parcel Delivery';
  const purpose = `${orderRef} (${packageCount} Pkg) | ${actionLabel}`;

  const payload: ApiDeliveryVisitorPassPayload = {
    passType: 'DELIVERY',
    isPrivate: isLeaveAtGate,
    visitorDetails: {
      name: visitorName,
    },
    deliveryDetails: {
      partner: partnerName,
      orderId: details.orderId && details.orderId.trim() !== '' ? details.orderId.trim() : undefined,
      packageCount,
      deliveryAction: details.deliveryAction || 'DOORSTEP',
      instructions: details.instructions && details.instructions.trim() !== '' ? details.instructions.trim() : undefined,
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
