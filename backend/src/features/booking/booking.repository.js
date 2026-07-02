import Booking from './booking.model.js';

export class BookingRepository {
  async findAll(orgId, filter = {}) {
    return await Booking.find({ orgId, ...filter }).sort({ date: -1, startTime: -1 }).populate('amenityId').populate('userId');
  }

  async findById(id, orgId) {
    return await Booking.findOne({ _id: id, orgId }).populate('amenityId').populate('userId');
  }

  async findOverlappingBookings(amenityId, date, startTime, endTime) {
    return await Booking.find({
      amenityId,
      date,
      bookingStatus: { $in: ['Confirmed', 'Checked-In'] },
      $or: [
        { $and: [{ startTime: { $lt: endTime } }, { endTime: { $gt: startTime } }] } // Overlap condition
      ]
    });
  }

  async create(bookingData) {
    const booking = new Booking(bookingData);
    return await booking.save();
  }

  async updateStatus(id, orgId, bookingStatus) {
    return await Booking.findOneAndUpdate({ _id: id, orgId }, { bookingStatus }, { new: true, runValidators: true });
  }
}

export default new BookingRepository();
