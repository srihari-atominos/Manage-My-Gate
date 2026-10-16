import mongoose from 'mongoose';
import StaffAttendance from './staffAttendance.model.js';
import HttpError from '../../utils/httpError.utils.js';
import { escapeRegex } from '../../utils/regex.utils.js';
import { buildStaffPhotoUrl } from '../../utils/staffPhoto.utils.js';

// Aggregation results bypass the Technician model's JSON transform, so do the same swap here.
const withPhotoUrl = (staff) => {
  if (staff && typeof staff === 'object' && staff.photoKey !== undefined) {
    staff.photoUrl = buildStaffPhotoUrl(staff);
    delete staff.photoKey;
  }
};

const MAX_PAGE_SIZE = 100;

function normalizeStartDate(dateInput) {
  if (!dateInput) return null;
  let d;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    d = new Date(`${dateInput.trim()}T00:00:00.000Z`);
  } else {
    d = new Date(dateInput);
  }
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEndDate(dateInput) {
  if (!dateInput) return null;
  let d;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    d = new Date(`${dateInput.trim()}T23:59:59.999Z`);
  } else {
    d = new Date(dateInput);
  }
  return isNaN(d.getTime()) ? null : d;
}

class StaffAttendanceRepository {
  /**
   * Find an active open session for a technician within the organization.
   */
  async findActiveSession(orgId, technicianId, session = null) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const techObjectId = mongoose.Types.ObjectId.isValid(technicianId) ? new mongoose.Types.ObjectId(technicianId) : technicianId;

