import mongoose from 'mongoose';
import AmenityAccessPass from './amenityAccessPass.model.js';

export class AmenityAccessPassRepository {
  /**
   * Creates an access pass document.
   * @param {Object} passData
   * @param {mongoose.ClientSession} [session]
   */
  async create(passData, session) {
    const [doc] = await AmenityAccessPass.create([passData], { session });
    return doc;
  }

  /**
   * Finds pass by ID.
   * @param {string|mongoose.Types.ObjectId} passId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(passId, session) {
    return AmenityAccessPass.findById(passId).session(session || null);
  }

  /**
   * Finds pass by token hash within an organization.
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} passTokenHash
   * @param {mongoose.ClientSession} [session]
   */
  async findByTokenHash(orgId, passTokenHash, session) {
    return AmenityAccessPass.findOne({ orgId, passTokenHash }).session(session || null);
  }

  /**
   * Finds all passes associated with a reservation.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async findByReservationId(reservationId, session) {
    return AmenityAccessPass.find({ reservationId }).session(session || null);
  }

  /**
   * Executes atomic turnstile check-in with anti-replay guard.
   * Rejects if expired, revoked, or checkInTimestamp is already populated.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string} params.passTokenHash
   * @param {string} [params.gateId]
   * @param {mongoose.ClientSession} [session]
   */
  async recordCheckIn({ orgId, passTokenHash, gateId }, session) {
    const now = new Date();
    return AmenityAccessPass.findOneAndUpdate(
      {
        orgId,
        passTokenHash,
        isRevoked: false,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        checkInTimestamp: null, // Anti-replay check
      },
      {
        $set: {
          checkInTimestamp: now,
          gateId: gateId || null,
        },
      },
      { session: session || null, returnDocument: 'after' }
    );
  }

  /**
   * Executes atomic check-out and records staff inspection details.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string} params.passTokenHash
   * @param {Object} [params.inspectionDetails]
   * @param {mongoose.ClientSession} [session]
   */
  async recordCheckOut({ orgId, passTokenHash, inspectionDetails }, session) {
    const now = new Date();
    const update = {
      $set: { checkOutTimestamp: now },
    };
    if (inspectionDetails) {
      update.$set.inspectionDetails = inspectionDetails;
    }

    return AmenityAccessPass.findOneAndUpdate(
      {
        orgId,
        passTokenHash,
        isRevoked: false,
        checkInTimestamp: { $ne: null },
        checkOutTimestamp: null,
      },
      update,
      { session: session || null, returnDocument: 'after' }
    );
  }

  /**
   * Revokes an active pass.
   * @param {string|mongoose.Types.ObjectId} passId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reason
   * @param {mongoose.ClientSession} [session]
   */
  async revokePass(passId, orgId, reason, session) {
    return AmenityAccessPass.findOneAndUpdate(
      { _id: passId, orgId, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
      { session: session || null, returnDocument: 'after' }
    );
  }

  /**
   * Revokes all active passes for a reservation upon cancellation.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reason
   * @param {mongoose.ClientSession} [session]
   */
  async revokeAllByReservationId(reservationId, orgId, reason, session) {
    return AmenityAccessPass.updateMany(
      { reservationId, orgId, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
      { session: session || null }
    );
  }
}

export const amenityAccessPassRepository = new AmenityAccessPassRepository();
export default amenityAccessPassRepository;
