import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeConversationTurn,
  detectDirectIntent,
  extractAmenityCreationDetails,
  formatAmenityCreationSummary,
  extractBookingParticipants,
  formatAmenityBookingSummary,
  formatAmenityCancellationSummary,
  attachUniversalInteractiveOptions,
  INTENTS,
  WORKFLOWS,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';
import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

const FIXED_REF_DATE = new Date('2026-10-30T10:00:00.000Z');
const TEST_ORG_ID = '507f191e810c19729de860ea';
const TEST_USER_ID = '507f191e810c19729de860eb';

const ADMIN_USER = {
  _id: TEST_USER_ID,
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: 'Admin',
  permissions: ['amenities:master', 'amenities:book', 'amenities:view'],
};

const RESIDENT_USER = {
  _id: TEST_USER_ID,
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: 'Resident',
  permissions: ['amenities:book', 'amenities:view'],
};

test.beforeEach(() => {
  resetTestServices();
});

test.afterEach(() => {
  resetTestServices();
});

// =========================================================================
// 1. Amenity Creation - Comprehensive Dynamic Configuration & Summaries
// =========================================================================

test('A1. Amenity Creation: Parses all 15 configuration fields from a single complex utterance', () => {
  const input =
    'Create Swimming Pool, Sports & Fitness, Clubhouse, First Floor, capacity 30, operating 06:00 to 21:00, ' +
    'slot 60 mins, buffer 15 mins, advance 7 days, max 4 participants per booking, max 1 booking per user, ' +
    'max 5 concurrent bookings, paid ₹100/slot, ₹500 refundable deposit, 18% tax, cancellation up to 2 hours before, ' +
    'refund: 100% before 12h, 50% before 2h, No refund within 2h, rules: Swimming costume mandatory. Children under 12 must be accompanied by an adult.';

  const details = extractAmenityCreationDetails(input);

  assert.equal(details.name, 'Swimming Pool');
  assert.equal(details.type, 'Sports & Fitness');
  assert.equal(details.location, 'Clubhouse, First Floor');
  assert.equal(details.capacity, 30);
  assert.equal(details.openTime, '06:00');
  assert.equal(details.closeTime, '21:00');
  assert.equal(details.slotDurationMinutes, 60);
  assert.equal(details.bufferTimeMinutes, 15);
  assert.equal(details.advanceBookingDays, 7);
  assert.equal(details.maxParticipantsPerBooking, 4);
  assert.equal(details.maxBookingsPerUser, 1);
  assert.equal(details.maxConcurrentBookings, 5);
  assert.equal(details.isPaid, true);
  assert.equal(details.ratePerHour, 100);
  assert.equal(details.securityDeposit, 500);
  assert.equal(details.taxPercentage, 18);
  assert.equal(details.isCancellationEnabled, true);
  assert.equal(details.minAdvanceBookingHours, 2);
  assert.equal(details.refundSummary, '100% before 12h, 50% before 2h, No refund within 2h');
  assert.equal(
    details.rules,
    'Swimming costume mandatory. Children under 12 must be accompanied by an adult.'
  );
});

