import amenityRepository from './amenity.repository.js';
import { amenityEventEmitter, AMENITY_CREATED, AMENITY_UPDATED, AMENITY_DELETED } from './amenity.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class AmenityService {
  async getAllAmenities(orgId, filters = {}) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required to fetch amenities.');
    
    const dbFilter = { isDeleted: false };
    if (filters.status) dbFilter.status = filters.status;
    if (filters.category && filters.category !== 'All') dbFilter.type = filters.category;
    if (filters.capacity) {
      const cap = parseInt(filters.capacity, 10);
      if (!isNaN(cap)) dbFilter.capacity = { $gte: cap };
    }
    if (filters.search) {
      dbFilter.$or = [
        { name: { $regex: new RegExp(filters.search, 'i') } },
        { location: { $regex: new RegExp(filters.search, 'i') } },
        { type: { $regex: new RegExp(filters.search, 'i') } }
      ];
    }
    
    let amenities = await amenityRepository.findAllByOrg(orgId, dbFilter);
    
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      amenities = amenities.filter(a => {
        const rate = a.ratePerHour || a.pricing?.baseRate || 0;
        if (max) return rate >= min && rate <= max;
        return rate >= min;
      });
    }

    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';
    const now = moment().tz(TIMEZONE);
    const today = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    
    amenities = await Promise.all(amenities.map(async (amenity) => {
      const a = amenity.toObject ? amenity.toObject() : amenity;
      
      if (a.status === 'active') {
        a.currentStatus = 'Available';
        const dayOfWeek = now.day();
        if (a.bookingRules?.weeklyOffDays?.includes(dayOfWeek)) {
          a.currentStatus = 'Closed';
        } else {
          const openTime = a.bookingRules?.openTime || '00:00';
          const closeTime = a.bookingRules?.closeTime || '23:59';
          
          let isOpen = false;
          if (closeTime < openTime) {
             // Operates past midnight
             isOpen = currentTime >= openTime || currentTime <= closeTime;
          } else {
             isOpen = currentTime >= openTime && currentTime <= closeTime;
          }
          
          if (!isOpen) {
            a.currentStatus = 'Closed';
          }
        }
        
        if (a.maintenanceSchedules && a.maintenanceSchedules.length > 0) {
          const hasActiveMaintenance = a.maintenanceSchedules.some(maint => {
            const mStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
            let mEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
            if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();
            const nowDt = now.toDate();
            return nowDt >= mStart && nowDt <= mEnd;
          });
          if (hasActiveMaintenance) {
            a.currentStatus = 'Under Maintenance';
          }
        }
        
        if (a.currentStatus === 'Available') {
          const conflicts = await amenityBookingRepository.findConflicts(orgId, a._id, today, currentTime, currentTime);
          const occupied = conflicts.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
          if (occupied >= a.capacity) {
            a.currentStatus = 'Fully Booked';
          }
        }
      } else {
        a.currentStatus = 'Unavailable';
      }
      return a;
    }));

    if (filters.sort) {
      amenities.sort((a, b) => {
        if (filters.sort === 'name') return a.name.localeCompare(b.name);
        if (filters.sort === 'price') return (a.ratePerHour || a.pricing?.baseRate || 0) - (b.ratePerHour || b.pricing?.baseRate || 0);
        if (filters.sort === 'capacity') return b.capacity - a.capacity;
        if (filters.sort === 'availability') return a.currentStatus.localeCompare(b.currentStatus);
        return 0;
      });
    }

    return amenities;
  }

  async getAmenityById(id, orgId) {
    const amenity = await amenityRepository.findById(id, orgId);
    if (!amenity) {
      throw new HttpError(404, `Amenity with ID ${id} not found.`);
    }
    return amenity;
  }

  async createAmenity(orgId, amenityData) {
    if (amenityData.name) amenityData.name = amenityData.name.trim();
    if (amenityData.description) amenityData.description = amenityData.description.trim();
    
    // Duplicate Name Validation
    if (amenityData.name) {
      const existing = await amenityRepository.findByName(amenityData.name, orgId);
      if (existing) {
        throw new HttpError(400, 'An amenity with this name already exists.');
      }
    }
    
    amenityData.orgId = orgId; // override/set just to be safe
    const created = await amenityRepository.create(amenityData);
    
    // Audit log can be handled by events
    amenityEventEmitter.emit(AMENITY_CREATED, created);
    return created;
  }

  async updateAmenity(id, orgId, updateData) {
    await this.getAmenityById(id, orgId); // Verify existence

    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.description) updateData.description = updateData.description.trim();

    // Check if status is being set to inactive
    if (updateData.status === 'inactive') {
      const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
      const hasPendingBookings = await amenityBookingService.hasPendingOrApprovedFutureBookings(id, orgId);
      if (hasPendingBookings) {
        throw new HttpError(400, 'Cannot deactivate amenity: there are pending or approved future bookings.');
      }
    }

    const updated = await amenityRepository.update(id, orgId, updateData);
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }

  async updateStatus(id, orgId, status) {
    await this.getAmenityById(id, orgId); // Verify existence

    if (status === 'inactive') {
      const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
      const hasPendingBookings = await amenityBookingService.hasPendingOrApprovedFutureBookings(id, orgId);
      if (hasPendingBookings) {
        throw new HttpError(400, 'Cannot deactivate amenity: there are pending or approved future bookings.');
      }
    }

    const updated = await amenityRepository.update(id, orgId, { status });
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }

  async deleteAmenity(id, orgId) {
    await this.getAmenityById(id, orgId); // Verify existence
    
    // Check if there are active bookings
    const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
    const hasPendingBookings = await amenityBookingService.hasPendingOrApprovedFutureBookings(id, orgId);
    if (hasPendingBookings) {
      throw new HttpError(400, 'Cannot delete amenity: there are pending or approved future bookings.');
    }

    const deleted = await amenityRepository.softDelete(id, orgId);
    amenityEventEmitter.emit(AMENITY_DELETED, deleted);
    return deleted;
  }

  /**
   * Generates available time slots for a specific amenity on a specific date.
   * Considers operating hours, slot duration, weekly offs, maintenance, and existing bookings.
   */
  async getAvailableSlots(id, orgId, dateStr) {
    const amenity = await this.getAmenityById(id, orgId);
    if (amenity.status !== 'active') return [];

    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';
    const targetDate = moment.tz(dateStr, 'YYYY-MM-DD', TIMEZONE).startOf('day');
    const dayOfWeek = targetDate.day();

    // 1. Weekly Off Check
    if (amenity.bookingRules?.weeklyOffDays?.includes(dayOfWeek)) {
      return []; // Closed today
    }

    // 2. Maintenance Check
    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        const start = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        let end = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        if (end < start) end = moment(end).add(1, 'days').toDate();
        
        // If the entire day is blocked by maintenance
        if (start <= targetDate.toDate() && end >= moment(targetDate).add(1, 'days').toDate()) {
           // Basic check. A more precise check happens per slot later
           // return [];
        }
      }
    }

    // 3. Daily Pricing Bypass
    if (amenity.pricing?.pricingType === 'daily') {
      const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
      const existingBookings = await amenityBookingRepository.findByOrgPaginated(orgId, {
        amenityId: id,
        bookingDate: dateStr,
        status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
      }, 0, 1000);
      
      const bookings = existingBookings.data;
      const bookedSpots = bookings.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
      const isBooked = bookedSpots >= amenity.capacity;
      
      let multiplier = 1.0;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
      }
      
      return [{
        startTime: amenity.bookingRules?.openTime || '00:00',
        endTime: amenity.bookingRules?.closeTime || '23:59',
        status: isBooked ? 'Booked' : 'Available',
        price: (amenity.pricing?.baseRate || 0) * multiplier
      }];
    }

    // 4. Generate base hourly slots from openTime to closeTime
    const openTime = amenity.bookingRules?.openTime || '06:00';
    const closeTime = amenity.bookingRules?.closeTime || '22:00';
    const durationMins = amenity.bookingRules?.slotDurationMinutes || 60;
    const bufferMins = amenity.bookingRules?.bufferTimeMinutes || 0;

    const startMs = moment.tz(`${dateStr}T${openTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).valueOf();
    let endMs = moment.tz(`${dateStr}T${closeTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).valueOf();
    if (endMs < startMs) {
      endMs = moment.tz(`${dateStr}T${closeTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).add(1, 'days').valueOf();
    }
    
    let currentMs = startMs;
    const allSlots = [];
    
    while (currentMs + (durationMins * 60000) <= endMs) {
      const slotEndMs = currentMs + (durationMins * 60000);
      
      const sDate = moment(currentMs).tz(TIMEZONE);
      const eDate = moment(slotEndMs).tz(TIMEZONE);
      
      const formatTime = (m) => m.format('HH:mm');
      
      allSlots.push({
        startTime: formatTime(sDate),
        endTime: formatTime(eDate),
        startMs,
        endMs: slotEndMs
      });
      
      currentMs = slotEndMs + (bufferMins * 60000); // Advance by duration + buffer
    }

    // 4. Fetch existing bookings for that date
    const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
    // We need a repository method to get all bookings for that day, we can use the repository directly
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    
    // findConflicts expects just the strings
    // Or we can fetch ALL bookings for the day and check overlaps in memory
    const existingBookings = await amenityBookingRepository.findByOrgPaginated(orgId, {
      amenityId: id,
      bookingDate: dateStr,
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
    }, 0, 1000);

    const bookings = existingBookings.data;
    
    // 5. Filter out slots that overlap with maintenance or exceed capacity
    const availableSlots = allSlots.filter(slot => {
      const slotStart = moment.tz(`${dateStr}T${slot.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      const slotEnd = moment.tz(`${dateStr}T${slot.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();

      // Check maintenance
      let inMaintenance = false;
      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          let mEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();
          if (slotStart < mEnd && slotEnd > mStart) {
            inMaintenance = true;
            break;
          }
        }
      }
      if (inMaintenance) return false;

      // Check capacity
      let overlappingBookings = 0;
      for (const b of bookings) {
        const bStart = moment.tz(`${dateStr}T${b.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        let bEnd = moment.tz(`${dateStr}T${b.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        if (bEnd < bStart) bEnd = moment(bEnd).add(1, 'days').toDate();
        if (slotStart < bEnd && slotEnd > bStart) {
          overlappingBookings += parseInt(b.numberOfPersons || 1, 10);
        }
      }

      if (overlappingBookings >= amenity.capacity) {
        return false; // Fully booked
      }

      // Past time check (don't return slots in the past if date is today)
      if (slotStart < moment().tz(TIMEZONE).toDate()) {
        return false;
      }

      return true;
    });

    // 6. Calculate Price for each slot
    let multiplier = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
    }
    const baseRate = amenity.pricing?.baseRate || amenity.ratePerHour || 0;
    const durationHours = durationMins / 60;
    const price = baseRate * durationHours * multiplier;

    return availableSlots.map(s => ({
      startTime: s.startTime,
      endTime: s.endTime,
      price: price
    }));
  }

  async getAllSlots(id, orgId, dateStr, userId) {
    const amenity = await this.getAmenityById(id, orgId);
    
    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';
    const targetDate = moment.tz(dateStr, 'YYYY-MM-DD', TIMEZONE).startOf('day');
    const dayOfWeek = targetDate.day();
    const isWeeklyOff = amenity.bookingRules?.weeklyOffDays?.includes(dayOfWeek);

    if (amenity.pricing?.pricingType === 'daily') {
      const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
      const existingBookings = await amenityBookingRepository.findByOrgPaginated(orgId, {
        amenityId: id,
        bookingDate: dateStr,
        status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
      }, 0, 1000);
      
      const bookings = existingBookings.data;
      const bookedSpots = bookings.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
      const isBooked = bookedSpots >= amenity.capacity;
      
      let multiplier = 1.0;
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
      }
      
      let status = isBooked ? 'Booked' : 'Available';
      
      // Basic maintenance/weekly off check for daily
      if (isWeeklyOff || amenity.status !== 'active') {
        status = 'Closed';
      } else if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = moment.tz(`${maint.startDate}T00:00`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          const mEnd = moment.tz(`${maint.endDate}T23:59`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          if (targetDate.toDate() >= mStart && targetDate.toDate() <= mEnd) {
            status = 'Maintenance';
            break;
          }
        }
      }
      
      const today = moment().tz(TIMEZONE).startOf('day');
      if (targetDate.isBefore(today)) {
        status = 'Closed';
      }

      let bookedByMe = false;
      let bookingId = null;
      let bookingStatus = null;
      let myBookingsCount = 0;

      for (const b of bookings) {
        if (userId && b.user && b.user._id && b.user._id.toString() === userId.toString()) {
          bookedByMe = true;
          myBookingsCount += (b.numberOfPersons || 1);
          bookingId = b.bookingId || b._id;
          bookingStatus = b.status;
        } else if (userId && b.userId && b.userId.toString() === userId.toString()) {
          bookedByMe = true;
          myBookingsCount += (b.numberOfPersons || 1);
          bookingId = b.bookingId || b._id;
          bookingStatus = b.status;
        }
      }

      return [{
        startTime: amenity.bookingRules?.openTime || '00:00',
        endTime: amenity.bookingRules?.closeTime || '23:59',
        status,
        price: (amenity.pricing?.baseRate || 0) * multiplier,
        bookedByMe,
        bookingId,
        bookingStatus,
        myBookingsCount
      }];
    }

    const openTime = amenity.bookingRules?.openTime || '06:00';
    const closeTime = amenity.bookingRules?.closeTime || '22:00';
    const durationMins = amenity.bookingRules?.slotDurationMinutes || 60;
    const bufferMins = amenity.bookingRules?.bufferTimeMinutes || 0;

    const startMs = moment.tz(`${dateStr}T${openTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).valueOf();
    let endMs = moment.tz(`${dateStr}T${closeTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).valueOf();
    if (endMs < startMs) {
      endMs = moment.tz(`${dateStr}T${closeTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).add(1, 'days').valueOf();
    }
    
    let currentMs = startMs;
    const allSlots = [];
    
    while (currentMs + (durationMins * 60000) <= endMs) {
      const slotEndMs = currentMs + (durationMins * 60000);
      const sDate = moment(currentMs).tz(TIMEZONE);
      const eDate = moment(slotEndMs).tz(TIMEZONE);
      const formatTime = (m) => m.format('HH:mm');
      
      allSlots.push({
        startTime: formatTime(sDate),
        endTime: formatTime(eDate),
        startMs,
        endMs: slotEndMs
      });
      
      currentMs = slotEndMs + (bufferMins * 60000);
    }

    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const existingBookings = await amenityBookingRepository.findByOrgPaginated(orgId, {
      amenityId: id,
      bookingDate: dateStr,
      status: { $in: ['pending', 'approved', 'confirmed', 'checked-in'] }
    }, 0, 1000);
    const bookings = existingBookings.data;

    let multiplier = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      multiplier = amenity.pricing?.weekendRateMultiplier || 1.0;
    }
    const baseRate = amenity.pricing?.baseRate || amenity.ratePerHour || 0;
    const durationHours = durationMins / 60;
    const price = baseRate * durationHours * multiplier;

    return allSlots.map(slot => {
      const slotStart = moment.tz(`${dateStr}T${slot.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      const slotEnd = moment.tz(`${dateStr}T${slot.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      
      let status = 'Available';
      let bookedByMe = false;
      let bookingId = null;
      let bookingStatus = null;
      let myBookingsCount = 0;

      if (slotStart < moment().tz(TIMEZONE).toDate()) {
        status = 'Closed';
      }

      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          let mEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();
          if (slotStart < mEnd && slotEnd > mStart) {
            status = 'Maintenance';
            break;
          }
        }
      }

      if (status !== 'Maintenance' && (isWeeklyOff || amenity.status !== 'active')) {
        status = 'Closed';
      }

      if (status === 'Available') {
        let overlappingBookings = 0;
        for (const b of bookings) {
          const bStart = moment.tz(`${dateStr}T${b.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          let bEnd = moment.tz(`${dateStr}T${b.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          if (bEnd < bStart) bEnd = moment(bEnd).add(1, 'days').toDate();
          if (slotStart < bEnd && slotEnd > bStart) {
            overlappingBookings += (b.numberOfPersons || 1);
            if (userId && b.user && b.user._id && b.user._id.toString() === userId.toString()) {
              bookedByMe = true;
              myBookingsCount += (b.numberOfPersons || 1);
              bookingId = b.bookingId || b._id;
              bookingStatus = b.status;
            } else if (userId && b.userId && b.userId.toString() === userId.toString()) {
              bookedByMe = true;
              myBookingsCount += (b.numberOfPersons || 1);
              bookingId = b.bookingId || b._id;
              bookingStatus = b.status;
            }
          }
        }
        if (overlappingBookings >= amenity.capacity) {
          status = 'Booked';
        }
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: durationMins,
        price: price,
        status: status,
        bookedByMe,
        myBookingsCount,
        maxBookingsPerUser: amenity.maxBookingsPerUserPerSlot || 2, // It should be maxBookingsPerUserPerSlot but the model might have it as maxBookingsPerUserPerSlot right now based on my previous edit
        bookingId,
        bookingStatus
      };
    });
  }

  async searchAvailableAmenities(orgId, dateStr, startTime, endTime, filters = {}) {
    const dbFilter = { status: 'active' };
    if (filters.category && filters.category !== 'All') dbFilter.type = filters.category;
    if (filters.capacity) {
      const cap = parseInt(filters.capacity, 10);
      if (!isNaN(cap)) dbFilter.capacity = { $gte: cap };
    }
    if (filters.search) {
      dbFilter.$or = [
        { name: { $regex: new RegExp(filters.search, 'i') } },
        { location: { $regex: new RegExp(filters.search, 'i') } }
      ];
    }
    
    let amenities = await amenityRepository.findAllByOrg(orgId, dbFilter);

    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      amenities = amenities.filter(a => {
        const rate = a.ratePerHour || a.pricing?.baseRate || 0;
        if (max) return rate >= min && rate <= max;
        return rate >= min;
      });
    }

    const availableAmenities = [];
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;

    for (const amenity of amenities) {
      // 1. Weekly Off Check
      const moment = (await import('moment-timezone')).default;
      const TIMEZONE = 'Asia/Kolkata';
      const targetDate = moment.tz(dateStr, 'YYYY-MM-DD', TIMEZONE).startOf('day');
      if (amenity.bookingRules?.weeklyOffDays?.includes(targetDate.day())) {
        continue;
      }

      const slotStart = moment.tz(`${dateStr}T${startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      let slotEnd = moment.tz(`${dateStr}T${endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      if (slotEnd < slotStart) slotEnd = moment(slotEnd).add(1, 'days').toDate();

      // 2. Operating hours check
      const openTimeParsed = moment.tz(`${dateStr}T${amenity.bookingRules?.openTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      let closeTimeParsed = moment.tz(`${dateStr}T${amenity.bookingRules?.closeTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      if (closeTimeParsed < openTimeParsed) closeTimeParsed = moment(closeTimeParsed).add(1, 'days').toDate();
      
      if (slotStart < openTimeParsed || slotEnd > closeTimeParsed) {
        continue;
      }

      // 3. Maintenance check
      let inMaintenance = false;
      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          let mEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
          if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();
          
          if (slotStart < mEnd && slotEnd > mStart) {
            inMaintenance = true;
            break;
          }
        }
      }
      if (inMaintenance) continue;

      // 4. Booking conflicts check
      const conflicts = await amenityBookingRepository.findConflicts(orgId, amenity._id, dateStr, startTime, endTime);
      const occupied = conflicts.reduce((sum, b) => sum + parseInt(b.numberOfPersons || 1, 10), 0);
      
      if (occupied < amenity.capacity) {
        const a = amenity.toObject ? amenity.toObject() : amenity;
        a.currentStatus = 'Available';
        availableAmenities.push(a);
      }
    }

    // Sorting
    if (filters.sort) {
      availableAmenities.sort((a, b) => {
        if (filters.sort === 'name') return a.name.localeCompare(b.name);
        if (filters.sort === 'price') return (a.ratePerHour || a.pricing?.baseRate || 0) - (b.ratePerHour || b.pricing?.baseRate || 0);
        if (filters.sort === 'capacity') return b.capacity - a.capacity;
        if (filters.sort === 'availability') return a.currentStatus.localeCompare(b.currentStatus);
        return 0;
      });
    }

    return availableAmenities;
  }

  async getAmenityStats(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await amenityRepository.getAmenityStats(orgId);
  }

  async getMaintenanceStats(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await amenityRepository.getMaintenanceStats(orgId);
  }

  async getAllMaintenance(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await amenityRepository.getAllMaintenance(orgId);
  }

  async scheduleMaintenance(amenityId, orgId, maintenanceData) {
    const amenity = await this.getAmenityById(amenityId, orgId);
    if (!amenity) throw new HttpError(404, 'Amenity not found');

    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';
    const mStart = moment.tz(`${maintenanceData.startDate}T${maintenanceData.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
    let mEnd = moment.tz(`${maintenanceData.endDate}T${maintenanceData.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
    if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();

    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        const existingStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        let existingEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        if (existingEnd < existingStart) existingEnd = moment(existingEnd).add(1, 'days').toDate();
        if (mStart < existingEnd && mEnd > existingStart) {
          throw new HttpError(400, 'A maintenance schedule already exists that overlaps with the requested time.');
        }
      }
    }

    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const activeBookings = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    
    for (const booking of activeBookings) {
      const bStart = moment.tz(`${booking.bookingDate}T${booking.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      let bEnd = moment.tz(`${booking.bookingDate}T${booking.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      if (bEnd < bStart) bEnd = moment(bEnd).add(1, 'days').toDate();
      if (mStart < bEnd && mEnd > bStart) {
        throw new HttpError(400, `Cannot schedule maintenance. An active booking exists on ${booking.bookingDate} (${booking.startTime} - ${booking.endTime}).`);
      }
    }

    const updated = await amenityRepository.update(amenityId, orgId, {
      $push: { maintenanceSchedules: maintenanceData }
    });
    
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }

  async updateMaintenance(amenityId, maintenanceId, orgId, maintenanceData) {
    const amenity = await this.getAmenityById(amenityId, orgId);
    if (!amenity) throw new HttpError(404, 'Amenity not found');

    const moment = (await import('moment-timezone')).default;
    const TIMEZONE = 'Asia/Kolkata';
    const mStart = moment.tz(`${maintenanceData.startDate}T${maintenanceData.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
    let mEnd = moment.tz(`${maintenanceData.endDate}T${maintenanceData.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
    if (mEnd < mStart) mEnd = moment(mEnd).add(1, 'days').toDate();

    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        if (maint._id.toString() === maintenanceId.toString()) continue;
        const existingStart = moment.tz(`${maint.startDate}T${maint.startTime || '00:00'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        let existingEnd = moment.tz(`${maint.endDate}T${maint.endTime || '23:59'}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
        if (existingEnd < existingStart) existingEnd = moment(existingEnd).add(1, 'days').toDate();
        if (mStart < existingEnd && mEnd > existingStart) {
          throw new HttpError(400, 'A maintenance schedule already exists that overlaps with the requested time.');
        }
      }
    }

    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const activeBookings = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    
    for (const booking of activeBookings) {
      const bStart = moment.tz(`${booking.bookingDate}T${booking.startTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      let bEnd = moment.tz(`${booking.bookingDate}T${booking.endTime}`, 'YYYY-MM-DDTHH:mm', TIMEZONE).toDate();
      if (bEnd < bStart) bEnd = moment(bEnd).add(1, 'days').toDate();
      if (mStart < bEnd && mEnd > bStart) {
        throw new HttpError(400, `Cannot schedule maintenance. An active booking exists on ${booking.bookingDate} (${booking.startTime} - ${booking.endTime}).`);
      }
    }

    const updated = await amenityRepository.update(amenityId, orgId, {
      $set: { "maintenanceSchedules.$[elem]": { ...maintenanceData, _id: maintenanceId } }
    }, { arrayFilters: [{ "elem._id": maintenanceId }] });
    
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }

  async deleteMaintenance(amenityId, maintenanceId, orgId) {
    const amenity = await this.getAmenityById(amenityId, orgId);
    if (!amenity) throw new HttpError(404, 'Amenity not found');

    const updated = await amenityRepository.update(amenityId, orgId, {
      $pull: { maintenanceSchedules: { _id: maintenanceId } }
    });
    
    amenityEventEmitter.emit(AMENITY_UPDATED, updated);
    return updated;
  }
}

export default new AmenityService();
