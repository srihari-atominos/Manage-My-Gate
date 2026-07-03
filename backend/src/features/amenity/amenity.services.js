import amenityRepository from './amenity.repository.js';
import { amenityEventEmitter, AMENITY_CREATED, AMENITY_UPDATED, AMENITY_DELETED } from './amenity.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class AmenityService {
  async getAllAmenities(orgId, filters = {}) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required to fetch amenities.');
    return await amenityRepository.findAllByOrg(orgId, filters);
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
}

export default new AmenityService();
