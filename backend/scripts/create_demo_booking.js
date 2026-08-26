// backend/scripts/create_demo_booking.js (ESM version)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// .env is at backend/.env
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

// Import models using static ESM imports (relative to this script)
import AmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import User from '../src/features/user/user.model.js';
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const resident = await User.findOne({ status: 'Active', isSuperAdmin: { $ne: true } }).lean();
  if (!resident) {
    console.error('❌ No resident user found');
    process.exit(1);
  }

  const booking = await AmenityBooking.create({
    orgId: resident.orgId,
    amenityId: mongoose.Types.ObjectId('6a3d0459f3c5657827cccd87'),
    userId: resident._id,
    bookingNumber: `BK-${Date.now()}`,
    bookingDate: '2026-08-20',
    startTime: '00:00',
    endTime: '23:59',
    purpose: 'Community Hall Day‑Based Reservation',
    status: 'confirmed',
    numberOfPersons: 50,
    paymentStatus: 'success', // daily pricing gives a free booking
  });

  console.log('✅ Booking created with ID:', booking._id.toString());
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
