import mongoose from 'mongoose';
import Invoice from './invoice.model.js';
import HttpError from '../../utils/httpError.utils.js';

export class InvoiceRepository {
  /**
   * Batch insert invoices within a transaction session.
   * Gracefully catches duplicate key errors (11000).
   * @param {Array<Object>} invoicesArray - Array of invoice objects.
   * @param {import('mongoose').ClientSession} [session] - Mongoose transaction session.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  async createBatch(invoicesArray, session) {
    try {
      const options = session ? { session } : {};
      return await Invoice.insertMany(invoicesArray, options);
    } catch (error) {
      if (error.code === 11000) {
        throw new HttpError(
          409,
          'Duplicate billing spam prevented. One or more invoices in this batch already exist for the same assessment, user, and billing period.',
          error.writeErrors || error.message
        );
      }
      throw error;
    }
  }

  /**
   * Calculate dashboard KPIs for a community in a single round-trip.
   * @param {string} communityId - Community ID.
   * @returns {Promise<{ grossDemand: number, totalCollected: number, inTransitGateway: number, totalUnpaidArrears: number }>}
   */
  async getDashboardKPIs(communityId) {
    const result = await Invoice.aggregate([
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessmentId',
          foreignField: '_id',
          as: 'assessment',
        },
      },
      {
        $unwind: '$assessment',
      },
      {
        $match: {
          'assessment.communityId': new mongoose.Types.ObjectId(communityId),
        },
      },
      {
        $facet: {
          grossDemand: [
            { $match: { status: { $ne: 'CANCELLED' } } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          totalCollected: [
            { $match: { status: 'PAID', paid_at: { $ne: null } } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          inTransitGateway: [
            { $match: { status: 'PAID', paid_at: { $ne: null }, settled_at: null } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          totalUnpaidArrears: [
            { $match: { status: { $in: ['UNPAID', 'VERIFICATION_PENDING'] } } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
        },
      },
    ]);

    const kpis = result[0];

    return {
      grossDemand: kpis?.grossDemand[0]?.total || 0,
      totalCollected: kpis?.totalCollected[0]?.total || 0,
      inTransitGateway: kpis?.inTransitGateway[0]?.total || 0,
      totalUnpaidArrears: kpis?.totalUnpaidArrears[0]?.total || 0,
    };
  }

  /**
   * Get outstanding dues grouped by targetUserId for portfolio summary.
   * @param {string} userId - User ID.
   * @returns {Promise<{ _id: string, totalPortfolioDue: number, unitBreakdown: Array } | null>}
   */
  async getUserPortfolioDues(userId) {
    const result = await Invoice.aggregate([
      {
        $match: {
          targetUserId: new mongoose.Types.ObjectId(userId),
          status: { $ne: 'PAID' },
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unitId',
          foreignField: '_id',
          as: 'unitInfo',
        },
      },
      {
        $unwind: {
          path: '$unitInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$targetUserId',
          totalPortfolioDue: { $sum: '$totalDue' },
          unitBreakdown: {
            $push: {
              invoiceId: '$_id',
              invoiceNumber: '$invoiceNumber',
              unitId: '$unitId',
              unitNumber: '$unitInfo.unitNumber',
              floor: '$unitInfo.floor',
              type: '$unitInfo.type',
              totalDue: '$totalDue',
              billingPeriodString: '$billingPeriodString',
              status: '$status',
              dueDate: '$dueDate',
            },
          },
        },
      },
    ]);

    return result[0] || null;
  }

  /**
   * Transactional check-and-update to prevent race conditions.
   * @param {string} invoiceId - Invoice ID.
   * @param {string} newStatus - New invoice status.
   * @param {Object} paymentData - Payment details (paymentMethod, paid_at, settled_at, offlineReference).
   * @param {import('mongoose').ClientSession} [session] - Mongoose transaction session.
   * @returns {Promise<import('mongoose').Document>}
   */
  async updateStatusWithLock(invoiceId, newStatus, paymentData = {}, session) {
    const query = Invoice.findById(invoiceId);
    if (session) {
      query.session(session);
    }
    const invoice = await query;

    if (!invoice) {
      throw new HttpError(404, 'Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new HttpError(409, 'Invoice is already paid and cannot be updated');
    }

    invoice.status = newStatus;
    if (newStatus === 'PAID') {
      invoice.paid_at = paymentData.paid_at || new Date();
      invoice.settled_at = paymentData.settled_at || null;
      invoice.paymentMethod = paymentData.paymentMethod || null;
      invoice.offlineReference = paymentData.offlineReference || null;
    } else if (newStatus === 'CANCELLED') {
      invoice.paid_at = null;
      invoice.settled_at = null;
      invoice.paymentMethod = null;
      invoice.offlineReference = null;
    }

    return await invoice.save(session ? { session } : undefined);
  }
}

export default new InvoiceRepository();
