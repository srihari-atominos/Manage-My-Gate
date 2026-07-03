import amenityService from '../amenity/amenity.services.js';
import bookingService from '../booking/booking.services.js';
import paymentService from '../payment/payment.service.js';

class AmenityDashboardService {
  async getKpis(orgId) {
    const [amenityStats, maintenanceStats, bookingStats, paymentStats] = await Promise.all([
      amenityService.getAmenityStats(orgId),
      amenityService.getMaintenanceStats(orgId),
      bookingService.getBookingStats(orgId),
      paymentService.getPaymentStats(orgId)
    ]);

    return {
      amenities: {
        ...amenityStats,
        ...maintenanceStats
      },
      bookings: bookingStats,
      payments: paymentStats,
      // Mapping frontend expected properties
      checkIns: bookingStats.todayCheckIns,
      revenue: paymentStats.todayRevenue,
      occupancy: bookingStats.total > 0 ? Math.round((bookingStats.confirmed / bookingStats.total) * 100) : 0,
      activeMaintenance: maintenanceStats.in_progress,
      maintenanceTasks: `${maintenanceStats.in_progress} In Progress, ${maintenanceStats.scheduled} Scheduled`
    };
  }

  async getRevenue(orgId) {
    const trend = await paymentService.getRevenueTrend(orgId);
    return trend;
  }

  async getOccupancy(orgId) {
    const stats = await bookingService.getOccupancyStats(orgId);
    return stats;
  }

  async getTrends(orgId) {
    // For trends, we can return revenue trend and maybe booking trend.
    const revenueTrend = await paymentService.getRevenueTrend(orgId);
    return { revenueTrend };
  }

  async getRecentActivity(orgId) {
    // Aggregate activities from booking and payment
    const [recentBookings, recentPayments] = await Promise.all([
      bookingService.getRecentActivity(orgId, 5),
      paymentService.getRecentActivity(orgId, 5)
    ]);

    const activity = [];
    recentBookings.forEach(b => {
      activity.push({
        id: b._id,
        type: 'booking',
        title: `Booking ${b.bookingStatus}`,
        subtitle: `${b.amenityId?.name || 'Amenity'} • ${b.date ? b.date.toISOString().split('T')[0] : ''}`,
        timestamp: b.updatedAt,
        status: b.bookingStatus
      });
    });

    recentPayments.forEach(p => {
      activity.push({
        id: p._id,
        type: 'payment',
        title: `Payment ${p.status === 'success' ? 'Success' : (p.status === 'failed' ? 'Failed' : 'Pending')}`,
        subtitle: `₹${p.amount} • ${p.referenceType || 'Booking'}`,
        timestamp: p.updatedAt,
        status: p.status
      });
    });

    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activity.slice(0, 10);
  }

  async getCalendarEvents(orgId, dateStr) {
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenities = await amenityService.getAllAmenities(orgId);
    
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const { data: bookings } = await amenityBookingRepository.findByOrgPaginated(orgId, { bookingDate: dateStr }, 0, 1000);
    
    const events = [];

    amenities.forEach(amenity => {
      // Operating Hours (if active and open today)
      if (amenity.status === 'active' && amenity.bookingRules?.openTime && amenity.bookingRules?.closeTime) {
        const targetDate = new Date(dateStr);
        const dayOfWeek = targetDate.getDay();
        if (!amenity.bookingRules?.weeklyOffDays?.includes(dayOfWeek)) {
          events.push({
            id: `op_${amenity._id}_${dateStr}`,
            type: 'operating_hours',
            title: 'Operating Hours',
            subtitle: amenity.name,
            date: dateStr,
            start: amenity.bookingRules.openTime,
            end: amenity.bookingRules.closeTime,
            amenityName: amenity.name,
            status: 'open'
          });
        }
      }

      // Maintenance
      if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
        amenity.maintenanceSchedules.forEach(maint => {
          if (dateStr >= maint.startDate && dateStr <= maint.endDate) {
            events.push({
              id: `maint_${maint._id}`,
              type: 'maintenance',
              title: maint.title || 'Maintenance',
              subtitle: amenity.name,
              date: dateStr,
              start: maint.startTime || '00:00',
              end: maint.endTime || '23:59',
              amenityName: amenity.name,
              status: maint.status || 'in_progress'
            });
          }
        });
      }
    });

    // Bookings
    bookings.forEach(b => {
      events.push({
        id: b._id,
        type: 'booking',
        title: `${b.amenity?.name || 'Amenity'} Booking`,
        subtitle: b.user?.name || 'Resident',
        date: b.bookingDate,
        start: b.startTime,
        end: b.endTime,
        amenityName: b.amenity?.name,
        residentName: b.user?.name,
        status: b.status
      });
    });

    return events;
  }

  async getCalendarIndicators(orgId, year, month) {
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const dates = await amenityBookingRepository.getMonthlyIndicators(orgId, year, month);
    return dates;
  }
}

export default new AmenityDashboardService();
