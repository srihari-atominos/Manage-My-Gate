import SecurityLog from './securityLog.model.js';
import mongoose from 'mongoose';

class SecurityLogRepository {
  async createLog(logData) {
    const log = new SecurityLog(logData);
    return await log.save();
  }

  async getLogs(orgId, filters = {}, skip = 0, limit = 20) {
    const query = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (filters.search) {
      query.$or = [
        { bookingReference: { $regex: filters.search, $options: 'i' } },
        { residentName: { $regex: filters.search, $options: 'i' } },
        { amenityName: { $regex: filters.search, $options: 'i' } },
        { guardName: { $regex: filters.search, $options: 'i' } }
      ];
      // Note: Full searching across joined collections (like phone number in User) would require aggregation.
      // We stored most searchable fields directly on the log for faster querying.
    }

    if (filters.status) query.status = filters.status;
    if (filters.scanType) query.scanType = filters.scanType;
    if (filters.amenityId) query.amenityId = new mongoose.Types.ObjectId(filters.amenityId);
    if (filters.checkedInBy) query.checkedInBy = new mongoose.Types.ObjectId(filters.checkedInBy);
    
    if (filters.dateRange) {
      const now = new Date();
      let startDate = new Date();
      if (filters.dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (filters.dateRange === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        query.scanTime = { $gte: startDate, $lte: endDate };
      } else if (filters.dateRange === '7days') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (filters.dateRange === '30days') {
        startDate.setDate(startDate.getDate() - 30);
      }
      
      if (filters.dateRange !== 'yesterday' && filters.dateRange !== 'custom') {
        query.scanTime = { $gte: startDate };
      }
      
      if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
        query.scanTime = { 
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }
    }

    const total = await SecurityLog.countDocuments(query);
    const logs = await SecurityLog.find(query)
      .sort({ scanTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return { total, logs };
  }

  async getDashboardStats(orgId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await SecurityLog.aggregate([
      { 
        $match: { 
          orgId: new mongoose.Types.ObjectId(orgId),
          scanTime: { $gte: today } 
        } 
      },
      {
        $group: {
          _id: '$scanType',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      entries: 0,
      exits: 0,
      denied: 0,
      manualVerifications: 0,
      cancelled: 0,
      refunds: 0,
      qrExpired: 0
    };

    stats.forEach(stat => {
      switch(stat._id) {
        case 'Entry': result.entries = stat.count; break;
        case 'Exit': result.exits = stat.count; break;
        case 'Denied': result.denied = stat.count; break;
        case 'Manual Verification': result.manualVerifications = stat.count; break;
        case 'Booking Cancelled': result.cancelled = stat.count; break;
        case 'Refund': result.refunds = stat.count; break;
        case 'QR Expired': result.qrExpired = stat.count; break;
      }
    });
    
    // Active visitors are basically count of entries minus exits today, or we can fetch bookings with status checked-in.
    // In our system, a booking status of checked-in indicates active. Let's rely on booking table or simple diff.
    return result;
  }
}

export default new SecurityLogRepository();
