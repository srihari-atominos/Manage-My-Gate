import { mapGuestFormToApiPayload } from './mapGuestFormToApiPayload';
import { mapCabFormToApiPayload } from './mapCabFormToApiPayload';
import { mapDeliveryFormToApiPayload } from './mapDeliveryFormToApiPayload';
import { mapServiceFormToApiPayload } from './mapServiceFormToApiPayload';
import { mapGroupFormToApiPayload } from './mapGroupFormToApiPayload';
import { PassTypeKey } from '../mocks/visitorMocks';

export interface PassPayloadContext {
  role: 'RESIDENT' | 'ADMIN' | 'GUARD';
  orgId: string;
  createdById?: string;
  villaId?: string;
  isPrivate?: boolean;
  adminNotes?: string;
}

/**
 * Enterprise Pass Payload Strategy Mapper
 * Seamlessly maps wizard form inputs across all pass types (GUEST, CAB, DELIVERY, SERVICE, GROUP)
 * while injecting role context (Resident vs Admin vs Guard) and optional Villa assignment.
 */
export const mapFormToApiPayloadStrategy = (
  passType: PassTypeKey,
  formData: any,
  context: PassPayloadContext
) => {
  const baseContext = {
    orgId: context.orgId,
    createdById: context.createdById,
    villaId: context.villaId || undefined,
    isPrivate: context.isPrivate ?? false,
    role: context.role,
  };

  switch (passType) {
    case 'GUEST': {
      const payload = mapGuestFormToApiPayload(
        formData.guestDetails,
        formData.guestSchedule,
        formData.guestOptions
      );
      return {
        ...payload,
        ...baseContext,
        passType: context.role === 'ADMIN' && !context.villaId ? 'ADMIN_GUEST' : 'GUEST',
        ...(context.adminNotes ? { adminNotes: context.adminNotes } : {}),
      };
    }

    case 'CAB': {
      const payload = mapCabFormToApiPayload(
        formData.cabProvider,
        formData.cabVehicle,
        formData.cabSchedule,
        baseContext,
        formData.customCabProvider
      );
      return {
        ...payload,
        ...baseContext,
        passType: 'CAB',
      };
    }

    case 'DELIVERY': {
      const payload = mapDeliveryFormToApiPayload(
        formData.deliveryPartner,
        formData.deliveryDetails,
        formData.deliveryValidity,
        baseContext,
        formData.customDeliveryPartner
      );
      return {
        ...payload,
        ...baseContext,
        passType: 'DELIVERY',
      };
    }

    case 'SERVICE': {
      const payload = mapServiceFormToApiPayload(
        formData.staffDetails,
        formData.serviceCategory,
        formData.serviceDateRange,
        formData.serviceWeekdays,
        formData.serviceTimeWindow
      );
      return {
        ...payload,
        ...baseContext,
        passType: 'SERVICE',
      };
    }

    case 'GROUP': {
      const payload = mapGroupFormToApiPayload(
        formData.groupDetails,
        formData.groupGuests
      );
      return {
        ...payload,
        ...baseContext,
        passType: 'GUEST',
        isGroupPass: true,
      };
    }

    default:
      throw new Error(`Unsupported pass type key: ${passType}`);
  }
};

export default mapFormToApiPayloadStrategy;