test('A2. Amenity Creation Summary: Matches the exact user prompt specification format', () => {
  const collected = {
    name: 'Swimming Pool',
    type: 'Sports & Fitness',
    location: 'Clubhouse, First Floor',
    capacity: 30,
    openTime: '06:00',
    closeTime: '21:00',
    slotDurationMinutes: 60,
    bufferTimeMinutes: 15,
    advanceBookingDays: 7,
    maxParticipantsPerBooking: 4,
    maxBookingsPerUser: 1,
    maxConcurrentBookings: 5,
    isPaid: true,
    ratePerHour: 100,
    securityDeposit: 500,
    taxPercentage: 18,
    minAdvanceBookingHours: 2,
    isCancellationEnabled: true,
    refundSummary: '100% before 12h, 50% before 2h, No refund within 2h',
    rules: 'Swimming costume mandatory. Children under 12 must be accompanied by an adult.',
  };

  const summary = formatAmenityCreationSummary(collected);

  assert.ok(summary.includes('Amenity Creation Summary:'));
  assert.ok(summary.includes('* Name: Swimming Pool'));
  assert.ok(summary.includes('* Type: Sports & Fitness'));
  assert.ok(summary.includes('* Location: Clubhouse, First Floor'));
  assert.ok(summary.includes('* Physical Capacity: 30'));
  assert.ok(summary.includes('* Operating Hours: 06:00 to 21:00'));
  assert.ok(summary.includes('* Slot Duration: 60 minutes'));
  assert.ok(summary.includes('* Buffer Time: 15 minutes'));
  assert.ok(summary.includes('* Advance Booking: Up to 7 days in advance'));
  assert.ok(summary.includes('* Max Participants per Booking: 4'));
  assert.ok(summary.includes('* Max Bookings per User per Day: 1'));
  assert.ok(summary.includes('* Max Concurrent Bookings per Slot: 5'));
  assert.ok(summary.includes('* Pricing: Paid'));
  assert.ok(summary.includes('* Booking Fee: ₹100 per slot'));
  assert.ok(summary.includes('* Security Deposit: ₹500 (Refundable)'));
  assert.ok(summary.includes('* Tax: 18%'));
  assert.ok(summary.includes('* Cancellation: Allowed up to 2 hours before slot'));
  assert.ok(summary.includes('* Refund: 100% before 12h, 50% before 2h, No refund within 2h'));
  assert.ok(summary.includes('* Rules: Swimming costume mandatory. Children under 12 must be accompanied by an adult.'));
});

test('A3. Amenity Creation: Distinguishes physical capacity vs max participants per booking vs concurrent bookings', () => {
  const input =
    'Add a new Badminton Court in Sports Complex, physical capacity of 20, max 4 participants per booking, max 2 concurrent bookings per slot, max 1 booking per user';
  const details = extractAmenityCreationDetails(input);

  assert.equal(details.capacity, 20, 'Physical capacity must be 20');
  assert.equal(details.maxParticipantsPerBooking, 4, 'Max participants per booking must be 4');
  assert.equal(details.maxConcurrentBookings, 2, 'Max concurrent bookings must be 2');
  assert.equal(details.maxBookingsPerUser, 1, 'Max bookings per user must be 1');
});

test('A4. Amenity Creation Tool: prepare_amenity_creation enforces admin authorization', async () => {
  setTestServices({
    amenityService: {
      createAmenity: async () => ({ id: 'am_1' }),
      getAllAmenities: async () => [],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_creation',
    { name: 'Sky Pool', capacity: 20 }
  );

  assert.equal(res.success, false);
  assert.ok(/permission denied/i.test(res.error));
});

test('A5. Amenity Creation Tool: prepare_amenity_creation rejects duplicate amenity name', async () => {
  setTestServices({
    amenityService: {
      createAmenity: async () => ({ id: 'am_1' }),
      getAllAmenities: async () => [
        { name: 'Swimming Pool', isDeleted: false },
      ],
    },
  });

  const res = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_creation',
    { name: 'Swimming Pool', capacity: 30 }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('already exists in the community catalog'));
});

test('A6. Amenity Creation Tool: prepare_amenity_creation succeeds with complete proposal and confirmation card', async () => {
  setTestServices({
    amenityService: {
      createAmenity: async () => ({ _id: 'am_new', name: 'Rooftop Tennis', code: 'FAC-ROOFTOP-01' }),
      getAllAmenities: async () => [],
    },
  });

  const toolArgs = {
    name: 'Rooftop Tennis',
    type: 'court',
    location: 'Tower A Rooftop',
    capacity: 12,
    ratePerHour: 300,
    securityDeposit: 1000,
    taxPercentage: 18,
    slotDurationMinutes: 60,
    bufferTimeMinutes: 15,
  };

  const res = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_creation',
    toolArgs
  );

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.actionType, 'CREATE_AMENITY');
  assert.ok(res.action);
  assert.equal(res.action.title, 'Create Amenity: Rooftop Tennis');

  // Confirm pending action
  const confirmRes = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: res.data.actionId,
      confirmationToken: res.data.confirmationToken,
    }
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.executed, true);
  assert.equal(confirmRes.data.status, 'active');
  assert.ok(confirmRes.data.message.includes('created successfully'));
});

// =========================================================================
// 2. Amenity Booking Intelligence - Participants, Wallet, Online Payment
// =========================================================================

