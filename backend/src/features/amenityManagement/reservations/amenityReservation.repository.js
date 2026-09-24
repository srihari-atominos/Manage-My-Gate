import mongoose from 'mongoose';
import AmenityReservation from './amenityReservation.model.js';
import { getValidSession } from '../domain/concurrency/transaction.utils.js';

export class AmenityReservationRepository {
  /**
   * Creates a new reservation document.
   * @param {Object} reservationData
   * @param {mongoose.ClientSession} [session]
   */
  async create(reservationData, session) {
    const validSession = getValidSession(session);
    const options = validSession ? { session: validSession } : {};
    const [doc] = await AmenityReservation.create([reservationData], options);
    return AmenityReservation.populate(doc, [
      { path: 'facilityId', select: 'name timezone type category isExclusive' },
      { path: 'resourceId', select: 'name type' },
      { path: 'residentId', select: 'name username email' }
    ]);
  }

  /**
   * Finds a reservation by ID.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(reservationId, session) {
    return AmenityReservation.findById(reservationId)
      .populate('facilityId', 'name timezone type category isExclusive')
      .populate('resourceId', 'name type')
      .populate('residentId', 'name username email')
      .session(getValidSession(session));
  }

  /**
   * Finds a reservation by tenant-scoped reservation number.
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reservationNumber
   * @param {mongoose.ClientSession} [session]
   */
  async findByReservationNumber(orgId, reservationNumber, session) {
    return AmenityReservation.findOne({ orgId, reservationNumber })
      .populate('facilityId', 'name timezone type category isExclusive')
      .populate('resourceId', 'name type')
      .populate('residentId', 'name username email')
      .session(getValidSession(session));
  }

  /**
   * Finds active reservations overlapping an effective date range.
   * Excludes CANCELLED and REJECTED bookings.
   * @param {Object} params
   */
  async findOverlappingActiveReservations(
    { orgId, facilityId, resourceId, resourceIds, effectiveStartDateTime, effectiveEndDateTime },
    session
  ) {
    const filter = {
      orgId,
      facilityId,
      bookingStatus: { $in: ['PENDING_APPROVAL', 'CONFIRMED'] },
      effectiveStartDateTime: { $lt: effectiveEndDateTime },
      effectiveEndDateTime: { $gt: effectiveStartDateTime },
    };
    if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      filter.resourceId = { $in: resourceIds };
    } else if (resourceId) {
      filter.resourceId = resourceId;
    }

