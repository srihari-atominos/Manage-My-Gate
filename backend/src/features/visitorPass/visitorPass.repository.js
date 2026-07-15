import VisitorPass from './visitorPass.model.js';
import mongoose from 'mongoose';

export class VisitorPassRepository {
  /**
   * Create a new VisitorPass.
   * @param {Object} passData - The data to create the pass.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object>} The created pass document.
   */
  async create(passData, session) {
    const pass = new VisitorPass(passData);
    return await pass.save(session ? { session } : undefined);
  }

  /**
   * Find a VisitorPass by its ID.
   * @param {string} id - The ID of the pass.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The pass document, or null if not found.
   */
  async findById(id, session) {
    return await VisitorPass.findById(id).session(session || null);
  }

  /**
   * Update the status of a VisitorPass.
   * @param {string} id - The ID of the pass.
   * @param {string} status - The new status value (PENDING, ACTIVE, REVOKED, EXPIRED).
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The updated pass document.
   */
  async updateStatus(id, status, session) {
    return await VisitorPass.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    );
  }

  /**
   * Update VisitorPass properties.
   * @param {string} id - The ID of the pass.
   * @param {Object} updateData - The update parameters.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<Object|null>} The updated pass document.
   */
  async update(id, updateData, session = null) {
    return await VisitorPass.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true, ...(session ? { session } : {}) }
    );
  }

  /**
   * Paginated aggregation to retrieve passes in an organization by their statuses.
   * @param {string} orgId - The organization ID.
   * @param {number} [skip=0] - Number of items to skip.
   * @param {number} [limit=10] - Number of items to return.
   * @param {string[]} [statuses=['PENDING', 'ACTIVE']] - Array of statuses to match.
   * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session.
   * @returns {Promise<{ data: Object[], totalRecords: number }>} Paginated list of passes and total count.
   */
  async findActivePassesByOrg(orgId, skip = 0, limit = 10, statuses = ['PENDING', 'ACTIVE'], session = null) {
    const matchStage = {
      orgId: new mongoose.Types.ObjectId(orgId),
      status: { $in: statuses }
    };

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalRecords' }],
          data: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ];

    const result = await VisitorPass.aggregate(pipeline).session(session || null);
    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    return { data, totalRecords };
  }
}

export default new VisitorPassRepository();
