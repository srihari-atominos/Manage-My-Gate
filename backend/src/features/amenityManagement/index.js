// ==========================================
// 12 Mongoose Models
// ==========================================
export { AmenityFacility } from './facilities/amenityFacility.model.js';
export { AmenityResource } from './resources/amenityResource.model.js';
export { AmenitySlotAllocation } from './allocations/amenitySlotAllocation.model.js';
export { AmenityAllocationLedger } from './allocations/amenityAllocationLedger.model.js';
export { AmenityReservationHold } from './holds/amenityReservationHold.model.js';
export { AmenityReservation } from './reservations/amenityReservation.model.js';
export { AmenityQuotaAllocation } from './quotas/amenityQuotaAllocation.model.js';
export { AmenityAccessPass } from './passes/amenityAccessPass.model.js';
export { AmenityMaintenanceBlock } from './maintenance/amenityMaintenanceBlock.model.js';
export { AmenityOutboxEvent } from './outbox/amenityOutboxEvent.model.js';
export { AmenityIdempotencyRecord } from './idempotency/amenityIdempotencyRecord.model.js';
export { AmenityCounter } from './counters/amenityCounter.model.js';

// ==========================================
// 12 Repositories
// ==========================================
export {
  AmenityFacilityRepository,
  amenityFacilityRepository,
} from './facilities/amenityFacility.repository.js';
export {
  AmenityResourceRepository,
  amenityResourceRepository,
} from './resources/amenityResource.repository.js';
export {
  AmenitySlotAllocationRepository,
  amenitySlotAllocationRepository,
} from './allocations/amenitySlotAllocation.repository.js';
export {
  AmenityAllocationLedgerRepository,
  amenityAllocationLedgerRepository,
} from './allocations/amenityAllocationLedger.repository.js';
export {
  AmenityReservationHoldRepository,
  amenityReservationHoldRepository,
} from './holds/amenityReservationHold.repository.js';
export {
  AmenityReservationRepository,
  amenityReservationRepository,
} from './reservations/amenityReservation.repository.js';
export {
  AmenityQuotaAllocationRepository,
  amenityQuotaAllocationRepository,
} from './quotas/amenityQuotaAllocation.repository.js';
export {
  AmenityAccessPassRepository,
  amenityAccessPassRepository,
} from './passes/amenityAccessPass.repository.js';
export {
  AmenityMaintenanceBlockRepository,
  amenityMaintenanceBlockRepository,
} from './maintenance/amenityMaintenanceBlock.repository.js';
export {
  AmenityOutboxEventRepository,
  amenityOutboxEventRepository,
} from './outbox/amenityOutboxEvent.repository.js';
export {
  AmenityIdempotencyRecordRepository,
  amenityIdempotencyRecordRepository,
} from './idempotency/amenityIdempotencyRecord.repository.js';
export {
  AmenityCounterRepository,
  amenityCounterRepository,
} from './counters/amenityCounter.repository.js';

// ==========================================
// Feature & Domain Services
// ==========================================
export {
  AmenityFacilityService,
  amenityFacilityService,
} from './facilities/amenityFacility.service.js';
export {
  AmenityResourceService,
  amenityResourceService,
} from './resources/amenityResource.service.js';
export {
  AmenityReservationHoldService,
  amenityReservationHoldService,
} from './holds/amenityReservationHold.service.js';
export {
  AmenityReservationService,
  amenityReservationService,
} from './reservations/amenityReservation.service.js';
export {
  AmenityAccessPassService,
  amenityAccessPassService,
} from './passes/amenityAccessPass.service.js';
export {
  AmenityQuotaAllocationService,
  amenityQuotaAllocationService,
} from './quotas/amenityQuotaAllocation.service.js';
export {
  AmenityMaintenanceBlockService,
  amenityMaintenanceBlockService,
} from './maintenance/amenityMaintenanceBlock.service.js';
export {
  AmenityCounterService,
  amenityCounterService,
} from './counters/amenityCounter.service.js';
export {
  AmenityIdempotencyService,
  amenityIdempotencyService,
} from './idempotency/amenityIdempotencyRecord.service.js';

// Domain Core Services & Concurrency Utilities
export {
  AvailabilityService,
  availabilityService,
} from './domain/availability/availability.service.js';
export {
  PricingService,
  pricingService,
} from './domain/pricing/pricing.service.js';
export {
  ResourceMutexService,
  resourceMutexService,
} from './domain/concurrency/resourceMutex.service.js';
export {
  withTransaction,
  withTransactionRetry,
} from './domain/concurrency/transaction.utils.js';

// Events & Real-time Sockets
export {
  AMENITY_EVENTS,
  amenityManagementEvents,
} from './amenityManagement.events.js';
export {
  AmenityManagementSocket,
  amenityManagementSocket,
} from './amenityManagement.socket.js';
