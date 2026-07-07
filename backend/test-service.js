import mongoose from 'mongoose';
import amenityService from './src/features/amenity/amenity.services.js';
import dotenv from 'dotenv';
dotenv.config();

const reqBody = {
  name: 'Test Amenity ' + Date.now(),
  type: 'Event Space',
  location: '123',
  description: '',
  capacity: 50,
  pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
  images: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAMgAA/9sAQwIGBxI"],
  bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, bufferTimeMinutes: 0, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
  openDays: [0, 1, 2, 3, 4, 5, 6],
  status: 'active'
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const org = await mongoose.connection.db.collection('organizations').findOne({});
    const created = await amenityService.createAmenity(org._id, reqBody);
    console.log('SUCCESS:', created.name);
  } catch (err) {
    console.error('ERROR:', err.message, err.errors);
  } finally {
    process.exit(0);
  }
};

run();
