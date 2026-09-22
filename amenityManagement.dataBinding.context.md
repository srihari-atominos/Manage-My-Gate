# Amenity Management — Phase 6A: Mobile Data-Binding Context & Architecture

**Subsystem:** Amenity Management v2 Mobile Client  
**Status:** IMPLEMENTATION COMPLETE & VERIFIED  
**Backend Baseline:** Phase 5 Complete & Frozen (196/196 backend tests passing)  
**Mobile Test Suite:** 53/53 tests passing (including Visitor regression tests)  
**Date:** September 2026  

---

## 1. Executive Overview

Phase 6A establishes the **mobile frontend data-binding foundation** for the frozen Amenity Management v2 subsystem inside `mobile/mobile-app/src/features/amenities/`. It cleanly connects:

```text
Backend API (/api/v2/amenity-management/*)
    ↓
Typed API Models (amenityApi.types.ts)
    ↓
Payload / Response Mappers (amenityPayloadMappers.ts)
    ↓
Amenity Management Service (amenityManagementService.ts)
    ↓
Redux Toolkit (amenityBookingSlice.ts - v2 state & thunks)
    ↓
Custom Hooks (useResidentBooking.ts & useResidentAmenities.ts)
    ↓
Existing Mobile UI
```

### Strict Architectural Boundaries
- **Backend Frozen:** Exactly 0 lines of backend code were modified.
- **Visitor Untouched:** Exactly 0 lines of code under `src/features/visitor/` were modified, and 0 visitor modules were imported. The data-collection architecture (controlled state, multi-step coordination, dynamic row collection, in-memory ID stripping) was replicated cleanly in isolated Amenity feature modules.
- **Legacy Amenity Preservation:** All pre-existing legacy Amenity types, slices, and hooks continue functioning without breaking changes.

---

## 2. API Namespace & Dynamic Host Resolution

### 2.1 The v2 Routing Namespace
The Amenity Management backend is mounted at root as `/api/v2/amenity-management/*`.

### 2.2 Feature-Local URL Resolver (`getAmenityV2Url`)
Because the global mobile `apiClient` defaults to `/api/v1`, Amenity Management employs a dedicated feature-local URL resolver in `amenityManagementService.ts`:
```typescript
export const getAmenityV2Url = (endpointPath: string): string => {
  const rawBase = (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : '') || apiClient.defaults.baseURL || '';
  const cleanHost = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${cleanHost}/api/v2/amenity-management${cleanPath}`;
};
```

#### Key Architecture Properties:
1. **Dynamic Host Derivation:** Exclusively derives the base host at runtime via `getApiBaseUrl()`. No port (`5002`, `5000`), `localhost`, or IP address is hardcoded.
2. **Absolute URL Protocol:** Returning an absolute URL (`http(s)://...`) causes Axios `buildFullPath` to ignore `baseURL`, preventing `/api/v1/api/v2` namespace duplication.
3. **Interceptor Preservation:** All global `apiClient` request and response interceptors remain 100% active:
   - Bearer JWT Authorization
   - Multi-tenant boundary header (`x-organization-id`)
   - Correlation tracing (`X-Request-ID: <uuid>`)
   - Automatic 401 token refresh & failed queue replay

---

## 3. Verified Backend Archetypes

The mobile layer strictly accepts only the 5 frozen backend archetypes:
```typescript
export type AmenityArchetype =
  | 'SHARED_CAPACITY'    // Swimming pool, Gym, Clubhouse lounge (concurrent capacity quota)
  | 'EXCLUSIVE_HOURLY'   // Tennis, Squash, Badminton courts (slot exclusivity)
  | 'EVENT_SPACE'        // Banquet hall, Community party terrace (daily/event rate, approvals)
  | 'ROOM_RESOURCE'      // Meeting room, Co-working pod, Music studio
  | 'INVENTORY_TOOLS';   // Drilling kit, Lawn mower, Projector (serialized asset / stock checkout)
```
*Audit Confirmation:* Erroneous assumptions such as `EXCLUSIVE_SLOT`, `UNLIMITED_OPEN`, `SLOT_EXCLUSIVE`, or `PER_PERSON_DAILY` are strictly prohibited and do not exist anywhere in the code.

