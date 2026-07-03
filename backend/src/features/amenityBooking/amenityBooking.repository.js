import AmenityBooking from './amenityBooking.model.js';
import mongoose from 'mongoose';

export class AmenityBookingRepository {
  async findConflicts(amenityId, date, startTime, endTime) {
    return await AmenityBooking.find({
      amenityId,
      bookingDate: date,
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });
  }

  async countUserBookingsOnDate(userId, orgId, date) {
    return await AmenityBooking.countDocuments({
      userId,
      orgId,
      bookingDate: date,
      status: { $ne: 'cancelled' } // pending, approved, rejected count? Prompt says maxBookingsPerUserPerDay, usually implies active intent
    });
  }

  async findByOrgPaginated(orgId, filters = {}, skip = 0, limit = 10) {
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId) };
    if (filters.status) matchStage.status = filters.status;
    if (filters.amenityId) matchStage.amenityId = new mongoose.Types.ObjectId(filters.amenityId);
    if (filters.date) matchStage.bookingDate = filters.date;
    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters.checkedInBy) matchStage.checkedInBy = new mongoose.Types.ObjectId(filters.checkedInBy);

    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalRecords' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'amenities',
                localField: 'amenityId',
                foreignField: '_id',
                as: 'amenity'
              }
            },
            { $unwind: '$amenity' },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                bookingDate: 1,
                startTime: 1,
                endTime: 1,
                status: 1,
                totalPrice: 1,
                deposit: 1,
                paymentMethod: 1,
                rejectionReason: 1,
                createdAt: 1,
                'amenity._id': 1,
                'amenity.name': 1,
                'amenity.type': 1,
                'user._id': 1,
                'user.name': 1,
                'user.email': 1
              }
            }
          ]
        }
      }
    ];

    const result = await AmenityBooking.aggregate(pipeline);
    const data = result[0].data;
    const totalRecords = result[0].metadata.length > 0 ? result[0].metadata[0].totalRecords : 0;
    return { data, totalRecords };
  }

  async findByUser(userId, orgId) {
    return await AmenityBooking.find({ userId, orgId })
      .sort({ bookingDate: -1, startTime: -1 })
      .populate('amenityId', 'name type images')
      .exec();
  }

  async findById(id, orgId) {
    return await AmenityBooking.findOne({ _id: id, orgId }).populate('amenityId');
  }

  async create(bookingData) {
    const booking = new AmenityBooking(bookingData);
    return await booking.save();
  }

  async updateStatus(id, orgId, status, reviewData = {}) {
    return await AmenityBooking.findOneAndUpdate(
      { _id: id, orgId },
      { status, ...reviewData },
      { new: true }
    ).populate('amenityId user');
  }

  async findActiveBookingsByAmenity(amenityId, orgId) {
    const today = new Date().toISOString().split('T')[0];
    return await AmenityBooking.find({
      amenityId,
      orgId,
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] },
      bookingDate: { $gte: today }
    });
  }

  async getKpiStats(orgId) {
    const today = new Date().toISOString().split('T')[0];
    const matchOrg = { orgId: new mongoose.Types.ObjectId(orgId) };
    const kpis = await AmenityBooking.aggregate([
      { $match: { ...matchOrg, bookingDate: today, status: { $ne: 'cancelled' } } },
      { $group: {
          _id: null,
          checkIns: { $sum: { $cond: [ { $in: ['$status', ['checked-in', 'completed']] }, 1, 0 ] } },
          revenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 }
      }}
    ]);
    return kpis[0] || { checkIns: 0, revenue: 0, totalBookings: 0 };
  }

  async getRevenueStats(orgId) {
    return await AmenityBooking.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId), status: { $ne: 'cancelled' } } },
      { $group: { _id: '$bookingDate', revenue: { $sum: '$totalPrice' } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);
  }

  async getOccupancyStats(orgId) {
    return await AmenityBooking.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId), status: { $ne: 'cancelled' } } },
      { $group: { _id: '$bookingDate', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);
  }

  async getTrendsStats(orgId) {
    return await AmenityBooking.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId), status: { $ne: 'cancelled' } } },
      { $group: { _id: '$amenityId', count: { $sum: 1 } } },
      { $lookup: { from: 'amenities', localField: '_id', foreignField: '_id', as: 'amenity' } },
      { $unwind: '$amenity' },
      { $project: { name: '$amenity.name', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
  }

  async getRecentActivity(orgId) {
    return await AmenityBooking.find({ orgId: new mongoose.Types.ObjectId(orgId) })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('amenityId', 'name')
      .populate('userId', 'name')
      .exec();
  }
}

export default new AmenityBookingRepository();
