import amenityBookingRepository from './amenityBooking.repository.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CREATED, AMENITY_BOOKING_REVIEWED, AMENITY_BOOKING_CANCELLED, AMENITY_BOOKING_CHECKED_IN } from './amenityBooking.events.js';
import HttpError from '../../utils/httpError.utils.js';
import paymentService from '../payment/payment.service.js';

export class AmenityBookingService {
  async getBookingsQueue(orgId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const { data, totalRecords } = await amenityBookingRepository.findByOrgPaginated(orgId, filters, skip, limit);
    const totalPages = Math.ceil(totalRecords / limit);
    return {
      data,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }

  async getMyBookings(userId, orgId) {
    return await amenityBookingRepository.findByUser(userId, orgId);
  }

  async createBooking(bookingData) {
    const { orgId, amenityId, userId, bookingDate, startTime, endTime } = bookingData;
    
    // 1 & 2. Tenant and User validation is implicitly handled by auth middlewares or caller
    
    // 3. Amenity Validation
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenity = await amenityService.getAmenityById(amenityId, orgId);
    if (!amenity) throw new HttpError(404, 'Amenity not found');
    
    // 4. Amenity Status Validation
    if (amenity.status !== 'active') {
      throw new HttpError(400, `Cannot book this amenity as its status is ${amenity.status}`);
    }

    const bookingDateTimeStart = new Date(`${bookingDate}T${startTime}`);
    const bookingDateTimeEnd = new Date(`${bookingDate}T${endTime}`);
    const now = new Date();

    if (bookingDateTimeStart < now) {
      throw new HttpError(400, 'Cannot book in the past');
    }

    // 5. Maintenance Validation
    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        const maintStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
        const maintEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
        if (bookingDateTimeStart < maintEnd && bookingDateTimeEnd > maintStart) {
          throw new HttpError(400, 'Amenity is under maintenance during this time slot');
        }
      }
    }

    // 6. Holiday / Weekly Off Validation
    const dayOfWeek = bookingDateTimeStart.getDay();
    if (amenity.bookingRules.weeklyOffDays && amenity.bookingRules.weeklyOffDays.includes(dayOfWeek)) {
      throw new HttpError(400, 'Amenity is closed on this day of the week');
    }

    // 7. Operating Hours Validation
    const openTimeParsed = new Date(`${bookingDate}T${amenity.bookingRules.openTime}`);
    const closeTimeParsed = new Date(`${bookingDate}T${amenity.bookingRules.closeTime}`);
    if (bookingDateTimeStart < openTimeParsed || bookingDateTimeEnd > closeTimeParsed) {
      throw new HttpError(400, `Booking must be within operating hours (${amenity.bookingRules.openTime} to ${amenity.bookingRules.closeTime})`);
    }

    // 9. Existing Booking Validation (max per day)
    const userBookings = await amenityBookingRepository.countUserBookingsOnDate(userId, orgId, bookingDate);
    if (userBookings >= amenity.bookingRules.maxBookingsPerUserPerDay) {
      throw new HttpError(400, `You have reached the maximum number of bookings per day for this amenity.`);
    }

    // 12. Booking Window Validation
    const diffTime = Math.abs(bookingDateTimeStart - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > amenity.bookingRules.advanceBookingDays) {
      throw new HttpError(400, `Cannot book more than ${amenity.bookingRules.advanceBookingDays} days in advance`);
    }

    // 8, 10 & 11. Overlapping Slot, Buffer Time, and Capacity Validation
    const conflicts = await amenityBookingRepository.findConflicts(amenityId, bookingDate, startTime, endTime);
    if (conflicts.length >= amenity.capacity) {
      throw new HttpError(400, 'The amenity is at full capacity for the selected time slot.');
    }
    
    // Validate if the same user has already booked an overlapping slot (duplicate booking)
    const duplicateUserBooking = conflicts.find(b => b.userId.toString() === userId.toString());
    if (duplicateUserBooking) {
      throw new HttpError(400, 'You already have a booking that overlaps with this time slot');
    }

    // 13. Pricing Calculation
    const durationHours = (bookingDateTimeEnd - bookingDateTimeStart) / (1000 * 60 * 60);
    const baseRate = amenity.pricing?.baseRate || amenity.ratePerHour || 0;
    
