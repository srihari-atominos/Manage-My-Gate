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
  AmenityFacilityStatus,
  AmenityPricingType,
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

export const normalizeFacilityFromApi = (raw: ApiAmenityFacility | any): AmenityFacility => {
  const rawStatusUpper = typeof raw.status === 'string' ? raw.status.toUpperCase() : '';
  const isDraft = Boolean(raw.isDraft === true || raw.isDraft === 'true' || rawStatusUpper === 'DRAFT');
  const derivedStatus: AmenityFacilityStatus = isDraft
    ? 'DRAFT'
    : (rawStatusUpper as AmenityFacilityStatus) || (raw.isActive === false ? 'INACTIVE' : 'ACTIVE');

  const rawPricing = raw.pricingConfig || {};
  const pricingType = (rawPricing.type || rawPricing.pricingType || (raw.bookingFee ? 'HOURLY' : 'FREE')) as AmenityPricingType;
  const baseRate = Number(rawPricing.baseRate ?? raw.bookingFee ?? 0);
  const depositAmount = Number(rawPricing.depositAmount ?? rawPricing.securityDeposit ?? raw.securityDeposit ?? 0);
  const taxRate = Number(rawPricing.taxRate ?? rawPricing.taxPercentage ?? 0);
  const currency = rawPricing.currency || 'INR';

  const rawBookingRules = raw.bookingRules || {};
  const requiresApproval = Boolean(raw.requiresApproval ?? rawBookingRules.requiresApproval ?? false);

  const operatingHours = Array.isArray(raw.operatingHours)
    ? raw.operatingHours.map((h: any) => ({
        dayOfWeek: h.dayOfWeek,
        opensAt: h.opensAt || h.openTime || '06:00',
        closesAt: h.closesAt || h.closeTime || '22:00',
        openTime: h.openTime || h.opensAt || '06:00',
        closeTime: h.closeTime || h.closesAt || '22:00',
        isOpen: h.isOpen !== undefined ? h.isOpen : true,
      }))
    : [];

  return {
    _id: raw._id,
    orgId: raw.orgId,
    code: raw.code,
    name: raw.name,
    description: raw.description,
    location: raw.location,
    archetype: raw.archetype,
    category: raw.category || raw.type || undefined,
    type: raw.type || raw.category || undefined,
    status: derivedStatus,
    isDraft,
    isActive: isDraft ? false : (raw.isActive !== undefined ? raw.isActive : derivedStatus === 'ACTIVE'),
    maxCapacity: raw.maxCapacity ?? raw.capacity ?? 1,
    maxHeadcountPerReservation: raw.maxHeadcountPerReservation ?? raw.maxBookingsPerUserPerSlot ?? 1,
    slotDurationMinutes: raw.slotDurationMinutes ?? rawBookingRules.slotDurationMinutes ?? 60,
    setupBufferMinutes: raw.setupBufferMinutes ?? rawBookingRules.bufferTimeMinutes ?? 0,
    teardownBufferMinutes: raw.teardownBufferMinutes ?? 0,
    timezone: raw.timezone || 'UTC',
    pricingConfig: {
      type: pricingType,
      baseRate,
      depositAmount,
      taxRate,
      currency,
      ...(rawPricing as any),
    },
    bookingRules: {
      minNoticeHours: rawBookingRules.minNoticeHours ?? 0,
      maxAdvanceBookingDays: rawBookingRules.maxAdvanceBookingDays ?? 30,
      cancelNoticeHours: rawBookingRules.cancelNoticeHours ?? raw.cancellationPolicy?.refundCutoffHours ?? 24,
      requiresApproval,
      maxActiveReservationsPerResident: rawBookingRules.maxActiveReservationsPerResident ?? 3,
      ...rawBookingRules,
    },
    operatingHours,
    images: Array.isArray(raw.images) ? [...raw.images] : (raw.imageUrl ? [raw.imageUrl] : []),
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
    currency: raw?.currency || 'INR',
  };
};

export const normalizeHoldFromApi = (
  payload: any,
  pricingSnapshot?: ApiPricingSnapshot
): AmenityHoldState => {
  const raw = payload?.hold ? payload.hold : payload;
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

export const normalizeReservationFromApi = (payload: any): AmenityReservation => {
  // Accommodate payloads wrapped in { reservation, pass, rawToken } from the confirmation endpoint
  const raw = payload?.reservation ? payload.reservation : payload;

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

  const rawUser = raw.residentId || raw.userId;
  const userObj = typeof rawUser === 'object' && rawUser !== null ? rawUser : null;
  const userId = userObj ? userObj._id || userObj.id : String(rawUser);
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
  const checkInTimestamp = raw.checkInTimestamp || (raw as any).checkedInAt || null;
  const checkOutTimestamp = raw.checkOutTimestamp || (raw as any).checkedOutAt || null;

  return {
    _id: raw._id,
    orgId: raw.orgId,
    facilityId: raw.facilityId,
    facilityName: raw.facilityName,
    reservationId: raw.reservationId,
    userId: raw.userId,
    passCode: raw.passCode,
    qrData: raw.qrData,
    passType: raw.passType,
    validFrom: raw.validFrom,
    validUntil: raw.validUntil,
    maxUses: raw.maxUses,
    currentUses: raw.currentUses,
    checkedInAt: raw.checkedInAt || (checkInTimestamp ? String(checkInTimestamp) : undefined),
    checkedOutAt: raw.checkedOutAt || (checkOutTimestamp ? String(checkOutTimestamp) : undefined),
    status: raw.status || (raw.isRevoked ? 'REVOKED' : checkOutTimestamp ? 'USED' : 'ACTIVE'),
    checkInTimestamp,
    checkOutTimestamp,
    gateId: raw.gateId || null,
    isRevoked: Boolean(raw.isRevoked || raw.status === 'REVOKED'),
    revokedAt: raw.revokedAt || null,
    revokedReason: raw.revokedReason || null,
    inspectionDetails: raw.inspectionDetails || null,
    passTokenHash: raw.passTokenHash,
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
