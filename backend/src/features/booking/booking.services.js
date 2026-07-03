import bookingRepository from './booking.repository.js';
import amenityService from '../amenity/amenity.services.js';
import { bookingEventEmitter, BOOKING_CREATED, BOOKING_STATUS_UPDATED } from './booking.events.js';
import HttpError from '../../utils/httpError.utils.js';

export class BookingService {
  async getAllBookings(orgId, filters = {}) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required to fetch bookings.');
    return await bookingRepository.findAll(orgId, filters);
  }

  async getBookingById(id, orgId) {
    const booking = await bookingRepository.findById(id, orgId);
    if (!booking) {
      throw new HttpError(404, `Booking with ID ${id} not found.`);
    }
    return booking;
  }

  async createBooking(bookingData) {
    const { amenityId, orgId, date, startTime, endTime } = bookingData;

    // 1. Verify amenity exists and belongs to the org
    const amenity = await amenityService.getAmenityById(amenityId, orgId);
    if (amenity.status !== 'active') {
      throw new HttpError(400, `Amenity is currently ${amenity.status} and cannot be booked.`);
    }

    // 2. Validate against amenity operating hours and open days
    const bookingDay = new Date(date).getDay();
    if (!amenity.openDays.includes(bookingDay)) {
      throw new HttpError(400, 'Amenity is closed on the selected day.');
    }

    // 3. Collision detection: Ensure no overlapping confirmed bookings
    const overlapping = await bookingRepository.findOverlappingBookings(amenityId, date, startTime, endTime);
    if (overlapping && overlapping.length > 0) {
      throw new HttpError(409, 'The requested time slot overlaps with an existing booking.');
    }

    // Create booking
    const created = await bookingRepository.create(bookingData);
    bookingEventEmitter.emit(BOOKING_CREATED, created);
    return created;
  }

  async updateBookingStatus(id, orgId, status) {
    const updated = await bookingRepository.updateStatus(id, orgId, status);
    if (!updated) {
      throw new HttpError(404, `Booking with ID ${id} not found or doesn't belong to this organization.`);
    }

    bookingEventEmitter.emit(BOOKING_STATUS_UPDATED, updated);

    return updated;
  }

  async getBookingStats(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await bookingRepository.getBookingStats(orgId);
  }

  async getRecentActivity(orgId, limit = 10) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await bookingRepository.getRecentActivity(orgId, limit);
  }

  async getOccupancyStats(orgId) {
    if (!orgId) throw new HttpError(400, 'Organization ID is required');
    return await bookingRepository.getOccupancyStats(orgId);
  }
}

export default new BookingService();
