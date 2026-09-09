import mongoose from 'mongoose';
import AmenityCounter from './amenityCounter.model.js';

export class AmenityCounterRepository {
  /**
   * Atomically increments the sequence counter for the given orgId, counterType, and yearMonth token.
   * Returns the formatted tenant-scoped reservation number: RES-YYYYMM-000001.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string} [params.counterType='RESERVATION_NUMBER']
   * @param {string} [params.yearMonth] - YYYYMM format (defaults to current UTC year and month)
   * @param {mongoose.ClientSession} [session]
   * @returns {Promise<string>}
   */
  async getNextReservationNumber({ orgId, counterType = 'RESERVATION_NUMBER', yearMonth }, session) {
    if (!yearMonth) {
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      yearMonth = `${yyyy}${mm}`;
    }

    const counter = await AmenityCounter.findOneAndUpdate(
      { orgId, counterType, yearMonth },
      { $inc: { currentSeq: 1 } },
      {
        upsert: true,
        returnDocument: 'after',
        session: session || null,
        setDefaultsOnInsert: true,
      }
    );

    const seqStr = String(counter.currentSeq).padStart(6, '0');
    return `RES-${yearMonth}-${seqStr}`;
  }
}

export const amenityCounterRepository = new AmenityCounterRepository();
export default amenityCounterRepository;
