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

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);
    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    
    amenities = await Promise.all(amenities.map(async (amenity) => {
      const a = amenity.toObject ? amenity.toObject() : amenity;
      
      if (a.status === 'active') {
        a.currentStatus = 'Available';
        const dayOfWeek = now.getDay();
        if (a.bookingRules?.weeklyOffDays?.includes(dayOfWeek)) {
          a.currentStatus = 'Closed';
        } else {
          const openTime = a.bookingRules?.openTime || '00:00';
          const closeTime = a.bookingRules?.closeTime || '23:59';
          if (currentTime < openTime || currentTime > closeTime) {
            a.currentStatus = 'Closed';
          }
        }
        
        if (a.maintenanceSchedules && a.maintenanceSchedules.length > 0) {
          const hasActiveMaintenance = a.maintenanceSchedules.some(maint => {
            const mStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
            const mEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
            return now >= mStart && now <= mEnd;
          });
          if (hasActiveMaintenance) {
            a.currentStatus = 'Under Maintenance';
          }
        }
        
        if (a.currentStatus === 'Available') {
          const conflicts = await amenityBookingRepository.findConflicts(orgId, a._id, today, currentTime, currentTime);
          if (conflicts.length >= a.capacity) {
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

    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay();

    // 1. Weekly Off Check
    if (amenity.bookingRules?.weeklyOffDays?.includes(dayOfWeek)) {
      return []; // Closed today
    }

    // 2. Maintenance Check
    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        const start = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
        const end = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
        // If the entire day is blocked by maintenance
        if (start <= targetDate && end >= new Date(targetDate.getTime() + 86400000)) {
           // Basic check. A more precise check happens per slot later
           // return [];
        }
      }
    }

    // 3. Generate base slots from openTime to closeTime
    const openTime = amenity.bookingRules?.openTime || '06:00';
    const closeTime = amenity.bookingRules?.closeTime || '22:00';
    const durationMins = amenity.bookingRules?.slotDurationMinutes || 60;
    const bufferMins = amenity.bookingRules?.bufferTimeMinutes || 0;

    const startMs = new Date(`${dateStr}T${openTime}`).getTime();
    const endMs = new Date(`${dateStr}T${closeTime}`).getTime();
    
    let currentMs = startMs;
    const allSlots = [];
    
    while (currentMs + (durationMins * 60000) <= endMs) {
      const slotEndMs = currentMs + (durationMins * 60000);
      
      const sDate = new Date(currentMs);
      const eDate = new Date(slotEndMs);
      
      const formatTime = (d) => d.toTimeString().substring(0, 5);
      
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
      const slotStart = new Date(`${dateStr}T${slot.startTime}`);
      const slotEnd = new Date(`${dateStr}T${slot.endTime}`);

      // Check maintenance
      let inMaintenance = false;
      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
          const mEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
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
        const bStart = new Date(`${dateStr}T${b.startTime}`);
        const bEnd = new Date(`${dateStr}T${b.endTime}`);
        if (slotStart < bEnd && slotEnd > bStart) {
          overlappingBookings++;
        }
      }

      if (overlappingBookings >= amenity.capacity) {
        return false; // Fully booked
      }

      // Past time check (don't return slots in the past if date is today)
      if (slotStart < new Date()) {
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
    
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay();
    const isWeeklyOff = amenity.bookingRules?.weeklyOffDays?.includes(dayOfWeek);

    const openTime = amenity.bookingRules?.openTime || '06:00';
    const closeTime = amenity.bookingRules?.closeTime || '22:00';
    const durationMins = amenity.bookingRules?.slotDurationMinutes || 60;
    const bufferMins = amenity.bookingRules?.bufferTimeMinutes || 0;

    const startMs = new Date(`${dateStr}T${openTime}`).getTime();
    const endMs = new Date(`${dateStr}T${closeTime}`).getTime();
    
    let currentMs = startMs;
    const allSlots = [];
    
    while (currentMs + (durationMins * 60000) <= endMs) {
      const slotEndMs = currentMs + (durationMins * 60000);
      const sDate = new Date(currentMs);
      const eDate = new Date(slotEndMs);
      const formatTime = (d) => d.toTimeString().substring(0, 5);
      
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
      const slotStart = new Date(`${dateStr}T${slot.startTime}`);
      const slotEnd = new Date(`${dateStr}T${slot.endTime}`);
      
      let status = 'Available';
      let bookedByMe = false;
      let bookingId = null;
      let bookingStatus = null;
      let myBookingsCount = 0;

      if (slotStart < new Date()) {
        status = 'Closed';
      }

      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
          const mEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
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
          const bStart = new Date(`${dateStr}T${b.startTime}`);
          const bEnd = new Date(`${dateStr}T${b.endTime}`);
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
      const targetDate = new Date(dateStr);
      if (amenity.bookingRules?.weeklyOffDays?.includes(targetDate.getDay())) {
        continue;
      }

      const slotStart = new Date(`${dateStr}T${startTime}`);
      const slotEnd = new Date(`${dateStr}T${endTime}`);

      // 2. Operating hours check
      const openTimeParsed = new Date(`${dateStr}T${amenity.bookingRules?.openTime || '00:00'}`);
      const closeTimeParsed = new Date(`${dateStr}T${amenity.bookingRules?.closeTime || '23:59'}`);
      if (slotStart < openTimeParsed || slotEnd > closeTimeParsed) {
        continue;
      }

      // 3. Maintenance check
      let inMaintenance = false;
      if (amenity.maintenanceSchedules) {
        for (const maint of amenity.maintenanceSchedules) {
          const mStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
          const mEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
          if (slotStart < mEnd && slotEnd > mStart) {
            inMaintenance = true;
            break;
          }
        }
      }
      if (inMaintenance) continue;

      // 4. Booking conflicts check
      const conflicts = await amenityBookingRepository.findConflicts(orgId, amenity._id, dateStr, startTime, endTime);
      
      if (conflicts.length < amenity.capacity) {
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

    const mStart = new Date(`${maintenanceData.startDate}T${maintenanceData.startTime || '00:00'}`);
    const mEnd = new Date(`${maintenanceData.endDate}T${maintenanceData.endTime || '23:59'}`);

    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        const existingStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
        const existingEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
        if (mStart < existingEnd && mEnd > existingStart) {
          throw new HttpError(400, 'A maintenance schedule already exists that overlaps with the requested time.');
        }
      }
    }

    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const activeBookings = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    
    for (const booking of activeBookings) {
      const bStart = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const bEnd = new Date(`${booking.bookingDate}T${booking.endTime}`);
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

    const mStart = new Date(`${maintenanceData.startDate}T${maintenanceData.startTime || '00:00'}`);
    const mEnd = new Date(`${maintenanceData.endDate}T${maintenanceData.endTime || '23:59'}`);

    if (amenity.maintenanceSchedules && amenity.maintenanceSchedules.length > 0) {
      for (const maint of amenity.maintenanceSchedules) {
        if (maint._id.toString() === maintenanceId.toString()) continue;
        const existingStart = new Date(`${maint.startDate}T${maint.startTime || '00:00'}`);
        const existingEnd = new Date(`${maint.endDate}T${maint.endTime || '23:59'}`);
        if (mStart < existingEnd && mEnd > existingStart) {
          throw new HttpError(400, 'A maintenance schedule already exists that overlaps with the requested time.');
        }
      }
    }

    const amenityBookingRepository = (await import('../amenityBooking/amenityBooking.repository.js')).default;
    const activeBookings = await amenityBookingRepository.findActiveBookingsByAmenity(amenityId, orgId);
    
    for (const booking of activeBookings) {
      const bStart = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const bEnd = new Date(`${booking.bookingDate}T${booking.endTime}`);
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
