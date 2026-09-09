import crypto from 'crypto';
import HttpError from '../../../utils/httpError.utils.js';
import amenityAccessPassRepository from './amenityAccessPass.repository.js';

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

    const updatedPass = await amenityAccessPassRepository.recordCheckIn(
      { orgId, passTokenHash, gateId },
      session
    );

    if (updatedPass) {
      return updatedPass;
    }

    // Identify the specific failure reason
    const existingPass = await amenityAccessPassRepository.findByTokenHash(
      orgId,
      passTokenHash,
      session
    );

    if (!existingPass) {
      throw new HttpError(404, 'Invalid pass: token not found for this organization');
    }

    if (existingPass.isRevoked) {
      throw new HttpError(
        403,
        `Access denied: pass was revoked (${existingPass.revokedReason || 'No reason provided'})`
      );
    }

    if (existingPass.checkInTimestamp !== null) {
      throw new HttpError(
        409,
        `Anti-replay violation: pass was already used for check-in at ${existingPass.checkInTimestamp.toISOString()}`
      );
    }

    const now = new Date();
    if (now < existingPass.validFrom || now > existingPass.validUntil) {
      throw new HttpError(
        403,
        `Access denied: pass is outside its validity window (${existingPass.validFrom.toISOString()} - ${existingPass.validUntil.toISOString()})`
      );
    }

    throw new HttpError(400, 'Check-in validation failed');
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
