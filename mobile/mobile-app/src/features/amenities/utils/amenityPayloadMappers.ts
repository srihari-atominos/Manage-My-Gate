/**
 * Amenity Management v2 - Payload & Response Mappers
 * Bridges UI form inputs to backend API schemas, and normalizes server responses into clean domain models.
 * Replicates the proven Visitor Management pattern (e.g. client-only ID stripping) without importing Visitor code.
 */

import {
  ApiAmenityFacility,
  ApiAmenityResource,
  ApiAmenityHold,
  ApiAmenityReservation,
  ApiAmenityAccessPass,
  ApiAvailabilityResponse,
  ApiPricingSnapshot,
  ApiAmenityGuest,
  CreateHoldApiPayload,
  ConfirmReservationApiPayload,
  CalculatePricingApiPayload,
} from '../types/amenityApi.types';

import {
  AmenityFacility,
  AmenityResource,
  AmenityHoldState,
  AmenityReservation,
  AmenityAccessPass,
  AmenityAvailabilityResult,
  AmenityPricingSnapshot,
  AmenityGuest,
  AmenitySlotSelection,
} from '../types/amenityDomain.types';

/**
 * Maps dynamic guest rows from UI to backend API format.
 * Strips client-only `clientId` identifiers used for in-memory list rendering.
 */
export const mapGuestsToApiPayload = (guests?: AmenityGuest[]): ApiAmenityGuest[] => {
  if (!guests || !Array.isArray(guests)) return [];

  return guests
    .filter((g) => g && g.name && g.name.trim().length > 0)
    .map((g) => ({
      name: g.name.trim(),
      phone: g.phone && g.phone.trim().length > 0 ? g.phone.trim() : undefined,
      email: g.email && g.email.trim().length > 0 ? g.email.trim() : undefined,
    }));
};

/**
 * Builds the payload for POST /holds from wizard inputs.
 */
export const mapHoldFormToApiPayload = (params: {
  facilityId: string;
  resourceId?: string;
  slotSelection: AmenitySlotSelection;
  headcount?: number;
  quantity?: number;
  holdType?: 'STANDARD' | 'ADMIN_REVIEW' | 'PAYMENT_PENDING';
  holdDurationMinutes?: number;
  unitId?: string;
  quotaLimit?: number;
}): CreateHoldApiPayload => {
  return {
    facilityId: params.facilityId,
    resourceId: params.resourceId || undefined,
    requestedStartDateTime: params.slotSelection.utcStartDateTime,
    requestedEndDateTime: params.slotSelection.utcEndDateTime,
    headcount: params.headcount && params.headcount > 0 ? params.headcount : 1,
    quantity: params.quantity && params.quantity > 0 ? params.quantity : 1,
    holdType: params.holdType || 'STANDARD',
    holdDurationMinutes: params.holdDurationMinutes,
    unitId: params.unitId || undefined,
    quotaLimit: params.quotaLimit,
  };
};

/**
 * Builds the payload for POST /reservations/confirm.
 */
export const mapConfirmFormToApiPayload = (params: {
  holdId: string;
  paymentReference?: string;
  notes?: string;
}): ConfirmReservationApiPayload => {
  return {
    holdId: params.holdId.trim(),
    paymentReference: params.paymentReference?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
  };
};

/**
 * Builds the payload for POST /pricing/calculate.
 */
export const mapPricingFormToApiPayload = (params: {
  facilityId: string;
  startDateTime: string;
  endDateTime: string;
  headcount?: number;
  quantity?: number;
}): CalculatePricingApiPayload => {
  return {
    facilityId: params.facilityId,
    startDateTime: params.startDateTime,
    endDateTime: params.endDateTime,
    headcount: params.headcount || 1,
    quantity: params.quantity || 1,
  };
};

// ==========================================
// API -> Domain Response Normalizers
// ==========================================