test('B1. Booking Intelligence: Extracts named participants and calculates headcount', () => {
  const input1 = 'Book badminton court tomorrow 7 AM for Rahul and Priya';
  const p1 = extractBookingParticipants(input1);
  assert.equal(p1.names, 'Rahul and Priya');
  assert.equal(p1.headcount, 2);

  const input2 = 'Book swimming pool for me and Priya at 6 PM';
  const p2 = extractBookingParticipants(input2);
  assert.equal(p2.names, 'me and Priya');
  assert.equal(p2.headcount, 2);

  const input3 = 'Book tennis court tomorrow 8 AM with Amit, Sneha and Raj';
  const p3 = extractBookingParticipants(input3);
  assert.equal(p3.names, 'Amit, Sneha and Raj');
  assert.equal(p3.headcount, 3);
});

test('B2. Booking Intelligence: prepare_amenity_booking generates exact prompt summary with sufficient wallet', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_badminton_1',
          name: 'Badminton Court 1',
          type: 'court',
          capacity: 4,
          pricing: { baseRate: 200, taxPercentage: 18 },
          bookingRules: { minAdvanceBookingHours: 2 },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '07:00', endTime: '08:00' }],
    },
    walletService: {
      getWallet: async () => ({ balance: 850 }),
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Badminton Court 1',
      date: '2026-10-31',
      dateLabel: 'Tomorrow (25 Oct 2024)',
      slotTime: '07:00',
      endTime: '08:00',
      participantNames: 'Rahul and Priya',
      headcount: 2,
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.isWalletShort, false);
  assert.equal(res.data.preferredPaymentMethod, 'WALLET');

  const msg = res.data.message;
  assert.ok(msg.includes('Booking Summary:'));
  assert.ok(msg.includes('* Amenity: Badminton Court 1'));
  assert.ok(msg.includes('* Date: Tomorrow (25 Oct 2024)'));
  assert.ok(msg.includes('* Time: 07:00 - 08:00'));
  assert.ok(msg.includes('* Participants: Rahul and Priya (2 persons)'));
  assert.ok(msg.includes('* Booking Fee: ₹200'));
  assert.ok(msg.includes('* Tax (18%): ₹36'));
  assert.ok(msg.includes('* Total Amount: ₹236'));
  assert.ok(msg.includes('* Payment Method: Digital Wallet (Current Balance: ₹850)'));
  assert.ok(msg.includes('* Cancellation Policy: Free cancellation up to 2 hours before slot start time.'));
});

test('B3. Booking Intelligence: Insufficient wallet balance explains shortage and directs to Online Payment', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_badminton_1',
          name: 'Badminton Court 1',
          type: 'court',
          capacity: 4,
          pricing: { baseRate: 200, taxPercentage: 18 },
          bookingRules: { minAdvanceBookingHours: 2 },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '07:00', endTime: '08:00' }],
    },
    walletService: {
      getWallet: async () => ({ balance: 50 }), // Insufficient for ₹236
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Badminton Court 1',
      date: '2026-10-31',
      slotTime: '07:00',
      endTime: '08:00',
      headcount: 2,
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.isWalletShort, true);
  assert.equal(res.data.preferredPaymentMethod, 'ONLINE');
  assert.ok(res.data.message.includes('Online Payment'));
  assert.ok(res.data.message.includes('insufficient'));
  assert.ok(res.action.confirmLabel.includes('Pay Online'));
});

test('B4. Booking Intelligence: Enforces physical capacity limit', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_badminton_1',
          name: 'Badminton Court 1',
          type: 'court',
          capacity: 4,
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Badminton Court 1',
      date: '2026-10-31',
      slotTime: '07:00',
      headcount: 8, // Exceeds capacity of 4
    }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('exceeds the maximum capacity of 4'));
});

// =========================================================================
// 3. Cancellation and Refund Intelligence
// =========================================================================

