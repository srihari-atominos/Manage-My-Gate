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
    const communityObjId = new mongoose.Types.ObjectId(communityId);
    const result = await Invoice.aggregate([
      {
        $match: {
          $or: [
            { communityId: communityObjId },
            { communityId: { $exists: false } }
          ]
        }
      },
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
          $or: [
            { communityId: communityObjId },
            { 'assessment.communityId': communityObjId }
          ]
        },
      },
      {
        $facet: {
          grossDemand: [
            { $match: { status: { $ne: 'CANCELLED' } } },
            { $group: { _id: null, total: { $sum: '$totalDue' }, count: { $sum: 1 } } },
          ],
          totalCollected: [
            { $match: { status: 'PAID', paid_at: { $ne: null } } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          inTransitGateway: [
            { $match: { status: 'PAID', paid_at: { $ne: null }, settled_at: null } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          pendingOffline: [
            { $match: { status: 'VERIFICATION_PENDING' } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
          totalUnpaidArrears: [
            { $match: { status: 'UNPAID' } },
            { $group: { _id: null, total: { $sum: '$totalDue' } } },
          ],
        },
      },
    ]);

    const kpis = result[0];

    const grossDemand = kpis?.grossDemand[0]?.total || 0;
    const grossDemandCount = kpis?.grossDemand[0]?.count || 0;
    const totalCollected = kpis?.totalCollected[0]?.total || 0;
    const inTransitGateway = kpis?.inTransitGateway[0]?.total || 0;
    const pendingOffline = kpis?.pendingOffline[0]?.total || 0;
    const totalUnpaidArrears = kpis?.totalUnpaidArrears[0]?.total || 0;

    return {
      grossDemand,
      grossDemandCount,
      totalCollected,
      inTransitGateway: inTransitGateway + pendingOffline,
      totalUnpaidArrears,
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
          from: 'villas',
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
          totalPortfolioDue: { $sum: '$outstandingAmount' },
          unitBreakdown: {
            $push: {
              invoiceId: '$_id',
              invoiceNumber: '$invoiceNumber',
              unitId: '$unitId',
              unitNumber: '$unitInfo.unitNumber',
              floor: '$unitInfo.floor',
              type: '$unitInfo.type',
              assessmentName: '$snapshot.assessmentName',
              residentName: '$snapshot.residentDetails.name',
              residentType: '$snapshot.residentDetails.residencyType',
              currentCharge: '$currentCharge',
              previousOutstanding: '$previousOutstanding',
              lateFeeAmount: '$lateFeeAmount',
              totalDue: '$totalDue',
              outstandingAmount: '$outstandingAmount',
              paidAmount: '$paidAmount',
              billingPeriodString: '$billingPeriodString',
              status: '$status',
              dueDate: '$dueDate',
              createdAt: '$createdAt',
              paid_at: '$paid_at',
              paymentMethod: '$paymentMethod',
              offlineReference: '$offlineReference',
            },
          },
        },
      },
    ]);

    return result[0] || null;
  }

  /**
   * Get recent invoice history for a user.
   * @param {string} userId - User ID.
   * @returns {Promise<Array>}
   */
  async getUserRecentInvoices(userId) {
    return await Invoice.aggregate([
      {
        $match: {
          targetUserId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: 'villas',
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
        $sort: { createdAt: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          invoiceId: '$_id',
          invoiceNumber: 1,
          unitId: 1,
          unitNumber: '$unitInfo.unitNumber',
          type: '$unitInfo.type',
          assessmentName: '$snapshot.assessmentName',
          residentName: '$snapshot.residentDetails.name',
          residentType: '$snapshot.residentDetails.residencyType',
          currentCharge: 1,
          previousOutstanding: 1,
          lateFeeAmount: 1,
          totalDue: 1,
          outstandingAmount: 1,
          paidAmount: 1,
          billingPeriodString: 1,
          status: 1,
          dueDate: 1,
          createdAt: 1,
          paid_at: 1,
          paymentMethod: 1,
          offlineReference: 1
        }
      }
    ]);
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
    const isObjId = mongoose.Types.ObjectId.isValid(invoiceId);
    const filter = isObjId
      ? { $or: [{ _id: invoiceId }, { invoiceNumber: invoiceId }] }
      : { invoiceNumber: invoiceId };

    const query = Invoice.findOne(filter);
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
    if (newStatus === 'PAID' || newStatus === 'PARTIALLY_PAID') {
      invoice.paid_at = paymentData.paid_at || new Date();
      invoice.settled_at = paymentData.settled_at || null;
      invoice.paymentMethod = paymentData.paymentMethod || invoice.paymentMethod || null;
      invoice.offlineReference = paymentData.offlineReference || invoice.offlineReference || null;
      
      let applyAmount = 0;
      if (paymentData.amount) {
        applyAmount = Number(paymentData.amount);
      } else if (!paymentData.amount && paymentData.paymentMethod !== 'WALLET') {
        // Legacy fallback: if no amount provided, assume full payment of outstanding
        applyAmount = invoice.outstandingAmount || invoice.totalAmount;
      }

      invoice.paidAmount = (invoice.paidAmount || 0) + applyAmount;
      invoice.outstandingAmount = (invoice.outstandingAmount || invoice.totalAmount) - applyAmount;
      if (invoice.outstandingAmount < 0) invoice.outstandingAmount = 0;
      
      // Reset offline amount since it has been processed
      invoice.offlineAmount = 0;
    } else if (newStatus === 'CANCELLED') {
      invoice.paid_at = null;
      invoice.settled_at = null;
      invoice.paymentMethod = null;
      invoice.offlineReference = null;
    } else if (newStatus === 'VERIFICATION_PENDING') {
      if (paymentData.offlineReference !== undefined) invoice.offlineReference = paymentData.offlineReference;
      if (paymentData.offlineAmount !== undefined) invoice.offlineAmount = paymentData.offlineAmount;
    }

    return await invoice.save(session ? { session } : undefined);
  }

  /**
   * Fetch all community invoices.
   */
  async getInvoices(orgId, query) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const communityObjId = new mongoose.Types.ObjectId(orgId);

    const matchConditions = {};
    if (status && status !== 'ALL') {
      matchConditions.status = status;
    }

    const searchMatch = {};
    if (search && search.trim()) {
      const q = search.trim();
      searchMatch.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { 'unitInfo.unitNumber': { $regex: q, $options: 'i' } },
        { 'userInfo.name': { $regex: q, $options: 'i' } },
        { 'userInfo.username': { $regex: q, $options: 'i' } }
      ];
    }

    const result = await Invoice.aggregate([
      {
        $match: {
          $or: [
            { communityId: communityObjId, ...matchConditions },
            { communityId: { $exists: false } }
          ]
        }
      },
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessmentId',
          foreignField: '_id',
          as: 'assessment',
        },
      },
      { $unwind: '$assessment' },
      {
        $match: {
          $or: [
            { communityId: communityObjId },
            { 'assessment.communityId': communityObjId }
          ],
          ...matchConditions,
        },
      },

      {
        $lookup: {
          from: 'users',
          localField: 'targetUserId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'villas',
          localField: 'unitId',
          foreignField: '_id',
          as: 'unitInfo',
        },
      },
      { $unwind: { path: '$unitInfo', preserveNullAndEmptyArrays: true } },
      { $match: searchMatch },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: take },
            {
              $project: {
                _id: 1,
                invoiceNumber: 1,
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                unitNumber: '$unitInfo.unitNumber',
                targetUser: { $ifNull: ['$userInfo.name', '$userInfo.username'] },
                amount: '$totalDue',
                currency: { $literal: 'INR' },
                status: 1,
                paymentMethod: { $ifNull: ['$paymentMethod', '—'] },
                offlineReference: 1,
                offlineAmount: 1,
              },
            },
          ],
          metadata: [{ $count: 'totalRecords' }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    const totalPages = Math.ceil(totalRecords / take) || 1;

    return {
      data,
      pagination: {
        totalRecords,
        currentPage: parseInt(page, 10),
        totalPages,
        limit: take,
      },
    };
  }

  /**
   * Check if there are active (unpaid or pending verification) invoices for an assessment template.
   */
  async hasActiveInvoices(assessmentId) {
    const match = await Invoice.exists({
      assessmentId,
      status: { $in: ['UNPAID', 'VERIFICATION_PENDING'] },
    });
    return match !== null;
  }

  /**
   * Check if any invoices exist for an assessment template.
   */
  async hasAnyInvoices(assessmentId) {
    const match = await Invoice.exists({ assessmentId });
    return match !== null;
  }
}

export default new InvoiceRepository();
