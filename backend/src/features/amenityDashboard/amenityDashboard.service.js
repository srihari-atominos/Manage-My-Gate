import amenityService from '../amenity/amenity.services.js';
import amenityBookingService from '../amenityBooking/amenityBooking.services.js';
import paymentService from '../payment/payment.service.js';
import amenityReservationService from '../amenityManagement/reservations/amenityReservation.service.js';
import amenityMaintenanceBlockService from '../amenityManagement/maintenance/amenityMaintenanceBlock.service.js';

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

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

  async getCalendarEvents(orgId, startDate, endDate, filters = {}) {
    const facilityId = filters.facilityId || filters.amenityId;
    const resourceId = filters.resourceId;

    // Fetch V2 reservations, V2 maintenance blocks, and V1 bookings concurrently
    const [v2Reservations, v2MaintenanceBlocks, v1Bookings] = await Promise.all([
      amenityReservationService.findEventsForCalendar({
        orgId,
        startDate,
        endDate,
        facilityId,
        resourceId,
        bookingStatus: filters.status,
        paymentStatus: filters.paymentStatus,
      }).catch(err => {
        console.error('[AmenityDashboardService] Error fetching V2 reservations:', err.message);
        return [];
      }),
      amenityMaintenanceBlockService.findBlocksForCalendar({
        orgId,
        startDate,
        endDate,
        facilityId,
        resourceId,
        status: filters.status,
      }).catch(err => {
        console.error('[AmenityDashboardService] Error fetching V2 maintenance blocks:', err.message);
        return [];
      }),
      amenityBookingService.findEventsForCalendar(orgId, startDate, endDate, {
        facilityId,
        status: filters.status,
        paymentStatus: filters.paymentStatus,
      }).catch(err => {
        console.error('[AmenityDashboardService] Error fetching V1 bookings:', err.message);
        return [];
      }),
    ]);

    const events = [];

    // 1. Process V2 Reservations
    (v2Reservations || []).forEach((res) => {
      const startDateTime = new Date(res.effectiveStartDateTime || res.requestedStartDateTime);
      const endDateTime = new Date(res.effectiveEndDateTime || res.requestedEndDateTime);
      const durationMins = Math.max(0, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000));

      const totalAmount = res.pricingSnapshot?.totalAmount ?? res.totalAmount ?? 0;
      const paidAmount = res.paidAmount ?? (res.paymentStatus === 'PAID' ? totalAmount : 0);

      let paymentStatus = 'PENDING';
      if (res.paymentStatus === 'NOT_REQUIRED' || res.paymentStatus === 'NOT_APPLICABLE' || totalAmount === 0) {
        paymentStatus = 'NOT_REQUIRED';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = 'PARTIALLY_PAID';
      } else if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (res.paymentStatus === 'REFUNDED') {
        paymentStatus = 'REFUNDED';
      } else {
        paymentStatus = res.paymentStatus || 'PENDING';
      }

      let operationalStatus = 'CONFIRMED';
      if (res.bookingStatus === 'CANCELLED') {
        operationalStatus = 'CANCELLED';
      } else if (res.accessStatus === 'CHECKED_IN') {
        operationalStatus = 'CHECKED_IN';
      } else if (res.completionStatus === 'COMPLETED') {
        operationalStatus = 'COMPLETED';
      } else if (res.bookingStatus) {
        operationalStatus = res.bookingStatus;
      }

      events.push({
        id: String(res._id),
        bookingId: res.reservationNumber || String(res._id),
        reservationNumber: res.reservationNumber,
        type: 'booking',
        title: `${res.facilityId?.name || 'Amenity'}${res.resourceId?.name ? ' - ' + res.resourceId.name : ''}`,
        subtitle: res.residentId?.name || res.residentId?.username || 'Resident',
        date: formatDate(startDateTime),
        start: formatTime(startDateTime),
        end: formatTime(endDateTime),
        startDateTime,
        endDateTime,
        duration: durationMins,

        amenityId: res.facilityId?._id ? String(res.facilityId._id) : String(res.facilityId || ''),
        amenityName: res.facilityId?.name || 'Amenity',
        amenityImage: res.facilityId?.images?.[0] || null,
        resourceId: res.resourceId?._id ? String(res.resourceId._id) : (res.resourceId ? String(res.resourceId) : null),
        resourceName: res.resourceId?.name || null,
        numberOfPersons: res.headcount || res.quantity || 1,

        residentId: res.residentId?._id ? String(res.residentId._id) : null,
        residentName: res.residentId?.name || res.residentId?.username || 'Resident',
        residentPhoto: res.residentId?.profilePicture || null,
        flatNumber: res.residentId?.flatNumber || res.unitId?.unitNumber || res.unitId?.villaNumber || '',
        building: res.residentId?.building || res.unitId?.block || '',
        tower: res.residentId?.tower || '',
        phoneNumber: res.residentId?.phoneNumber || '',

        status: operationalStatus,
        paymentStatus,
        paymentMethod: res.paymentMethod || null,
        bookingAmount: totalAmount,
        paidAmount,
        remainingAmount: Math.max(0, totalAmount - paidAmount),
        depositAmount: res.pricingSnapshot?.depositAmount ?? res.depositAmount ?? 0,
        pricingDetails: {
          totalAmount,
          paidAmount,
          remainingAmount: Math.max(0, totalAmount - paidAmount),
          depositAmount: res.pricingSnapshot?.depositAmount ?? res.depositAmount ?? 0,
        },

        qrStatus: res.accessStatus === 'PASS_GENERATED' ? 'active' : (res.accessStatus || 'pending'),
        checkInStatus: res.accessStatus === 'CHECKED_IN' ? 'entered' : (res.accessStatus === 'CHECKED_OUT' ? 'exited' : 'pending'),
        checkInTime: res.checkedInAt || null,
        checkOutTime: res.checkedOutAt || null,
        cancellationReason: res.cancellationReason || null,
        version: 'v2',
      });
    });

    // 2. Process V2 Maintenance Blocks
    (v2MaintenanceBlocks || []).forEach((block) => {
      const startDateTime = new Date(block.startDateTime);
      const endDateTime = new Date(block.endDateTime);
      const durationMins = Math.max(0, Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000));

      events.push({
        id: `maint_${block._id}`,
        bookingId: String(block._id),
        type: 'maintenance',
        title: `${block.facilityId?.name || 'Amenity'}: ${block.title}`,
        subtitle: `${block.maintenanceType || 'MAINTENANCE'} • ${block.isCompleteClosure ? 'Full Closure' : 'Partial Closure'}`,
        date: formatDate(startDateTime),
        startDate: formatDate(startDateTime),
        endDate: formatDate(endDateTime),
        start: formatTime(startDateTime),
        end: formatTime(endDateTime),
        startDateTime,
        endDateTime,
        duration: durationMins > 0 ? durationMins : 1440,

        amenityId: block.facilityId?._id ? String(block.facilityId._id) : String(block.facilityId || ''),
        amenityName: block.facilityId?.name || 'Amenity',
        amenityImage: block.facilityId?.images?.[0] || null,
        resourceId: block.resourceId?._id ? String(block.resourceId._id) : (block.resourceId ? String(block.resourceId) : null),
        resourceName: block.resourceId?.name || null,
        resourceIds: block.resourceIds || [],

        status: block.status || 'SCHEDULED',
        isCompleteClosure: block.isCompleteClosure !== false,
        isEmergency: Boolean(block.isEmergency),
        reason: block.reason || '',
        notes: block.internalNotes || '',
        bufferBeforeMinutes: block.bufferBeforeMinutes || 0,
        bufferAfterMinutes: block.bufferAfterMinutes || 0,
        version: 'v2',
      });
    });

    // 3. Process Legacy V1 Bookings (with deduplication against V2)
    (v1Bookings || []).forEach((b) => {
      const bDate = b.bookingDate;
      const bStart = b.startTime;
      const bAmenityId = String(b.amenityId?._id || b.amenityId || '');
      const bUserId = String(b.userId?._id || b.userId || '');

      // Check if this V1 booking is already present in V2 reservations
      const isDuplicate = (v2Reservations || []).some((v2) => {
        const v2AmenityId = String(v2.facilityId?._id || v2.facilityId || '');
        const v2Date = formatDate(v2.effectiveStartDateTime || v2.requestedStartDateTime);
        const v2Start = formatTime(v2.effectiveStartDateTime || v2.requestedStartDateTime);
        const v2ResidentId = String(v2.residentId?._id || v2.residentId || '');
        return v2AmenityId === bAmenityId && v2Date === bDate && v2Start === bStart && v2ResidentId === bUserId;
      });

      if (isDuplicate) return;

      const startDateTime = new Date(`${b.bookingDate}T${b.startTime}:00.000Z`);
      const endDateTime = new Date(`${b.bookingDate}T${b.endTime}:00.000Z`);
      const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);

      const totalAmount = b.pricingDetails?.totalAmount || b.totalPrice || 0;
      const isV1Paid = ['paid', 'captured', 'success'].includes(b.paymentStatus);
      const paidAmount = b.pricingDetails?.paidAmount || (isV1Paid ? totalAmount : 0);

      let paymentStatus = 'PENDING';
      if (b.paymentStatus === 'not_required' || totalAmount === 0) {
        paymentStatus = 'NOT_REQUIRED';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = 'PARTIALLY_PAID';
      } else if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (b.paymentStatus === 'refunded') {
        paymentStatus = 'REFUNDED';
      } else {
        paymentStatus = (b.paymentStatus || 'PENDING').toUpperCase();
      }

      let operationalStatus = (b.status || 'CONFIRMED').toUpperCase();
      if (operationalStatus === 'APPROVED') operationalStatus = 'CONFIRMED';
      if (operationalStatus === 'CHECKED-IN') operationalStatus = 'CHECKED_IN';

      events.push({
        id: String(b._id),
        bookingId: b.bookingId || String(b._id),
        type: 'booking',
        title: `${b.amenityId?.name || 'Amenity'} Booking`,
        subtitle: b.userId?.name || b.userId?.username || 'Resident',
        date: b.bookingDate,
        start: b.startTime,
        end: b.endTime,
        startDateTime,
        endDateTime,
        duration: durationMins > 0 ? durationMins : 60,

        amenityId: b.amenityId?._id ? String(b.amenityId._id) : String(b.amenityId || ''),
        amenityName: b.amenityId?.name,
        amenityImage: b.amenityId?.images?.[0] || null,
        numberOfPersons: b.numberOfPersons || 1,

        residentId: b.userId?._id ? String(b.userId._id) : null,
        residentName: b.userId?.name || b.userId?.username,
        residentPhoto: b.userId?.profilePicture,
        flatNumber: b.userId?.flatNumber,
        building: b.userId?.building,
        tower: b.userId?.tower,
        phoneNumber: b.userId?.phoneNumber,

        status: operationalStatus,
        paymentStatus,
        paymentMethod: b.paymentMethod,
        bookingAmount: totalAmount,
        paidAmount,
        remainingAmount: Math.max(0, totalAmount - paidAmount),
        refundAmount: b.refundAmount || 0,
        pricingDetails: {
          totalAmount,
          paidAmount,
          remainingAmount: Math.max(0, totalAmount - paidAmount),
        },

        qrStatus: b.qrStatus,
        checkInStatus: b.status === 'checked-in' || b.status === 'completed' ? 'entered' : 'pending',
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        cancellationReason: b.cancellationReason,
        version: 'v1',
      });
    });

    // 4. In-memory filter for search if provided
    let filteredEvents = events;
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filteredEvents = filteredEvents.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const subtitle = (e.subtitle || '').toLowerCase();
        const resName = (e.residentName || '').toLowerCase();
        const flat = (e.flatNumber || '').toLowerCase();
        const bId = (e.bookingId || '').toLowerCase();
        return title.includes(q) || subtitle.includes(q) || resName.includes(q) || flat.includes(q) || bId.includes(q);
      });
    }

    // 5. Chronological sort
    filteredEvents.sort((a, b) => {
      const aTime = a.startDateTime ? new Date(a.startDateTime).getTime() : new Date(`${a.date}T${a.start || '00:00'}`).getTime();
      const bTime = b.startDateTime ? new Date(b.startDateTime).getTime() : new Date(`${b.date}T${b.start || '00:00'}`).getTime();
      return aTime - bTime;
    });

    return filteredEvents;
  }

  async getCalendarIndicators(orgId, year, month) {
    return await amenityBookingService.getCalendarIndicators(orgId, year, month);
  }
}

export default new AmenityDashboardService();