test('C1. Cancellation Intelligence: Calculates 100% refund when cancelled before cutoff deadline', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'BKG-SWIM-12345',
          amenityId: 'am_pool',
          amenity: {
            name: 'Swimming Pool',
            pricing: { securityDeposit: 500 },
            bookingRules: {
              isCancellationEnabled: true,
              cancellationRefundRules: [
                { cancelBeforeHours: 12, refundPercentage: 100 },
                { cancelBeforeHours: 2, refundPercentage: 50 },
              ],
            },
          },
          bookingDate: '2026-11-05',
          startTime: '18:00',
          endTime: '19:00',
          pricingDetails: { totalAmount: 700, securityDeposit: 500, baseAmount: 200 },
          status: 'confirmed',
          userId: TEST_USER_ID,
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { amenityName: 'Swimming Pool' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.totalPaid, 700);
  assert.equal(res.data.bookingFee, 200);
  assert.equal(res.data.securityDeposit, 500);
  assert.equal(res.data.cancellationFee, 0);
  assert.equal(res.data.refundAmount, 700);
  assert.equal(res.data.refundPercentage, 100);

  const summary = res.data.summary;
  assert.ok(summary.includes('Cancellation Summary:'));
  assert.ok(summary.includes('* Amenity: Swimming Pool'));
  assert.ok(summary.includes('* Booking ID: BKG-SWIM-12345'));
  assert.ok(summary.includes('* Booking Fee: ₹200'));
  assert.ok(summary.includes('* Security Deposit: ₹500'));
  assert.ok(summary.includes('* Total Paid: ₹700'));
  assert.ok(summary.includes('* Eligible Refund: ₹700 (100% refund'));
  assert.ok(summary.includes('* Refund Destination: Digital Wallet'));
});

test('C2. Cancellation Intelligence: Calculates 50% refund schedule and 100% deposit return for late cancellation', async () => {
  const moment = (await import('moment-timezone')).default;
  const futureSlot = moment().tz('Asia/Kolkata').add(4, 'hours');
  const bookingDate = futureSlot.format('YYYY-MM-DD');
  const startTime = futureSlot.format('HH:mm');
  const endTime = futureSlot.clone().add(1, 'hour').format('HH:mm');

  const mockBooking = {
    _id: 'BKG-555',
    amenityId: 'am_court',
    amenity: {
      name: 'Tennis Court',
      pricing: { securityDeposit: 200 },
      bookingRules: {
        isCancellationEnabled: true,
        cancellationRefundRules: [
          { cancelBeforeHours: 12, refundPercentage: 100 },
          { cancelBeforeHours: 2, refundPercentage: 50 },
        ],
      },
    },
    bookingDate,
    startTime, // ~4 hours from now, matches 50% rule (between 2h and 12h)
    endTime,
    pricingDetails: { totalAmount: 400, securityDeposit: 200, baseAmount: 200 },
    status: 'confirmed',
    userId: TEST_USER_ID,
  };

  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [mockBooking],
      getBookingById: async () => mockBooking,
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { bookingId: 'BKG-555' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.bookingFee, 200);
  assert.equal(res.data.securityDeposit, 200);
  assert.equal(res.data.refundPercentage, 50);
  assert.equal(res.data.cancellationFee, 100, '50% of ₹200 fee deducted as cancellation fee');
  assert.equal(res.data.refundAmount, 300, '₹200 deposit + ₹100 refunded fee = ₹300 total refund');
});

test('C3. Cancellation Intelligence: Recognizes cancellation policy inquiries without initiating cancellation', () => {
  const query = 'What is the cancellation policy for swimming pool?';
  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);

  assert.equal(turnState.activeIntent, INTENTS.AMENITY_INQUIRY);
  assert.equal(turnState.workflow, 'amenity_policy_inquiry');
  assert.equal(turnState.collectedDetails.inquiryType, 'cancellation_policy');
  assert.equal(turnState.collectedDetails.amenityName, 'Swimming Pool');
  assert.equal(turnState.awaitingConfirmation, false, 'Policy inquiries must not trigger direct cancellation proposal');
});

