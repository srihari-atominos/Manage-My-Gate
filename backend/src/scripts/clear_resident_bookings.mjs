import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/database_name';

export async function clearResidentBookings() {
  console.log(`[CLEAR-BOOKINGS] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[CLEAR-BOOKINGS] Connected successfully.');

  const db = mongoose.connection.db;

  const collectionsToClear = [
    'amenity_management_reservations',
    'amenity_management_reservation_holds',
    'amenity_management_slot_allocations',
    'amenity_management_access_passes',
    'amenity_management_quota_allocations',
    'amenity_management_allocation_ledger',
    'amenity_management_idempotency_records',
    'amenitybookings',
    'bookings',
  ];

  for (const collName of collectionsToClear) {
    const res = await db.collection(collName).deleteMany({});
    console.log(`[CLEAR-BOOKINGS] Cleared ${res.deletedCount} documents from '${collName}'.`);
  }

  // Reset reservation counters so next booking starts fresh
  await db.collection('amenity_management_counters').deleteMany({});
  console.log(`[CLEAR-BOOKINGS] Reset amenity counters.`);

  console.log('[CLEAR-BOOKINGS] All resident bookings, holds, passes, and slot locks cleared successfully.');
  await mongoose.disconnect();
}

clearResidentBookings().catch((err) => {
  console.error('[CLEAR-BOOKINGS] Error clearing bookings:', err);
  process.exit(1);
});
