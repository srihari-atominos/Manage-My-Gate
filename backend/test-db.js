import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import amenityBookingRepository from './src/features/amenityBooking/amenityBooking.repository.js';
import AmenityBooking from './src/features/amenityBooking/amenityBooking.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Let's find ANY booking to get an orgId
  const anyBooking = await AmenityBooking.findOne({});
  console.log('Any Booking:', anyBooking);

  if (anyBooking) {
    const orgId = anyBooking.orgId;
    console.log('Using OrgId:', orgId);

    // Test findByOrgPaginated
    const ledger = await amenityBookingRepository.findByOrgPaginated(orgId.toString(), {}, 0, 10);
    console.log('Ledger Data:', JSON.stringify(ledger, null, 2));

    // Test getDashboardAggregation
    const dashboard = await amenityBookingRepository.getDashboardAggregation(orgId.toString());
    console.log('Dashboard Data:', JSON.stringify(dashboard, null, 2));
  } else {
    console.log('No bookings found in DB at all!');
  }

  mongoose.disconnect();
}

run().catch(console.error);