test('C4. Cancellation Execution: confirmPendingAction reports truthful refund status and never reports pending as completed', async () => {
  setTestServices({
    amenityBookingService: {
      cancelBooking: async (id, uid, oid, reason) => ({
        bookingId: id,
        status: 'cancelled',
        paymentStatus: 'refunded',
        refundAmount: 700,
        refundPercentage: 100,
      }),
    },
  });

  // Test full refund success
  const proposalRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    {
      bookingId: 'BKG-SWIM-1',
      amenityName: 'Swimming Pool',
    }
  );

  // Inject a mock booking if needed or test confirm directly
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'BKG-SWIM-1',
          amenityName: 'Swimming Pool',
          bookingDate: '2026-11-05',
          startTime: '18:00',
          endTime: '19:00',
          status: 'confirmed',
          pricingDetails: { totalAmount: 700 },
          userId: TEST_USER_ID,
        },
      ],
      cancelBooking: async () => ({
        status: 'cancelled',
        paymentStatus: 'refunded',
        refundAmount: 700,
        refundPercentage: 100,
      }),
    },
  });

  const prep = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { amenityName: 'Swimming Pool' }
  );

  const confirmResult = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prep.data.actionId,
      confirmationToken: prep.data.confirmationToken,
    }
  );

  assert.equal(confirmResult.success, true);
  assert.equal(confirmResult.executed, true);
  assert.equal(confirmResult.data.status, 'cancelled');
  assert.equal(confirmResult.data.paymentStatus, 'refunded');
  assert.ok(confirmResult.data.message.includes('credited to your digital wallet'));
});

// =========================================================================
// 4. Advanced Limits, Payment Methods & Error Scenarios
// =========================================================================

test('D1. Booking Intelligence: Enforces max participants per booking limit distinct from physical capacity', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_badminton_1',
          name: 'Badminton Court 1',
          type: 'court',
          capacity: 30, // Large facility capacity
          bookingRules: {
            maxParticipantsPerBooking: 4, // Max 4 players per match
          },
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Badminton Court 1',
      date: '2026-10-31',
      slotTime: '07:00',
      headcount: 6, // Exceeds participants limit of 4
    }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('exceeds the maximum allowed participants per booking (4)'));
});

test('D2. Booking Intelligence: Enforces daily max bookings per user limit', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_court_1',
          name: 'Tennis Court',
          type: 'court',
          capacity: 8,
          bookingRules: {
            maxBookingsPerUser: 1, // Only 1 booking per day
          },
        },
      ],
    },
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'bkg_existing_1',
          amenityId: 'am_court_1',
          status: 'confirmed',
          bookingDate: '2026-10-31',
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Tennis Court',
      date: '2026-10-31',
      slotTime: '09:00',
      headcount: 2,
    }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('maximum booking limit of 1 booking(s) per day'));
});

test('D3. Booking Intelligence: Free amenity booking requires no payment details', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_garden',
          name: 'Community Garden',
          type: 'garden',
          capacity: 50,
          pricing: { baseRate: 0, pricingType: 'hourly' },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '06:00', endTime: '07:00' }],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Community Garden',
      date: '2026-10-31',
      slotTime: '06:00',
      headcount: 2,
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.totalAmount, 0);
  assert.equal(res.data.preferredPaymentMethod, 'FREE');
  assert.ok(res.data.message.includes('Booking Fee: Free'));
});

test('D4. Booking Intelligence: Handles explicit Online Payment method selection', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_pool',
          name: 'Swimming Pool',
          type: 'pool',
          capacity: 20,
          pricing: { baseRate: 150 },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '17:00', endTime: '18:00' }],
    },
    walletService: {
      getWallet: async () => ({ balance: 1000 }), // Has wallet funds but chooses online
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Swimming Pool',
      date: '2026-10-31',
      slotTime: '17:00',
      headcount: 1,
      preferredPaymentMethod: 'ONLINE',
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.preferredPaymentMethod, 'ONLINE');
  assert.ok(res.data.message.includes('Online Payment'));
});

test('D5. Booking Intelligence: Slot unavailability reports error and offers available slots', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_court',
          name: 'Badminton Court',
          type: 'court',
          capacity: 4,
          pricing: { baseRate: 100 },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '08:00', endTime: '09:00' },
        { startTime: '09:00', endTime: '10:00' },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Badminton Court',
      date: '2026-10-31',
      slotTime: '15:00', // Slot not available
      headcount: 2,
    }
  );

  assert.equal(res.success, false);
  assert.equal(res.slotUnavailable, true);
  assert.ok(res.error.includes('Slot 15:00 is not available'));
  assert.ok(res.error.includes('08:00 - 09:00'));
});

test('D6. Cancellation Intelligence: Rejects cancellation if slot has already started', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'BKG-PAST-1',
          amenityId: 'am_pool',
          amenityName: 'Swimming Pool',
          bookingDate: '2026-10-25', // Past date relative to now
          startTime: '06:00',
          endTime: '07:00',
          status: 'confirmed',
          pricingDetails: { totalAmount: 200 },
          userId: TEST_USER_ID,
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { bookingId: 'BKG-PAST-1' }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('already started and can no longer be cancelled'));
});

