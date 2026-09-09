import mongoose from 'mongoose';
import HttpError from '../../../utils/httpError.utils.js';
import amenityReservationRepository from './amenityReservation.repository.js';
import amenityReservationHoldRepository from '../holds/amenityReservationHold.repository.js';
import amenityFacilityRepository from '../facilities/amenityFacility.repository.js';
import amenitySlotAllocationRepository from '../allocations/amenitySlotAllocation.repository.js';
import amenityAllocationLedgerRepository from '../allocations/amenityAllocationLedger.repository.js';
import amenityOutboxEventRepository from '../outbox/amenityOutboxEvent.repository.js';
import amenityCounterService from '../counters/amenityCounter.service.js';
import amenityQuotaAllocationService from '../quotas/amenityQuotaAllocation.service.js';
import amenityAccessPassService from '../passes/amenityAccessPass.service.js';
import pricingService from '../domain/pricing/pricing.service.js';
import { withTransactionRetry } from '../domain/concurrency/transaction.utils.js';
import amenityManagementEvents, { AMENITY_EVENTS } from '../amenityManagement.events.js';

export class AmenityReservationService {
  /**
   * Promotes an active hold into a confirmed or pending-approval reservation.
   * Generates sequential reservation number, allocates pass, consumes quota,
   * transitions ledger, and publishes outbox events atomically.
   *
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.holdId
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} params.residentId
   * @param {string|mongoose.Types.ObjectId} params.unitId
   * @param {string} [params.paymentReference]
   * @param {string} [params.notes]
   * @param {mongoose.ClientSession} [session]
   * @returns {Promise<{ reservation: any, pass?: any, rawToken?: string }>}
   */
  async confirmReservationFromHold(params, session) {
    if (session) {
      return this._executeConfirmReservation(params, session);
    }
    return withTransactionRetry(async (trxSession) => {
      return this._executeConfirmReservation(params, trxSession);
    });
  }

  /**
   * Internal implementation of reservation confirmation inside a transaction session.
   * @private
   */
  async _executeConfirmReservation(
    { holdId, orgId, residentId, unitId, paymentReference, notes },
    session
  ) {
    // 1. Verify Active Hold
    const hold = await amenityReservationHoldRepository.findActiveById(holdId, session);
    if (!hold) {
      throw new HttpError(410, 'Reservation hold has expired or is no longer active');
    }

    if (
      hold.orgId.toString() !== orgId.toString() ||
      hold.residentId.toString() !== residentId.toString()
    ) {
      throw new HttpError(403, 'Reservation hold does not match user or organization');
    }

    // 2. State-Guarded Hold Transition (ACTIVE -> PROMOTED)
    const promotedHold = await amenityReservationHoldRepository.transitionStatus(
      { holdId, fromStatus: 'ACTIVE', toStatus: 'PROMOTED' },
      session
    );

    if (!promotedHold) {
      throw new HttpError(409, 'Reservation hold has already been promoted or expired');
    }

    // 3. Facility Lookup for Pricing & Workflow Rules
    const facility = await amenityFacilityRepository.findById(hold.facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, 'Amenity facility not found');
    }

    // 4. Compute Final Pricing Snapshot
    const pricingSnapshot = pricingService.calculatePricingSnapshot({
      pricingConfig: facility.pricingConfig || facility.pricing,
      startDateTime: hold.requestedStartDateTime,
      endDateTime: hold.requestedEndDateTime,
      headcount: hold.headcount,
      quantity: hold.quantity,
    });

    // 5. Determine the 5 Orthogonal Dimensions
    const requiresApproval =
      facility.requiresApproval || facility.approvalWorkflow?.requireAdminApproval || false;
    const bookingStatus = requiresApproval ? 'PENDING_APPROVAL' : 'CONFIRMED';
    const approvalStatus = requiresApproval ? 'PENDING_REVIEW' : 'NOT_REQUIRED';
    const approvalDeadline = requiresApproval
      ? new Date(Date.now() + (facility.approvalWorkflow?.approvalTimeoutHours || 24) * 3600000)
      : null;

