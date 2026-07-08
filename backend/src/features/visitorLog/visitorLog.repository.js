import VisitorLog from './visitorLog.model.js';
import mongoose from 'mongoose';

export class VisitorLogRepository {
  /**
   * Create a new VisitorLog (check-in / walkthrough / walk-in).
   * @param {Object} logData - The data of the visitor entry.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The created log document.
   */
  async create(logData, session) {
    const log = new VisitorLog(logData);
    return await log.save(session ? { session } : undefined);
  }

  /**
   * Update an entry log for checkout, transitioning status to COMPLETED and recording checkout time.
   * @param {string} id - The ID of the visitor log.
   * @param {Date} [checkOutTime=new Date()] - The checkout timestamp.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The updated log document.
   */
  async updateLogForCheckout(id, checkOutTime = new Date(), session = null) {
    return await VisitorLog.findByIdAndUpdate(
      id,
      {
        $set: {
          logStatus: 'COMPLETED',
          checkOutTime: checkOutTime || new Date()
        }
      },
      { new: true, runValidators: true, ...(session ? { session } : {}) }
    );
  }

  /**
   * Fetch active logs for visitors currently inside the premises.
   * @param {string} orgId - The organization (community) ID.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object[]>} List of active visitor log documents.
   */
  async findActiveLogsInside(orgId, session = null) {
    return await VisitorLog.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      logStatus: 'INSIDE'
    })
    .sort({ checkInTime: -1 })
    .session(session || null)
    .exec();
  }
}

export default new VisitorLogRepository();
