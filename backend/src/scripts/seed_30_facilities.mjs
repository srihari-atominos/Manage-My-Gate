import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/database_name';

/**
 * Standard operating hours for all 7 days of the week
 */
const createWeeklyOperatingHours = (openTime = '06:00', closeTime = '22:00') => {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    openTime,
    closeTime,
    isOpen: true,
  }));
};

export async function seed30Facilities() {
  console.log(`[SEED-30] Connecting to MongoDB at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('[SEED-30] Connected successfully.');

  const db = mongoose.connection.db;

  const orgs = await db.collection('organizations').find({}).toArray();
  if (!orgs || orgs.length === 0) {
    console.error('[SEED-30] No organizations found in database!');
    process.exit(1);
  }

  console.log(`[SEED-30] Seeding 30 facilities across 5 archetypes for ${orgs.length} organization(s).`);

  for (const org of orgs) {
    const orgId = org._id;
    console.log(`\n--------------------------------------------------`);
    console.log(`[SEED-30] Seeding for organization: "${org.name}" (${orgId})`);

    // Clean existing amenity collections for this organization
    await db.collection('amenity_management_facilities').deleteMany({ orgId });
    await db.collection('amenity_management_resources').deleteMany({ orgId });
    await db.collection('amenity_management_maintenance_blocks').deleteMany({ orgId });
    await db.collection('amenities').deleteMany({ orgId });

    const facilities = [];
    const resources = [];

    // =========================================================================
    // ARCHETYPE 1: SHARED_CAPACITY (6 Facilities)
    // Multiple residents can book the same time slot up to maxCapacity
    // =========================================================================
    
    // 1. Olympic Swimming Pool
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Olympic Swimming Pool & Splash Deck',
      code: 'POOL-OLYMPIC-01',
      archetype: 'SHARED_CAPACITY',
      description: '50m temperature-controlled 8-lane swimming pool with dedicated diving boards and children splash area.',
      location: 'Clubhouse - Ground Floor (East Wing)',
      category: 'Aquatics',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('06:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 40,
      maxHeadcountPerReservation: 4,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 1, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Fitness Gym & Functional Cardio Studio
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'High-Altitude Fitness Gym & Cardio Studio',
      code: 'GYM-CARDIO-02',
      archetype: 'SHARED_CAPACITY',
      description: 'Fully equipped fitness center with Technogym treadmills, ellipticals, free weights, and crossfit rigs.',
      location: 'Clubhouse - 2nd Floor',
      category: 'Fitness',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('05:00', '23:00'),
      slotDurationMinutes: 60,
      maxCapacity: 35,
      maxHeadcountPerReservation: 2,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 1, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Zen Yoga & Pilates Sanctuary
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Zen Yoga & Pilates Sanctuary',
      code: 'YOGA-SANCTUARY-03',
      archetype: 'SHARED_CAPACITY',
      description: 'Tranquil hardwood floor studio with ambient lighting, meditation bolsters, and reformer Pilates equipment.',
      location: 'Wellness Pavilion - Level 1',
      category: 'Wellness',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('06:00', '21:00'),
      slotDurationMinutes: 60,
      maxCapacity: 25,
      maxHeadcountPerReservation: 2,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Hydrotherapy Steam & Sauna Lounge
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Hydrotherapy Steam & Sauna Lounge',
      code: 'SPA-STEAM-04',
      archetype: 'SHARED_CAPACITY',
      description: 'Scandinavian pine sauna and eucalyptus steam rooms with temperature-monitored cold plunge baths.',
      location: 'Spa & Wellness Wing - Basement 1',
      category: 'Wellness',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('07:00', '21:00'),
      slotDurationMinutes: 60,
      maxCapacity: 12,
      maxHeadcountPerReservation: 2,
      advanceBookingDays: 5,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 100,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 4, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Skyline Rooftop Jogging & Aerobic Track
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Skyline Rooftop Jogging & Aerobic Track',
      code: 'TRACK-SKYLINE-05',
      archetype: 'SHARED_CAPACITY',
      description: 'Cushioned 400m synthetic rubber jogging track on the 25th floor rooftop with 360-degree skyline views.',
      location: 'Tower A - Rooftop Level',
      category: 'Outdoor',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('05:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 50,
      maxHeadcountPerReservation: 5,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 1, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Kids Water Splash Park & Adventure Lagoon
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Kids Water Splash Park & Adventure Lagoon',
      code: 'KIDS-SPLASH-06',
      archetype: 'SHARED_CAPACITY',
      description: 'Safe shallow water park for kids under 12 featuring tipping water buckets, mini slides, and fountain jets.',
      location: 'Central Community Park',
      category: 'Family',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '19:00'),
      slotDurationMinutes: 60,
      maxCapacity: 30,
      maxHeadcountPerReservation: 4,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // =========================================================================
    // ARCHETYPE 2: EXCLUSIVE_HOURLY (6 Facilities)
    // Only one booking allowed per time slot (court/arena locked)
    // =========================================================================

    // 7. Championship Lawn Tennis Court
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Championship Lawn Tennis Court',
      code: 'SPORT-TENNIS-01',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Floodlit ITF-standard synthetic acrylic surface court with professional tournament grade netting.',
      location: 'Outdoor Sports Arena - Court 1',
      category: 'Sports',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('06:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 4,
      setupBufferMinutes: 10,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 200,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 50,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 4, refundPercentage: 80 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. Teakwood Indoor Badminton Arena
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Teakwood Indoor Badminton Arena',
      code: 'SPORT-BADMINTON-02',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'BWF certified wooden suspension flooring court with anti-glare high-bay LED tournament lighting.',
      location: 'Sports Complex - Hall B',
      category: 'Sports',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('06:00', '23:00'),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 4,
      setupBufferMinutes: 10,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 150,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 30,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 3, refundPercentage: 90 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 9. Glass-Back Professional Squash Court
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Glass-Back Professional Squash Court',
      code: 'SPORT-SQUASH-03',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'WSF standard glass-backed air-conditioned squash court with shock-absorbent sprung parquet floor.',
      location: 'Sports Complex - 1st Floor',
      category: 'Sports',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('06:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 2,
      maxHeadcountPerReservation: 2,
      setupBufferMinutes: 10,
      advanceBookingDays: 5,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 180,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 40,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 4, refundPercentage: 85 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 10. Billiards & Snooker Private Lounge
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Billiards & Snooker Private Lounge',
      code: 'REC-SNOOKER-04',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Full-size English Riley snooker table with Belgian Aramith balls, cue racks, and ambient leather club seating.',
      location: 'Clubhouse - Games Wing',
      category: 'Recreation',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('10:00', '23:00'),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 4,
      setupBufferMinutes: 10,
      advanceBookingDays: 5,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 120,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 11. Dolby Atmos 4K Private Mini Theater
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Dolby Atmos 4K Private Mini Theater',
      code: 'MEDIA-THEATER-05',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Private 18-seat acoustic theater with 4K laser projection, Dolby Atmos 7.1.4 sound, and motorized plush recliners.',
      location: 'Clubhouse - Basement Level 1',
      category: 'Entertainment',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('10:00', '23:00'),
      slotDurationMinutes: 180,
      maxCapacity: 18,
      maxHeadcountPerReservation: 18,
      setupBufferMinutes: 20,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 500,
        currency: 'INR',
        securityDeposit: 500,
        taxPercentage: 18,
        cancellationFee: 150,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 12, refundPercentage: 80 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 12. Table Tennis & Foosball Arena
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Table Tennis & Foosball Arena',
      code: 'REC-TABLETENNIS-06',
      archetype: 'EXCLUSIVE_HOURLY',
      description: 'Stiga professional competition table tennis station with butterfly racquets and wooden foosball table.',
      location: 'Clubhouse - Mezzanine Level',
      category: 'Sports',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('07:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 4,
      setupBufferMinutes: 5,
      advanceBookingDays: 5,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 80,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // =========================================================================
    // ARCHETYPE 3: EVENT_SPACE (6 Facilities)
    // Daily / multi-hour party halls, lawns, and banquet grounds
    // =========================================================================

    // 13. Grand Royal Ballroom & Banquet Lawn
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Grand Royal Ballroom & Banquet Lawn',
      code: 'HALL-BALLROOM-01',
      archetype: 'EVENT_SPACE',
      description: 'Palatial banquet hall with private landscaped lawn, theatrical stage, and commercial catering pantry.',
      location: 'Community Cultural Center - Ground Floor',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '23:59'),
      slotDurationMinutes: 1440,
      maxCapacity: 250,
      maxHeadcountPerReservation: 250,
      advanceBookingDays: 30,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 5000,
        currency: 'INR',
        securityDeposit: 2000,
        taxPercentage: 18,
        cancellationFee: 500,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 72, refundPercentage: 80 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 14. Sunset Open-Air Amphitheater
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Sunset Open-Air Amphitheater',
      code: 'AMPHI-SUNSET-02',
      archetype: 'EVENT_SPACE',
      description: 'Tiered semi-circular open amphitheater for musical concerts, drama, and community cultural festivals.',
      location: 'South Lake Park Promenade',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('16:00', '22:00'),
      slotDurationMinutes: 360,
      maxCapacity: 300,
      maxHeadcountPerReservation: 300,
      advanceBookingDays: 30,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 2500,
        currency: 'INR',
        securityDeposit: 1000,
        taxPercentage: 18,
        cancellationFee: 250,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 48, refundPercentage: 90 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 15. Pergola BBQ Party Lawn & Grill Deck
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Pergola BBQ Party Lawn & Grill Deck',
      code: 'LAWN-BBQ-03',
      archetype: 'EVENT_SPACE',
      description: 'Wooden pergola gazebo with built-in stainless steel charcoal barbecue pits, prep sink, and fairy lighting.',
      location: 'East Lawn Promenade',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('16:00', '23:00'),
      slotDurationMinutes: 300,
      maxCapacity: 40,
      maxHeadcountPerReservation: 40,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 1200,
        currency: 'INR',
        securityDeposit: 500,
        taxPercentage: 18,
        cancellationFee: 100,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 24, refundPercentage: 85 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 16. Clubhouse Multipurpose Community Hall
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Clubhouse Multipurpose Community Hall',
      code: 'HALL-COMMUNITY-04',
      archetype: 'EVENT_SPACE',
      description: 'Air-conditioned hall with projector setup, PA system, and banquet seating for community townhalls and weddings.',
      location: 'Clubhouse - 1st Floor Central Wing',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '22:00'),
      slotDurationMinutes: 720,
      maxCapacity: 150,
      maxHeadcountPerReservation: 150,
      advanceBookingDays: 21,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 3000,
        currency: 'INR',
        securityDeposit: 1500,
        taxPercentage: 18,
        cancellationFee: 300,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 48, refundPercentage: 80 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 17. Sky Lounge & Open Terrace Pavilion
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Sky Lounge & Open Terrace Pavilion',
      code: 'TERRACE-SKYLOUNGE-05',
      archetype: 'EVENT_SPACE',
      description: 'Chic rooftop party deck with bar counters, lounge seating, fire pit, and skyline night views.',
      location: 'Tower C - 22nd Floor Rooftop',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('17:00', '23:30'),
      slotDurationMinutes: 360,
      maxCapacity: 60,
      maxHeadcountPerReservation: 60,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 2000,
        currency: 'INR',
        securityDeposit: 1000,
        taxPercentage: 18,
        cancellationFee: 200,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 24, refundPercentage: 90 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 18. Children Birthday Party Gazebo & Garden
    facilities.push({
      _id: new mongoose.Types.ObjectId(),
      orgId,
      name: 'Children Birthday Party Gazebo & Garden',
      code: 'GAZEBO-PARTY-06',
      archetype: 'EVENT_SPACE',
      description: 'Lush enclosed lawn with decorated wooden party gazebo, picnic tables, and proximity to the playground.',
      location: 'North Garden Promenade',
      category: 'Event Space',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('10:00', '20:00'),
      slotDurationMinutes: 240,
      maxCapacity: 50,
      maxHeadcountPerReservation: 50,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'DAILY',
        baseRate: 1500,
        currency: 'INR',
        securityDeposit: 500,
        taxPercentage: 18,
        cancellationFee: 100,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 24, refundPercentage: 90 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // =========================================================================
    // ARCHETYPE 4: ROOM_RESOURCE (6 Facilities)
    // Multi-resource room suites with discrete sub-rooms / pods
    // =========================================================================

    // 19. Smart Co-Working Hub & Meeting Suites
    const coworkId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: coworkId,
      orgId,
      name: 'Smart Co-Working Hub & Meeting Suites',
      code: 'COWORK-HUB-01',
      archetype: 'ROOM_RESOURCE',
      description: 'Executive workspace with high-speed fiber internet, ergonomic chairs, and private soundproof pods.',
      location: 'Clubhouse - 3rd Floor Wing B',
      category: 'Workspace',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '21:00'),
      slotDurationMinutes: 60,
      maxCapacity: 20,
      maxHeadcountPerReservation: 8,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 150,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: coworkId,
        name: 'Executive Boardroom Alpha (10 Pax)',
        identifier: 'ROOM-ALPHA-01',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: coworkId,
        name: 'Private Focus Pod Beta (1 Pax)',
        identifier: 'POD-BETA-02',
        setupBufferMinutes: 5,
        teardownBufferMinutes: 5,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 20. Innovation Video Conference Boardroom
    const confId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: confId,
      orgId,
      name: 'Innovation Video Conference Boardroom',
      code: 'CONF-BOARDROOM-02',
      archetype: 'ROOM_RESOURCE',
      description: 'Cisco Webex & Zoom Rooms certified corporate conference room with 85-inch digital whiteboard display.',
      location: 'Business Center - Level 2',
      category: 'Workspace',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '20:00'),
      slotDurationMinutes: 60,
      maxCapacity: 16,
      maxHeadcountPerReservation: 16,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 250,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 18,
        cancellationFee: 50,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 4, refundPercentage: 90 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: confId,
        name: 'Video Boardroom Suite 1',
        identifier: 'SUITE-VIDEO-01',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: confId,
        name: 'Executive Round Table 2',
        identifier: 'ROUND-EXEC-02',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 21. Soundproof Music Jamming & Podcast Studio
    const studioId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: studioId,
      orgId,
      name: 'Soundproof Music Jamming & Podcast Studio',
      code: 'STUDIO-MUSIC-03',
      archetype: 'ROOM_RESOURCE',
      description: 'Acoustically isolated room with Shure podcast microphones, Yamaha electronic drum kit, and Fender amplifiers.',
      location: 'Arts & Culture Center - Basement',
      category: 'Creative',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('09:00', '22:00'),
      slotDurationMinutes: 60,
      maxCapacity: 8,
      maxHeadcountPerReservation: 8,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 200,
        currency: 'INR',
        securityDeposit: 200,
        taxPercentage: 18,
        cancellationFee: 30,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 4, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: studioId,
        name: 'Acoustic Jamming Room A',
        identifier: 'JAM-ROOM-A',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: studioId,
        name: 'Voiceover & Podcast Booth B',
        identifier: 'PODCAST-BOOTH-B',
        setupBufferMinutes: 5,
        teardownBufferMinutes: 5,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 22. Silent Study Pods & Digital Library
    const libId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: libId,
      orgId,
      name: 'Silent Study Pods & Digital Library',
      code: 'LIB-STUDY-04',
      archetype: 'ROOM_RESOURCE',
      description: 'Quiet study desks with reading lamps, Kindle stations, and a collection of 5,000 physical and digital books.',
      location: 'Heritage Center - 2nd Floor',
      category: 'Education',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('07:00', '22:00'),
      slotDurationMinutes: 120,
      maxCapacity: 30,
      maxHeadcountPerReservation: 4,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 1, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: libId,
        name: 'Silent Reading Carrel 1',
        identifier: 'CARREL-QUIET-01',
        setupBufferMinutes: 0,
        teardownBufferMinutes: 0,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: libId,
        name: 'Group Discussion Cubicle 2',
        identifier: 'CUBICLE-GROUP-02',
        setupBufferMinutes: 5,
        teardownBufferMinutes: 5,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 23. Resident Wellness Consultation Suite
    const wellnessId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: wellnessId,
      orgId,
      name: 'Resident Wellness Consultation Suite',
      code: 'WELL-CONSULT-05',
      archetype: 'ROOM_RESOURCE',
      description: 'Private medical and physiotherapy examination chamber for visiting doctors, dietitians, and physiotherapists.',
      location: 'Medical Center - Room 101',
      category: 'Healthcare',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('09:00', '18:00'),
      slotDurationMinutes: 60,
      maxCapacity: 4,
      maxHeadcountPerReservation: 2,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 0,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: wellnessId,
        name: 'Consultation Chamber A',
        identifier: 'CHAMBER-A-01',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: wellnessId,
        name: 'Physiotherapy Suite B',
        identifier: 'PHYSIO-B-02',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 24. Private Dining & Culinary Tasting Room
    const diningId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: diningId,
      orgId,
      name: 'Private Dining & Culinary Tasting Room',
      code: 'DINING-PRIVATE-06',
      archetype: 'ROOM_RESOURCE',
      description: 'Exclusive 12-seat private dining room with butler service pantry, wine cooler, and fine bone china settings.',
      location: 'Clubhouse - Wine Cellar Level',
      category: 'Dining',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('18:00', '23:30'),
      slotDurationMinutes: 120,
      maxCapacity: 12,
      maxHeadcountPerReservation: 12,
      advanceBookingDays: 10,
      pricingConfig: {
        pricingType: 'HOURLY',
        baseRate: 350,
        currency: 'INR',
        securityDeposit: 500,
        taxPercentage: 18,
        cancellationFee: 100,
      },
      requiresApproval: true,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 12, refundPercentage: 80 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: diningId,
        name: 'Chef Tasting Table 1',
        identifier: 'TABLE-CHEF-01',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: diningId,
        name: 'Sommelier Lounge 2',
        identifier: 'LOUNGE-WINE-02',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: false,
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // =========================================================================
    // ARCHETYPE 5: INVENTORY_TOOLS (6 Facilities)
    // Physical tool and asset library available for resident loan checkout
    // =========================================================================

    // 25. Community Power Toolkit & Asset Library
    const toolLibId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: toolLibId,
      orgId,
      name: 'Community Power Toolkit & Asset Library',
      code: 'TOOL-LIBRARY-01',
      archetype: 'INVENTORY_TOOLS',
      description: 'Borrow heavy-duty cordless impact drills, pressure washers, and telescopic ladders for home DIY improvements.',
      location: 'Estate Maintenance Facility - Gate 3',
      category: 'Utility',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '18:00'),
      slotDurationMinutes: 1440,
      maxCapacity: 10,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 100,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: toolLibId,
        name: 'Bosch 18V Cordless Impact Drill Kit',
        identifier: 'TOOL-BOSCH-01',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'BSH-98421-IMP',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: toolLibId,
        name: 'Kärcher K5 High-Pressure Surface Washer',
        identifier: 'TOOL-KARCHER-02',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'KRC-55219-HPC',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: toolLibId,
        name: 'Werner 12ft Telescopic Aluminum Ladder',
        identifier: 'TOOL-LADDER-03',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'WRN-12003-LAD',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 26. Automotive Care & Tire Station
    const autoId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: autoId,
      orgId,
      name: 'Automotive Care & Tire Station',
      code: 'AUTO-CARE-02',
      archetype: 'INVENTORY_TOOLS',
      description: 'Self-service automotive maintenance kits including digital tire inflators, hydraulic jacks, and OBD2 diagnostic scanners.',
      location: 'Basement Parking P2 - Bay 4',
      category: 'Utility',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('08:00', '20:00'),
      slotDurationMinutes: 720,
      maxCapacity: 6,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 200,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: autoId,
        name: 'Michelin Digital Tire Pressure Pump & Gauge',
        identifier: 'AUTO-PUMP-01',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'MCH-TIRE-991',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: autoId,
        name: '3-Ton Hydraulic Low Profile Trolley Jack',
        identifier: 'AUTO-JACK-02',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'JCK-3TON-441',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: autoId,
        name: 'Autel Bluetooth OBD2 Vehicle Diagnostic Scanner',
        identifier: 'AUTO-SCAN-03',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'ATL-OBD-102',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 27. Camping & Outdoor Adventure Gear
    const campId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: campId,
      orgId,
      name: 'Camping & Outdoor Adventure Gear',
      code: 'CAMP-EQUIP-03',
      archetype: 'INVENTORY_TOOLS',
      description: 'Outdoor excursion equipment: 4-person waterproof dome tents, dual burner camping stoves, and thermal sleeping pads.',
      location: 'Recreation Depot - Clubhouse Ground Floor',
      category: 'Recreation',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('09:00', '17:00'),
      slotDurationMinutes: 1440,
      maxCapacity: 8,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 300,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 12, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: campId,
        name: 'Coleman 4-Person WeatherMaster Waterproof Tent',
        identifier: 'CAMP-TENT-01',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'CLM-TNT-401',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: campId,
        name: 'Campingaz Dual-Burner Portable Gas Stove',
        identifier: 'CAMP-STOVE-02',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'CGZ-STV-202',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 28. High-Power Stargazing Telescope Kit
    const teleId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: teleId,
      orgId,
      name: 'High-Power Stargazing Telescope Kit',
      code: 'OPTIC-TELESCOPE-04',
      archetype: 'INVENTORY_TOOLS',
      description: 'Motorized computerized GoTo astronomical telescopes with moon filter and smartphone photo adapters.',
      location: 'Astronomy Club Store - Tower A',
      category: 'Hobbies',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('16:00', '20:00'),
      slotDurationMinutes: 1440,
      maxCapacity: 3,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 500,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 6, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: teleId,
        name: 'Celestron NexStar 8SE Schmidt-Cassegrain Telescope',
        identifier: 'TELE-CELESTRON-01',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'CLS-8SE-8831',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: teleId,
        name: 'Sky-Watcher Dobsonian Reflector 200mm',
        identifier: 'TELE-SKY-02',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'SKW-DOB-2002',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 29. Gardening & Landscaping Machinery Depot
    const gardenId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: gardenId,
      orgId,
      name: 'Gardening & Landscaping Machinery Depot',
      code: 'GARDEN-MOWER-05',
      archetype: 'INVENTORY_TOOLS',
      description: 'Electric rotary lawn mowers, cordless hedge shears, and leaf vacuums for private villa garden grooming.',
      location: 'Central Botanical Nursery Shed',
      category: 'Utility',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('07:00', '17:00'),
      slotDurationMinutes: 720,
      maxCapacity: 6,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 7,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 150,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 2, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: gardenId,
        name: 'Makita Cordless 36V Rotary Lawn Mower',
        identifier: 'MOW-MAKITA-01',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'MKT-MOW-36V',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: gardenId,
        name: 'Stihl Battery Handheld Hedge Trimmer',
        identifier: 'TRIM-STIHL-02',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
        isSerializedAsset: true,
        serialNumber: 'STL-HDG-404',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // 30. AV Projection & Party Sound System Kit
    const avId = new mongoose.Types.ObjectId();
    facilities.push({
      _id: avId,
      orgId,
      name: 'AV Projection & Party Sound System Kit',
      code: 'AV-SOUND-06',
      archetype: 'INVENTORY_TOOLS',
      description: 'Portable high-output party sound equipment with wireless UHF microphones and portable projector screens.',
      location: 'Cultural Committee Media Store',
      category: 'Entertainment',
      timezone: 'Asia/Kolkata',
      operatingHours: createWeeklyOperatingHours('09:00', '18:00'),
      slotDurationMinutes: 1440,
      maxCapacity: 4,
      maxHeadcountPerReservation: 1,
      advanceBookingDays: 14,
      pricingConfig: {
        pricingType: 'FREE',
        baseRate: 0,
        currency: 'INR',
        securityDeposit: 400,
        taxPercentage: 0,
        cancellationFee: 0,
      },
      requiresApproval: false,
      cancellationPolicy: { isAllowed: true, refundCutoffHours: 6, refundPercentage: 100 },
      status: 'ACTIVE',
      isDraft: false,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      concurrencyVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    resources.push(
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: avId,
        name: 'JBL PartyBox 310 Portable Bluetooth Sound System',
        identifier: 'AV-JBL-01',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'JBL-PB310-912',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        orgId,
        facilityId: avId,
        name: 'Epson Full HD Portable Projector & 100in Screen',
        identifier: 'AV-EPSON-02',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
        isSerializedAsset: true,
        serialNumber: 'EPS-PRJ-1080',
        assetState: 'AVAILABLE',
        totalBulkStock: 1,
        concurrencyVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // =========================================================================
    // DATABASE PERSISTENCE
    // =========================================================================

    // 1. Insert 30 Facilities into amenity_management_facilities
    await db.collection('amenity_management_facilities').insertMany(facilities);

    // 2. Insert all sub-resources into amenity_management_resources
    if (resources.length > 0) {
      await db.collection('amenity_management_resources').insertMany(resources);
    }

    // 3. Populate legacy amenities collection for backward compatibility
    const legacyAmenities = facilities.map((f) => ({
      _id: f._id,
      orgId: f.orgId,
      name: f.name,
      description: f.description,
      type:
        f.archetype === 'EXCLUSIVE_HOURLY'
          ? 'sports'
          : f.archetype === 'SHARED_CAPACITY'
            ? 'pool'
            : f.archetype === 'EVENT_SPACE'
              ? 'hall'
              : 'general',
      category: f.category,
      archetype: f.archetype,
      code: f.code,
      location: f.location,
      pricing: {
        baseRate: f.pricingConfig.baseRate,
        pricingType: f.pricingConfig.pricingType.toLowerCase(),
        peakRateMultiplier: 1,
        weekendRateMultiplier: 1,
        holidayRateMultiplier: 1,
        securityDeposit: f.pricingConfig.securityDeposit,
        securityDepositDescription:
          f.pricingConfig.securityDeposit > 0 ? 'Refundable deposit against equipment damages.' : null,
        taxPercentage: f.pricingConfig.taxPercentage,
        cancellationChargePercentage: 0,
        dynamicPricingEnabled: false,
      },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      capacity: f.maxCapacity,
      bookingRules: {
        slotDurationMinutes: f.slotDurationMinutes,
        bufferTimeMinutes: f.setupBufferMinutes || 10,
        openTime: f.operatingHours[0]?.openTime || '06:00',
        closeTime: f.operatingHours[0]?.closeTime || '22:00',
        maxBookingsPerUserPerSlot: f.maxHeadcountPerReservation || 2,
        advanceBookingDays: f.advanceBookingDays || 7,
        minAdvanceBookingHours: 1,
        isCancellationEnabled: f.cancellationPolicy.isAllowed,
        holidayCalendarIds: [],
        weeklyOffDays: [],
        cancellationRefundRules: [],
      },
      status: 'active',
      isDeleted: false,
      maintenanceSchedules: [],
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    await db.collection('amenities').insertMany(legacyAmenities);

    console.log(`[SEED-30] Successfully seeded ${facilities.length} facilities (6 per archetype) for "${org.name}"!`);
    console.log(`[SEED-30] Successfully seeded ${resources.length} sub-resources and physical tool assets.`);
  }

  console.log('\n==================================================');
  console.log('[SEED-30] Finished seeding 30 facilities across all 5 archetypes.');
  await mongoose.disconnect();
}

// Execute directly if run via node
seed30Facilities().catch((err) => {
  console.error('[SEED-30] Fatal error seeding facilities:', err);
  process.exit(1);
});