test('D7. Cancellation Intelligence: Calculates non-refundable cancellation scenario (0% refund of booking fee)', async () => {
  const moment = (await import('moment-timezone')).default;
  const slotSoon = moment().tz('Asia/Kolkata').add(1, 'hour'); // Less than 2 hours before slot
  const bookingDate = slotSoon.format('YYYY-MM-DD');
  const startTime = slotSoon.format('HH:mm');
  const endTime = slotSoon.clone().add(1, 'hour').format('HH:mm');

  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'BKG-LATE-1',
          amenityId: 'am_pool',
          amenity: {
            name: 'Swimming Pool',
            pricing: { securityDeposit: 300 },
            bookingRules: {
              isCancellationEnabled: true,
              cancellationRefundRules: [
                { cancelBeforeHours: 12, refundPercentage: 100 },
                { cancelBeforeHours: 2, refundPercentage: 50 },
              ],
            },
          },
          bookingDate,
          startTime,
          endTime,
          pricingDetails: { totalAmount: 500, securityDeposit: 300, baseAmount: 200 },
          status: 'confirmed',
          userId: TEST_USER_ID,
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { bookingId: 'BKG-LATE-1' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.refundPercentage, 0);
  assert.equal(res.data.cancellationFee, 200, 'Full booking fee retained as cancellation fee');
  assert.equal(res.data.refundAmount, 300, 'Security deposit returned 100%');
});

test('D8. Cancellation Intelligence: Correctly distinguishes initiated / pending refund from completed refund', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'BKG-PEND-1',
          amenityName: 'Clubhouse',
          bookingDate: '2026-11-10',
          startTime: '10:00',
          endTime: '12:00',
          status: 'confirmed',
          pricingDetails: { totalAmount: 1000 },
          userId: TEST_USER_ID,
        },
      ],
      cancelBooking: async () => ({
        status: 'cancelled',
        paymentStatus: 'refund_pending', // Bank transfer or gateway refund pending
        refundAmount: 1000,
        refundPercentage: 100,
      }),
    },
  });

  const prep = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { bookingId: 'BKG-PEND-1' }
  );

  const confirmResult = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prep.data.actionId,
      confirmationToken: prep.data.confirmationToken,
    }
  );

  assert.equal(confirmResult.success, true);
  assert.equal(confirmResult.data.paymentStatus, 'refund_pending');
  assert.ok(confirmResult.data.message.includes('initiated and is currently processing'));
  assert.ok(!confirmResult.data.message.includes('has been credited'));
});

test('D9. Action Manager: Double submission is prevented with idempotent replay', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [],
      createAmenity: async (oid, p) => ({ _id: 'am_idemp_1', name: p.name, code: 'FAC-IDEMP' }),
    },
  });

  const prep = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_creation',
    { name: 'Idempotent Court', capacity: 10 }
  );

  // First confirmation
  const firstConfirm = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prep.data.actionId,
      confirmationToken: prep.data.confirmationToken,
    }
  );
  assert.equal(firstConfirm.success, true);
  assert.equal(firstConfirm.idempotentReplay, undefined);

  // Second confirmation (double submit replay)
  const secondConfirm = await executeAssistantTool(
    ADMIN_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prep.data.actionId,
      confirmationToken: prep.data.confirmationToken,
    }
  );
  assert.equal(secondConfirm.success, true);
  assert.equal(secondConfirm.idempotentReplay, true);
});

