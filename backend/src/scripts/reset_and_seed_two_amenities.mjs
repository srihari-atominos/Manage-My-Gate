import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true';

export async function resetAndSeedTwoAmenities() {
  console.log(`[RESET & SEED] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log('[RESET & SEED] Connected successfully.');

  // 1. Remove all amenities and booking data across all collections
  console.log('[RESET & SEED] Wiping all existing amenities and booking/reservation data...');

  const wipeCollections = [
    'amenities',
    'amenity_management_facilities',
    'amenity_management_resources',
    'amenity_management_maintenance_blocks',
    'amenity_management_maintenance_impacts',
    'amenitybookings',
    'bookings',
    'amenity_management_reservations',
    'amenity_management_reservation_holds',
    'amenity_management_slot_allocations',
    'amenity_management_allocation_ledger',
    'amenity_management_quota_allocations',
    'amenity_management_access_passes',
    'amenity_management_idempotency_records',
    'amenity_management_counters',
    'amenity_management_outbox_events',
  ];

  for (const colName of wipeCollections) {
    const res = await db.collection(colName).deleteMany({});
    console.log(`  - Cleared collection '${colName}': deleted ${res.deletedCount} documents.`);
  }

  // 2. Find all non-platform organizations
  const orgs = await db.collection('organizations').find({ isPlatform: { $ne: true } }).toArray();
  console.log(`\n[RESET & SEED] Found ${orgs.length} non-platform organizations.`);

  const v2Facilities = [];
  const legacyAmenities = [];

  const now = new Date();

  for (const org of orgs) {
    const orgId = org._id;

    // --- 1. BASKETBALL COURT ---
    const bballId = new mongoose.Types.ObjectId();
    const bballV2 = {
      _id: bballId,
      orgId,
      name: 'Basketball Court',
      code: 'SPORT-BBALL-01',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Standard outdoor floodlit basketball court with tournament hoops and acrylic sports flooring.',
      location: 'Sports Complex - Court 2',
      category: 'Sports',
      images: [],
      imageUrl: '',
      timezone: 'UTC',
      operatingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        dayOfWeek: day,
        openTime: '06:00',
        closeTime: '22:00',
        isOpen: true,
      })),
      slotDurationMinutes: 60,
      maxCapacity: 10,
      maxHeadcountPerReservation: 10,
      setupBufferMinutes: 15,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 150,
        currency: 'INR',
        securityDeposit: 50,
        taxPercentage: 18,
        cancellationFee: 25,
      },
      requiresApproval: false,
      cancellationPolicy: {
        isAllowed: true,
        refundCutoffHours: 12,
        refundPercentage: 100,
      },
      paymentPolicy: {
        mode: 'FULL',
        advanceType: 'PERCENT',
        advanceValue: 0,
      },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    const bballLegacy = {
      _id: bballId,
      orgId,
      name: 'Basketball Court',
      description: 'Standard outdoor floodlit basketball court with tournament hoops and acrylic sports flooring.',
      type: 'court',
      category: 'Sports',
      archetype: 'EXCLUSIVE_HOURLY',
      code: 'SPORT-BBALL-01',
      location: 'Sports Complex - Court 2',
      images: [],
      pricing: {
        baseRate: 150,
        pricingType: 'hourly',
        peakRateMultiplier: 1,
        weekendRateMultiplier: 1,
        holidayRateMultiplier: 1,
        securityDeposit: 50,
        securityDepositDescription: 'Refundable deposit against equipment damages.',
        taxPercentage: 18,
        cancellationChargePercentage: 15,
        dynamicPricingEnabled: false,
      },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      capacity: 10,
      bookingRules: {
        slotDurationMinutes: 60,
        bufferTimeMinutes: 15,
        openTime: '06:00',
        closeTime: '22:00',
        maxBookingsPerUserPerSlot: 2,
        advanceBookingDays: 7,
        minAdvanceBookingHours: 1,
        isCancellationEnabled: true,
        holidayCalendarIds: [],
        weeklyOffDays: [],
        cancellationRefundRules: [],
      },
      status: 'active',
      isDeleted: false,
      maintenanceSchedules: [],
      createdAt: now,
      updatedAt: now,
    };

    // --- 2. TENNIS COURT ---
    const tennisId = new mongoose.Types.ObjectId();
    const tennisV2 = {
      _id: tennisId,
      orgId,
      name: 'Tennis Court',
      code: 'SPORT-TENNIS-01',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Championship floodlit synthetic turf tennis court with player seating and automated ball machine.',
      location: 'Sports Complex - Court 1',
      category: 'Sports',
      images: [],
      imageUrl: '',
      timezone: 'UTC',
      operatingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        dayOfWeek: day,
        openTime: '06:00',
        closeTime: '22:00',
        isOpen: true,
      })),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 4,
      setupBufferMinutes: 15,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 200,
        currency: 'INR',
        securityDeposit: 100,
        taxPercentage: 18,
        cancellationFee: 50,
      },
      requiresApproval: false,
      cancellationPolicy: {
        isAllowed: true,
        refundCutoffHours: 24,
        refundPercentage: 100,
      },
      paymentPolicy: {
        mode: 'FULL',
        advanceType: 'PERCENT',
        advanceValue: 0,
      },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    const tennisLegacy = {
      _id: tennisId,
      orgId,
      name: 'Tennis Court',
      description: 'Championship floodlit synthetic turf tennis court with player seating and automated ball machine.',
      type: 'court',
      category: 'Sports',
      archetype: 'EXCLUSIVE_HOURLY',
      code: 'SPORT-TENNIS-01',
      location: 'Sports Complex - Court 1',
      images: [],
      pricing: {
        baseRate: 200,
        pricingType: 'hourly',
        peakRateMultiplier: 1,
        weekendRateMultiplier: 1,
        holidayRateMultiplier: 1,
        securityDeposit: 100,
        securityDepositDescription: 'Refundable deposit against equipment damages.',
        taxPercentage: 18,
        cancellationChargePercentage: 25,
        dynamicPricingEnabled: false,
      },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      capacity: 4,
      bookingRules: {
        slotDurationMinutes: 60,
        bufferTimeMinutes: 15,
        openTime: '06:00',
        closeTime: '22:00',
        maxBookingsPerUserPerSlot: 2,
        advanceBookingDays: 7,
        minAdvanceBookingHours: 2,
        isCancellationEnabled: true,
        holidayCalendarIds: [],
        weeklyOffDays: [],
        cancellationRefundRules: [],
      },
      status: 'active',
      isDeleted: false,
      maintenanceSchedules: [],
      createdAt: now,
      updatedAt: now,
    };

    v2Facilities.push(bballV2, tennisV2);
    legacyAmenities.push(bballLegacy, tennisLegacy);
  }

  if (v2Facilities.length > 0) {
    await db.collection('amenity_management_facilities').insertMany(v2Facilities);
    await db.collection('amenities').insertMany(legacyAmenities);
    console.log(`\n[RESET & SEED] Successfully inserted ${v2Facilities.length} facilities across ${orgs.length} organizations.`);
  }

  // Double check counts
  console.log('\n[RESET & SEED] Verification of database state:');
  for (const colName of wipeCollections) {
    const count = await db.collection(colName).countDocuments();
    console.log(`  - ${colName}: ${count} documents`);
  }

  await mongoose.disconnect();
  console.log('[RESET & SEED] Done!');
}

resetAndSeedTwoAmenities().catch((err) => {
  console.error('[RESET & SEED] Error:', err);
  process.exit(1);
});
