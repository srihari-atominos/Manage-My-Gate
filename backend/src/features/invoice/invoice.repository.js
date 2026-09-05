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
    const communityMatchCandidates = [];
    if (mongoose.Types.ObjectId.isValid(communityId)) {
      communityMatchCandidates.push(new mongoose.Types.ObjectId(communityId));
    }
    if (communityId) {
      communityMatchCandidates.push(String(communityId));
    }

    const result = await Invoice.aggregate([
      {
        $match: {
          $or: [
            { communityId: { $in: communityMatchCandidates } },
            { orgId: { $in: communityMatchCandidates } },
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
        $unwind: {
          path: '$assessment',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { communityId: { $in: communityMatchCandidates } },
            { orgId: { $in: communityMatchCandidates } },
            { 'assessment.communityId': { $in: communityMatchCandidates } }
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

      const remainingDue = Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
      applyAmount = Math.min(applyAmount, remainingDue > 0 ? remainingDue : applyAmount);

      invoice.paidAmount = (invoice.paidAmount || 0) + applyAmount;
      invoice.outstandingAmount = Math.max(0, Math.round(((invoice.totalAmount || 0) - invoice.paidAmount) * 100) / 100);
      
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
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      block,
      paymentMethod,
      groupBy = 'none',
    } = query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const communityMatchCandidates = [];
    if (mongoose.Types.ObjectId.isValid(orgId)) {
      communityMatchCandidates.push(new mongoose.Types.ObjectId(orgId));
    }
    if (orgId) {
      communityMatchCandidates.push(String(orgId));
    }

    const matchConditions = { isDeleted: false };

    // 1. Date Range filtering (on createdAt)
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        dateFilter.$lte = end;
      }
      matchConditions.createdAt = dateFilter;
    }

    // 2. Payment Method filtering
    if (paymentMethod && paymentMethod !== 'ALL') {
      matchConditions.paymentMethod = paymentMethod;
    }

    // 3. Omnisearch matching
    const searchMatch = {};
    if (search && search.trim()) {
      const q = search.trim();
      searchMatch.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { offlineReference: { $regex: q, $options: 'i' } },
        { billingPeriodString: { $regex: q, $options: 'i' } },
        { 'snapshot.assessmentName': { $regex: q, $options: 'i' } },
        { 'assessment.name': { $regex: q, $options: 'i' } },
        { 'unitInfo.unitNumber': { $regex: q, $options: 'i' } },
        { 'snapshot.unitDetails.unitNumber': { $regex: q, $options: 'i' } },
        { 'unitInfo.blockOrBuilding': { $regex: q, $options: 'i' } },
        { 'userInfo.name': { $regex: q, $options: 'i' } },
        { 'userInfo.username': { $regex: q, $options: 'i' } },
        { 'userInfo.email': { $regex: q, $options: 'i' } },
        { 'userInfo.phone': { $regex: q, $options: 'i' } },
        { 'snapshot.residentDetails.name': { $regex: q, $options: 'i' } },
      ];
    }

    // 4. Block filtering
    const blockMatch = {};
    if (block && block !== 'ALL') {
      blockMatch['unitInfo.blockOrBuilding'] = block;
    }

    // Base pipeline stages up to lookups and filter matches
    const basePipeline = [
      {
        $match: {
          $and: [
            {
              $or: [
                { communityId: { $in: communityMatchCandidates } },
                { orgId: { $in: communityMatchCandidates } },
                { communityId: { $exists: false } },
              ],
            },
            matchConditions,
          ],
        },
      },
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessmentId',
          foreignField: '_id',
          as: 'assessment',
        },
      },
      { $unwind: { path: '$assessment', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $and: [
            {
              $or: [
                { communityId: { $in: communityMatchCandidates } },
                { orgId: { $in: communityMatchCandidates } },
                { 'assessment.communityId': { $in: communityMatchCandidates } },
              ],
            },
            matchConditions,
          ],
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
      { $match: blockMatch },
    ];

    // Compute live status counts across all statuses for the active tenant, block, and date filter
    const statusCountsFacet = [
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const statusMatch = status && status !== 'ALL' ? [{ $match: { status } }] : [];

    // --- GROUP BY: UNIT / VILLA ---
    if (groupBy === 'unit') {
      const unitPipeline = [
        ...basePipeline,
        {
          $facet: {
            data: [
              ...statusMatch,
              {
                $group: {
                  _id: { $ifNull: ['$unitId', 'unassigned'] },
                  unitId: { $first: '$unitId' },
                  unitNumber: { $first: { $ifNull: ['$unitInfo.unitNumber', 'Unassigned'] } },
                  blockOrBuilding: { $first: { $ifNull: ['$unitInfo.blockOrBuilding', '—'] } },
                  unitType: { $first: { $ifNull: ['$unitInfo.type', 'Apartment'] } },
                  primaryResident: { $first: { $ifNull: ['$userInfo.name', { $ifNull: ['$userInfo.username', '—'] }] } },
                  primaryResidentPhone: { $first: { $ifNull: ['$userInfo.phone', ''] } },
                  totalBilled: { $sum: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] } },
                  totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },
                  outstandingBalance: { $sum: { $ifNull: ['$outstandingAmount', 0] } },
                  invoiceCount: { $sum: 1 },
                  pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'VERIFICATION_PENDING'] }, 1, 0] } },
                  overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, 1, 0] } },
                  invoices: {
                    $push: {
                      _id: '$_id',
                      invoiceNumber: '$invoiceNumber',
                      billingPeriodString: '$billingPeriodString',
                      assessmentName: { $ifNull: ['$snapshot.assessmentName', { $ifNull: ['$assessment.name', 'Assessment'] }] },
                      totalAmount: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] },
                      paidAmount: { $ifNull: ['$paidAmount', 0] },
                      outstandingAmount: { $ifNull: ['$outstandingAmount', 0] },
                      status: '$status',
                      dueDate: '$dueDate',
                      createdAt: '$createdAt',
                      paymentMethod: '$paymentMethod',
                      offlineReference: '$offlineReference',
                    },
                  },
                },
              },
              { $sort: { outstandingBalance: -1, unitNumber: 1 } },
              { $skip: skip },
              { $limit: take },
            ],
            metadata: [
              ...statusMatch,
              {
                $group: {
                  _id: { $ifNull: ['$unitId', 'unassigned'] },
                },
              },
              { $count: 'totalRecords' },
            ],
            statusCounts: statusCountsFacet,
          },
        },
      ];

      const result = await Invoice.aggregate(unitPipeline);
      return this._formatInvoicesResult(result, page, take);
    }

    // --- GROUP BY: RESIDENT ---
    if (groupBy === 'resident') {
      const residentPipeline = [
        ...basePipeline,
        {
          $facet: {
            data: [
              ...statusMatch,
              {
                $group: {
                  _id: { $ifNull: ['$targetUserId', 'unassigned'] },
                  residentId: { $first: '$targetUserId' },
                  residentName: { $first: { $ifNull: ['$userInfo.name', { $ifNull: ['$userInfo.username', 'Unknown Resident'] }] } },
                  phone: { $first: { $ifNull: ['$userInfo.phone', '—'] } },
                  email: { $first: { $ifNull: ['$userInfo.email', '—'] } },
                  units: { $addToSet: { $ifNull: ['$unitInfo.unitNumber', 'Unassigned'] } },
                  totalPortfolioDue: { $sum: { $ifNull: ['$outstandingAmount', 0] } },
                  totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },
                  totalBilled: { $sum: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] } },
                  invoiceCount: { $sum: 1 },
                  pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'VERIFICATION_PENDING'] }, 1, 0] } },
                  overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, 1, 0] } },
                  invoices: {
                    $push: {
                      _id: '$_id',
                      invoiceNumber: '$invoiceNumber',
                      unitNumber: '$unitInfo.unitNumber',
                      billingPeriodString: '$billingPeriodString',
                      assessmentName: { $ifNull: ['$snapshot.assessmentName', { $ifNull: ['$assessment.name', 'Assessment'] }] },
                      totalAmount: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] },
                      paidAmount: { $ifNull: ['$paidAmount', 0] },
                      outstandingAmount: { $ifNull: ['$outstandingAmount', 0] },
                      status: '$status',
                      dueDate: '$dueDate',
                      createdAt: '$createdAt',
                    },
                  },
                },
              },
              { $sort: { totalPortfolioDue: -1, residentName: 1 } },
              { $skip: skip },
              { $limit: take },
            ],
            metadata: [
              ...statusMatch,
              {
                $group: {
                  _id: { $ifNull: ['$targetUserId', 'unassigned'] },
                },
              },
              { $count: 'totalRecords' },
            ],
            statusCounts: statusCountsFacet,
          },
        },
      ];

      const result = await Invoice.aggregate(residentPipeline);
      return this._formatInvoicesResult(result, page, take);
    }

    // --- GROUP BY: BILLING CYCLE / ASSESSMENT ---
    if (groupBy === 'cycle') {
      const cyclePipeline = [
        ...basePipeline,
        {
          $facet: {
            data: [
              ...statusMatch,
              {
                $group: {
                  _id: {
                    period: '$billingPeriodString',
                    assessmentId: { $ifNull: ['$assessmentId', 'general'] },
                  },
                  billingPeriodString: { $first: '$billingPeriodString' },
                  assessmentName: { $first: { $ifNull: ['$snapshot.assessmentName', { $ifNull: ['$assessment.name', 'General Assessment'] }] } },
                  totalTargeted: { $sum: 1 },
                  grossDemand: { $sum: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] } },
                  totalCollected: { $sum: { $ifNull: ['$paidAmount', 0] } },
                  totalOutstanding: { $sum: { $ifNull: ['$outstandingAmount', 0] } },
                  paidCount: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] } },
                  pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'VERIFICATION_PENDING'] }, 1, 0] } },
                  unpaidCount: { $sum: { $cond: [{ $in: ['$status', ['UNPAID', 'OVERDUE']] }, 1, 0] } },
                  invoices: {
                    $push: {
                      _id: '$_id',
                      invoiceNumber: '$invoiceNumber',
                      unitNumber: '$unitInfo.unitNumber',
                      targetUser: { $ifNull: ['$userInfo.name', '$userInfo.username'] },
                      totalAmount: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] },
                      paidAmount: { $ifNull: ['$paidAmount', 0] },
                      outstandingAmount: { $ifNull: ['$outstandingAmount', 0] },
                      status: '$status',
                      offlineReference: '$offlineReference',
                    },
                  },
                },
              },
              { $sort: { billingPeriodString: -1 } },
              { $skip: skip },
              { $limit: take },
            ],
            metadata: [
              ...statusMatch,
              {
                $group: {
                  _id: {
                    period: '$billingPeriodString',
                    assessmentId: { $ifNull: ['$assessmentId', 'general'] },
                  },
                },
              },
              { $count: 'totalRecords' },
            ],
            statusCounts: statusCountsFacet,
          },
        },
      ];

      const result = await Invoice.aggregate(cyclePipeline);
      return this._formatInvoicesResult(result, page, take);
    }

    // --- DEFAULT: FLAT INVOICES LIST (groupBy === 'none') ---
    const result = await Invoice.aggregate([
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            ...statusMatch,
            { $skip: skip },
            { $limit: take },
            {
              $project: {
                _id: 1,
                invoiceNumber: 1,
                billingPeriodString: 1,
                dueDate: 1,
                createdAt: 1,
                assessmentName: { $ifNull: ['$snapshot.assessmentName', { $ifNull: ['$assessment.name', 'Maintenance Assessment'] }] },
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                unitNumber: { $ifNull: ['$unitInfo.unitNumber', '$snapshot.unitDetails.unitNumber'] },
                blockOrBuilding: '$unitInfo.blockOrBuilding',
                targetUser: { $ifNull: ['$userInfo.name', { $ifNull: ['$userInfo.username', '$snapshot.residentDetails.name'] }] },
                amount: { $ifNull: ['$totalDue', { $ifNull: ['$totalAmount', { $ifNull: ['$outstandingAmount', { $ifNull: ['$currentCharge', 0] }] }] }] },
                totalDue: { $ifNull: ['$totalDue', { $ifNull: ['$totalAmount', { $ifNull: ['$outstandingAmount', { $ifNull: ['$currentCharge', 0] }] }] }] },
                totalAmount: { $ifNull: ['$totalAmount', { $ifNull: ['$totalDue', 0] }] },
                outstandingAmount: { $ifNull: ['$outstandingAmount', { $ifNull: ['$totalDue', { $ifNull: ['$totalAmount', 0] }] }] },
                paidAmount: { $ifNull: ['$paidAmount', 0] },
                currency: { $literal: 'INR' },
                status: 1,
                paymentMethod: { $ifNull: ['$paymentMethod', '—'] },
                offlineReference: 1,
                offlineAmount: 1,
                paymentDate: 1,
                paymentScreenshot: 1,
                rejectionReason: 1,
              },
            },
          ],
          metadata: [
            ...statusMatch,
            { $count: 'totalRecords' },
          ],
          statusCounts: statusCountsFacet,
        },
      },
    ]);

    return this._formatInvoicesResult(result, page, take);
  }

  /**
   * Helper to format pagination and status count metadata.
   */
  _formatInvoicesResult(result, page, take) {
    const data = result[0]?.data || [];
    const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
    const totalPages = Math.ceil(totalRecords / take) || 1;

    const rawStatusCounts = result[0]?.statusCounts || [];
    const statusCounts = {
      ALL: 0,
      VERIFICATION_PENDING: 0,
      UNPAID: 0,
      PARTIALLY_PAID: 0,
      OVERDUE: 0,
      PAID: 0,
    };

    let totalAll = 0;
    rawStatusCounts.forEach((item) => {
      if (item._id && statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
      totalAll += item.count;
    });
    statusCounts.ALL = totalAll;

    return {
      data,
      statusCounts,
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