---

## 4. The Five Orthogonal Reservation State Dimensions

The backend reservation state model (`amenityReservation.model.js`) rejects flattened status strings in favor of five orthogonal status axes. The mobile domain model reflects this architecture:

```typescript
// 1. Booking Status
export type AmenityBookingStatus =
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REJECTED';

// 2. Payment Status (NOTE: 'EXEMPTED' does NOT exist; 'NOT_REQUIRED' is used)
export type AmenityPaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'HELD_AUTHORIZED'
  | 'PAID'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'FAILED';

// 3. Approval Status
export type AmenityApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

// 4. Access Status
export type AmenityAccessStatus =
  | 'NOT_APPLICABLE'
  | 'PASS_GENERATED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'ACCESS_REVOKED';

// 5. Completion Status
export type AmenityCompletionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'ABANDONED';
```

---

## 5. Two-Phase Hold Protocol & Expiration Mechanics

### 5.1 The Two-Phase Booking Flow
1. **Phase 1 (Temporary Lock):** `POST /holds`
   - Client sends target window and headcount.
   - Backend reserves temporary hold and returns `{ hold, pricingSnapshot }`.
2. **Phase 2 (Payment & Confirmation):** `POST /reservations/confirm`
   - If payment required, mobile payment gateway SDK collects payment $\to$ passes transaction token as `paymentReference` into confirmation body `{ holdId, paymentReference?, notes? }`.
   - Backend promotes hold to `CONFIRMED` reservation and releases active hold lock.

### 5.2 Authoritative `expiresAt` & Countdown Derivation
- Redux and domain state store the backend's authoritative `expiresAt` ISO string.
- No decrementing timer is stored in Redux.
- Pure calculation helper:
  ```typescript
  export const calculateHoldRemainingSeconds = (
    expiresAt: string | Date | null | undefined,
    currentMs: number = Date.now()
  ): number => {
    if (!expiresAt) return 0;
    const expiryTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
    if (isNaN(expiryTime)) return 0;
    return Math.max(0, Math.floor((expiryTime - currentMs) / 1000));
  };
  ```

---

## 6. Idempotency Architecture

- **Hold Creation (`POST /holds`):** Generates a client-side UUID per submit action (`x-idempotency-key`). In-flight retries of the same logical submission reuse the key.
- **Reservation Confirmation (`POST /reservations/confirm`):** Derives a deterministic key from the hold ID:
  ```text
  x-idempotency-key: confirm_hold_${payload.holdId}
  ```
  Guarantees network retries or user double-taps will never create duplicate reservations or double-charge.

---

## 7. Dynamic Availability Evaluation

The backend does not return a precomputed 24h slot grid. The mobile layer models availability as a **dynamic evaluation query**:
- Endpoint: `GET /availability?facilityId=...&startDateTime=...&endDateTime=...`
- Response: `{ isAvailable: boolean, reason?: string, availableUnits?: number, maxCapacity?: number, effectiveStartDateTime, effectiveEndDateTime }`
- Discrete UI selections are managed locally via `AmenitySlotSelection`, which normalizes candidate start/end times into UTC ISO strings before querying.

---

## 8. Immutable Pricing Snapshot

Server pricing is authoritative. When calculating pricing (`POST /pricing/calculate`) or creating a hold (`POST /holds`), the returned `AmenityPricingSnapshot`:
```typescript
export interface AmenityPricingSnapshot {
  baseAmount: number;
  taxAmount: number;
  depositAmount: number;
  totalAmount: number;
  currency: string;
}
```
is stored immutably on the reservation. Subsequent calculations for other slots never overwrite an active reservation's snapshot.

---

## 9. Canonical Access Pass Eligibility Rule

Access pass (QR code) display is governed by a pure, deterministic predicate based solely on frozen Phase 5 backend enums:
```typescript
export const canDisplayAmenityAccessPass = (
  reservation: AmenityReservation | null | undefined
): boolean => {
  if (!reservation) return false;

  const isBookingValid = reservation.bookingStatus === 'CONFIRMED';
  const isApprovalValid =
    reservation.approvalStatus === 'APPROVED' ||
    reservation.approvalStatus === 'NOT_REQUIRED';
  const isPaymentValid =
    reservation.paymentStatus === 'PAID' ||
    reservation.paymentStatus === 'NOT_REQUIRED';
  const isAccessValid =
    reservation.accessStatus === 'PASS_GENERATED' ||
    reservation.accessStatus === 'CHECKED_IN';

  return isBookingValid && isApprovalValid && isPaymentValid && isAccessValid;
};
```

