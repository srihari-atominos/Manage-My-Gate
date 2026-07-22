import amenityBookingRepository from './amenityBooking.repository.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CREATED, AMENITY_BOOKING_REVIEWED, AMENITY_BOOKING_CANCELLED, AMENITY_BOOKING_CHECKED_IN, AMENITY_BOOKING_DENIED } from './amenityBooking.events.js';
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

  async getMyBookings(userId, orgId, filters = {}) {
    return await amenityBookingRepository.findByUser(userId, orgId, filters);
  }

  async findEventsForCalendar(orgId, startDate, endDate) {
    return await amenityBookingRepository.findEventsForCalendar(orgId, startDate, endDate);
  }

  async getAggregatedCalendarBookings(orgId, startDate, endDate) {
    return await amenityBookingRepository.getAggregatedCalendarBookings(orgId, startDate, endDate);
  }

  async getActivePasses(userId, orgId) {
    const activeBookings = await amenityBookingRepository.getActivePasses(userId, orgId);
    
    // Lazy expiration logic
    const now = new Date();
    const validPasses = [];
    
    for (const booking of activeBookings) {
      if (booking.bookingDate && booking.endTime) {
        const bookingEnd = new Date(`${booking.bookingDate}T${booking.endTime}`);
        if (now > bookingEnd) {
          // Expire it
          await amenityBookingRepository.updateStatus(booking._id, orgId, booking.status, { qrStatus: 'expired' });
          continue; // skip returning it
        }
      }
      validPasses.push(booking);
    }
    
    return validPasses;
  }

  async createBooking(bookingData) {
    const mongoose = (await import('mongoose')).default;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orgId, amenityId, userId, bookingDate, startTime, endTime } = bookingData;
      
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

      // 12. Booking Window Validation
      const diffTime = Math.abs(bookingDateTimeStart - now);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > amenity.bookingRules.advanceBookingDays) {
        throw new HttpError(400, `Cannot book more than ${amenity.bookingRules.advanceBookingDays} days in advance`);
      }

      // 8, 10 & 11. Overlapping Slot, Buffer Time, and Capacity Validation
      const conflicts = await amenityBookingRepository.findConflicts(orgId, amenityId, bookingDate, startTime, endTime);
      const currentlyBookedSpots = conflicts.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
      const requestedSpots = parseInt(bookingData.numberOfPersons || 1, 10);
      const remainingCapacity = amenity.capacity - currentlyBookedSpots;
      if (requestedSpots > remainingCapacity) {
        if (remainingCapacity <= 0) {
          throw new HttpError(400, 'The amenity is at full capacity for the selected time slot.');
        } else {
          throw new HttpError(400, `The amenity remaining capacity for the selected time slot is ${remainingCapacity}.`);
        }
      }
      
      // Validate if the same user has already booked an overlapping slot (duplicate booking)
      const overlappingOtherSlot = conflicts.find(b => 
        b.userId.toString() === userId.toString() && 
        (b.startTime !== startTime || b.endTime !== endTime)
      );
      if (overlappingOtherSlot) {
        throw new HttpError(400, 'You already have a booking that overlaps with this time slot');
      }

      // 13. Pricing Calculation
      const pricingDetails = bookingData.pricingDetails || this._calculatePricing(amenity, bookingDateTimeStart, bookingDateTimeEnd, bookingData.numberOfPersons || 1);
      const totalAmount = pricingDetails.totalAmount;
      const deposit = pricingDetails.securityDeposit;

      // 14. Create Pending Booking
      let finalStatus = 'pending';
      let requiresPayment = totalAmount > 0;

      if (!requiresPayment) {
        finalStatus = 'confirmed';
      }

      const newBookingData = {
        ...bookingData,
        status: finalStatus,
        paymentStatus: requiresPayment ? 'pending' : 'success',
        pricingDetails,
        totalPrice: totalAmount,
        deposit
      };

      const booking = await amenityBookingRepository.create(newBookingData, session);
      
      let paymentResult = null;
      if (requiresPayment) {
        paymentResult = await paymentService.createPaymentOrder({
          orgId,
          userId,
          referenceId: booking._id,
          referenceType: 'AmenityBooking',
          amount: totalAmount,
          currency: 'INR'
        }, session);

        booking.paymentStatus = 'pending';
        booking.paymentId = paymentResult.paymentId;
        await booking.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      amenityBookingEventEmitter.emit(AMENITY_BOOKING_CREATED, booking);
      
      return {
        booking,
        paymentIntent: paymentResult
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async generateAccessQRCode(bookingId, session = null) {
    const AmenityBooking = (await import('./amenityBooking.model.js')).default;
    const booking = await AmenityBooking.findById(bookingId).session(session);
    if (!booking) {
      const HttpError = (await import('../../utils/httpError.utils.js')).default;
      throw new HttpError(404, 'Booking not found');
    }
    const QRCode = (await import('qrcode')).default;
    const bookingIdStr = booking.bookingId || `BKG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const qrData = JSON.stringify({
      bookingId: booking._id,
      displayId: bookingIdStr,
      userId: booking.userId,
      amenityId: booking.amenityId?._id || booking.amenityId
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    return { qrCodeUrl, bookingIdStr };
  }

  async settleBookingPayment(bookingId, paymentData, session) {
    const AmenityBooking = (await import('./amenityBooking.model.js')).default;
    const booking = await AmenityBooking.findById(bookingId).session(session);
    if (!booking) {
      const HttpError = (await import('../../utils/httpError.utils.js')).default;
      throw new HttpError(404, 'Booking not found');
    }

    if (booking.paymentStatus === 'success') {
      return booking;
    }

    const { qrCodeUrl, bookingIdStr } = await this.generateAccessQRCode(booking._id, session);
    const qrExpiresAt = new Date(`${booking.bookingDate}T${booking.endTime}`);

    // Robust extraction: support both standard paymentData object and raw Razorpay payload
    const paymentEntity = paymentData?.payment?.entity || paymentData?.order?.entity || {};
    const gatewayTransactionId = paymentData.gatewayTransactionId || paymentEntity.id || paymentData.id || 'unknown_txn';
    const paymentMethod = paymentData.paymentMethod || paymentEntity.method || paymentData.method || 'RAZORPAY';

    booking.paymentStatus = 'success';
    booking.status = 'confirmed';
    booking.paymentId = gatewayTransactionId;
    booking.paymentMethod = paymentMethod;
    booking.qrCode = qrCodeUrl;
    booking.qrStatus = 'active';
    booking.qrGeneratedAt = new Date();
    booking.qrExpiresAt = qrExpiresAt;
    if (!booking.bookingId) {
      booking.bookingId = bookingIdStr;
    }

    await booking.save({ session });
    return booking;
  }

  _calculatePricing(amenity, startDateTime, endDateTime, numberOfPersons = 1) {
    const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
    const baseRate = amenity.pricing?.baseRate || amenity.ratePerHour || 0;
    
    const dayOfWeek = startDateTime.getDay();
    let multiplier = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
    }
    
    const baseAmount = baseRate * durationHours * multiplier * numberOfPersons;
    const taxAmount = baseAmount * ((amenity.pricing?.taxPercentage || 0) / 100);
    const securityDeposit = amenity.pricing?.securityDeposit || 0;
    const totalAmount = baseAmount + taxAmount + securityDeposit;

    return {
      baseAmount,
      taxAmount,
      discountAmount: 0,
      securityDeposit,
      totalAmount,
      refundAmount: 0,
      cancellationCharge: 0
    };
  }

  async createManualBooking(bookingData) {
    const { orgId, amenityId, userId, bookingDate, startTime, endTime, paymentStatus = 'success' } = bookingData;
    
    // Resident membership check
    const userService = (await import('../user/user.services.js')).default;
    const user = await userService.getUserById(userId);
    if (!user || user.orgId.toString() !== orgId.toString()) {
      throw new HttpError(400, 'Resident not found in this organization');
    }
    
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenity = await amenityService.getAmenityById(amenityId, orgId);
    if (!amenity) throw new HttpError(404, 'Amenity not found');
    
    const bookingDateTimeStart = new Date(`${bookingDate}T${startTime}`);
    const bookingDateTimeEnd = new Date(`${bookingDate}T${endTime}`);
    
    // Amenity availability check
    const conflicts = await amenityBookingRepository.findConflicts(orgId, amenityId, bookingDate, startTime, endTime);
    const currentlyBookedSpots = conflicts.reduce((sum, b) => sum + (b.numberOfPersons || 1), 0);
    const requestedSpots = parseInt(bookingData.numberOfPersons || 1, 10);
    const remainingCapacity = amenity.capacity - currentlyBookedSpots;
    
    if (requestedSpots > remainingCapacity) {
      if (remainingCapacity <= 0) {
        throw new HttpError(400, 'The amenity is at full capacity for the selected time slot.');
      } else {
        throw new HttpError(400, `The amenity remaining capacity for the selected time slot is ${remainingCapacity}.`);
      }
    }
    
    const pricingDetails = this._calculatePricing(amenity, bookingDateTimeStart, bookingDateTimeEnd, bookingData.numberOfPersons || 1);
    
    const newBookingData = {
      ...bookingData,
      status: 'confirmed',
      paymentStatus: paymentStatus,
      pricingDetails,
      totalPrice: pricingDetails.totalAmount,
      deposit: pricingDetails.securityDeposit,
      isManual: true
    };

    const booking = await amenityBookingRepository.create(newBookingData);
    
    // Generate QR automatically since it's confirmed
    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CREATED, booking);
    
    return booking;
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

  async cancelBooking(bookingId, userId, orgId, reason = '', isAdmin = false) {
    const booking = await amenityBookingRepository.findById(bookingId, orgId);
    if (!booking) throw new HttpError(404, 'Booking not found');
    
    if (!isAdmin && booking.userId.toString() !== userId.toString()) {
      throw new HttpError(403, 'You can only cancel your own bookings');
    }
    
    if (['rejected', 'cancelled', 'checked-in', 'completed'].includes(booking.status)) {
      throw new HttpError(400, 'Booking cannot be cancelled in its current state');
    }

    // 1. Load the Amenity bookingRules
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenity = await amenityService.getAmenityById(booking.amenityId, orgId);
    
    let refundPercentage = 100; // default to full refund if no rules
    let refundAmount = booking.pricingDetails?.totalAmount || booking.totalPrice || 0;

    // 2. Read cancellationRefundRules
    if (amenity?.bookingRules?.isCancellationEnabled && amenity.bookingRules.cancellationRefundRules?.length > 0) {
      const rules = [...amenity.bookingRules.cancellationRefundRules].sort((a, b) => b.cancelBeforeHours - a.cancelBeforeHours);
      
      const bookingStartDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const now = new Date();
      const remainingHours = (bookingStartDateTime - now) / (1000 * 60 * 60);

      // Find the applicable rule
      const applicableRule = rules.find(rule => remainingHours >= rule.cancelBeforeHours);
      
      if (applicableRule) {
        refundPercentage = applicableRule.refundPercentage;
      } else {
        // If remaining hours is less than the smallest rule, refund is 0%
        refundPercentage = 0;
      }
      
      refundAmount = (refundAmount * refundPercentage) / 100;
    }

    // 3. Process Refund logic if payment was success
    let newPaymentStatus = booking.paymentStatus;
    if (booking.paymentStatus === 'success' && booking.paymentId) {
      const paymentService = (await import('../payment/payment.service.js')).default;
      if (refundAmount > 0) {
        await paymentService.processRefund(booking.paymentId, refundAmount);
        newPaymentStatus = refundPercentage === 100 ? 'refunded' : 'partial_refund';
      }
      // If refundAmount is 0, we do not call processRefund, but we update the paymentStatus manually
      if (refundAmount === 0) {
        newPaymentStatus = 'success'; // Kept as success, or maybe 'no_refund' ? Wait, the requirement says "Payment Status Updated".
      }
    }

    const cancelUpdateData = {
      status: 'cancelled',
      paymentStatus: newPaymentStatus,
      qrStatus: 'expired',
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: userId,
      refundPercentage,
      refundAmount
    };

    const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, 'cancelled', cancelUpdateData);
    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CANCELLED, updated);
    return updated;
  }

  async hasPendingOrApprovedFutureBookings(amenityId, orgId) {
    const active = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    return active.length > 0;
  }

  async getBookingById(bookingId, orgId) { return await amenityBookingRepository.findById(bookingId, orgId); }
  async getKpiStats(orgId) { return await amenityBookingRepository.getKpiStats(orgId); }
  async getRevenueStats(orgId) { return await amenityBookingRepository.getRevenueStats(orgId); }
  async getOccupancyStats(orgId) { return await amenityBookingRepository.getOccupancyStats(orgId); }
  async getTrendsStats(orgId) { return await amenityBookingRepository.getTrendsStats(orgId); }
  async getRecentActivity(orgId) { return await amenityBookingRepository.getRecentActivity(orgId); }

  /**
   * Consolidated dashboard aggregation.
   * Calls: own repository for booking metrics, amenityService for amenity counts, Payment model for payment stats.
   * Returns a single DTO with all dashboard data.
   */
  async getDashboardData(orgId) {
    // 1. Get all booking metrics in one $facet pipeline
    const bookingAgg = await amenityBookingRepository.getDashboardAggregation(orgId);

    // 2. Get amenity counts by status (cross-feature service call)
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const allAmenities = await amenityService.getAllAmenities(orgId);
    
    const amenityKpis = {
      totalAmenities: allAmenities.length,
      activeAmenities: allAmenities.filter(a => a.status === 'active').length,
      inactiveAmenities: allAmenities.filter(a => a.status === 'inactive').length,
      underMaintenance: allAmenities.filter(a => a.status === 'maintenance').length,
    };

    // 3. Maintenance summary from amenity data
    const maintenanceSummary = [];
    for (const amenity of allAmenities) {
      if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
        for (const maint of amenity.maintenanceSchedules) {
          if (['scheduled', 'in_progress'].includes(maint.status)) {
            maintenanceSummary.push({
              amenityName: amenity.name,
              title: maint.title,
              description: maint.description,
              startDate: maint.startDate,
              endDate: maint.endDate,
              status: maint.status
            });
          }
        }
      }
    }

    // 4. Payment stats from Payment model (single aggregation)
    const Payment = (await import('../payment/payment.model.js')).default;
    const mongoose = (await import('mongoose')).default;
    const paymentAgg = await Payment.aggregate([
      { $match: { orgId: new mongoose.Types.ObjectId(orgId) } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }}
    ]);

    const paymentStats = { pending: 0, success: 0, failed: 0, refunded: 0 };
    const paymentAmounts = { pending: 0, success: 0, failed: 0, refunded: 0 };
    for (const p of paymentAgg) {
      if (paymentStats.hasOwnProperty(p._id)) {
        paymentStats[p._id] = p.count;
        paymentAmounts[p._id] = p.total;
      }
    }

    // 5. Flatten booking status counts
    const statusMap = {};
    for (const s of (bookingAgg.statusCounts || [])) {
      statusMap[s._id] = s.count;
    }

    const todayData = bookingAgg.todayStats?.[0] || { totalBookings: 0, revenue: 0, checkIns: 0, checkOuts: 0, confirmed: 0, pending: 0 };

    // 6. Calculate total capacity and occupancy
    const totalCapacity = allAmenities.reduce((sum, a) => sum + (a.status === 'active' ? (a.capacity || 0) : 0), 0);
    const occupancyPercentage = totalCapacity > 0 ? Math.round((todayData.totalBookings / totalCapacity) * 100) : 0;

    // 7. Build the consolidated response
    return {
      amenityKpis,

      bookingKpis: {
        totalBookings: Object.values(statusMap).reduce((s, v) => s + v, 0),
        todayBookings: todayData.totalBookings,
        upcomingBookings: bookingAgg.upcomingCount?.[0]?.count || 0,
        completedBookings: statusMap['completed'] || 0,
        cancelledBookings: statusMap['cancelled'] || 0,
        pendingBookings: statusMap['pending'] || 0,
        confirmedBookings: statusMap['confirmed'] || 0,
        checkedInBookings: statusMap['checked-in'] || 0,
        approvedBookings: statusMap['approved'] || 0,
        rejectedBookings: statusMap['rejected'] || 0,
      },

      revenue: {
        dailyRevenue: bookingAgg.dailyRevenue?.[0]?.total || 0,
        weeklyRevenue: bookingAgg.weeklyRevenue?.[0]?.total || 0,
        monthlyRevenue: bookingAgg.monthlyRevenue?.[0]?.total || 0,
      },

      occupancy: {
        occupancyPercentage,
        capacityUtilization: totalCapacity,
        todayCheckIns: todayData.checkIns,
        todayCheckOuts: todayData.checkOuts,
      },

      paymentStats,
      paymentAmounts,

      charts: {
        revenueTrend: (bookingAgg.revenueTrend || []).reverse(),
        bookingTrend: (bookingAgg.bookingTrend || []).reverse(),
        bookingStatusDist: bookingAgg.statusCounts || [],
        paymentStatusDist: bookingAgg.paymentStatusDist || [],
        peakHours: bookingAgg.peakHours || [],
        amenityUsage: bookingAgg.amenityUsage || [],
        monthlyComparison: {
          current: bookingAgg.currentMonthBookings?.[0] || { count: 0, revenue: 0 },
          previous: bookingAgg.previousMonthBookings?.[0] || { count: 0, revenue: 0 },
        },
      },

      maintenanceSummary,

      recentActivity: bookingAgg.recentActivity || [],
    };
  }

  async checkInBooking(bookingId, orgId, userId) {
    const booking = await amenityBookingRepository.findById(bookingId, orgId);
    
    const emitDenied = (reason) => {
      amenityBookingEventEmitter.emit(AMENITY_BOOKING_DENIED, {
        orgId,
        bookingId,
        userId, // The guard scanning it
        booking,
        reason
      });
      return new HttpError(400, reason);
    };
    
    // 1 & 2. Booking Exists
    if (!booking) {
      amenityBookingEventEmitter.emit(AMENITY_BOOKING_DENIED, { orgId, bookingId, userId, reason: 'Invalid QR Code' });
      throw new HttpError(404, 'Booking not found.');
    }

    const today = new Date().toISOString().split('T')[0];
    
    // 4. Booking Status Cancelled
    if (booking.status === 'cancelled') {
      throw emitDenied('Booking has been cancelled.');
    }
    
    // 5. Payment Status
    if (booking.paymentStatus === 'pending') {
      throw emitDenied('Payment is pending.');
    }

    // 6. QR Status
    if (booking.qrStatus === 'expired') {
      throw emitDenied('QR Code has expired.');
    }

    // 9. Duplicate Entry (Already Completed)
    if (booking.status === 'completed') {
      throw emitDenied('Booking already completed.');
    }

    // Exit Workflow
    if (booking.status === 'checked-in') {
      const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, 'completed');
      updated.checkOutTime = new Date();
      await updated.save();
      
      const { AMENITY_BOOKING_COMPLETED } = await import('./amenityBooking.events.js');
      amenityBookingEventEmitter.emit(AMENITY_BOOKING_COMPLETED, updated);
      
      return Object.assign(updated.toObject(), {
        isExit: true,
        message: 'Exit Recorded'
      });
    }

    // Entry Workflow Validations
    // 3. Booking Date
    if (booking.bookingDate !== today) {
      const formattedDate = new Date(booking.bookingDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      });
      throw emitDenied(`Access Denied: Booking is scheduled for ${formattedDate}.`);
    }
    const parseTimeStr = (timeStr) => {
      // Assuming HH:MM in 24hr format based on regex ^([01]\d|2[0-3]):?([0-5]\d)$
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    
    // 7. Booking Time (Start Time <= Current Time <= End Time)
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const startMins = parseTimeStr(booking.startTime);
    const endMins = parseTimeStr(booking.endTime);
    
    if (currentMins < startMins) {
      throw emitDenied('Resident is too early for this booking.');
    }
    if (currentMins > endMins) {
      throw emitDenied('Booking time has expired.');
    }

    // 8. Amenity Status
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenity = await amenityService.getAmenityById(booking.amenityId, orgId);
    if (!amenity || amenity.status === 'inactive') {
      throw emitDenied('Amenity is currently unavailable.');
    }

    // Entry Workflow
    const updated = await amenityBookingRepository.updateStatus(bookingId, orgId, 'checked-in');
    updated.checkInTime = new Date();
    updated.checkedInBy = userId; // Log who scanned it (Security Guard)
    await updated.save();
    
    // Populate checkedInBy so frontend can display the guard's name
    await updated.populate('checkedInBy', 'name');

    amenityBookingEventEmitter.emit(AMENITY_BOOKING_CHECKED_IN, updated);
    
    return Object.assign(updated.toObject(), {
      isExit: false,
      message: 'Access Granted'
    });
  }

  async getCalendarIndicators(orgId, year, month) {
    return await amenityBookingRepository.getMonthlyIndicators(orgId, year, month);
  }

  async getRecentScans(orgId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const scans = await amenityBookingRepository.getRecentScans(orgId, startOfDay);

    return scans.map(scan => {
      // Determine if it was entry or exit that was most recent
      // Or just return the record and let frontend decide based on status
      const scanType = scan.status === 'completed' ? 'Exit' : 'Entry';
      const scanTime = scan.status === 'completed' ? scan.checkOutTime : scan.checkInTime;

      return {
        _id: scan._id,
        bookingId: scan.bookingId || scan._id,
        residentName: scan.userId?.name || 'Unknown',
        residentPhoto: scan.userId?.profilePicture,
        amenityName: scan.amenityId?.name || 'Unknown',
        scanType: scanType,
        entryTime: scan.checkInTime,
        exitTime: scan.checkOutTime,
        scanTime: scanTime,
        result: 'Success',
        guardName: scan.checkedInBy?.name || 'Security'
      };
    }).sort((a, b) => b.scanTime - a.scanTime);
  }
}

export default new AmenityBookingService();