    return AmenityReservation.find(filter).session(getValidSession(session));
  }

  /**
   * Finds all future active/confirmed reservations for a facility without an arbitrary date cap.
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|mongoose.Types.ObjectId} params.facilityId
   * @param {mongoose.ClientSession} [session]
   */
  async findFutureActiveReservations({ orgId, facilityId }, session) {
    const now = new Date();
    const filter = {
      orgId,
      facilityId,
      bookingStatus: { $in: ['PENDING_APPROVAL', 'CONFIRMED'] },
      effectiveEndDateTime: { $gte: now },
    };
    return AmenityReservation.find(filter).session(getValidSession(session));
  }

  /**
   * Updates state dimensions on a reservation document.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {Object} updateFields
   * @param {mongoose.ClientSession} [session]
   */
  async updateStateDimensions(reservationId, updateFields, session) {
    return AmenityReservation.findOneAndUpdate(
      { _id: reservationId },
      {
        $set: updateFields,
        $inc: { version: 1 },
      },
      { session: getValidSession(session), returnDocument: 'after', runValidators: true }
    );
  }

  /**
   * Appends an action entry to the approval history array.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {Object} historyEntry
   * @param {mongoose.ClientSession} [session]
   */
  async appendApprovalHistory(reservationId, historyEntry, session) {
    return AmenityReservation.findOneAndUpdate(
      { _id: reservationId },
      {
        $push: { approvalHistory: historyEntry },
        $inc: { version: 1 },
      },
      { session: getValidSession(session), returnDocument: 'after' }
    );
  }

  /**
   * Paginated list query with total count via $facet aggregation pipeline.
   * @param {Object} params
   */
  async findWithPagination({
    orgId,
    facilityId,
    residentId,
    unitId,
    bookingStatus,
    paymentStatus,
    approvalStatus,
    page = 1,
    limit = 10,
  }) {
    const match = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (facilityId) match.facilityId = new mongoose.Types.ObjectId(facilityId);
    if (residentId) match.residentId = new mongoose.Types.ObjectId(residentId);
    if (unitId) match.unitId = new mongoose.Types.ObjectId(unitId);
    if (bookingStatus) match.bookingStatus = bookingStatus;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (approvalStatus) match.approvalStatus = approvalStatus;

    const skip = (page - 1) * limit;

    const [result] = await AmenityReservation.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $addFields: {
                startDateTime: { $ifNull: ['$effectiveStartDateTime', '$requestedStartDateTime'] },
                endDateTime: { $ifNull: ['$effectiveEndDateTime', '$requestedEndDateTime'] },
              },
            },
            {
              $lookup: {
                from: 'amenity_management_facilities',
                localField: 'facilityId',
                foreignField: '_id',
                as: 'facilityId',
              },
            },
            {
              $unwind: {
                path: '$facilityId',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'amenity_management_resources',
                localField: 'resourceId',
                foreignField: '_id',
                as: 'resourceId',
              },
            },
            {
              $unwind: {
                path: '$resourceId',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'residentId',
                foreignField: '_id',
                as: 'residentId',
              },
            },
            {
              $unwind: {
                path: '$residentId',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                'residentId.password': 0,
                'residentId.otp': 0,
              },
            }
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, items: data, total, page, limit, totalPages };
  }

  /**
   * Finds reservations for calendar view within a date range with optional filtering.
   * Matches reservations overlapping [startDate, endDate].
   * @param {Object} params
   * @param {string|mongoose.Types.ObjectId} params.orgId
   * @param {string|Date} [params.startDate]
   * @param {string|Date} [params.endDate]
   * @param {string|mongoose.Types.ObjectId} [params.facilityId]
   * @param {string|mongoose.Types.ObjectId} [params.resourceId]
   * @param {string} [params.bookingStatus]
   * @param {string} [params.paymentStatus]
   * @param {mongoose.ClientSession} [session]
   */
  async findEventsForCalendar(
    {
      orgId,
      startDate,
      endDate,
      facilityId,
      resourceId,
      bookingStatus,
      paymentStatus,
    },
    session
  ) {
    const filter = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (startDate && endDate) {
      const rangeStart = new Date(startDate);
      const rangeEnd = String(endDate).includes('T')
        ? new Date(endDate)
        : new Date(`${endDate}T23:59:59.999Z`);
      filter.effectiveStartDateTime = { $lt: rangeEnd };
      filter.effectiveEndDateTime = { $gt: rangeStart };
    } else if (startDate) {
      const rangeStart = new Date(startDate);
      filter.effectiveEndDateTime = { $gt: rangeStart };
    } else if (endDate) {
      const rangeEnd = String(endDate).includes('T')
        ? new Date(endDate)
        : new Date(`${endDate}T23:59:59.999Z`);
      filter.effectiveStartDateTime = { $lt: rangeEnd };
    }

    if (facilityId && facilityId !== 'All') {
      filter.facilityId = new mongoose.Types.ObjectId(facilityId);
    }
    if (resourceId && resourceId !== 'All') {
      filter.resourceId = new mongoose.Types.ObjectId(resourceId);
    }
    if (bookingStatus && bookingStatus !== 'All') {
      filter.bookingStatus = bookingStatus.toUpperCase();
    }
    if (paymentStatus && paymentStatus !== 'All') {
      filter.paymentStatus = paymentStatus.toUpperCase();
    }

    return AmenityReservation.find(filter)
      .populate('facilityId', 'name type images location bookingRules category isExclusive pricingConfig')
      .populate('resourceId', 'name type resourceCode capacity')
      .populate('residentId', 'name email profilePicture flatNumber building tower phoneNumber villaNumber username')
      .populate('unitId', 'unitNumber villaNumber block floor')
      .sort({ effectiveStartDateTime: 1 })
      .session(getValidSession(session))
      .lean();
  }
}

export const amenityReservationRepository = new AmenityReservationRepository();
export default amenityReservationRepository;