test('D10. Multi-Turn Conversation: Admin creates amenity across multiple conversational turns', () => {
  // Turn 1: Admin begins with bare intent
  const turn1 = analyzeConversationTurn('Create a new amenity', null, [], FIXED_REF_DATE);
  assert.equal(turn1.activeIntent, INTENTS.AMENITY_CREATE);
  assert.equal(turn1.workflow, WORKFLOWS.AMENITY_CREATE_INTAKE);
  assert.ok(turn1.missingFields.includes('name'));

  // Turn 2: Admin provides name and capacity
  const turn2 = analyzeConversationTurn('Badminton Court with 8 people capacity', turn1, [], FIXED_REF_DATE);
  assert.ok(turn2.collectedDetails.name.includes('Badminton'));
  assert.equal(turn2.collectedDetails.capacity, 8);
  assert.equal(turn2.workflow, WORKFLOWS.AMENITY_CREATE_READY);
  assert.equal(turn2.awaitingConfirmation, true);

  // Turn 3: Admin configures pricing before confirming
  const turn3 = analyzeConversationTurn('Make it 250 rupees per slot with one hour slots', turn2, [], FIXED_REF_DATE);
  assert.ok(turn3.collectedDetails.name.includes('Badminton'));
  assert.equal(turn3.collectedDetails.capacity, 8);
  assert.equal(turn3.collectedDetails.ratePerHour, 250);
  assert.equal(turn3.collectedDetails.slotDurationMinutes, 60);
  assert.equal(turn3.awaitingConfirmation, true);
});

test('D11. Multi-Turn Conversation: Resident corrects booking headcount without losing amenity or slot context', () => {
  // Turn 1: Initial partial booking
  const turn1 = analyzeConversationTurn('Book Badminton Court tomorrow', null, [], FIXED_REF_DATE);
  assert.equal(turn1.activeIntent, INTENTS.AMENITY_BOOKING);
  assert.equal(turn1.workflow, WORKFLOWS.AMENITY_BOOKING_INTAKE);

  // Turn 2: Providing slot and headcount
  const turn2 = analyzeConversationTurn('7 PM for 2 members', turn1, [], FIXED_REF_DATE);
  assert.ok(turn2.collectedDetails.amenityName.includes('Badminton'));
  assert.equal(turn2.collectedDetails.slotTime, '19:00');
  assert.equal(turn2.collectedDetails.headcount, 2);

  // Turn 3: Correcting headcount
  const turn3 = analyzeConversationTurn('Actually make it 4 members', turn2, [], FIXED_REF_DATE);
  assert.ok(turn3.collectedDetails.amenityName.includes('Badminton'));
  assert.equal(turn3.collectedDetails.slotTime, '19:00');
  assert.equal(turn3.collectedDetails.headcount, 4);
});

test('D12. Cancellation Intelligence: Rejects cancellation if user does not own the booking and is not admin', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [],
      getBookingById: async () => ({
        _id: 'BKG-OTHER-1',
        userId: 'different_user_999',
        amenityName: 'Badminton Court',
        bookingDate: '2026-11-05',
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
      }),
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking_cancellation',
    { bookingId: 'BKG-OTHER-1' }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('Forbidden. You can only cancel bookings made by your account.'));
});

test('E1. Multi-Slot Booking: Calculates scaled price across 13 hours (6 am - 7 pm = 13 slots)', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_bball_1',
          name: 'Basketball Court',
          type: 'court',
          capacity: 30,
          pricing: { baseRate: 1000, taxPercentage: 0 },
          bookingRules: { maxParticipantsPerBooking: 25, slotDurationMinutes: 60 },
        },
      ],
      getAvailableSlots: async () => [],
    },
    walletService: {
      getWallet: async () => ({ balance: 5000 }), // Balance 5,000, needed 13,000 -> 8,000 short
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Basketball Court',
      date: '2026-11-02',
      slotTime: '06:00',
      endTime: '19:00',
      headcount: 20,
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.durationHours, 13);
  assert.equal(res.data.slotCount, 13);
  assert.equal(res.data.rateAmount, 13000);
  assert.equal(res.data.totalAmount, 13000);
  assert.equal(res.data.isWalletShort, true);
  assert.equal(res.data.shortageAmount, 8000);

  // Verifies dual payment options
  assert.ok(Array.isArray(res.action.paymentOptions));
  assert.equal(res.action.paymentOptions.length, 2);

  const walletOpt = res.action.paymentOptions.find((o) => o.id === 'WALLET');
  assert.ok(walletOpt);
  assert.equal(walletOpt.isSufficient, false);
  assert.equal(walletOpt.shortageAmount, 8000);
  assert.ok(walletOpt.route.includes('/(resident)/billing/wallet?amount=8000'));
  assert.ok(walletOpt.actionLabel.includes('Top Up Wallet'));

  const onlineOpt = res.action.paymentOptions.find((o) => o.id === 'ONLINE');
  assert.ok(onlineOpt);
  assert.equal(onlineOpt.isSufficient, true);
  assert.ok(onlineOpt.route.includes('/(resident)/amenities/booking/am_bball_1'));
  assert.ok(onlineOpt.route.includes('payOnline=1'));
});