    let paymentStatus = 'NOT_REQUIRED';
    if (pricingSnapshot.totalAmount > 0) {
      paymentStatus = paymentReference ? 'PAID' : 'PENDING';
    }

    const shouldIssuePass =
      !requiresApproval && (paymentStatus === 'NOT_REQUIRED' || paymentStatus === 'PAID');
    const accessStatus = shouldIssuePass ? 'PASS_GENERATED' : 'NOT_APPLICABLE';
    const completionStatus = 'PENDING';

    // 6. Generate Tenant-Scoped Sequential Reservation Number
    const reservationNumber = await amenityCounterService.generateReservationNumber(
      { orgId },
      session
    );

    // 7. Create AmenityReservation Document
    const reservation = await amenityReservationRepository.create(
      {
        orgId,
        facilityId: hold.facilityId,
        resourceId: hold.resourceId,
        residentId: hold.residentId,
        unitId: hold.unitId,
        reservationNumber,
        requestedStartDateTime: hold.requestedStartDateTime,
        requestedEndDateTime: hold.requestedEndDateTime,
        effectiveStartDateTime: hold.effectiveStartDateTime,
        effectiveEndDateTime: hold.effectiveEndDateTime,
        headcount: hold.headcount,
        quantity: hold.quantity,
        bookingStatus,
        paymentStatus,
        approvalStatus,
        accessStatus,
        completionStatus,
        pricingSnapshot,
        totalAmount: pricingSnapshot.totalAmount,
        depositAmount: pricingSnapshot.depositAmount,
        approvalDeadline,
        approvalHistory: requiresApproval
          ? [
              {
                action: 'REQUESTED',
                performedBy: residentId,
                timestamp: new Date(),
                notes: notes || 'Reservation submitted for review',
              },
            ]
          : [],
      },
      session
    );

    // 8. Promote Ledger Entries & Discrete Slot
    await amenityAllocationLedgerRepository.transitionStatus(
      {
        holdId: hold._id,
        fromStatus: 'HELD',
        toStatus: 'CONFIRMED',
        assignReservationId: reservation._id,
      },
      session
    );

    if (hold.resourceId && facility.archetype === 'EXCLUSIVE_HOURLY') {
      const slotStartUTC = hold.requestedStartDateTime.toISOString();
      const slotId = `SLOT:${orgId}:${hold.resourceId}:${slotStartUTC}`;
      await amenitySlotAllocationRepository.promoteDiscreteSlot(slotId, reservation._id, session);
    }

    // 9. Consume Household Quota (Promote from reserved to consumed)
    const requestedUnits = Math.ceil(
      (hold.effectiveEndDateTime.getTime() - hold.effectiveStartDateTime.getTime()) / 60000
    );
    await amenityQuotaAllocationService.promoteQuota(
      {
        orgId,
        unitId: hold.unitId,
        facilityId: hold.facilityId,
        requestedUnits,
        date: hold.requestedStartDateTime,
      },
      session
    );

    // 10. Generate Access Pass if Confirmed
    let pass = null;
    let rawToken = null;
    if (shouldIssuePass) {
      const passResult = await amenityAccessPassService.issueAccessPass(
        {
          orgId,
          reservationId: reservation._id,
          passType: 'QR_DYNAMIC',
          validFrom: hold.effectiveStartDateTime,
          validUntil: hold.effectiveEndDateTime,
        },
        session
      );
      pass = passResult.pass;
      rawToken = passResult.rawToken;
    }

    // 11. Record Transactional Outbox Events
    const outboxEventType = requiresApproval ? 'APPROVAL_REQUESTED' : 'RESERVATION_CONFIRMED';
    await amenityOutboxEventRepository.createEvent(
      {
        orgId,
        eventType: outboxEventType,
        aggregateId: reservation._id,
        aggregateType: 'AmenityReservation',
        payload: {
          reservationId: reservation._id,
          reservationNumber: reservation.reservationNumber,
          residentId: reservation.residentId,
          facilityId: reservation.facilityId,
          bookingStatus,
          approvalStatus,
          paymentStatus,
        },
      },
      session
    );

