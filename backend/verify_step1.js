import mongoose from 'mongoose';
import Amenity from './src/features/amenity/amenity.model.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gated_community');
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    
    const amenity = new Amenity({
      orgId,
      name: 'Test Gym',
      type: 'gym',
      capacity: 50,
      bookingRules: { slotDurationMinutes: 60, openTime: '06:00', closeTime: '22:00', maxBookingsPerUserPerDay: 2, advanceBookingDays: 7 }
    });
    await amenity.save();
    console.log('Amenity created successfully:', amenity.name);
    
    const booking = new AmenityBooking({
      orgId,
      amenityId: amenity._id,
      userId,
      bookingDate: '2026-10-24',
      startTime: '10:00',
      endTime: '11:00'
    });
    await booking.save();
    console.log('Legacy Booking created successfully with status:', booking.status);
    
    await Amenity.deleteOne({ _id: amenity._id });
    await AmenityBooking.deleteOne({ _id: booking._id });
    console.log('Verification passed. No breaking changes detected.');
    process.exit(0);
  } catch(e) {
    console.error('Verification failed:', e);
    process.exit(1);
  }
}
run();
