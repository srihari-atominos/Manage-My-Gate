import crypto from 'crypto';
import HttpError from '../../../utils/httpError.utils.js';
import amenityAccessPassRepository from './amenityAccessPass.repository.js';
import amenityReservationRepository from '../reservations/amenityReservation.repository.js';
import amenityFacilityRepository from '../facilities/amenityFacility.repository.js';
import amenityMaintenanceBlockRepository from '../maintenance/amenityMaintenanceBlock.repository.js';

export class AmenityAccessPassService {
  /**
   * Hashes a raw access token with SHA-256 for secure database storage.
   * @param {string} rawToken
   * @returns {string}
   */
  hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new HttpError(400, 'Invalid token: raw token string is required');
    }
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates an unhashed cryptographically secure random token string.
   * @param {number} [bytes=32]
   * @returns {string}
   */
  generateRawToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Issues an access pass for a confirmed reservation.
   * Stores SHA-256 hash in database and returns the rawToken to caller.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.reservationId
   * @param {'QR_DYNAMIC'|'PIN_CODE'|'RFID_NFC'} [params.passType='QR_DYNAMIC']
   * @param {Date} params.validFrom
   * @param {Date} params.validUntil
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ pass: any, rawToken: string }>}
   */
  async issueAccessPass(
    { orgId, reservationId, passType = 'QR_DYNAMIC', validFrom, validUntil },
    session
  ) {
    if (!orgId || !reservationId) {
      throw new HttpError(400, 'orgId and reservationId are required to issue an access pass');
    }

    const rawToken = this.generateRawToken(32);
    const passTokenHash = this.hashToken(rawToken);

    const pass = await amenityAccessPassRepository.create(
      {
        orgId,
        reservationId,
        passType,
        passTokenHash,
        qrData: rawToken,
        validFrom,
        validUntil,
      },
      session
    );

    return { pass, rawToken };
  }

  /**
   * Validates and records a turnstile check-in with anti-replay guard.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string} params.rawToken
   * @param {string} [params.gateId]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<any>}
   */
  async validateAndRecordCheckIn({ orgId, rawToken, gateId }, session) {
    const passTokenHash = this.hashToken(rawToken);

    // Step 1: Token exists & hash matches
    const pass = await amenityAccessPassRepository.findByTokenHash(
      orgId,
      passTokenHash,
      session
    );

    if (!pass) {
      throw new HttpError(404, 'Invalid pass: token not found for this organization');
    }

    // Step 2: Pass is not revoked
    if (pass.isRevoked) {
      throw new HttpError(
        403,
        `Access denied: pass was revoked (${pass.revokedReason || 'No reason provided'})`
      );
    }

    // Step 3: Anti-replay validation
    if (pass.checkInTimestamp !== null) {
      throw new HttpError(
        409,
        `Anti-replay violation: pass was already used for check-in at ${pass.checkInTimestamp.toISOString()}`
      );
    }

    // Step 4: Pass validity window
    const now = new Date();
    if (now < pass.validFrom || now > pass.validUntil) {
      throw new HttpError(
        403,
        `Access denied: pass is outside its validity window (${pass.validFrom.toISOString()} - ${pass.validUntil.toISOString()})`
      );
    }

    // Step 5: Reservation is CONFIRMED
    const reservation = await amenityReservationRepository.findById(pass.reservationId, session);
    if (!reservation) {
      throw new HttpError(404, 'Associated reservation not found');
    }
    if (reservation.bookingStatus !== 'CONFIRMED') {
      throw new HttpError(
        403,
        `Access denied: associated reservation is ${reservation.bookingStatus}`
      );
    }

    // Step 6: Facility publication & deletion validation
    const facility = await amenityFacilityRepository.findById(reservation.facilityId, orgId, session);
    if (!facility || facility.isDeleted) {
      throw new HttpError(403, 'Access denied: facility is no longer available');
    }
    if (facility.isDraft || facility.status === 'DRAFT') {
      throw new HttpError(403, 'Access denied: facility is in draft mode');
    }

    // Step 7: Operational & Maintenance validation
    // Policy T4: If facility is inactive, check if the booking was explicitly honored.
    // An honored booking has reservation.bookingStatus === 'CONFIRMED' and pass.isRevoked === false.
    // (If it was cancelled upon deactivation, it was already rejected at Step 5).
    // However, active complete-closure maintenance blocks in progress right now deny access for physical safety:
    const activeBlocks = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
      {
        orgId,
        facilityId: reservation.facilityId,
        resourceId: reservation.resourceId || null,
        startDateTime: now,
        endDateTime: now,
      },
      session
    );

    const activeClosure = activeBlocks.find(
      (b) =>
        (b.status === 'IN_PROGRESS' || b.status === 'SCHEDULED') &&
        (b.isCompleteClosure || (reservation.resourceId && b.resourceId?.toString() === reservation.resourceId.toString()))
    );

    if (activeClosure) {
      throw new HttpError(
        403,
        `Access denied: facility is under maintenance (${activeClosure.reason || 'Closure in progress'})`
      );
    }

    // All checks passed -> Record turnstile check-in atomically
    const updatedPass = await amenityAccessPassRepository.recordCheckIn(
      { orgId, passTokenHash, gateId },
      session
    );

    if (!updatedPass) {
      throw new HttpError(409, 'Anti-replay violation: pass was checked in concurrently');
    }

    return updatedPass;
  }

  /**
   * Validates and records check-out with staff equipment inspection.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string} params.rawToken
   * @param {Object} [params.inspectionDetails]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<any>}
   */
  async recordCheckOut({ orgId, rawToken, inspectionDetails }, session) {
    const passTokenHash = this.hashToken(rawToken);

    const updatedPass = await amenityAccessPassRepository.recordCheckOut(
      { orgId, passTokenHash, inspectionDetails },
      session
    );

    if (updatedPass) {
      return updatedPass;
    }

    const existingPass = await amenityAccessPassRepository.findByTokenHash(
      orgId,
      passTokenHash,
      session
    );

    if (!existingPass) {
      throw new HttpError(404, 'Invalid pass: token not found for this organization');
    }

    if (existingPass.isRevoked) {
      throw new HttpError(403, 'Access denied: pass is revoked');
    }

    if (!existingPass.checkInTimestamp) {
      throw new HttpError(400, 'Check-out rejected: pass has not been checked in yet');
    }

    if (existingPass.checkOutTimestamp) {
      throw new HttpError(409, 'Pass has already been checked out');
    }

    throw new HttpError(400, 'Check-out validation failed');
  }

  /**
   * Revokes a single access pass.
   * @param {string|import('mongoose').Types.ObjectId} passId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {string} reason
   * @param {import('mongoose').ClientSession} [session]
   */
  async revokePass(passId, orgId, reason, session) {
    const revoked = await amenityAccessPassRepository.revokePass(passId, orgId, reason, session);
    if (!revoked) {
      throw new HttpError(404, 'Pass not found or already revoked');
    }
    return revoked;
  }

  /**
   * Revokes all active passes for a reservation.
   * @param {string|import('mongoose').Types.ObjectId} reservationId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {string} reason
   * @param {import('mongoose').ClientSession} [session]
   */
  async revokeAllByReservationId(reservationId, orgId, reason, session) {
    return amenityAccessPassRepository.revokeAllByReservationId(
      reservationId,
      orgId,
      reason,
      session
    );
  }

  /**
   * Retrieves all passes issued for a reservation.
   * @param {string|import('mongoose').Types.ObjectId} reservationId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getPassesByReservationId(reservationId, session) {
    return amenityAccessPassRepository.findByReservationId(reservationId, session);
  }
}

export const amenityAccessPassService = new AmenityAccessPassService();
export default amenityAccessPassService;
