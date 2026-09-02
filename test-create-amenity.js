import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Amenity } from './backend/src/features/amenity/amenity.model.js';

dotenv.config({ path: 'backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const data = {
        name: 'Test Amenity',
        type: 'Event Space',
        location: 'Rooftop',
        description: 'Test description',
        capacity: 50,
        status: 'active',
        maxBookingsPerUserPerSlot: 2,
        pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
        bookingRules: {
          openTime: '08:00',
          closeTime: '21:00',
          slotDurationMinutes: 60,
          bufferTimeMinutes: 0,
          advanceBookingDays: 7,
          isCancellationEnabled: false,
          cancellationRefundRules: [],
        },
        openDays: [0, 1, 2, 3, 4, 5, 6],
        images: [],
        orgId: new mongoose.Types.ObjectId()
    };
    
    const amenity = new Amenity(data);
    await amenity.validate();
    console.log("Validation passed");
  } catch(e) {
    console.log("Validation failed:", e.message);
  }
  await mongoose.disconnect();
}
test();
