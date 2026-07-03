import Booking from './booking.model.js';

export class BookingRepository {
  async findAll(orgId, filter = {}) {
    return await Booking.find({ orgId, ...filter }).sort({ date: -1, startTime: -1 }).populate('amenityId').populate('userId');
  }

  async findById(id, orgId) {
    return await Booking.findOne({ _id: id, orgId }).populate('amenityId').populate('userId');
  }

  async findOverlappingBookings(amenityId, date, startTime, endTime) {
    return await Booking.find({
      amenityId,
      date,
      bookingStatus: { $in: ['Confirmed', 'Checked-In'] },
      $or: [
        { $and: [{ startTime: { $lt: endTime } }, { endTime: { $gt: startTime } }] } // Overlap condition
      ]
    });
  }

  async create(bookingData) {
    const booking = new Booking(bookingData);
    return await booking.save();
  }

  async updateStatus(id, orgId, bookingStatus) {
    return await Booking.findOneAndUpdate({ _id: id, orgId }, { bookingStatus }, { new: true, runValidators: true });
  }

  async getBookingStats(orgId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const stats = await Booking.aggregate([
      { $match: { orgId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          today: [{ $match: { date: { $gte: todayStart, $lte: todayEnd } } }, { $count: "count" }],
          upcoming: [{ $match: { date: { $gt: todayEnd } } }, { $count: "count" }],
          confirmed: [{ $match: { bookingStatus: 'Confirmed' } }, { $count: "count" }],
          pending: [{ $match: { paymentStatus: 'Pending' } }, { $count: "count" }], // Alternatively, bookingStatus pending if we add it
          cancelled: [{ $match: { bookingStatus: 'Cancelled' } }, { $count: "count" }],
          completed: [{ $match: { bookingStatus: 'Completed' } }, { $count: "count" }],
          checkedIn: [{ $match: { bookingStatus: 'Checked-In' } }, { $count: "count" }],
          todayCheckIns: [{ $match: { date: { $gte: todayStart, $lte: todayEnd }, bookingStatus: { $in: ['Checked-In', 'Completed'] } } }, { $count: "count" }],
          expired: [{ $match: { date: { $lt: todayStart }, bookingStatus: { $nin: ['Completed', 'Cancelled'] } } }, { $count: "count" }]
        }
      }
    ]);

    return {
      total: stats[0].total[0]?.count || 0,
      today: stats[0].today[0]?.count || 0,
      upcoming: stats[0].upcoming[0]?.count || 0,
      confirmed: stats[0].confirmed[0]?.count || 0,
      pending: stats[0].pending[0]?.count || 0,
      cancelled: stats[0].cancelled[0]?.count || 0,
      completed: stats[0].completed[0]?.count || 0,
      checkedIn: stats[0].checkedIn[0]?.count || 0,
      todayCheckIns: stats[0].todayCheckIns[0]?.count || 0,
      expired: stats[0].expired[0]?.count || 0,
    };
  }

  async getRecentActivity(orgId, limit = 10) {
    return await Booking.find({ orgId }).sort({ updatedAt: -1 }).limit(limit).populate('amenityId', 'name');
  }

  async getOccupancyStats(orgId) {
    // Basic aggregation: count confirmed/completed bookings per amenity
    const stats = await Booking.aggregate([
      { $match: { orgId, bookingStatus: { $in: ['Confirmed', 'Checked-In', 'Completed'] } } },
      { $group: { _id: "$amenityId", count: { $sum: 1 } } },
      { $lookup: { from: 'amenities', localField: '_id', foreignField: '_id', as: 'amenity' } },
      { $unwind: "$amenity" },
      { $project: { name: "$amenity.name", count: 1 } },
      { $sort: { count: -1 } }
    ]);
    return stats;
  }
}

export default new BookingRepository();