    if (pass) {
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'GATE_PASS_ISSUED',
          aggregateId: pass._id,
          aggregateType: 'AmenityAccessPass',
          payload: {
            passId: pass._id,
            reservationId: reservation._id,
            residentId: reservation.residentId,
          },
        },
        session
      );
    }

    // 12. Emit Domain Events
    amenityManagementEvents.emit(
      requiresApproval ? AMENITY_EVENTS.APPROVAL_REQUESTED : AMENITY_EVENTS.RESERVATION_CONFIRMED,
      reservation
    );

    if (pass) {
      amenityManagementEvents.emit(AMENITY_EVENTS.GATE_PASS_ISSUED, {
        pass,
        reservationId: reservation._id,
        residentId: reservation.residentId,
      });
    }

    return { reservation, pass, rawToken };
  }

  /**
   * Cancels an active or pending-approval reservation.
   * State-guarded, releases allocation ledger & slots, refunds quota,
   * revokes passes, and dispatches refund outbox event if paid.
   *
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.reservationId
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} params.residentId
   * @param {string} [params.cancellationReason]
   * @param {string|mongoose.Types.ObjectId} [params.cancelledBy]
   * @param {mongoose.ClientSession} [session]
   */
  async cancelReservation(params, session) {
    if (session) {
      return this._executeCancelReservation(params, session);
    }
    return withTransactionRetry(async (trxSession) => {
      return this._executeCancelReservation(params, trxSession);
    });
  }

  /**
   * Internal implementation of reservation cancellation.
   * @private
   */
  async _executeCancelReservation(
    { reservationId, orgId, residentId, cancellationReason, cancelledBy },
    session
  ) {
    // 1. Fetch Reservation
    const reservation = await amenityReservationRepository.findById(reservationId, session);
    if (!reservation || reservation.orgId.toString() !== orgId.toString()) {
      throw new HttpError(404, 'Reservation not found');
    }

    // Idempotent: already cancelled
    if (reservation.bookingStatus === 'CANCELLED') {
      return reservation;
    }

    if (reservation.bookingStatus === 'REJECTED') {
      throw new HttpError(400, 'Cannot cancel a rejected reservation');
    }

    // 2. Determine updated payment status
    let newPaymentStatus = reservation.paymentStatus;
    if (reservation.paymentStatus === 'PAID') {
      newPaymentStatus = 'REFUND_PENDING';
    }

    // 3. Update Reservation Dimensions
    const updatedReservation = await amenityReservationRepository.updateStateDimensions(
      reservationId,
      {
        bookingStatus: 'CANCELLED',
        paymentStatus: newPaymentStatus,
        accessStatus: 'ACCESS_REVOKED',
        cancelledAt: new Date(),
        cancellationReason: cancellationReason || 'Cancelled by user',
        cancelledBy: cancelledBy || residentId,
      },
      session
    );

    // 4. Release Allocations & Capacity via Ledger
    const ledgerEntries = await amenityAllocationLedgerRepository.findByReservationId(
      reservationId,
      session
    );

    for (const entry of ledgerEntries) {
      const released = await amenityAllocationLedgerRepository.transitionStatus(
        {
          reservationId,
          fromStatus: 'CONFIRMED',
          toStatus: 'RELEASED',
        },
        session
      );

      if (released) {
        if (entry.allocationType === 'CAPACITY_HEADCOUNT' && entry.bucketId) {
          await amenitySlotAllocationRepository.decrementCapacityBucket(
            entry.bucketId,
            entry.allocatedQuantity,
            session
          );
        } else if (entry.allocationType === 'BULK_INVENTORY' && entry.bucketId) {
          await amenitySlotAllocationRepository.decrementBulkDayBucket(
            entry.bucketId,
            entry.allocatedQuantity,
            session
          );
        }
      }
    }

    if (reservation.resourceId) {
      const slotStartUTC = reservation.requestedStartDateTime.toISOString();
      const slotId = `SLOT:${reservation.orgId}:${reservation.resourceId}:${slotStartUTC}`;
      await amenitySlotAllocationRepository.releaseDiscreteSlot(slotId, session);
    }

    // 5. Refund Consumed Quota
    const requestedUnits = Math.ceil(
      (reservation.effectiveEndDateTime.getTime() - reservation.effectiveStartDateTime.getTime()) /
        60000
    );

    await amenityQuotaAllocationService.refundQuota(
      {
        orgId,
        unitId: reservation.unitId,
        facilityId: reservation.facilityId,
        requestedUnits,
        date: reservation.requestedStartDateTime,
      },
      session
    );

    // 6. Revoke All Access Passes
    await amenityAccessPassService.revokeAllByReservationId(
      reservationId,
      orgId,
      cancellationReason || 'Reservation cancelled',
      session
    );

    // 7. Write Outbox Events
    await amenityOutboxEventRepository.createEvent(
      {
        orgId,
        eventType: 'RESERVATION_CANCELLED',
        aggregateId: reservation._id,
        aggregateType: 'AmenityReservation',
        payload: {
          reservationId: reservation._id,
          reservationNumber: reservation.reservationNumber,
          residentId: reservation.residentId,
          cancellationReason,
        },
      },
      session
    );

    if (newPaymentStatus === 'REFUND_PENDING') {
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'REFUND_DISPATCH_REQUIRED',
          aggregateId: reservation._id,
          aggregateType: 'AmenityReservation',
          payload: {
            reservationId: reservation._id,
            reservationNumber: reservation.reservationNumber,
            amount: reservation.totalAmount,
            reason: cancellationReason || 'Reservation cancelled',
          },
        },
        session
      );
    }

    // 8. Emit Domain Events
    amenityManagementEvents.emit(AMENITY_EVENTS.RESERVATION_CANCELLED, updatedReservation);
    if (newPaymentStatus === 'REFUND_PENDING') {
      amenityManagementEvents.emit(AMENITY_EVENTS.REFUND_DISPATCH_REQUIRED, {
        reservationId: updatedReservation._id,
        amount: updatedReservation.totalAmount,
      });
    }

    return updatedReservation;
  }

  /**
   * Maker-checker review action for event / approval-pending reservations.
   *
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.reservationId
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} params.adminUserId
   * @param {'APPROVED'|'REJECTED'} params.action
   * @param {string} [params.notes]
   * @param {mongoose.ClientSession} [session]
   */
  async reviewEventReservation(params, session) {
    if (session) {
      return this._executeReviewEventReservation(params, session);
    }
    return withTransactionRetry(async (trxSession) => {
      return this._executeReviewEventReservation(params, trxSession);
    });
  }

  /**
   * Internal implementation of review workflow.
   * @private
   */
  async _executeReviewEventReservation(
    { reservationId, orgId, adminUserId, action, notes },
    session
  ) {
    const reservation = await amenityReservationRepository.findById(reservationId, session);
    if (!reservation || reservation.orgId.toString() !== orgId.toString()) {
      throw new HttpError(404, 'Reservation not found');
    }

    if (reservation.approvalStatus !== 'PENDING_REVIEW') {
      throw new HttpError(
        409,
        `Reservation is not pending review (current approvalStatus: ${reservation.approvalStatus})`
      );
    }

    // Enforce approval deadline timeout
    if (reservation.approvalDeadline && reservation.approvalDeadline < new Date()) {
      throw new HttpError(408, 'Approval deadline has expired for this reservation');
    }

    if (action === 'APPROVED') {
      const isPaymentPending = reservation.paymentStatus === 'PENDING';
      const shouldConfirm = !isPaymentPending;
      const bookingStatus = shouldConfirm ? 'CONFIRMED' : 'PENDING_APPROVAL';
      const accessStatus = shouldConfirm ? 'PASS_GENERATED' : 'NOT_APPLICABLE';

      await amenityReservationRepository.appendApprovalHistory(
        reservationId,
        {
          action: 'APPROVED',
          performedBy: adminUserId,
          timestamp: new Date(),
          notes: notes || 'Approved by administrator',
        },
        session
      );

      const updatedReservation = await amenityReservationRepository.updateStateDimensions(
        reservationId,
        {
          bookingStatus,
          approvalStatus: 'APPROVED',
          accessStatus,
        },
        session
      );

      let pass = null;
      let rawToken = null;

      // Only generate pass and emit confirmation events when fully confirmed (paid or free)
      if (shouldConfirm) {
        const passResult = await amenityAccessPassService.issueAccessPass(
          {
            orgId,
            reservationId: reservation._id,
            passType: 'QR_DYNAMIC',
            validFrom: reservation.effectiveStartDateTime,
            validUntil: reservation.effectiveEndDateTime,
          },
          session
        );
        pass = passResult.pass;
        rawToken = passResult.rawToken;

        await amenityOutboxEventRepository.createEvent(
          {
            orgId,
            eventType: 'GATE_PASS_ISSUED',
            aggregateId: pass._id,
            aggregateType: 'AmenityAccessPass',
            payload: {
              passId: pass._id,
              reservationId: reservation._id,
              residentId: reservation.residentId,
            },
          },
          session
        );

        await amenityOutboxEventRepository.createEvent(
          {
            orgId,
            eventType: 'RESERVATION_CONFIRMED',
            aggregateId: reservation._id,
            aggregateType: 'AmenityReservation',
            payload: {
              reservationId: reservation._id,
              reservationNumber: reservation.reservationNumber,
              residentId: reservation.residentId,
            },
          },
          session
        );

        amenityManagementEvents.emit(AMENITY_EVENTS.RESERVATION_CONFIRMED, updatedReservation);
      }

      return { reservation: updatedReservation, pass, rawToken };
    }

    if (action === 'REJECTED') {
      let newPaymentStatus = reservation.paymentStatus;
      if (reservation.paymentStatus === 'PAID') {
        newPaymentStatus = 'REFUND_PENDING';
      }

      await amenityReservationRepository.appendApprovalHistory(
        reservationId,
        {
          action: 'REJECTED',
          performedBy: adminUserId,
          timestamp: new Date(),
          notes: notes || 'Rejected by administrator',
        },
        session
      );

      const updatedReservation = await amenityReservationRepository.updateStateDimensions(
        reservationId,
        {
          bookingStatus: 'REJECTED',
          approvalStatus: 'REJECTED',
          accessStatus: 'NOT_APPLICABLE',
          paymentStatus: newPaymentStatus,
        },
        session
      );

      // Release Allocations & Ledger
      const ledgerEntries = await amenityAllocationLedgerRepository.findByReservationId(
        reservationId,
        session
      );

      for (const entry of ledgerEntries) {
        const released = await amenityAllocationLedgerRepository.transitionStatus(
          {
            reservationId,
            fromStatus: 'CONFIRMED',
            toStatus: 'RELEASED',
          },
          session
        );

        if (released) {
          if (entry.allocationType === 'CAPACITY_HEADCOUNT' && entry.bucketId) {
            await amenitySlotAllocationRepository.decrementCapacityBucket(
              entry.bucketId,
              entry.allocatedQuantity,
              session
            );
          } else if (entry.allocationType === 'BULK_INVENTORY' && entry.bucketId) {
            await amenitySlotAllocationRepository.decrementBulkDayBucket(
              entry.bucketId,
              entry.allocatedQuantity,
              session
            );
          }
        }
      }

      if (reservation.resourceId) {
        const slotStartUTC = reservation.requestedStartDateTime.toISOString();
        const slotId = `SLOT:${reservation.orgId}:${reservation.resourceId}:${slotStartUTC}`;
        await amenitySlotAllocationRepository.releaseDiscreteSlot(slotId, session);
      }

      // Refund Quota
      const requestedUnits = Math.ceil(
        (reservation.effectiveEndDateTime.getTime() -
          reservation.effectiveStartDateTime.getTime()) /
          60000
      );

      await amenityQuotaAllocationService.refundQuota(
        {
          orgId,
          unitId: reservation.unitId,
          facilityId: reservation.facilityId,
          requestedUnits,
          date: reservation.requestedStartDateTime,
        },
        session
      );

      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'RESERVATION_CANCELLED',
          aggregateId: reservation._id,
          aggregateType: 'AmenityReservation',
          payload: {
            reservationId: reservation._id,
            reservationNumber: reservation.reservationNumber,
            reason: notes || 'Rejected by administrator',
          },
        },
        session
      );

      amenityManagementEvents.emit(AMENITY_EVENTS.RESERVATION_CANCELLED, updatedReservation);

      return { reservation: updatedReservation };
    }

    throw new HttpError(400, `Unsupported review action: ${action}`);
  }

  /**
   * Processes payment webhooks idempotently.
   * Handles late payments for expired holds by scheduling an automatic refund.
   *
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} [params.holdId]
   * @param {string|mongoose.Types.ObjectId} [params.reservationId]
   * @param {string} params.paymentReference
   * @param {'PAID'|'FAILED'} params.status
   * @param {number} [params.paymentAmount]
   * @param {mongoose.ClientSession} [session]
   */
  async handlePaymentWebhook(params, session) {
    if (session) {
      return this._executePaymentWebhook(params, session);
    }
    return withTransactionRetry(async (trxSession) => {
      return this._executePaymentWebhook(params, trxSession);
    });
  }

  /**
   * Internal implementation of payment webhook handling.
   * @private
   */
  async _executePaymentWebhook(
    { orgId, holdId, reservationId, paymentReference, status, paymentAmount },
    session
  ) {
    // Case 1: Payment for an existing reservation document
    if (reservationId) {
      const reservation = await amenityReservationRepository.findById(reservationId, session);
      if (!reservation) {
        throw new HttpError(404, 'Reservation not found for payment webhook');
      }

      // Tenant spoofing guard: reject if caller passed orgId that differs from database
      if (orgId && reservation.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Tenant spoofing detected for reservation payment webhook.');
      }

      // Underpayment guard: reject if payment amount is less than reservation total
      if (
        status === 'PAID' &&
        paymentAmount !== undefined &&
        paymentAmount !== null &&
        Number(paymentAmount) < Number(reservation.totalAmount || 0)
      ) {
        throw new HttpError(400, `Insufficient payment amount: expected ${reservation.totalAmount}, got ${paymentAmount}`);
      }

      const authoritativeOrgId = reservation.orgId;

      // Idempotency: if already PAID and CONFIRMED, return existing reservation without duplicate pass/event
      if (reservation.paymentStatus === 'PAID') {
        const existingPasses = await amenityAccessPassService.getPassesByReservationId(
          reservation._id,
          session
        );
        return {
          reservation,
          pass: existingPasses[0] || null,
          isDuplicate: true,
        };
      }

      if (status === 'PAID') {
        // Can transition to CONFIRMED and generate access pass if:
        // a) bookingStatus is already CONFIRMED (e.g. non-approval facility created pending payment)
        // b) bookingStatus is PENDING_APPROVAL and approvalStatus is APPROVED (maker-checker approved event)
        const canConfirm =
          reservation.bookingStatus === 'CONFIRMED' ||
          (reservation.bookingStatus === 'PENDING_APPROVAL' &&
            reservation.approvalStatus === 'APPROVED');

        const newBookingStatus = canConfirm ? 'CONFIRMED' : reservation.bookingStatus;
        const newAccessStatus = canConfirm ? 'PASS_GENERATED' : 'NOT_APPLICABLE';

        const updated = await amenityReservationRepository.updateStateDimensions(
          reservationId,
          {
            paymentStatus: 'PAID',
            bookingStatus: newBookingStatus,
            accessStatus: newAccessStatus,
          },
          session
        );

        let pass = null;
        let rawToken = null;

        if (canConfirm && reservation.accessStatus !== 'PASS_GENERATED') {
          // Promote any ledger allocations to CONFIRMED
          await amenityAllocationLedgerRepository.transitionStatus(
            {
              reservationId: reservation._id,
              fromStatus: 'HELD',
              toStatus: 'CONFIRMED',
            },
            session
          );

          const passResult = await amenityAccessPassService.issueAccessPass(
            {
              orgId: authoritativeOrgId,
              reservationId: reservation._id,
              passType: 'QR_DYNAMIC',
              validFrom: reservation.effectiveStartDateTime,
              validUntil: reservation.effectiveEndDateTime,
            },
            session
          );
          pass = passResult.pass;
          rawToken = passResult.rawToken;

          await amenityOutboxEventRepository.createEvent(
            {
              orgId: authoritativeOrgId,
              eventType: 'RESERVATION_CONFIRMED',
              aggregateId: reservation._id,
              aggregateType: 'AmenityReservation',
              payload: {
                reservationId: reservation._id,
                reservationNumber: reservation.reservationNumber,
                residentId: reservation.residentId,
              },
            },
            session
          );

          await amenityOutboxEventRepository.createEvent(
            {
              orgId: authoritativeOrgId,
              eventType: 'GATE_PASS_ISSUED',
              aggregateId: pass._id,
              aggregateType: 'AmenityAccessPass',
              payload: {
                passId: pass._id,
                reservationId: reservation._id,
                residentId: reservation.residentId,
              },
            },
            session
          );

          amenityManagementEvents.emit(AMENITY_EVENTS.RESERVATION_CONFIRMED, updated);
          amenityManagementEvents.emit(AMENITY_EVENTS.GATE_PASS_ISSUED, {
            pass,
            reservationId: reservation._id,
            residentId: reservation.residentId,
          });
        }

        return { reservation: updated, pass, rawToken };
      }

      if (status === 'FAILED') {
        return amenityReservationRepository.updateStateDimensions(
          reservationId,
          { paymentStatus: 'FAILED' },
          session
        );
      }
    }

    // Case 2: Payment triggered from Hold checkout
    if (holdId) {
      const hold = await amenityReservationHoldRepository.findById(holdId, session);
      if (!hold) {
        throw new HttpError(404, 'Hold not found for payment webhook');
      }

      // Tenant spoofing guard: reject if caller passed orgId that differs from database
      if (orgId && hold.orgId.toString() !== orgId.toString()) {
        throw new HttpError(403, 'Forbidden. Tenant spoofing detected for hold payment webhook.');
      }

      const authoritativeOrgId = hold.orgId;
      const activeHold = await amenityReservationHoldRepository.findActiveById(holdId, session);

      if (activeHold && status === 'PAID') {
        // Underpayment guard for active hold
        if (paymentAmount !== undefined && paymentAmount !== null) {
          const facility = await amenityFacilityRepository.findById(activeHold.facilityId, authoritativeOrgId || activeHold.orgId, session);
          if (facility) {
            const pricing = pricingService.calculateReservationPrice({
              pricingConfig: facility.pricingConfig || facility.pricing,
              requestedStartDateTime: activeHold.requestedStartDateTime,
              requestedEndDateTime: activeHold.requestedEndDateTime,
              headcount: activeHold.headcount,
              quantity: activeHold.quantity,
            });
            if (Number(paymentAmount) < Number(pricing.totalAmount || 0)) {
              throw new HttpError(400, `Insufficient payment amount: expected ${pricing.totalAmount}, got ${paymentAmount}`);
            }
          }
        }

        return this.confirmReservationFromHold(
          {
            holdId,
            orgId: authoritativeOrgId,
            residentId: activeHold.residentId,
            unitId: activeHold.unitId,
            paymentReference,
            notes: 'Payment confirmed via webhook',
          },
          session
        );
      }

      // Late payment arrived after hold expired:
      if ((!activeHold || activeHold.status !== 'ACTIVE') && status === 'PAID') {
        // Idempotency: check if a refund was already dispatched for this paymentReference or holdId
        const existingOutboxRefund = await amenityOutboxEventRepository.findExistingRefundEvent(
          { orgId: authoritativeOrgId, paymentReference, holdId },
          session
        );

        if (existingOutboxRefund) {
          const existingReservation = await amenityReservationRepository.findById(
            existingOutboxRefund.aggregateId,
            session
          );
          return {
            reservation: existingReservation,
            status: 'EXPIRED_HOLD_REFUND_DISPATCHED',
            isDuplicate: true,
          };
        }

        const deadHold = hold;
        const reservationNumber = await amenityCounterService.generateReservationNumber(
          { orgId: authoritativeOrgId },
          session
        );

        // Step 1: Record reservation as CANCELLED with initial paymentStatus: 'PAID'
        const fallbackReservation = await amenityReservationRepository.create(
          {
            orgId: authoritativeOrgId,
            facilityId: deadHold?.facilityId || new mongoose.Types.ObjectId(),
            resourceId: deadHold?.resourceId || null,
            residentId: deadHold?.residentId || new mongoose.Types.ObjectId(),
            unitId: deadHold?.unitId || new mongoose.Types.ObjectId(),
            reservationNumber,
            requestedStartDateTime: deadHold?.requestedStartDateTime || new Date(),
            requestedEndDateTime: deadHold?.requestedEndDateTime || new Date(),
            effectiveStartDateTime: deadHold?.effectiveStartDateTime || new Date(),
            effectiveEndDateTime: deadHold?.effectiveEndDateTime || new Date(),
            headcount: deadHold?.headcount || 1,
            quantity: deadHold?.quantity || 1,
            bookingStatus: 'CANCELLED',
            paymentStatus: 'PAID',
            approvalStatus: 'NOT_REQUIRED',
            accessStatus: 'NOT_APPLICABLE',
            completionStatus: 'ABANDONED',
            totalAmount: paymentAmount || 0,
            cancellationReason:
              `Payment received after hold expired (${paymentReference}); automatic refund scheduled`,
          },
          session
        );

        // Step 2: Transition paymentStatus to REFUND_PENDING according to refund workflow
        const updatedRefundReservation = await amenityReservationRepository.updateStateDimensions(
          fallbackReservation._id,
          { paymentStatus: 'REFUND_PENDING' },
          session
        );

        // Step 3: Write REFUND_DISPATCH_REQUIRED to Transactional Outbox
        await amenityOutboxEventRepository.createEvent(
          {
            orgId: authoritativeOrgId,
            eventType: 'REFUND_DISPATCH_REQUIRED',
            aggregateId: updatedRefundReservation._id,
            aggregateType: 'AmenityReservation',
            payload: {
              reservationId: updatedRefundReservation._id,
              reservationNumber: updatedRefundReservation.reservationNumber,
              holdId: holdId.toString(),
              paymentReference,
              amount: paymentAmount || 0,
              reason: 'Payment received after hold expired',
            },
          },
          session
        );

        amenityManagementEvents.emit(AMENITY_EVENTS.REFUND_DISPATCH_REQUIRED, {
          reservationId: updatedRefundReservation._id,
          paymentReference,
          amount: paymentAmount,
        });

        return {
          reservation: updatedRefundReservation,
          status: 'EXPIRED_HOLD_REFUND_DISPATCHED',
        };
      }
    }

    throw new HttpError(400, 'Invalid payment webhook payload: holdId or reservationId required');
  }

  /**
   * Retrieves reservation by ID.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async getReservationById(reservationId, session) {
    return amenityReservationRepository.findById(reservationId, session);
  }

  /**
   * Retrieves reservation by tenant reservation number.
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reservationNumber
   * @param {mongoose.ClientSession} [session]
   */
  async getReservationByNumber(orgId, reservationNumber, session) {
    return amenityReservationRepository.findByReservationNumber(orgId, reservationNumber, session);
  }

  /**
   * Lists reservations with pagination via $facet aggregation pipeline.
   * @param {Object} queryParams
   */
  async listReservations(queryParams) {
    return amenityReservationRepository.findWithPagination(queryParams);
  }
}

export const amenityReservationService = new AmenityReservationService();
export default amenityReservationService;