---

## 10. Comprehensive Error Mapping

The error mapper (`amenityErrorMapper.ts`) normalizes HTTP status codes and payloads:
- **HTTP 400 (Validation Failure):** Extracts Express-Validator `details: [{ field, message, value }]` into a structured dictionary `fieldErrors: Record<string, string>`.
- **HTTP 401 (Unauthorized):** Maps to session expiration notification.
- **HTTP 403 (Forbidden):** Maps to tenant boundary / RBAC violation notification.
- **HTTP 404 (Not Found):** Maps to facility/reservation missing message.
- **HTTP 409 (Conflict):** Categorizes conflicts into:
  - `SLOT_CAPACITY`: Capacity exhausted or overlapping reservation
  - `IDEMPOTENCY_MISMATCH`: Idempotency key reused with different payload
  - `OPERATION_IN_PROGRESS`: Simultaneous in-flight request lock
  - `CONCURRENCY_VERSION`: Optimistic concurrency version mismatch
- **HTTP 410 (Gone):** Sets `isHoldExpired: true` to trigger slot re-selection.
- **Network / Timeout:** Maps aborts and timeouts gracefully.

---

## 11. Visitor Management Architectural Pattern Adoption

| Concern | Visitor Management Pattern | Amenity Management v2 Implementation |
| :--- | :--- | :--- |
| **Dynamic Guest Rows** | `GroupGuestItem` with in-memory `id` | `AmenityGuest` with in-memory `clientId` |
| **Payload Sanitization** | `mapGroupFormToApiPayload` strips local IDs | `mapGuestsToApiPayload` strips `clientId` and empty rows |
| **Two-Phase Handoff** | Multi-step form state committed on final step | `activeHold` in Step 1 $\to$ `confirmReservation` in Step 2 |
| **Code Boundary** | Zero cross-feature imports | 0 imports from `src/features/visitor/*` |

---

## 12. File Inventory

### Created Files
- `mobile/mobile-app/src/features/amenities/types/amenityApi.types.ts`: Frozen backend API contracts
- `mobile/mobile-app/src/features/amenities/types/amenityDomain.types.ts`: Clean domain models
- `mobile/mobile-app/src/features/amenities/services/amenityManagementService.ts`: v2 HTTP client with dynamic URL resolution & idempotency
- `mobile/mobile-app/src/features/amenities/utils/amenityStateHelpers.ts`: Pure business rules (`canDisplayAmenityAccessPass`, `calculateHoldRemainingSeconds`)
- `mobile/mobile-app/src/features/amenities/utils/amenityPayloadMappers.ts`: UI-to-API and API-to-Domain transformers
- `mobile/mobile-app/src/features/amenities/utils/amenityErrorMapper.ts`: HTTP 400/409/410/5xx error normalization
- `mobile/mobile-app/src/features/amenities/hooks/useResidentAmenities.ts`: Facility and resource discovery hook
- `mobile/mobile-app/src/features/amenities/__tests__/amenityDataBinding.test.ts`: 24-scenario comprehensive test suite

### Modified Files
- `mobile/mobile-app/src/features/amenities/store/amenityBookingSlice.ts`: Extended with v2 state (`activeHold`, `v2Reservations`, etc.), v2 async thunks, and reducers while preserving legacy state
- `mobile/mobile-app/src/features/amenities/hooks/useResidentBooking.ts`: Extended with v2 two-phase booking, hold expiry derivation, and pass eligibility while preserving legacy exports

---

## 13. Test Verification Summary

```text
Test Suites: 2 passed, 2 total
Tests:       53 passed, 53 total
  - src/features/visitor/__tests__/VisitorPassCard.test.tsx: 19/19 PASSED
  - src/features/amenities/__tests__/amenityDataBinding.test.ts: 34/34 PASSED
Snapshots:   0 total
Time:        16.013 s
```
