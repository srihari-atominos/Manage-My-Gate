import mongoose from 'mongoose';
import AmenityReservation from './amenityReservation.model.js';

export class AmenityReservationRepository {
  /**
   * Creates a new reservation document.
   * @param {Object} reservationData
   * @param {mongoose.ClientSession} [session]
   */
  async create(reservationData, session) {
    const [doc] = await AmenityReservation.create([reservationData], { session });
    return doc;
  }

  /**
   * Finds a reservation by ID.
   * @param {string|mongoose.Types.ObjectId} reservationId
   * @param {mongoose.ClientSession} [session]
   */
  async findById(reservationId, session) {
    return AmenityReservation.findById(reservationId).session(session || null);
  }

  /**
   * Finds a reservation by tenant-scoped reservation number.
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string} reservationNumber
   * @param {mongoose.ClientSession} [session]
   */
  async findByReservationNumber(orgId, reservationNumber, session) {
    return AmenityReservation.findOne({ orgId, reservationNumber }).session(session || null);
  }

  /**
   * Finds active reservations overlapping an effective date range.
   * Excludes CANCELLED and REJECTED bookings.
   * @param {Object} params
   */
  async findOverlappingActiveReservations(
    { orgId, facilityId, resourceId, effectiveStartDateTime, effectiveEndDateTime },
    session
  ) {
    const filter = {
      orgId,
      facilityId,
      bookingStatus: { $in: ['PENDING_APPROVAL', 'CONFIRMED'] },
      effectiveStartDateTime: { $lt: effectiveEndDateTime },
      effectiveEndDateTime: { $gt: effectiveStartDateTime },
    };
    if (resourceId) filter.resourceId = resourceId;

    return AmenityReservation.find(filter).session(session || null);
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
      { session: session || null, returnDocument: 'after', runValidators: true }
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
      { session: session || null, returnDocument: 'after' }
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
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return { data, items: data, total, page, limit, totalPages };
  }
}

export const amenityReservationRepository = new AmenityReservationRepository();
export default amenityReservationRepository;