    return await StaffAttendance.findOne({
      orgId: orgObjectId,
      technicianId: techObjectId,
      status: 'Open',
    })
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('checkInGuardId', 'name username email')
      .session(session);
  }

  /**
   * Find a session by idempotency key to prevent double-scan replay attacks.
   */
  async findByIdempotencyKey(orgId, idempotencyKey, session = null) {
    if (!idempotencyKey) return null;
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;

    return await StaffAttendance.findOne({
      orgId: orgObjectId,
      $or: [{ idempotencyKey }, { exitIdempotencyKey: idempotencyKey }],
    })
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .session(session);
  }

  /**
   * Creates a new attendance session.
   * Atomic duplicate-key handling for concurrent scans.
   */
  async createSession(data, session = null) {
    try {
      const doc = new StaffAttendance(data);
      return await doc.save({ session });
    } catch (err) {
      if (
        err &&
        (err.code === 11000 ||
          err.codeName === 'DuplicateKey' ||
          (err.message && err.message.includes('E11000')))
      ) {
        throw new HttpError(409, 'Staff member already has an active open attendance session.');
      }
      throw err;
    }
  }

  /**
   * Atomically closes an active open session.
   */
  async closeSession(sessionId, orgId, updateData, session = null) {
    const sessionObjectId = mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId;
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;

    return await StaffAttendance.findOneAndUpdate(
      { _id: sessionObjectId, orgId: orgObjectId, status: 'Open' },
      {
        $set: {
          status: 'Closed',
          checkOutTime: updateData.checkOutTime || new Date(),
          exitGate: updateData.exitGate || 'Main Gate',
          exitGuardId: updateData.exitGuardId,
          ...(updateData.exitIdempotencyKey ? { exitIdempotencyKey: updateData.exitIdempotencyKey } : {}),
          ...(updateData.notes !== undefined ? { notes: updateData.notes } : {}),
        },
      },
      { new: true, session }
    )
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('checkInGuardId', 'name username email')
      .populate('exitGuardId', 'name username email');
  }

  /**
   * Closes a stale open session whose checkout was never recorded. No checkout time is
   * invented (so durations stay null); the record is flagged as auto-closed for reporting.
   */
  async autoCloseSession(sessionId, orgId, note, session = null) {
    return await StaffAttendance.findOneAndUpdate(
      { _id: sessionId, orgId, status: 'Open' },
      {
        $set: { status: 'Closed', autoClosed: true, notes: note },
      },
      { new: true, session }
    );
  }

  /**
   * Auto-closes every open session of a technician (used when staff are deactivated or deleted).
   */
  async autoCloseOpenSessionsForTechnician(orgId, technicianId, note) {
    return await StaffAttendance.updateMany(
      { orgId, technicianId, status: 'Open' },
      { $set: { status: 'Closed', autoClosed: true, notes: note } }
    );
  }

  /**
   * Retrieves all currently active open sessions in the organization.
   */
  async getActiveSessions(orgId) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;

    return await StaffAttendance.find({
      orgId: orgObjectId,
      status: 'Open',
    })
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('checkInGuardId', 'name username email')
      .sort({ checkInTime: -1 });
  }

  /**
   * Open sessions limited to the given technicians (resident-facing "staff inside now" view).
   */
  async getActiveSessionsForTechnicians(orgId, technicianIds) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    return await StaffAttendance.find({
      orgId: orgObjectId,
      status: 'Open',
      technicianId: { $in: technicianIds },
    })
      .populate('technicianId', 'name department departmentOther designation photoKey')
      .sort({ checkInTime: -1 });
  }

  /**
   * Finds a session by ID and orgId.
   */
  async findById(id, orgId, session = null) {
    const sessionObjectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;

    return await StaffAttendance.findOne({ _id: sessionObjectId, orgId: orgObjectId })
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('checkInGuardId', 'name username email')
      .populate('exitGuardId', 'name username email')
      .session(session);
  }

  /**
   * Shared filter -> aggregation stages (match, technician lookup, post-lookup match).
   * Used by the paginated history and by the un-paginated export so both always agree.
   */
  _buildHistoryBasePipeline(orgObjectId, filter = {}) {
    const matchConditions = { orgId: orgObjectId };

    if (filter.technicianId) {
      matchConditions.technicianId = mongoose.Types.ObjectId.isValid(filter.technicianId)
        ? new mongoose.Types.ObjectId(filter.technicianId)
        : filter.technicianId;
    }

    if (filter.status) {
      if (filter.status === 'Missing Checkout' || filter.status === 'Exception') {
        matchConditions.status = 'Open';
        matchConditions.checkInTime = matchConditions.checkInTime || {};
        matchConditions.checkInTime.$lt = new Date(Date.now() - 12 * 60 * 60 * 1000);
      } else {
        matchConditions.status = filter.status;
      }
    }

    if (filter.gateId) {
      matchConditions.$or = [
        { checkInGate: filter.gateId },
        { exitGate: filter.gateId },
      ];
    }

    if (filter.startDate || filter.endDate) {
      const normStart = normalizeStartDate(filter.startDate);
      const normEnd = normalizeEndDate(filter.endDate);
      if (normStart && normEnd && normStart > normEnd) {
        throw new HttpError(400, 'Start date cannot be later than end date.');
      }
      const dateRange = {};
      if (normStart) dateRange.$gte = normStart;
      if (normEnd) dateRange.$lte = normEnd;
      if (Object.keys(dateRange).length > 0) {
        matchConditions.checkInTime = dateRange;
      }
    }

    const basePipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'technicians',
          localField: 'technicianId',
          foreignField: '_id',
          as: 'technician',
        },
      },
      { $unwind: { path: '$technician', preserveNullAndEmptyArrays: true } },
    ];

    const postLookupMatch = {};
    if (filter.department && filter.department !== 'ALL') {
      postLookupMatch['technician.department'] = filter.department;
    }
    if (filter.staffCategory && filter.staffCategory !== 'ALL') {
      postLookupMatch['technician.staffCategory'] = filter.staffCategory === 'COMMUNITY' ? { $ne: 'UNIT' } : filter.staffCategory;
    }
    if (filter.roleId) {
      postLookupMatch['technician.roleId'] = mongoose.Types.ObjectId.isValid(filter.roleId) ? new mongoose.Types.ObjectId(filter.roleId) : filter.roleId;
    }
    if (filter.departmentOther) {
      postLookupMatch['technician.department'] = 'Others';
      postLookupMatch['technician.departmentOther'] = filter.departmentOther;
    }
    if (filter.type && filter.type !== 'ALL') {
      postLookupMatch['technician.type'] = filter.type;
    }
    if (filter.search && typeof filter.search === 'string' && filter.search.trim()) {
      const q = filter.search.trim();
      const regex = new RegExp(escapeRegex(q), 'i');
      postLookupMatch.$or = [
        { 'technician.name': { $regex: regex } },
        { 'technician.staffCode': { $regex: regex } },
        { staffCode: { $regex: regex } },
        { 'technician.department': { $regex: regex } },
        { checkInGate: { $regex: regex } },
        { exitGate: { $regex: regex } },
      ];
    }

    if (Object.keys(postLookupMatch).length > 0) {
      basePipeline.push({ $match: postLookupMatch });
    }
    return basePipeline;
  }

  /**
   * Un-paginated, export-friendly rows (guard names resolved, newest first). Capped to protect the server.
   */
  async findForExport(orgId, filter = {}, maxRows = 20000) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const pipeline = [
      ...this._buildHistoryBasePipeline(orgObjectId, filter),
      { $sort: { checkInTime: -1 } },
      { $limit: maxRows + 1 },
      { $lookup: { from: 'users', localField: 'checkInGuardId', foreignField: '_id', as: 'checkInGuard' } },
      { $unwind: { path: '$checkInGuard', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'exitGuardId', foreignField: '_id', as: 'exitGuard' } },
      { $unwind: { path: '$exitGuard', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          status: 1,
          staffCode: 1,
          checkInTime: 1,
          checkOutTime: 1,
          checkInGate: 1,
          exitGate: 1,
          notes: 1,
          autoClosed: 1,
          isManualEntry: 1,
          'technician._id': 1,
          'technician.name': 1,
          'technician.department': 1,
          'technician.departmentOther': 1,
          'technician.designation': 1,
          'technician.type': 1,
          'technician.staffCategory': 1,
          'technician.roleId': 1,
          'technician.staffCode': 1,
          'technician.phone': 1,
          'technician.photoKey': 1,
          'checkInGuard.name': 1,
          'checkInGuard.username': 1,
          'exitGuard.name': 1,
          'exitGuard.username': 1,
        },
      },
    ];
    const rows = await StaffAttendance.aggregate(pipeline);
    rows.forEach((r) => withPhotoUrl(r.technician));
    const truncated = rows.length > maxRows;
    return { rows: truncated ? rows.slice(0, maxRows) : rows, truncated };
  }

  /**
   * Aggregation pipeline query with $facet for pagination and total record count.
   */
  async findHistory(orgId, filter = {}, pagination = { page: 1, limit: 20 }) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const page = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pagination.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const basePipeline = this._buildHistoryBasePipeline(orgObjectId, filter);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const pipeline = [
      ...basePipeline,
      { $sort: { checkInTime: -1 } },
      {
        $facet: {
          records: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'checkInGuardId',
                foreignField: '_id',
                as: 'checkInGuard',
              },
            },
            { $unwind: { path: '$checkInGuard', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'users',
                localField: 'exitGuardId',
                foreignField: '_id',
                as: 'exitGuard',
              },
            },
            { $unwind: { path: '$exitGuard', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                orgId: 1,
                // Clients read the staff member from `technicianId` (as the populated active-sessions
                // endpoint returns it). Expose the looked-up staff document there so names show up;
                // fall back to the raw id if the staff record no longer exists.
                technicianId: { $ifNull: ['$technician', '$technicianId'] },
                staffCode: 1,
                status: 1,
                checkInTime: 1,
                checkInGate: 1,
                checkOutTime: 1,
                exitGate: 1,
                notes: 1,
                createdAt: 1,
                updatedAt: 1,
                durationMinutes: {
                  $cond: {
                    if: { $and: ['$checkInTime', '$checkOutTime'] },
                    then: {
                      $round: [
                        { $divide: [{ $subtract: ['$checkOutTime', '$checkInTime'] }, 1000 * 60] },
                        0,
                      ],
                    },
                    else: null,
                  },
                },
                isMissingCheckout: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$status', 'Open'] },
                        { $lt: ['$checkInTime', twelveHoursAgo] },
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
                'technician._id': 1,
                'technician.name': 1,
                'technician.department': 1,
                'technician.departmentOther': 1,
                'technician.designation': 1,
                'technician.type': 1,
          'technician.staffCategory': 1,
          'technician.roleId': 1,
                'technician.staffCode': 1,
                'technician.status': 1,
                'technician.photoKey': 1,
                'checkInGuard._id': 1,
                'checkInGuard.name': 1,
                'checkInGuard.username': 1,
                'exitGuard._id': 1,
                'exitGuard.name': 1,
                'exitGuard.username': 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [facetResult] = await StaffAttendance.aggregate(pipeline);
    const records = facetResult?.records || [];
    records.forEach((r) => {
      withPhotoUrl(r.technician);
      withPhotoUrl(r.technicianId);
    });
    const totalRecords = facetResult?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      records,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Retrieves recent sessions within a window for reconciliation or inspection.
   */
  async findRecentSessions(filter = {}, limit = 100) {
    return await StaffAttendance.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Single-roundtrip aggregation for community staff attendance statistics.
   */
  async getAttendanceStats(orgId, query = {}) {
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : orgId;
    const matchConditions = { orgId: orgObjectId };

    if (query.startDate || query.endDate) {
      const normStart = normalizeStartDate(query.startDate);
      const normEnd = normalizeEndDate(query.endDate);
      if (normStart && normEnd && normStart > normEnd) {
        throw new HttpError(400, 'Start date cannot be later than end date.');
      }
      const dateRange = {};
      if (normStart) dateRange.$gte = normStart;
      if (normEnd) dateRange.$lte = normEnd;
      if (Object.keys(dateRange).length > 0) {
        matchConditions.checkInTime = dateRange;
      }
    }

    if (query.gateId) {
      matchConditions.$or = [
        { checkInGate: query.gateId },
        { exitGate: query.gateId },
      ];
    }

    if (query.technicianId) {
      matchConditions.technicianId = mongoose.Types.ObjectId.isValid(query.technicianId)
        ? new mongoose.Types.ObjectId(query.technicianId)
        : query.technicianId;
    }

    if (query.status) {
      if (query.status === 'Missing Checkout' || query.status === 'Exception') {
        matchConditions.status = 'Open';
        matchConditions.checkInTime = matchConditions.checkInTime || {};
        matchConditions.checkInTime.$lt = new Date(Date.now() - 12 * 60 * 60 * 1000);
      } else {
        matchConditions.status = query.status;
      }
    }

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const basePipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'technicians',
          localField: 'technicianId',
          foreignField: '_id',
          as: 'technician',
        },
      },
      { $unwind: { path: '$technician', preserveNullAndEmptyArrays: true } },
    ];

    const postLookupMatch = {};
    if (query.department && query.department !== 'ALL') {
      postLookupMatch['technician.department'] = query.department;
    }
    if (query.type && query.type !== 'ALL') {
      postLookupMatch['technician.type'] = query.type;
    }
    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const q = query.search.trim();
      const regex = new RegExp(escapeRegex(q), 'i');
      postLookupMatch.$or = [
        { 'technician.name': { $regex: regex } },
        { 'technician.staffCode': { $regex: regex } },
        { staffCode: { $regex: regex } },
        { 'technician.department': { $regex: regex } },
        { checkInGate: { $regex: regex } },
        { exitGate: { $regex: regex } },
      ];
    }

    if (Object.keys(postLookupMatch).length > 0) {
      basePipeline.push({ $match: postLookupMatch });
    }

    const pipeline = [
      ...basePipeline,
      {
        $facet: {
          totalSessions: [{ $count: 'count' }],
          openSessions: [{ $match: { status: 'Open' } }, { $count: 'count' }],
          closedSessions: [{ $match: { status: 'Closed' } }, { $count: 'count' }],
          missingCheckoutExceptions: [
            {
              $match: {
                status: 'Open',
                checkInTime: { $lt: twelveHoursAgo },
              },
            },
            { $count: 'count' },
          ],
          distinctStaff: [
            { $group: { _id: '$technicianId' } },
            { $count: 'count' },
          ],
        },
      },
    ];

    const [facetResult] = await StaffAttendance.aggregate(pipeline);

    return {
      totalSessions: facetResult?.totalSessions?.[0]?.count || 0,
      openSessions: facetResult?.openSessions?.[0]?.count || 0,
      closedSessions: facetResult?.closedSessions?.[0]?.count || 0,
      missingCheckoutExceptions: facetResult?.missingCheckoutExceptions?.[0]?.count || 0,
      distinctStaffCount: facetResult?.distinctStaff?.[0]?.count || 0,
    };
  }
}

export default new StaffAttendanceRepository();