    // Simulate peak/weekend rules
    let multiplier = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
    }
    const baseAmount = baseRate * durationHours * multiplier;
    const taxAmount = baseAmount * ((amenity.pricing?.taxPercentage || 0) / 100);
    const deposit = amenity.pricing?.securityDeposit || 0;
    const totalAmount = baseAmount + taxAmount + deposit;

    const pricingDetails = {
      baseAmount,
      taxAmount,
      discountAmount: 0,
      securityDeposit: deposit,
      totalAmount,
      refundAmount: 0,
      cancellationCharge: 0
    };

    // 14. Create Pending Booking
    let finalStatus = 'pending';
    let requiresPayment = totalAmount > 0;

    if (!requiresPayment && !amenity.requiresApproval) {
      finalStatus = 'confirmed';
    }

    const newBookingData = {
      ...bookingData,
      status: finalStatus,
      pricingDetails,
      totalPrice: totalAmount,
      deposit
    };

    const booking = await amenityBookingRepository.create(newBookingData);
    
    // 15. Payment Processing (Initialize Mock Provider if required)
    let paymentResult = null;
    if (requiresPayment) {
      paymentResult = await paymentService.initiatePayment({
        orgId,
        userId,
        referenceId: booking._id,
        referenceType: 'AmenityBooking',
        amount: totalAmount
      });

      booking.paymentStatus = 'pending';
      booking.paymentId = paymentResult.paymentId;
      await booking.save();
    }

    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CREATED, booking);
    
    return {
      booking,
      paymentIntent: paymentResult
    };
  }

  async reviewBooking(bookingId, orgId, decision, reviewerId, rejectionReason = '') {
    const validDecisions = ['approved', 'rejected'];
    if (!validDecisions.includes(decision)) {
      throw new HttpError(400, 'Decision must be approved or rejected');
    }

    const booking = await amenityBookingRepository.findById(bookingId, orgId);
    if (!booking) throw new HttpError(404, 'Booking not found');
    if (booking.status !== 'pending') throw new HttpError(400, 'Can only review pending bookings');

    const reviewData = {
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: decision === 'rejected' ? rejectionReason : null
    };

    const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, decision, reviewData);
    amenityBookingEventEmitter.emit(AMENITY_BOOKING_REVIEWED, updated);
    return updated;
  }

  async cancelBooking(bookingId, userId, orgId) {
    const booking = await amenityBookingRepository.findById(bookingId, orgId);
    if (!booking) throw new HttpError(404, 'Booking not found');
    
    if (booking.userId.toString() !== userId.toString()) {
      throw new HttpError(403, 'You can only cancel your own bookings');
    }
    
    if (['rejected', 'cancelled', 'checked-in', 'completed'].includes(booking.status)) {
      throw new HttpError(400, 'Booking cannot be cancelled in its current state');
    }

    // Process Refund logic if payment was success
    if (booking.paymentStatus === 'success' && booking.paymentId) {
      await paymentService.processRefund(booking.paymentId, booking.pricingDetails.totalAmount);
      booking.paymentStatus = 'refunded';
    }

    const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, 'cancelled');
    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CANCELLED, updated);
    return updated;
  }

  async hasPendingOrApprovedFutureBookings(amenityId, orgId) {
    const active = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    return active.length > 0;
  }

  async getKpiStats(orgId) { return await amenityBookingRepository.getKpiStats(orgId); }
  async getRevenueStats(orgId) { return await amenityBookingRepository.getRevenueStats(orgId); }
  async getOccupancyStats(orgId) { return await amenityBookingRepository.getOccupancyStats(orgId); }
  async getTrendsStats(orgId) { return await amenityBookingRepository.getTrendsStats(orgId); }
  async getRecentActivity(orgId) { return await amenityBookingRepository.getRecentActivity(orgId); }

  async checkInBooking(bookingId, orgId, userId) {
    const booking = await amenityBookingRepository.findById(bookingId, orgId);
    if (!booking) throw new HttpError(404, 'Booking not found');
    
    if (booking.userId.toString() !== userId.toString()) {
      throw new HttpError(403, 'You do not have permission to check-in this booking');
    }

    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      throw new HttpError(400, 'Cannot check in a cancelled or rejected booking');
    }
    if (booking.status === 'checked-in' || booking.status === 'completed') {
      throw new HttpError(400, 'Booking has already been checked in or completed');
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (booking.bookingDate !== today) {
      throw new HttpError(400, 'You can only check in on the day of the booking');
    }

    const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, 'checked-in');
    updated.checkInTime = new Date();
    await updated.save();

    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CHECKED_IN, updated);
    return updated;
  }
}

export default new AmenityBookingService();
