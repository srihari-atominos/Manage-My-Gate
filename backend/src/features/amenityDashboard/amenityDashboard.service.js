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

  async getCalendarEvents(orgId, startDate, endDate) {
    const amenities = await amenityService.getAllAmenities(orgId);
    
    // Pass startDate and endDate directly to repository to get all events in range without pagination
    // Because we just added findEventsForCalendar
    let bookings = [];
    if (amenityBookingService.findEventsForCalendar) {
      bookings = await amenityBookingService.findEventsForCalendar(orgId, startDate, endDate);
    } else {
      // Direct repo call if service method isn't mapped
      const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
      bookings = await amenityBookingRepository.findEventsForCalendar(orgId, startDate, endDate);
    }
    
    const events = [];

    // Bookings
    (bookings || []).forEach(b => {
      // Calculate duration in minutes if needed, or we just pass start/end
      const startDateTime = new Date(`${b.bookingDate}T${b.startTime}`);
      const endDateTime = new Date(`${b.bookingDate}T${b.endTime}`);
      const durationMins = (endDateTime - startDateTime) / (1000 * 60);

      events.push({
        id: b._id,
        bookingId: b.bookingId || b._id,
        type: 'booking',
        title: `${b.amenityId?.name || 'Amenity'} Booking`,
        subtitle: b.userId?.name || 'Resident',
        date: b.bookingDate,
        start: b.startTime,
        end: b.endTime,
        duration: durationMins,
        
        // Amenity info
        amenityId: b.amenityId?._id,
        amenityName: b.amenityId?.name,
        amenityImage: b.amenityId?.images?.[0] || null,
        numberOfPersons: b.numberOfPersons || 1,
        
        // Resident info
        residentId: b.userId?._id,
        residentName: b.userId?.name,
        residentPhoto: b.userId?.profilePicture,
        flatNumber: b.userId?.flatNumber,
        building: b.userId?.building,
        tower: b.userId?.tower,
        phoneNumber: b.userId?.phoneNumber,
        
        // Booking & Payment Info
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        bookingAmount: b.pricingDetails?.totalAmount || b.totalPrice || 0,
        refundAmount: b.refundAmount || 0,
        
        // Security Info
        qrStatus: b.qrStatus,
        checkInStatus: b.status === 'checked-in' || b.status === 'completed' ? 'entered' : 'pending',
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime
      });
    });

    return events;
  }

  async getCalendarIndicators(orgId, year, month) {
    return await amenityBookingService.getCalendarIndicators(orgId, year, month);
  }
}

export default new AmenityDashboardService();