export const normalizeFacilityFromApi = (raw: ApiAmenityFacility): AmenityFacility => {
  return {
    _id: raw._id,
    orgId: raw.orgId,
    name: raw.name,
    description: raw.description,
    archetype: raw.archetype,
    status: raw.status,
    maxCapacity: raw.maxCapacity,
    maxHeadcountPerReservation: raw.maxHeadcountPerReservation,
    slotDurationMinutes: raw.slotDurationMinutes,
    setupBufferMinutes: raw.setupBufferMinutes,
    teardownBufferMinutes: raw.teardownBufferMinutes,
    timezone: raw.timezone || 'UTC',
    pricingConfig: { ...raw.pricingConfig },
    bookingRules: { ...raw.bookingRules },
    operatingHours: Array.isArray(raw.operatingHours) ? [...raw.operatingHours] : [],
    images: Array.isArray(raw.images) ? [...raw.images] : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const normalizeResourceFromApi = (raw: ApiAmenityResource): AmenityResource => {
  return {
    _id: raw._id,
    orgId: raw.orgId,
    facilityId: raw.facilityId,
    name: raw.name,
    identifier: raw.identifier,
    concurrencyVersion: raw.concurrencyVersion,
    setupBufferMinutes: raw.setupBufferMinutes,
    teardownBufferMinutes: raw.teardownBufferMinutes,
    isSerializedAsset: raw.isSerializedAsset,
    serialNumber: raw.serialNumber,
    assetState: raw.assetState,
    totalBulkStock: raw.totalBulkStock,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const normalizePricingSnapshot = (raw?: ApiPricingSnapshot): AmenityPricingSnapshot => {
  return {
    baseAmount: raw?.baseAmount ?? 0,
    taxAmount: raw?.taxAmount ?? 0,
    depositAmount: raw?.depositAmount ?? 0,
    totalAmount: raw?.totalAmount ?? 0,
    currency: raw?.currency || 'SAR',
  };
};

export const normalizeHoldFromApi = (
  raw: ApiAmenityHold,
  pricingSnapshot?: ApiPricingSnapshot
): AmenityHoldState => {
  return {
    _id: raw._id,
    orgId: raw.orgId,
    facilityId: raw.facilityId,
    resourceId: raw.resourceId,
    userId: raw.userId,
    unitId: raw.unitId,
    requestedStartDateTime: raw.requestedStartDateTime,
    requestedEndDateTime: raw.requestedEndDateTime,
    headcount: raw.headcount,
    quantity: raw.quantity,
    holdType: raw.holdType,
    status: raw.status,
    expiresAt: raw.expiresAt,
    pricingSnapshot: pricingSnapshot ? normalizePricingSnapshot(pricingSnapshot) : undefined,
  };
};

export const normalizeReservationFromApi = (raw: ApiAmenityReservation): AmenityReservation => {
  const facilityObj =
    typeof raw.facilityId === 'object' && raw.facilityId !== null ? raw.facilityId : null;
  const facilityId = facilityObj ? facilityObj._id : String(raw.facilityId);
  const facilityName = facilityObj ? facilityObj.name : undefined;
  const facilityTimezone = facilityObj ? facilityObj.timezone : undefined;

  const resourceObj =
    typeof raw.resourceId === 'object' && raw.resourceId !== null ? raw.resourceId : null;
  const resourceId = resourceObj
    ? resourceObj._id
    : raw.resourceId
      ? String(raw.resourceId)
      : undefined;
  const resourceName = resourceObj ? resourceObj.name : undefined;

  const userObj = typeof raw.userId === 'object' && raw.userId !== null ? raw.userId : null;
  const userId = userObj ? userObj._id || userObj.id : String(raw.userId);
  const userName = userObj ? userObj.name || userObj.username : undefined;

  return {
    _id: raw._id,
    reservationNumber: raw.reservationNumber,
    orgId: raw.orgId,
    facilityId,
    facilityName,
    facilityTimezone,
    resourceId,
    resourceName,
    userId,
    userName,
    unitId: raw.unitId,
    startDateTime: raw.startDateTime,
    endDateTime: raw.endDateTime,
    headcount: raw.headcount,
    quantity: raw.quantity,
    guests: Array.isArray(raw.guests) ? [...raw.guests] : [],
    pricingSnapshot: normalizePricingSnapshot(raw.pricingSnapshot),

    // The Five Independent State Dimensions
    bookingStatus: raw.bookingStatus,
    paymentStatus: raw.paymentStatus,
    approvalStatus: raw.approvalStatus,
    accessStatus: raw.accessStatus,
    completionStatus: raw.completionStatus,

    rejectionReason: raw.rejectionReason,
    cancellationReason: raw.cancellationReason,
    notes: raw.notes,
    holdId: raw.holdId,
    paymentReference: raw.paymentReference,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const normalizeAccessPassFromApi = (raw: ApiAmenityAccessPass): AmenityAccessPass => {
  return {
    _id: raw._id,
    orgId: raw.orgId,
    facilityId: raw.facilityId,
    reservationId: raw.reservationId,
    userId: raw.userId,
    passCode: raw.passCode,
    qrData: raw.qrData,
    passType: raw.passType,
    validFrom: raw.validFrom,
    validUntil: raw.validUntil,
    maxUses: raw.maxUses,
    currentUses: raw.currentUses,
    checkedInAt: raw.checkedInAt,
    checkedOutAt: raw.checkedOutAt,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

export const normalizeAvailabilityFromApi = (
  raw: ApiAvailabilityResponse
): AmenityAvailabilityResult => {
  return {
    isAvailable: Boolean(raw.isAvailable),
    available: Boolean(raw.isAvailable),
    reason: raw.reason,
    availableUnits: raw.availableUnits,
    maxCapacity: raw.maxCapacity,
    effectiveStartDateTime: raw.effectiveStartDateTime,
    effectiveEndDateTime: raw.effectiveEndDateTime,
  };
};