test('E2. Dual Payment Options: Offers Wallet and Online Payment with sufficient balance', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_bball_2',
          name: 'Basketball Court',
          type: 'court',
          capacity: 30,
          pricing: { baseRate: 500, taxPercentage: 10 },
          bookingRules: { maxParticipantsPerBooking: 25 },
        },
      ],
      getAvailableSlots: async () => [],
    },
    walletService: {
      getWallet: async () => ({ balance: 2000 }), // Total 2 hrs * 500 + 10% = 1100 -> Sufficient!
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Basketball Court',
      date: '2026-11-02',
      slotTime: '06:00',
      endTime: '08:00',
      headcount: 10,
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.durationHours, 2);
  assert.equal(res.data.rateAmount, 1000);
  assert.equal(res.data.taxAmount, 100);
  assert.equal(res.data.totalAmount, 1100);
  assert.equal(res.data.isWalletShort, false);

  const walletOpt = res.action.paymentOptions.find((o) => o.id === 'WALLET');
  assert.ok(walletOpt);
  assert.equal(walletOpt.isSufficient, true);
  assert.ok(walletOpt.actionLabel.includes('Pay ₹1100 via Wallet'));

  const onlineOpt = res.action.paymentOptions.find((o) => o.id === 'ONLINE');
  assert.ok(onlineOpt);
  assert.ok(onlineOpt.route.includes('/(resident)/amenities/booking/am_bball_2'));
});

test('E3. Headcount Rules: Rejects booking when headcount exceeds physical facility capacity', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'am_bball_3',
          name: 'Basketball Court',
          type: 'court',
          capacity: 15, // Max capacity 15
          pricing: { baseRate: 500 },
        },
      ],
    },
  });

  const res = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_amenity_booking',
    {
      amenityName: 'Basketball Court',
      date: '2026-11-02',
      slotTime: '06:00',
      endTime: '08:00',
      headcount: 20, // 20 exceeds 15
    }
  );

  assert.equal(res.success, false);
  assert.ok(res.error.includes('exceeds the maximum capacity of 15'));
});

test('E4. Zero Fake Amenities: When community has zero amenities created, catalog returns empty array and availability check does not show fake amenities', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [],
    },
  });

  const catalogRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'get_amenities_catalog',
    {}
  );

  assert.equal(catalogRes.success, true);
  assert.equal(catalogRes.data.count, 0);
  assert.deepEqual(catalogRes.data.amenities, []);
  assert.equal(catalogRes.data.emptyMessage, 'No active amenities are currently listed in the community catalog.');

  const availRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'check_amenity_availability',
    { amenityName: 'Swimming Pool' }
  );

  assert.equal(availRes.success, true);
  assert.equal(availRes.data.found, false);
  assert.equal(availRes.data.message, 'There are currently no active amenities created in your community.');
});

test('E5. Zero Fake Amenities: Interactive options for amenity booking does not fall back to fake default amenities when presentedAmenities is empty', () => {
  const state = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
    collectedDetails: {},
    missingFields: ['amenityName', 'date', 'slotTime'],
    presentedAmenities: [],
  };

  const augmented = attachUniversalInteractiveOptions(state);
  assert.ok(!augmented.options || augmented.options.length === 0);
});

test('E6. Strict Created Amenities Only: When community has only 1 created facility, interactive options only contains that single facility', () => {
  const state = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
    collectedDetails: {},
    missingFields: ['amenityName', 'date', 'slotTime'],
    presentedAmenities: ['Basket Ball Court'],
  };

  const augmented = attachUniversalInteractiveOptions(state);
  assert.equal(augmented.options.length, 1);
  assert.equal(augmented.options[0].value, 'Basket Ball Court');
  assert.equal(augmented.options[0].label, 'Basket Ball Court');
  // Verify none of the old fake default amenities are present
  const values = augmented.options.map((o) => o.value);
  assert.ok(!values.includes('Badminton Court'));
  assert.ok(!values.includes('Swimming Pool'));
  assert.ok(!values.includes('Clubhouse'));
  assert.ok(!values.includes('Tennis Court'));
  assert.ok(!values.includes('Gym'));
});
