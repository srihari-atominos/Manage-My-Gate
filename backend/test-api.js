import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('backend/.env') });

import './src/features/user/user.model.js';
import './src/features/amenity/amenity.model.js';
import amenityDashboardService from './src/features/amenityDashboard/amenityDashboard.service.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const bookings = await mongoose.connection.collection('amenitybookings').find({}).toArray();
    console.log("Total amenitybookings in DB:", bookings.length);
    if (bookings.length > 0) {
      const orgId = bookings[0].orgId.toString();
      console.log("Testing with orgId", orgId);
      const events = await amenityDashboardService.getCalendarEvents(orgId, "2020-01-01", "2030-01-01");
      console.log("Success, found events:", events.length);
    }
  } catch (e) {
    console.error("Error occurred:");
    console.error(e.stack);
  }
  process.exit(0);
}

test();


