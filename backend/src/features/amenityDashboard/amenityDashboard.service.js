import amenityService from '../amenity/amenity.services.js';
import amenityBookingService from '../amenityBooking/amenityBooking.services.js';
import paymentService from '../payment/payment.service.js';

class AmenityDashboardService {
  async getKpis(orgId) {
    const [amenityStats, maintenanceStats, bookingStats] = await Promise.all([
      amenityService.getAmenityStats(orgId),
      amenityService.getMaintenanceStats(orgId),
      amenityBookingService.getKpiStats(orgId)
    ]);

    // calculate occupancy based on check-ins over today's total bookings
    const occupancy = bookingStats.totalBookings > 0
      ? Math.round((bookingStats.checkIns / bookingStats.totalBookings) * 100)
      : 0;

    return {
      checkIns: bookingStats.checkIns || 0,
      revenue: bookingStats.revenue || 0,
      occupancy,
      activeMaintenance: maintenanceStats.in_progress || 0,
      maintenanceTasks: `${maintenanceStats.in_progress || 0} In Progress, ${maintenanceStats.scheduled || 0} Scheduled`
    };
  }

  async getRevenue(orgId) {
    const trend = await paymentService.getRevenueTrend(orgId);
    return trend;
  }

  async getOccupancy(orgId) {
    return await amenityBookingService.getOccupancyStats(orgId);
  }

  async getTrends(orgId) {
    // Returns popular amenities array directly
    return await amenityBookingService.getTrendsStats(orgId);
  }

  async getRecentActivity(orgId) {
    const [recentBookings, recentPayments] = await Promise.all([
      amenityBookingService.getRecentActivity(orgId),
      paymentService.getRecentActivity(orgId, 5)
    ]);

    const activity = [];
    (recentBookings || []).forEach(b => {
      activity.push({
        id: b._id,
        type: 'booking',
        title: `Booking ${b.status}`,
        subtitle: `${b.amenityId?.name || 'Amenity'} • ${b.bookingDate || ''}`,
        timestamp: b.updatedAt,
        status: b.status
      });
    });

    (recentPayments || []).forEach(p => {
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
    const amenities = await amenityService.getAllAmenities(orgId);
    const { data: bookings } = await amenityBookingService.getBookingsQueue(orgId, 1, 1000, { bookingDate: dateStr });
    
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
    (bookings || []).forEach(b => {
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
    return await amenityBookingService.getCalendarIndicators(orgId, year, month);
  }
}

export default new AmenityDashboardService();
