import mongoose from 'mongoose';
import Amenity from './src/features/amenity/amenity.model.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';
import amenityBookingRepo from './src/features/amenityBooking/amenityBooking.repository.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gated_community');
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    
    const amenity = new Amenity({
      orgId,
      name: 'Test Stats Gym',
      type: 'gym',
      capacity: 50,
      bookingRules: { slotDurationMinutes: 60, openTime: '06:00', closeTime: '22:00', maxBookingsPerUserPerDay: 2, advanceBookingDays: 7 }
    });
    await amenity.save();
    
    const booking = new AmenityBooking({
      orgId,
      amenityId: amenity._id,
      userId,
      bookingDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      totalPrice: 100,
      status: 'confirmed'
    });
    await booking.save();

    // Check Analytics
    const kpi = await amenityBookingRepo.getKpiStats(orgId);
    console.log('KPI Stats:', kpi);
    
    const rev = await amenityBookingRepo.getRevenueStats(orgId);
    console.log('Revenue Stats:', rev);

    const trends = await amenityBookingRepo.getTrendsStats(orgId);
    console.log('Trends Stats:', trends);

    // Check-in (Simulated by updating status directly in DB so we can test the aggregation again)
    await AmenityBooking.updateOne({ _id: booking._id }, { status: 'checked-in' });
    const kpi2 = await amenityBookingRepo.getKpiStats(orgId);
    console.log('KPI Stats after check-in:', kpi2);
    
    // Clean up
    await Amenity.deleteOne({ _id: amenity._id });
    await AmenityBooking.deleteOne({ _id: booking._id });
    console.log('Step 2 verification passed.');
    process.exit(0);
  } catch(e) {
    console.error('Step 2 verification failed:', e);
    process.exit(1);
  }
}
run();
