import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import dashboardService from './src/features/amenityDashboard/amenityDashboard.service.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';
import User from './src/features/user/user.model.js';
import Amenity from './src/features/amenity/amenity.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const anyBooking = await AmenityBooking.findOne({});
  if (anyBooking) {
    const orgId = anyBooking.orgId;
    console.log('Using OrgId:', orgId);

    const data = await dashboardService.getCalendarEvents(orgId.toString(), '2026-07-01', '2026-07-31');
    console.log('Calendar Events:', JSON.stringify(data, null, 2));
  }

  mongoose.disconnect();
}

run().catch(console.error);
