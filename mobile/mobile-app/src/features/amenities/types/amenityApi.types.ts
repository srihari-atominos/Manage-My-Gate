/**
 * Amenity Management v2 - API Types
 * Strictly mirrored from the frozen Phase 5 backend (backend/src/features/amenityManagement/).
 * ZERO phantom fields, ZERO unauthorized enums.
 */

export type AmenityArchetype =
  'SHARED_CAPACITY' | 'EXCLUSIVE_HOURLY' | 'EVENT_SPACE' | 'ROOM_RESOURCE' | 'INVENTORY_TOOLS';

export type AmenityPricingType = 'FREE' | 'HOURLY' | 'DAILY' | 'FIXED_EVENT' | 'TIERED';

export type AmenityFacilityStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';

export type AmenityAssetState = 'AVAILABLE' | 'CHECKED_OUT' | 'INSPECTION_PENDING' | 'MAINTENANCE';

export type AmenityHoldType = 'STANDARD' | 'ADMIN_REVIEW' | 'PAYMENT_PENDING';

export type AmenityHoldStatus = 'ACTIVE' | 'PROMOTED' | 'EXPIRED' | 'RELEASED';

// The Five Orthogonal State Dimensions (Strictly from backend/src/features/amenityManagement/reservations/amenityReservation.model.js)
export type AmenityBookingStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';

// NOTE: 'EXEMPTED' does NOT exist in backend schemas. 'NOT_REQUIRED' is used for zero-cost / fee-waived reservations.
export type AmenityPaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'HELD_AUTHORIZED'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'FAILED';

export type AmenityApprovalStatus = 'NOT_REQUIRED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type AmenityAccessStatus =
  'NOT_APPLICABLE' | 'PASS_GENERATED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'ACCESS_REVOKED';

export type AmenityCompletionStatus = 'PENDING' | 'COMPLETED' | 'NO_SHOW' | 'ABANDONED';

export type AmenityPassType = 'QR_DYNAMIC' | 'PIN_CODE' | 'RFID_NFC';

export type AmenityPassStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export type AmenityMaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Standard Backend Response Envelopes
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  isReplay?: boolean;
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiPaginatedResponse<T = any> {
  items: T[];
  pagination: ApiPaginationMeta;
}

// Validation Error Structure returned by Express-Validator on HTTP 400
export interface ApiValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: ApiValidationErrorDetail[] | string[];
}

// Facility Entity
export interface ApiFacilityOperatingHour {
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  opensAt: string; // "HH:mm"
  closesAt: string; // "HH:mm"
  isOpen: boolean;
}

export interface ApiFacilityPricingConfig {
  type: AmenityPricingType;
  baseRate: number;
  depositAmount: number;
  taxRate: number;
  currency: string;
}

export interface ApiFacilityBookingRules {
  minNoticeHours: number;
  maxAdvanceBookingDays: number;
  cancelNoticeHours: number;
  requiresApproval: boolean;
  maxActiveReservationsPerResident: number;
}

export interface ApiAmenityFacility {
  _id: string;
  orgId: string;
  name: string;
  description?: string;
  archetype: AmenityArchetype;
  status: AmenityFacilityStatus;
  maxCapacity: number;
  maxHeadcountPerReservation: number;
  slotDurationMinutes: number;
  setupBufferMinutes: number;
  teardownBufferMinutes: number;
  timezone: string;
  pricingConfig: ApiFacilityPricingConfig;
  bookingRules: ApiFacilityBookingRules;
  operatingHours: ApiFacilityOperatingHour[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Resource Entity (for ROOM_RESOURCE or INVENTORY_TOOLS)
export interface ApiAmenityResource {
  _id: string;
  orgId: string;
  facilityId: string;
  name: string;
  identifier: string;
  concurrencyVersion: number;
  setupBufferMinutes: number;
  teardownBufferMinutes: number;
  isSerializedAsset: boolean;
  serialNumber?: string;
  assetState: AmenityAssetState;
  totalBulkStock: number;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Availability Evaluation Response
export interface ApiAvailabilityResponse {
  isAvailable: boolean;
  reason?: string;
  availableUnits?: number;
  maxCapacity?: number;
  effectiveStartDateTime: string;
  effectiveEndDateTime: string;
}

// Pricing Snapshot
export interface ApiPricingSnapshot {
  baseAmount: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: string;
}

// Hold Entity
export interface ApiAmenityHold {
  _id: string;
  orgId: string;
  facilityId: string;
  resourceId?: string;
  userId: string;
  unitId?: string;
  requestedStartDateTime: string;
  requestedEndDateTime: string;
  headcount: number;
  quantity: number;
  holdType: AmenityHoldType;
  status: AmenityHoldStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCreateHoldResponse {
  hold: ApiAmenityHold;
  pricingSnapshot: ApiPricingSnapshot;
}

// Reservation Entity
export interface ApiAmenityGuest {
  name: string;
  phone?: string;
  email?: string;
}

export interface ApiAmenityReservation {
  _id: string;
  reservationNumber?: string;
  orgId: string;
  facilityId: string | ApiAmenityFacility;
  resourceId?: string | ApiAmenityResource;
  userId: string | any;
  unitId?: string;
  startDateTime: string;
  endDateTime: string;
  headcount: number;
  quantity: number;
  guests?: ApiAmenityGuest[];
  pricingSnapshot: ApiPricingSnapshot;
  bookingStatus: AmenityBookingStatus;
  paymentStatus: AmenityPaymentStatus;
  approvalStatus: AmenityApprovalStatus;
  accessStatus: AmenityAccessStatus;
  completionStatus: AmenityCompletionStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  holdId?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// Access Pass Entity
export interface ApiAmenityAccessPass {
  _id: string;
  orgId: string;
  facilityId: string;
  reservationId: string;
  userId: string;
  passCode: string;
  qrData: string;
  passType: AmenityPassType;
  validFrom: string;
  validUntil: string;
  maxUses: number;
  currentUses: number;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: AmenityPassStatus;
  createdAt: string;
  updatedAt: string;
}

// Maintenance Block Entity
export interface ApiAmenityMaintenanceBlock {
  _id: string;
  orgId: string;
  facilityId: string;
  resourceId?: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  blockType: string;
  status: AmenityMaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

// Request Payloads
export interface CreateHoldApiPayload {
  facilityId: string;
  resourceId?: string;
  requestedStartDateTime: string;
  requestedEndDateTime: string;
  headcount?: number;
  quantity?: number;
  holdType?: AmenityHoldType;
  holdDurationMinutes?: number;
  unitId?: string;
  quotaLimit?: number;
}

export interface ConfirmReservationApiPayload {
  holdId: string;
  paymentReference?: string;
  notes?: string;
}

export interface CalculatePricingApiPayload {
  facilityId: string;
  startDateTime: string;
  endDateTime: string;
  headcount?: number;
  quantity?: number;
}

export interface CancelReservationApiPayload {
  reason?: string;
}

export interface ReviewReservationApiPayload {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface RescheduleReservationApiPayload {
  newStartDateTime: string;
  newEndDateTime: string;
}

export interface ScheduleMaintenanceApiPayload {
  facilityId: string;
  resourceId?: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  blockType: string;
}
