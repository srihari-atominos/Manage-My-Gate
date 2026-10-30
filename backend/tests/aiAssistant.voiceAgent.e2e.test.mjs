/**
 * End-to-End Voice Agent Backend Integration Tests
 *
 * Verifies the full conversational, authorization, data retrieval,
 * and amenity booking workflows specified in the NAHOM Voice Agent specification.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../src/config/config.js';
import aiAssistantService, {
  setFetchImplementation,
} from '../src/features/aiAssistant/aiAssistant.service.js';
import {
  setTestServices,
  resetTestServices,
} from '../src/features/aiAssistant/aiAssistant.tools.js';
import {
  INTENTS,
  WORKFLOWS,
  analyzeConversationTurn,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';

// Test Users and Tenant Context
const mockResidentUser = {
  id: '507f191e810c19729de860ea',
  _id: '507f191e810c19729de860ea',
  email: 'resident@nahom.test',
  role: 'Resident',
  permissions: ['billing:my_invoices', 'amenities:discover', 'amenities:my_booking'],
  orgId: 'community_alpha',
};

const mockAdminUser = {
  id: '507f191e810c19729de860aa',
  _id: '507f191e810c19729de860aa',
  email: 'admin@nahom.test',
  role: 'Community Admin',
  permissions: ['*'],
  orgId: 'community_alpha',
};

const mockTenant = {
  orgId: 'community_alpha',
  name: 'Alpha Heights Community',
};

// Fixed reference date: Wednesday, Oct 28, 2026
const FIXED_REF_DATE = new Date('2026-10-28T10:00:00+05:30');

test.beforeEach(() => {
  resetTestServices();
  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'test-voice-key-123';
  setFetchImplementation(async () => ({
    ok: false,
    status: 404,
    text: async () => 'Model offline for deterministic fallback test',
  }));
});

test.afterEach(() => {
  resetTestServices();
  setFetchImplementation(null);
});

test('1. Test A: General conversation - "Hello NAHOM, how can you help me?" returns helpful greeting', async () => {
  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'Hello NAHOM, how can you help me?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.ok(res.message);
  assert.match(res.message, /(NAHOM|assistant|amenit|expense|maintenance|help)/i);
});

test('2. Test B: Community expenses - Unauthorized resident receives clear access restriction', async () => {
  setTestServices({
    communityFinanceService: {
      getDashboard: async () => ({
        overview: { totalExpensesIncurred: 450000, grossSuccessfulCollections: 600000 },
      }),
    },
  });

  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'What are my community expenses for the current month?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.match(res.message, /(restricted|administrator|personal)/i);
  assert.ok(res.data?.authorized === false);
});

test('3. Test B: Community expenses - Authorized admin retrieves real verified financial totals', async () => {
  setTestServices({
    communityFinanceService: {
      getDashboard: async (orgId, filters) => {
        assert.equal(orgId, 'community_alpha');
        return {
          overview: {
            totalExpensesIncurred: 350000,
            grossSuccessfulCollections: 500000,
            netOperatingSurplus: 150000,
          },
          expenses: {
            byCategory: [
              { category: 'Security Services', amount: 120000 },
              { category: 'Water Supply', amount: 80000 },
            ],
            recentExpenses: [
              { title: 'Security Guard Monthly Contract', amount: 120000 },
            ],
          },
        };
      },
    },
  });

  const res = await aiAssistantService.generateChatResponse(mockAdminUser, mockTenant, {
    message: 'What are my community expenses for the current month?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.ok(res.data?.authorized !== false);
  assert.equal(res.data?.totalExpenses, 350000);
  assert.match(res.message, /350,000|3,50,000|350000/);
});

test('4. Test C: Amenity discovery - Retrieves active community amenities without inventing facilities', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async (orgId, filter) => {
        assert.equal(orgId, 'community_alpha');
        return [
          {
            _id: 'amenity_pool_1',
            name: 'Swimming Pool',
            category: 'Aquatics',
            status: 'active',
            pricing: { baseRate: 0, pricingType: 'hourly' },
            bookingRules: { openTime: '06:00', closeTime: '21:00' },
          },
          {
            _id: 'amenity_badminton_1',
            name: 'Badminton Court',
            category: 'Sports',
            status: 'active',
            pricing: { baseRate: 150, pricingType: 'hourly' },
            bookingRules: { openTime: '06:00', closeTime: '22:00' },
          },
        ];
      },
    },
  });

  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'What amenities are available in my community?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.ok(res.data?.amenities);
  assert.equal(res.data.amenities.length, 2);
  assert.match(res.message, /Swimming Pool/);
  assert.match(res.message, /Badminton Court/);
});

test('5. Test D: Booking history - Retrieves authorized personal bookings with slot times', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async (userId, orgId, filters) => {
        assert.equal(userId, mockResidentUser.id);
        assert.equal(orgId, 'community_alpha');
        return [
          {
            bookingId: 'BKG-101',
            amenity: { name: 'Tennis Court' },
            bookingDate: '2026-10-30',
            startTime: '18:00',
            endTime: '19:00',
            status: 'CONFIRMED',
            qrCode: 'QR_TENNIS_101',
          },
        ];
      },
    },
  });

  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'Show me my upcoming amenity bookings.',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.ok(res.data?.bookings);
  assert.equal(res.data.bookings.length, 1);
  assert.match(res.message, /Tennis Court/);
  assert.match(res.message, /18:00/);
});

test('6. Test E: Follow-up conversation - "Which one is available tomorrow?" prompts for clarification when amenity is ambiguous', async () => {
  const previousState = {
    activeIntent: INTENTS.AMENITY_INQUIRY,
    workflow: null,
    collectedDetails: {}, // No specific amenity selected
  };

  const turn = analyzeConversationTurn('Which one is available tomorrow?', previousState, [], FIXED_REF_DATE);

  assert.equal(turn.activeIntent, INTENTS.AMENITY_AVAILABILITY);
  assert.equal(turn.interactionType, 'clarification');
  assert.deepEqual(turn.missingFields, ['amenityName']);
  assert.match(turn.nextQuestion, /Which amenity would you like to check availability for tomorrow/i);
});

test('7. Stage 1 & 2: "Book the swimming pool for tomorrow evening." asks clarification for specific time without inventing 18:00', async () => {
  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'Book the swimming pool for tomorrow evening.',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.equal(res.status, 'clarification');
  assert.ok(res.conversationState?.missingFields.includes('slotTime'));
  assert.match(res.message, /Which time would you prefer tomorrow evening/i);
});

test('8. Stage 3 & 4: User provides time slot "6 PM", AI checks real availability and presents confirmation card', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'pool_01',
          name: 'Swimming Pool',
          status: 'active',
          pricing: { baseRate: 0 },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '18:00', endTime: '19:00', isAvailable: true },
      ],
    },
  });

  const previousState = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
    collectedDetails: {
      amenityName: 'Swimming Pool',
      date: '2026-10-29',
      dateLabel: 'Tomorrow',
      timePreference: 'evening',
    },
    missingFields: ['slotTime'],
  };

  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: '6 PM',
    history: [],
    context: {
      conversationState: previousState,
      referenceDate: FIXED_REF_DATE.toISOString(),
    },
  });

  assert.ok(res);
  assert.equal(res.status, 'confirmation');
  assert.ok(res.conversationState?.awaitingConfirmation);
  assert.ok(res.conversationState?.pendingAction?.id);
  assert.ok(res.conversationState?.pendingAction?.confirmationToken);
  assert.match(res.message, /Swimming Pool/);
  assert.match(res.message, /18:00/);
});

test('9. Stage 4: Rejection - User says "No, cancel it" stops booking and mutates nothing', async () => {
  const pendingState = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_READY,
    awaitingConfirmation: true,
    pendingAction: {
      id: 'act_test_pool_cancel',
      actionType: 'CREATE_AMENITY_BOOKING',
      confirmationToken: 'fake_token',
      summary: 'Swimming Pool booking',
    },
  };

  const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'No, cancel it',
    history: [],
    context: {
      conversationState: pendingState,
      referenceDate: FIXED_REF_DATE.toISOString(),
    },
  });

  assert.ok(res);
  assert.ok(!res.conversationState?.awaitingConfirmation);
  assert.match(res.message, /cancelled|no changes/i);
});

test('10. Stage 5: Confirmation - User says "Yes, confirm the booking" completes booking and confirms via backend', async () => {
  let createdPayload = null;

  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'pool_01',
          name: 'Swimming Pool',
          status: 'active',
          pricing: { baseRate: 0 },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '18:00', endTime: '19:00' }],
    },
    amenityBookingService: {
      createBooking: async (payload) => {
        createdPayload = payload;
        return {
          _id: 'bkg_pool_success_123',
          bookingId: payload.bookingId,
          status: 'CONFIRMED',
          bookingDate: payload.bookingDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
        };
      },
    },
  });

  // Step 1: Prepare proposal
  const prepRes = await aiAssistantService.executeTool(
    mockResidentUser,
    mockTenant,
    'prepare_amenity_booking',
    {
      amenityName: 'Swimming Pool',
      date: '2026-10-29',
      slotTime: '18:00',
    }
  );

  assert.ok(prepRes.success);
  assert.ok(prepRes.data.proposalReady);
  const { actionId, confirmationToken } = prepRes.data;

  // Step 2: Confirm proposal via spoken utterance
  const confirmRes = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
    message: 'Yes, confirm the booking.',
    history: [],
    context: {
      conversationState: {
        activeIntent: INTENTS.AMENITY_BOOKING,
        workflow: WORKFLOWS.AMENITY_BOOKING_READY,
        awaitingConfirmation: true,
        pendingAction: {
          id: actionId,
          actionType: 'CREATE_AMENITY_BOOKING',
          confirmationToken,
        },
      },
      referenceDate: FIXED_REF_DATE.toISOString(),
    },
  });

  assert.ok(confirmRes);
  assert.ok(createdPayload);
  assert.equal(createdPayload.orgId, 'community_alpha');
  assert.equal(createdPayload.startTime, '18:00');
  assert.match(confirmRes.message, /confirmed/i);
  assert.match(confirmRes.message, /Swimming Pool/);
});

test('11. Availability conflict - Slot is unavailable, AI reports unavailability and returns available alternatives', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'pool_01',
          name: 'Swimming Pool',
          status: 'active',
          pricing: { baseRate: 0 },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '19:00', endTime: '20:00', isAvailable: true },
        { startTime: '20:00', endTime: '21:00', isAvailable: true },
      ],
    },
  });

  const toolRes = await aiAssistantService.executeTool(
    mockResidentUser,
    mockTenant,
    'prepare_amenity_booking',
    {
      amenityName: 'Swimming Pool',
      date: '2026-10-29',
      slotTime: '18:00',
    }
  );

  assert.equal(toolRes.success, false);
  assert.match(toolRes.error, /18:00 is not available/i);
  assert.match(toolRes.error, /Available slots: 19:00 - 20:00/);
});

test('12. Security: Cross-community tenant isolation rejects execution for different tenant orgId', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        { _id: 'pool_01', name: 'Swimming Pool', status: 'active', pricing: { baseRate: 0 } },
      ],
      getAvailableSlots: async () => [{ startTime: '18:00', endTime: '19:00' }],
    },
  });

  const prepRes = await aiAssistantService.executeTool(
    mockResidentUser,
    mockTenant,
    'prepare_amenity_booking',
    { amenityName: 'Swimming Pool', date: '2026-10-29', slotTime: '18:00' }
  );

  assert.ok(prepRes.success);
  const foreignTenant = { orgId: 'community_beta', name: 'Beta Heights' };

  const confirmRes = await aiAssistantService.executeTool(
    mockResidentUser,
    foreignTenant,
    'confirm_pending_action',
    {
      actionId: prepRes.data.actionId,
      confirmationToken: prepRes.data.confirmationToken,
    }
  );

  assert.equal(confirmRes.success, false);
  assert.match(confirmRes.error, /community|workspace|forbidden|tenant/i);
});
