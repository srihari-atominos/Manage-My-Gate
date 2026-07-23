import AmenityBooking from './amenityBooking.model.js';
import mongoose from 'mongoose';

export class AmenityBookingRepository {
  async findConflicts(orgId, amenityId, date, startTime, endTime) {
    return await AmenityBooking.find({
      orgId,
      amenityId,
      bookingDate: date,
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });
  }

  async countUserBookingsOnDate(userId, orgId, amenityId, date) {
    const bookings = await AmenityBooking.find({
      userId,
      orgId,
      amenityId,
      bookingDate: date,
      status: { $nin: ['cancelled', 'rejected'] }
    });
    const uniqueSlots = new Set(bookings.map(b => `${b.startTime}-${b.endTime}`));
    return uniqueSlots.size;
  }

  async isExistingSlot(userId, orgId, amenityId, date, startTime, endTime) {
    const count = await AmenityBooking.countDocuments({
      userId,
      orgId,
      amenityId,
      bookingDate: date,
      startTime,
      endTime,
      status: { $nin: ['cancelled', 'rejected'] }
    });
    return count > 0;
  }

  async findByOrgPaginated(orgId, filters = {}, skip = 0, limit = 10) {
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId) };
    if (filters.status) matchStage.status = filters.status;
    if (filters.amenityId) matchStage.amenityId = new mongoose.Types.ObjectId(filters.amenityId);
    if (filters.date) matchStage.bookingDate = filters.date;
    if (filters.bookingDate) matchStage.bookingDate = filters.bookingDate;
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
                totalPrice: '$pricingDetails.totalAmount',
                deposit: '$pricingDetails.securityDeposit',
                paymentMethod: 1,
                rejectionReason: 1,
                numberOfPersons: 1,
                createdAt: 1,
                userId: {
                  _id: '$user._id',
                  name: '$user.name',
                  username: '$user.username',
                  email: '$user.email'
                },
                amenityId: {
                  _id: '$amenity._id',
                  name: '$amenity.name',
                  type: '$amenity.type'
                }
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

  async findByUser(userId, orgId, filters = {}) {
    const query = { userId, orgId };
    if (filters.startDate && filters.endDate) {
      query.bookingDate = { $gte: filters.startDate, $lte: filters.endDate };
    } else if (filters.startDate) {
      query.bookingDate = { $gte: filters.startDate };
    } else if (filters.endDate) {
      query.bookingDate = { $lte: filters.endDate };
    }

    return await AmenityBooking.find(query)
      .sort({ bookingDate: -1, startTime: -1 })
      .populate('amenityId', 'name type images location bookingRules pricing')
      .exec();
  }

  async findEventsForCalendar(orgId, startDate, endDate) {
    return await AmenityBooking.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      bookingDate: { $gte: startDate, $lte: endDate }
    })
    .populate('userId', 'name email profilePicture flatNumber building tower phoneNumber')
    .populate('amenityId', 'name type images location bookingRules pricing')
    .sort({ bookingDate: 1, startTime: 1 })
    .lean();
  }

  async getAggregatedCalendarBookings(orgId, startDate, endDate) {
    return await AmenityBooking.aggregate([
      {
        $match: {
          orgId: new mongoose.Types.ObjectId(orgId),
          bookingDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'confirmed', 'checked-in'] }
        }
      },
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
        $group: {
          _id: {
            amenityId: '$amenityId',
            bookingDate: '$bookingDate',
            startTime: '$startTime',
            endTime: '$endTime'
          },
          totalAttendees: {
            $sum: { $ifNull: ['$numberOfPersons', 1] }
          },
          attendeeDetails: {
            $push: {
              userId: '$userId',
              userName: { $ifNull: ['$user.name', '$user.username'] },
              numberOfPersons: { $ifNull: ['$numberOfPersons', 1] }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'amenities',
          localField: '_id.amenityId',
          foreignField: '_id',
          as: 'amenity'
        }
      },
      { $unwind: '$amenity' },
      {
        $project: {
          _id: 0,
          amenityId: '$_id.amenityId',
          amenityName: '$amenity.name',
          bookingDate: '$_id.bookingDate',
          startTime: '$_id.startTime',
          endTime: '$_id.endTime',
          totalAttendees: 1,
          attendeeDetails: 1
        }
      }
    ]);
  }

  async countAllUpcomingBookings(orgId) {
    return await AmenityBooking.countDocuments({
      orgId: new mongoose.Types.ObjectId(orgId),
      status: { $in: ['confirmed', 'checked-in'] },
      bookingDate: { $gte: new Date().toISOString().split('T')[0] }
    });
  }

  async getRecentScans(orgId, startOfDay) {
    return await AmenityBooking.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      status: { $in: ['checked-in', 'completed'] },
      $or: [
        { checkInTime: { $gte: startOfDay } },
        { checkOutTime: { $gte: startOfDay } }
      ]
    })
    .sort({ checkInTime: -1 })
    .populate('userId', 'name username email profilePicture')
    .populate('amenityId', 'name images')
    .populate('checkedInBy', 'name username')
    .limit(20)
    .lean();
  }

  async getActivePasses(userId, orgId) {
    return await AmenityBooking.find({
      userId,
      orgId,
      status: { $in: ['confirmed', 'checked-in'] },
      qrStatus: 'active'
    })
    .populate('amenityId', 'name type images location bookingRules pricing')
    .populate('userId', 'name')
    .sort({ bookingDate: 1, startTime: 1 })
    .exec();
  }

  async findById(id, orgId) {
    const query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { bookingId: id }];
    } else {
      query.bookingId = id;
    }
    return await AmenityBooking.findOne(query).populate('amenityId');
  }

  async create(bookingData, session = null) {
    const booking = new AmenityBooking(bookingData);
    return await booking.save(session ? { session } : undefined);
  }

  async updateStatus(id, orgId, status, reviewData = {}) {
    const query = { orgId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { bookingId: id }];
    } else {
      query.bookingId = id;
    }
    return await AmenityBooking.findOneAndUpdate(
      query,
      { $set: { status, ...reviewData } },
      { returnDocument: 'after' }
    ).populate('amenityId userId');
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
    const kNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const today = `${kNow.getFullYear()}-${String(kNow.getMonth() + 1).padStart(2, '0')}-${String(kNow.getDate()).padStart(2, '0')}`;
    const matchOrg = { orgId: new mongoose.Types.ObjectId(orgId) };
    const kpis = await AmenityBooking.aggregate([
      { $match: { ...matchOrg, bookingDate: today, status: { $ne: 'cancelled' } } },
      { $group: {
          _id: null,
          checkIns: { $sum: { $cond: [ { $in: ['$status', ['checked-in', 'completed']] }, 1, 0 ] } },
          revenue: { $sum: '$pricingDetails.totalAmount' },
          totalBookings: { $sum: 1 }
      }}
    ]);
    return kpis[0] || { checkIns: 0, revenue: 0, totalBookings: 0 };
  }

  async getRevenueStats(orgId) {
    return await AmenityBooking.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId), status: { $ne: 'cancelled' } } },
      { $group: { _id: '$bookingDate', revenue: { $sum: '$pricingDetails.totalAmount' } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);
  }

  async getMonthlyIndicators(orgId, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return await AmenityBooking.distinct('bookingDate', {
      orgId: new mongoose.Types.ObjectId(orgId),
      bookingDate: { $regex: `^${monthStr}` },
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
    });
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

  /**
   * Consolidated dashboard aggregation — all booking metrics in a single $facet pipeline.
   * Returns: statusCounts, todayStats, revenueByPeriod, peakHours, monthlyComparison, recentActivity
   */
  async getDashboardAggregation(orgId) {
    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const kNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const today = `${kNow.getFullYear()}-${String(kNow.getMonth() + 1).padStart(2, '0')}-${String(kNow.getDate()).padStart(2, '0')}`;
    
    const startOfWeek = new Date(kNow);
    startOfWeek.setDate(kNow.getDate() - kNow.getDay());
    const weekStart = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    
    const monthStart = `${kNow.getFullYear()}-${String(kNow.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonthDate = new Date(kNow.getFullYear(), kNow.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonthEnd = `${kNow.getFullYear()}-${String(kNow.getMonth() + 1).padStart(2, '0')}-01`;

    const result = await AmenityBooking.aggregate([
      { $match: { orgId: orgObjId } },
      {
        $facet: {
          // Booking counts by status
          statusCounts: [
            { $group: {
              _id: '$status',
              count: { $sum: 1 }
            }}
          ],

          // Today's stats
          todayStats: [
            { $match: { bookingDate: today } },
            { $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              revenue: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } },
              checkIns: { $sum: { $cond: [{ $ne: ['$checkInTime', null] }, 1, 0] } },
              checkOuts: { $sum: { $cond: [{ $ne: ['$checkOutTime', null] }, 1, 0] } },
              confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
            }}
          ],

          // Upcoming bookings (future, non-cancelled)
          upcomingCount: [
            { $match: { bookingDate: { $gt: today }, status: { $nin: ['cancelled', 'rejected'] } } },
            { $count: 'count' }
          ],

          // Revenue by period
          dailyRevenue: [
            { $match: { bookingDate: today, status: { $nin: ['cancelled', 'rejected'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } } } }
          ],
          weeklyRevenue: [
            { $match: { bookingDate: { $gte: weekStart }, status: { $nin: ['cancelled', 'rejected'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } } } }
          ],
          monthlyRevenue: [
            { $match: { bookingDate: { $gte: monthStart }, status: { $nin: ['cancelled', 'rejected'] } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } } } }
          ],

          // Revenue trend (last 7 days)
          revenueTrend: [
            { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
            { $group: { _id: '$bookingDate', revenue: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } }, bookings: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 7 }
          ],

          // Booking trend (last 7 days)
          bookingTrend: [
            { $group: { _id: '$bookingDate', count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 7 }
          ],

          // Peak booking hours
          peakHours: [
            { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
            { $addFields: { hourNum: { $toInt: { $substr: ['$startTime', 0, 2] } } } },
            { $group: { _id: '$hourNum', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ],

          // Most booked amenities (top 5)
          amenityUsage: [
            { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
            { $group: { _id: '$amenityId', count: { $sum: 1 } } },
            { $lookup: { from: 'amenities', localField: '_id', foreignField: '_id', as: 'amenity' } },
            { $unwind: '$amenity' },
            { $project: { name: '$amenity.name', count: 1 } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],

          // Payment status distribution (from bookings)
          paymentStatusDist: [
            { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
          ],

          // Monthly comparison (current vs previous)
          currentMonthBookings: [
            { $match: { bookingDate: { $gte: monthStart } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } } } }
          ],
          previousMonthBookings: [
            { $match: { bookingDate: { $gte: prevMonthStart, $lt: prevMonthEnd } } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$pricingDetails.totalAmount', 0] } } } }
          ],

          // Recent activity (last 15 events)
          recentActivity: [
            { $sort: { updatedAt: -1 } },
            { $limit: 15 },
            { $lookup: { from: 'amenities', localField: 'amenityId', foreignField: '_id', as: 'amenity' } },
            { $unwind: { path: '$amenity', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: {
              status: 1, bookingDate: 1, startTime: 1, endTime: 1, paymentStatus: 1,
              checkInTime: 1, checkOutTime: 1, updatedAt: 1, createdAt: 1,
              'amenity.name': 1, 'user.name': 1
            }}
          ]
        }
      }
    ]);

    return result[0];
  }
}

export default new AmenityBookingRepository();
