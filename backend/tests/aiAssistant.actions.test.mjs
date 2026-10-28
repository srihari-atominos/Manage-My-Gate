/**
 * AI Assistant Phase 4: Real AI Actions in Nahom Tests
 *
 * Verifies two-phase action execution, HMAC-SHA256 signature verification,
 * domain mutations (visitor pass creation/revocation, amenity booking creation/cancellation),
 * idempotency replay, authorization checks, and task-switching safety.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../src/config/config.js';
import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
  ASSISTANT_TOOL_DECLARATIONS,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

import {
  createPendingActionProposal,
  verifyPendingAction,
  resetActionStoreForTesting,
  cancelActiveProposalsForUser,
  getPendingActionById,
} from '../src/features/aiAssistant/aiAssistant.actions.js';

import aiAssistantService, {
  setFetchImplementation,
  resetFetchImplementation,
} from '../src/features/aiAssistant/aiAssistant.service.js';
import {
  analyzeConversationTurn,
  INTENTS,
  WORKFLOWS,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';

// Setup Mock User & Tenant Contexts
const mockResidentUser = {
  id: '507f191e810c19729de860ea',
  _id: '507f191e810c19729de860ea',
  name: 'Ananya Sharma',
  email: 'ananya@community.test',
  role: 'Resident',
  permissions: ['billing:my_invoices', 'amenities:discover', 'amenities:my_booking', 'visitor:resident'],
  orgId: 'community_alpha',
};

const mockOtherResidentUser = {
  id: '507f191e810c19729de860eb',
  _id: '507f191e810c19729de860eb',
  name: 'Vikram Seth',
  email: 'vikram@community.test',
  role: 'Resident',
  permissions: ['visitor:resident'],
  orgId: 'community_alpha',
};

const mockTenant = {
  orgId: 'community_alpha',
  name: 'Alpha Heights Community',
};

const mockOtherTenant = {
  orgId: 'community_beta',
  name: 'Beta Gardens Community',
};

test.beforeEach(() => {
  resetTestServices();
  resetActionStoreForTesting();
  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'test-secret-server-key-xyz123';
});

test.afterEach(() => {
  resetTestServices();
  resetActionStoreForTesting();
});

// ============================================================================
// 1. VISITOR PASS CREATION WORKFLOW
// ============================================================================

test('1. Visitor Pass: Prepares proposal card with valid details, HMAC token, and 5-minute TTL', async () => {
  setTestServices({
    visitorPassPolicy: {
      canCreateResidentPass: () => true,
    },
    blacklistService: {
      checkMatch: async () => ({ isBlacklisted: false }),
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Rajesh Kumar',
    date: '2026-10-30',
    slotTime: '11:00',
    phone: '9876543210',
    vehicleNumber: 'KA-01-AB-1234',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.visitorName, 'Rajesh Kumar');
  assert.equal(res.data.date, '2026-10-30');
  assert.equal(res.data.phone, '9876543210');
  assert.ok(res.data.actionId);
  assert.ok(res.data.confirmationToken);

  assert.equal(res.action.type, 'confirmation');
  assert.equal(res.action.actionType, 'CREATE_VISITOR_PASS');
  assert.match(res.action.summary, /Rajesh Kumar/);
  assert.equal(res.action.details['Visitor'], 'Rajesh Kumar');
  assert.equal(res.action.details['Phone'], '9876543210');
  assert.equal(res.action.details['Vehicle'], 'KA-01-AB-1234');
});

test('2. Visitor Pass: Rejects proposal if guest is on community blacklist', async () => {
  setTestServices({
    visitorPassPolicy: {
      canCreateResidentPass: () => true,
    },
    blacklistService: {
      checkMatch: async (orgId, params) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(params.phone, '9999999999');
        return {
          isBlacklisted: true,
          reason: 'Trespassing incident on 2026-09-15',
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Blocked Person',
    date: '2026-10-30',
    phone: '9999999999',
  });

  assert.equal(res.success, false);
  assert.match(res.error, /blacklist/i);
  assert.match(res.error, /Trespassing incident/);
});

test('3. Visitor Pass: Validates phone number format and returns helpful error', async () => {
  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Rajesh Kumar',
    date: '2026-10-30',
    phone: '12345', // invalid phone length
  });

  assert.equal(res.success, false);
  assert.match(res.error, /phone number/i);
});

test('4. Visitor Pass Confirmation: Calls visitorPassService.createPass and returns real persisted pass', async () => {
  let passServiceCalled = false;
  let receivedPassData = null;

  setTestServices({
    visitorPassPolicy: {
      canCreateResidentPass: () => true,
    },
    blacklistService: {
      checkMatch: async () => ({ isBlacklisted: false }),
    },
    visitorPassService: {
      createPass: async (passData) => {
        passServiceCalled = true;
        receivedPassData = passData;
        return {
          _id: 'pass_mongo_672819',
          shortKey: 'GUEST-4829',
          passType: 'GUEST',
          status: 'PENDING',
          visitorDetails: passData.visitorDetails,
          validity: passData.validity,
        };
      },
    },
  });

  // Step 1: Prepare proposal
  const prepRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Priya Sharma',
    date: '2026-10-31',
    slotTime: '14:00',
    phone: '9876543210',
  });

  assert.equal(prepRes.success, true);
  const { actionId, confirmationToken } = prepRes.data;

  // Step 2: Confirm action
  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId,
    confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(passServiceCalled, true);
  assert.equal(receivedPassData.orgId, 'community_alpha');
  assert.equal(receivedPassData.createdById, mockResidentUser.id);
  assert.equal(receivedPassData.visitorDetails.name, 'Priya Sharma');
  assert.equal(receivedPassData.visitorDetails.phone, '9876543210');

  assert.equal(confirmRes.data.passId, 'pass_mongo_672819');
  assert.equal(confirmRes.data.shortKey, 'GUEST-4829');
  assert.equal(confirmRes.data.visitorName, 'Priya Sharma');
  assert.equal(confirmRes.action.type, 'action_result');
  assert.equal(confirmRes.action.status, 'success');
  assert.equal(confirmRes.action.referenceId, 'GUEST-4829');
});

test('5. Visitor Pass Idempotency: Replaying confirmation returns cached result without creating duplicate pass', async () => {
  let createCallCount = 0;

  setTestServices({
    visitorPassPolicy: { canCreateResidentPass: () => true },
    blacklistService: { checkMatch: async () => ({ isBlacklisted: false }) },
    visitorPassService: {
      createPass: async (passData) => {
        createCallCount += 1;
        return {
          _id: 'pass_mongo_idempotent_1',
          shortKey: 'GUEST-8811',
          status: 'PENDING',
          visitorDetails: passData.visitorDetails,
        };
      },
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Idempotent Tester',
    date: '2026-11-01',
  });

  // Call confirm 1
  const first = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  // Call confirm 2 (network retry / double-tap)
  const second = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(createCallCount, 1, 'createPass must only be called once');
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  assert.equal(second.data.passId, 'pass_mongo_idempotent_1');
  assert.equal(second.data.shortKey, 'GUEST-8811');
});

test('6. Visitor Pass Cancellation: User rejects proposal, preventing pass creation', async () => {
  let passServiceCalled = false;
  setTestServices({
    visitorPassPolicy: { canCreateResidentPass: () => true },
    blacklistService: { checkMatch: async () => ({ isBlacklisted: false }) },
    visitorPassService: {
      createPass: async () => {
        passServiceCalled = true;
      },
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass', {
    visitorName: 'Cancelled Guest',
    date: '2026-10-31',
  });

  // Cancel proposal
  const cancelRes = await executeAssistantTool(mockResidentUser, mockTenant, 'cancel_pending_action', {
    actionId: prep.data.actionId,
  });

  assert.equal(cancelRes.success, true);
  assert.equal(cancelRes.data.cancelled, true);

  // Attempt to confirm after cancellation must fail
  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(confirmRes.success, false);
  assert.equal(passServiceCalled, false);
});

// ============================================================================
// 2. VISITOR PASS REVOCATION WORKFLOW
// ============================================================================

test('7. Visitor Pass Revocation: Resident prepares revocation proposal for their active pass', async () => {
  setTestServices({
    visitorPassService: {
      getUserPasses: async () => [
        {
          _id: 'pass_active_001',
          createdById: mockResidentUser.id,
          shortKey: 'GUEST-1111',
          status: 'ACTIVE',
          visitorDetails: { name: 'Kavita Roy' },
          validity: { startDate: '2026-10-28', endDate: '2026-10-29' },
        },
      ],
      assertPassAccess: () => true,
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass_revocation', {
    visitorName: 'Kavita',
  });

  assert.equal(prep.success, true);
  assert.equal(prep.data.proposalReady, true);
  assert.equal(prep.data.passId, 'pass_active_001');
  assert.equal(prep.data.visitorName, 'Kavita Roy');
  assert.equal(prep.action.type, 'confirmation');
  assert.equal(prep.action.actionType, 'REVOKE_VISITOR_PASS');
  assert.match(prep.action.title, /Pass Revocation/i);
});

test('8. Visitor Pass Revocation: Rejects already REVOKED or EXPIRED pass', async () => {
  setTestServices({
    visitorPassService: {
      getUserPasses: async () => [
        {
          _id: 'pass_revoked_002',
          createdById: mockResidentUser.id,
          shortKey: 'GUEST-2222',
          status: 'REVOKED',
          visitorDetails: { name: 'Suresh Raina' },
        },
      ],
      assertPassAccess: () => true,
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass_revocation', {
    visitorName: 'Suresh',
  });

  assert.equal(prep.success, false);
  assert.match(prep.error, /already revoked/i);
});

test('9. Visitor Pass Revocation: Calls visitorPassService.revokePass on confirmation', async () => {
  let revokeCalled = false;
  let revokedPassId = null;

  setTestServices({
    visitorPassService: {
      getUserPasses: async () => [
        {
          _id: 'pass_to_revoke_99',
          createdById: mockResidentUser.id,
          shortKey: 'GUEST-9999',
          status: 'PENDING',
          visitorDetails: { name: 'Rohan Mehra' },
        },
      ],
      assertPassAccess: () => true,
      revokePass: async (passId, orgId, unused, metadata) => {
        revokeCalled = true;
        revokedPassId = passId;
        assert.equal(orgId, 'community_alpha');
        assert.equal(metadata.source, 'ai_assistant');
        return {
          _id: passId,
          status: 'REVOKED',
          visitorDetails: { name: 'Rohan Mehra' },
        };
      },
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_visitor_pass_revocation', {
    passId: 'pass_to_revoke_99',
  });

  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(revokeCalled, true);
  assert.equal(revokedPassId, 'pass_to_revoke_99');
  assert.equal(confirmRes.data.status, 'REVOKED');
  assert.equal(confirmRes.action.status, 'success');
});

// ============================================================================
// 3. AMENITY BOOKING CREATION WORKFLOW
// ============================================================================

test('10. Amenity Booking: Prepares proposal with slot calculation, pricing, and availability check', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'amenity_badminton_1',
          name: 'Badminton Court A',
          status: 'active',
          pricing: { baseRate: 200, pricingType: 'hourly' },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '18:00', endTime: '19:00', available: true },
        { startTime: '19:00', endTime: '20:00', available: true },
      ],
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking', {
    amenityName: 'Badminton',
    date: '2026-10-29',
    slotTime: '18:00',
  });

  assert.equal(prep.success, true);
  assert.equal(prep.data.proposalReady, true);
  assert.equal(prep.data.amenityName, 'Badminton Court A');
  assert.equal(prep.data.estimatedCost, '₹200');
  assert.equal(prep.data.slotTime, '18:00 - 19:00');
  assert.equal(prep.action.type, 'confirmation');
  assert.equal(prep.action.details['Cost'], '₹200');
});

test('11. Amenity Booking: Rejects proposal when requested slot is unavailable', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'amenity_badminton_1',
          name: 'Badminton Court A',
          status: 'active',
          pricing: { baseRate: 200 },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '09:00', endTime: '10:00' }, // only 9 AM available
      ],
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking', {
    amenityName: 'Badminton',
    date: '2026-10-29',
    slotTime: '18:00', // 18:00 is not in available slots
  });

  assert.equal(prep.success, false);
  assert.match(prep.error, /not available/i);
});

test('12. Amenity Booking Confirmation: Calls amenityBookingService.createBooking and returns real booking', async () => {
  let bookingCreated = false;
  let receivedBookingPayload = null;

  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'amenity_swimming_pool',
          name: 'Swimming Pool',
          status: 'active',
          pricing: { baseRate: 0 },
        },
      ],
      getAvailableSlots: async () => [{ startTime: '07:00', endTime: '08:00' }],
    },
    amenityBookingService: {
      createBooking: async (payload) => {
        bookingCreated = true;
        receivedBookingPayload = payload;
        return {
          _id: 'bk_mongo_pool_101',
          amenityId: payload.amenityId,
          bookingDate: payload.bookingDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          status: 'confirmed',
          totalAmount: 0,
        };
      },
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking', {
    amenityName: 'Swimming',
    date: '2026-10-30',
    slotTime: '07:00',
  });

  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(bookingCreated, true);
  assert.equal(receivedBookingPayload.userId, mockResidentUser.id);
  assert.equal(receivedBookingPayload.orgId, 'community_alpha');
  assert.equal(confirmRes.data.bookingId, 'bk_mongo_pool_101');
  assert.equal(confirmRes.data.status, 'confirmed');
  assert.equal(confirmRes.action.type, 'action_result');
});

// ============================================================================
// 4. AMENITY BOOKING CANCELLATION WORKFLOW
// ============================================================================

test('13. Amenity Booking Cancellation: Calls cancelBooking and returns refunded/cancelled status', async () => {
  let cancelCalled = false;

  setTestServices({
    amenityBookingService: {
      getMyBookings: async (userId, orgId) => {
        assert.equal(userId, mockResidentUser.id);
        return {
          items: [
            {
              _id: 'bk_to_cancel_555',
              userId: mockResidentUser.id,
              amenityId: { name: 'Tennis Court' },
              bookingDate: new Date(Date.now() + 86400000).toISOString(),
              startTime: '16:00',
              endTime: '17:00',
              status: 'confirmed',
            },
          ],
        };
      },
      cancelBooking: async (bookingId, userId, orgId, reason) => {
        cancelCalled = true;
        assert.equal(bookingId, 'bk_to_cancel_555');
        assert.equal(userId, mockResidentUser.id);
        assert.equal(orgId, 'community_alpha');
        return {
          _id: bookingId,
          status: 'cancelled',
          refundAmount: 150,
        };
      },
    },
  });

  const prep = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking_cancellation', {
    bookingId: 'bk_to_cancel_555',
  });

  assert.equal(prep.success, true);
  assert.equal(prep.action.type, 'confirmation');

  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(cancelCalled, true);
  assert.equal(confirmRes.data.status, 'cancelled');
  assert.equal(confirmRes.action.status, 'success');
});

// ============================================================================
// 5. CRYPTOGRAPHIC HMAC SECURITY & BOUNDARIES
// ============================================================================

test('14. Security: Tampered confirmation token signature is rejected with HTTP 400', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Rahul' },
    summary: 'Visitor pass for Rahul',
  });

  // Tamper with the HMAC signature bytes
  const tamperedToken = proposal.confirmationToken.slice(0, -6) + '000000';

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: tamperedToken,
  });

  assert.equal(res.success, false);
  assert.match(res.error, /invalid or forged/i);
});

test('15. Security: Cross-user confirmation is blocked (User A proposal cannot be confirmed by User B)', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Rahul' },
    summary: 'Visitor pass for Rahul',
  });

  // Other resident attempts to confirm Ananya's proposal
  const res = await executeAssistantTool(mockOtherResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });

  assert.equal(res.success, false);
  assert.match(res.error, /another user/i);
});

test('16. Security: Cross-tenant confirmation is blocked (Tenant A proposal cannot be confirmed in Tenant B)', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Rahul' },
    summary: 'Visitor pass for Rahul',
  });

  // Attempt confirmation in another organization context
  const res = await executeAssistantTool(mockResidentUser, mockOtherTenant, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });

  assert.equal(res.success, false);
  assert.match(res.error, /different community workspace/i);
});

test('17. Security: Expired action proposal (>5 minutes TTL) fails verification', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Late Visitor' },
    summary: 'Visitor pass for Late Visitor',
    ttlMs: -1000, // already expired in the past
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });

  assert.equal(res.success, false);
  assert.match(res.error, /expired/i);
});

test('18. Task Switching: Pivoting to another intent cancels active proposals for user', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_AMENITY_BOOKING',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { amenityName: 'Tennis' },
    summary: 'Tennis Court Booking',
  });

  // Verify proposal is active
  const before = getPendingActionById(proposal.actionId);
  assert.equal(before.status, 'PENDING');

  // User pivots to asking about dues: task switching triggers cancelActiveProposalsForUser
  const turn = analyzeConversationTurn(
    'How much maintenance do I owe?',
    {
      activeIntent: INTENTS.AMENITY_BOOKING,
      workflow: WORKFLOWS.AMENITY_BOOKING_READY,
      awaitingConfirmation: true,
      pendingAction: { id: proposal.actionId },
    }
  );

  assert.equal(turn.activeIntent, INTENTS.RESIDENT_DUES);
  assert.equal(turn.workflow, null);

  // Proposal was automatically cancelled
  const after = getPendingActionById(proposal.actionId);
  assert.equal(after.status, 'CANCELLED');
});

// ============================================================================
// 6. END-TO-END MULTI-TURN AI SERVICE EXECUTION
// ============================================================================

test('19. End-to-End Chat: User saying "Yes" executes pending proposal and summarizes real DB outcome', async () => {
  let passServiceCalled = false;
  setTestServices({
    visitorPassPolicy: { canCreateResidentPass: () => true },
    blacklistService: { checkMatch: async () => ({ isBlacklisted: false }) },
    visitorPassService: {
      createPass: async (passData) => {
        passServiceCalled = true;
        return {
          _id: 'pass_live_e2e_888',
          shortKey: 'GUEST-7744',
          status: 'PENDING',
          visitorDetails: passData.visitorDetails,
        };
      },
    },
  });

  // Create real HMAC proposal
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: {
      visitorName: 'Deepa Verma',
      startDate: new Date('2026-10-30T10:00:00.000Z'),
      endDate: new Date('2026-10-30T14:00:00.000Z'),
      phone: '9876543210',
    },
    summary: 'Visitor pass for Deepa Verma on October 30, 2026',
  });

  // Mock Gemini model response
  setFetchImplementation(async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Your visitor pass for Deepa Verma has been confirmed! Pass code GUEST-7744 is ready and active.',
                },
              ],
            },
          },
        ],
      }),
    };
  });

  try {
    const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
      message: 'Yes, please confirm the pass',
      history: [
        { role: 'user', text: 'Create a visitor pass for Deepa Verma' },
        { role: 'assistant', text: 'I have prepared your visitor pass for Deepa Verma. Would you like to confirm?' },
      ],
      context: {
        conversationState: {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_READY,
          awaitingConfirmation: true,
          pendingAction: {
            id: proposal.actionId,
            actionType: 'CREATE_VISITOR_PASS',
            confirmationToken: proposal.confirmationToken,
            summary: proposal.summary,
          },
        },
      },
    });

    assert.equal(passServiceCalled, true);
    assert.equal(res.status, 'success');
    assert.match(res.message, /Deepa Verma/);
    assert.match(res.message, /GUEST-7744/);
    assert.equal(res.data.passId, 'pass_live_e2e_888');
    assert.equal(res.data.shortKey, 'GUEST-7744');
    assert.equal(res.conversationState.awaitingConfirmation, false);
    assert.equal(res.conversationState.pendingAction, null);
  } finally {
    resetFetchImplementation();
  }
});

test('20. End-to-End Chat: User saying "No" cancels pending proposal without mutation', async () => {
  let passServiceCalled = false;
  setTestServices({
    visitorPassService: {
      createPass: async () => {
        passServiceCalled = true;
      },
    },
  });

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Cancelled' },
    summary: 'Visitor pass for Cancelled',
  });

  setFetchImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: 'I have cancelled the visitor pass proposal as requested.' }],
          },
        },
      ],
    }),
  }));

  try {
    const res = await aiAssistantService.generateChatResponse(mockResidentUser, mockTenant, {
      message: 'No, cancel it',
      history: [],
      context: {
        conversationState: {
          activeIntent: INTENTS.VISITOR_MANAGEMENT,
          workflow: WORKFLOWS.VISITOR_PASS_READY,
          awaitingConfirmation: true,
          pendingAction: {
            id: proposal.actionId,
            actionType: 'CREATE_VISITOR_PASS',
            confirmationToken: proposal.confirmationToken,
          },
        },
      },
    });

    assert.equal(passServiceCalled, false);
    assert.equal(res.data.cancelled, true);
    assert.equal(res.conversationState.awaitingConfirmation, false);
    assert.equal(res.conversationState.pendingAction, null);
  } finally {
    resetFetchImplementation();
  }
});

// ============================================================================
// 7. DURABLE PERSISTENCE, CONCURRENCY & INTEGRITY TESTS
// ============================================================================

test('21. Durable Persistence: Recovers proposal from database when process memory is cleared (Restart / Multi-Instance)', async () => {
  const mongooseModule = await import('mongoose');
  const mongoose = mongooseModule.default;
  const crypto = await import('node:crypto');

  const testParams = { visitorName: 'Restart Guest', phone: '9998887770' };
  const canonical = JSON.stringify(testParams, Object.keys(testParams).sort());
  const paramHash = crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: testParams,
    summary: 'Visitor pass for Restart Guest',
  });

  // Clear in-memory store to simulate process termination / backend restart
  resetActionStoreForTesting();

  // Verify proposal is no longer in memory
  assert.equal(getPendingActionById(proposal.actionId), null);

  // Mock AIAssistantAction.findOne to simulate MongoDB returning the persisted document
  const { AIAssistantAction } = await import('../src/features/aiAssistant/aiAssistantAction.model.js');
  const originalFindOne = AIAssistantAction.findOne;
  AIAssistantAction.findOne = async (query) => {
    if (query.actionId === proposal.actionId) {
      return {
        actionId: proposal.actionId,
        actionType: 'CREATE_VISITOR_PASS',
        userId: mockResidentUser.id,
        orgId: mockTenant.orgId,
        params: testParams,
        paramHash,
        summary: 'Visitor pass for Restart Guest',
        confirmationToken: proposal.confirmationToken,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      };
    }
    return null;
  };

  // Temporarily set mongoose readyState to 1 to simulate live DB connection
  const origReadyState = mongoose?.connection?.readyState;
  if (mongoose?.connection) {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
  }

  try {
    const verification = await verifyPendingAction({
      actionId: proposal.actionId,
      confirmationToken: proposal.confirmationToken,
      userId: mockResidentUser.id,
      orgId: mockTenant.orgId,
    });

    assert.equal(verification.valid, true);
    assert.equal(verification.action.actionId, proposal.actionId);
    assert.equal(verification.action.params.visitorName, 'Restart Guest');
  } finally {
    AIAssistantAction.findOne = originalFindOne;
    if (mongoose?.connection) {
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
    }
  }
});

test('22. Concurrency: Double execution is blocked by atomic lock', async () => {
  const { lockActionForExecution } = await import('../src/features/aiAssistant/aiAssistant.actions.js');
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Concurrent Guest' },
    summary: 'Visitor pass for Concurrent Guest',
  });

  // First thread acquires execution lock
  const lock1 = await lockActionForExecution(proposal.actionId);
  assert.equal(lock1, true, 'First caller should successfully acquire execution lock');

  // Second concurrent thread attempts to acquire execution lock
  const lock2 = await lockActionForExecution(proposal.actionId);
  assert.equal(lock2, false, 'Second concurrent caller must be rejected by lock');
});

test('23. Immutability: Cancellation permanently locks action against subsequent confirmation', async () => {
  const { cancelPendingAction } = await import('../src/features/aiAssistant/aiAssistant.actions.js');
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Cancelled Guest' },
    summary: 'Visitor pass for Cancelled Guest',
  });

  // Explicitly cancel
  const cancelled = cancelPendingAction({ actionId: proposal.actionId, userId: mockResidentUser.id, orgId: mockTenant.orgId });
  assert.equal(cancelled, true);

  // Subsequent confirmation attempt fails
  const verification = await verifyPendingAction({
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
  });

  assert.equal(verification.valid, false);
  assert.equal(verification.statusCode, 400);
  assert.match(verification.error, /cancelled/i);
});

test('24. Parameter Alteration: Modified parameters invalidate HMAC cryptographic signature', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
    params: { visitorName: 'Original Guest', phone: '9876543210' },
    summary: 'Visitor pass for Original Guest',
  });

  // Tamper with action record in store to simulate tampering parameter in transit/DB
  const actionRecord = getPendingActionById(proposal.actionId);
  actionRecord.paramHash = 'tampered_hash_value_1234567890';

  const verification = await verifyPendingAction({
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
    userId: mockResidentUser.id,
    orgId: mockTenant.orgId,
  });

  assert.equal(verification.valid, false);
  assert.equal(verification.statusCode, 403);
  assert.match(verification.error, /invalid or forged confirmation token signature/i);
});

test('25. Amenity Facility Creation: Admin prepares and confirms new amenity creation in Amenity Master', async () => {
  const mockAdminUser = {
    id: '507f191e810c19729de860ff',
    _id: '507f191e810c19729de860ff',
    name: 'Naveen Vijayakumar',
    email: 'admin@community.test',
    role: 'Community Admin',
    permissions: ['amenities:master', 'amenities:discover', 'amenities:my_booking'],
    orgId: 'community_alpha',
  };

  let createdAmenityData = null;
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [],
      createAmenity: async (orgId, data) => {
        createdAmenityData = { orgId, ...data, _id: 'amenity_bb_123', code: 'FAC-BASKETBA-101', status: 'active' };
        return createdAmenityData;
      },
    },
  });

  // Non-admin rejected
  const nonAdminRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_creation', {
    name: 'Basketball Court',
    ratePerHour: 500,
    capacity: 10,
  });
  assert.equal(nonAdminRes.success, false);
  assert.match(nonAdminRes.error, /permission denied/i);

  // Admin permitted
  const adminRes = await executeAssistantTool(mockAdminUser, mockTenant, 'prepare_amenity_creation', {
    name: 'Basketball Court',
    ratePerHour: 500,
    capacity: 10,
    slotDurationMinutes: 60,
  });

  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.actionType, 'CREATE_AMENITY');
  assert.equal(adminRes.data.amenityName, 'Basketball Court');
  assert.equal(adminRes.data.capacity, 10);
  assert.equal(adminRes.data.rate, '₹500 per slot');
  assert.ok(adminRes.data.confirmationToken);
  assert.equal(adminRes.action.type, 'confirmation');
  assert.equal(adminRes.action.confirmLabel, 'Confirm & Create');

  // Confirm and execute action
  const confirmRes = await executeAssistantTool(mockAdminUser, mockTenant, 'confirm_pending_action', {
    actionId: adminRes.data.actionId,
    confirmationToken: adminRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.amenityCode, 'FAC-BASKETBA-101');
  assert.equal(confirmRes.data.amenityId, 'amenity_bb_123');
  assert.equal(confirmRes.data.name, 'Basketball Court');
  assert.equal(confirmRes.action.type, 'action_result');
  assert.equal(confirmRes.action.actionType, 'CREATE_AMENITY');
  assert.equal(confirmRes.action.title, 'Amenity Facility Created');
  assert.equal(confirmRes.action.referenceId, 'FAC-BASKETBA-101');
  assert.equal(createdAmenityData.name, 'Basketball Court');
  assert.equal(createdAmenityData.capacity, 10);
});

test('26. Maintenance Assessment Creation: Admin prepares and confirms new community assessment in Assessment Manager', async () => {
  const mockAdminUser = {
    id: '507f191e810c19729de860ff',
    _id: '507f191e810c19729de860ff',
    name: 'Naveen Vijayakumar',
    email: 'admin@community.test',
    role: 'Community Admin',
    permissions: ['billing:assessments', 'billing:view_expense'],
    orgId: 'community_alpha',
  };

  let createdAssessmentData = null;
  setTestServices({
    assessmentService: {
      getAssessments: async () => [],
      createAssessment: async (data) => {
        createdAssessmentData = { ...data, _id: 'assess_nov_999' };
        return createdAssessmentData;
      },
    },
  });

  // Non-admin rejected
  const nonAdminRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_assessment_creation', {
    name: 'November Maintenance',
    flatAmount: 10000,
  });
  assert.equal(nonAdminRes.success, false);
  assert.match(nonAdminRes.error, /permission denied/i);

  // Admin permitted
  const adminRes = await executeAssistantTool(mockAdminUser, mockTenant, 'prepare_assessment_creation', {
    name: 'November Maintenance',
    flatAmount: 10000,
    billingCycle: 'MONTHLY',
    type: 'RECURRING',
    targetScopeType: 'ALL_COMMUNITY',
  });

  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.actionType, 'CREATE_ASSESSMENT');
  assert.equal(adminRes.data.assessmentName, 'November Maintenance');
  assert.equal(adminRes.data.amount, '₹10,000');
  assert.equal(adminRes.data.scope, 'All Residents');
  assert.ok(adminRes.data.confirmationToken);
  assert.equal(adminRes.action.type, 'confirmation');
  assert.equal(adminRes.action.confirmLabel, 'Confirm & Create');

  // Confirm and execute action
  const confirmRes = await executeAssistantTool(mockAdminUser, mockTenant, 'confirm_pending_action', {
    actionId: adminRes.data.actionId,
    confirmationToken: adminRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.assessmentId, 'assess_nov_999');
  assert.equal(confirmRes.data.name, 'November Maintenance');
  assert.equal(confirmRes.data.amount, 10000);
  assert.equal(confirmRes.action.type, 'action_result');
  assert.equal(confirmRes.action.actionType, 'CREATE_ASSESSMENT');
  assert.equal(confirmRes.action.title, 'Assessment Template Created');
  assert.equal(createdAssessmentData.name, 'November Maintenance');
  assert.equal(createdAssessmentData.calculationMethod.flatAmount, 10000);
});

test('27. Community Poll Creation: Admin prepares and confirms new poll in Poll Manager', async () => {
  const mockAdminUser = {
    id: '507f191e810c19729de860ff',
    _id: '507f191e810c19729de860ff',
    name: 'Naveen Vijayakumar',
    email: 'admin@community.test',
    role: 'Community Admin',
    permissions: ['polls:create', 'polls:manage'],
    orgId: 'community_alpha',
  };

  let createdPollData = null;
  setTestServices({
    pollServices: {
      createPoll: async (data) => {
        createdPollData = { _id: 'poll_pool_888', ...data };
        return createdPollData;
      },
    },
  });

  // Non-admin rejected
  const nonAdminRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_poll_creation', {
    question: 'Should we renovate the swimming pool?',
    options: ['Yes', 'No', 'Need more info'],
  });
  assert.equal(nonAdminRes.success, false);
  assert.match(nonAdminRes.error, /permission denied/i);

  // Admin permitted
  const adminRes = await executeAssistantTool(mockAdminUser, mockTenant, 'prepare_poll_creation', {
    question: 'Should we renovate the swimming pool?',
    options: ['Yes', 'No', 'Need more info'],
    category: 'Amenities',
  });

  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.actionType, 'CREATE_POLL');
  assert.equal(adminRes.data.question, 'Should we renovate the swimming pool?');
  assert.equal(adminRes.data.options.length, 3);
  assert.ok(adminRes.data.confirmationToken);
  assert.equal(adminRes.action.confirmLabel, 'Confirm & Publish Poll');

  // Confirm and execute action
  const confirmRes = await executeAssistantTool(mockAdminUser, mockTenant, 'confirm_pending_action', {
    actionId: adminRes.data.actionId,
    confirmationToken: adminRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.pollId, 'poll_pool_888');
  assert.equal(confirmRes.action.actionType, 'CREATE_POLL');
  assert.equal(confirmRes.action.title, 'Community Poll Published');
  assert.equal(createdPollData.question, 'Should we renovate the swimming pool?');
  assert.equal(createdPollData.options.length, 3);
});

test('28. Notice Board Publication: Admin prepares and confirms new notice on Notice Board', async () => {
  const mockAdminUser = {
    id: '507f191e810c19729de860ff',
    _id: '507f191e810c19729de860ff',
    name: 'Naveen Vijayakumar',
    email: 'admin@community.test',
    role: 'Community Admin',
    permissions: ['notices:create', 'notices:manage'],
    orgId: 'community_alpha',
  };

  let createdNoticeData = null;
  setTestServices({
    noticeBoardService: {
      createNotice: async (data, userId, orgId) => {
        createdNoticeData = { _id: 'notice_water_777', ...data, userId, orgId };
        return createdNoticeData;
      },
    },
  });

  // Non-admin rejected
  const nonAdminRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_notice_creation', {
    title: 'Water Supply Shutdown',
    description: 'Maintenance shutdown tomorrow from 10am to 2pm.',
  });
  assert.equal(nonAdminRes.success, false);
  assert.match(nonAdminRes.error, /permission denied/i);

  // Admin permitted
  const adminRes = await executeAssistantTool(mockAdminUser, mockTenant, 'prepare_notice_creation', {
    title: 'Water Supply Shutdown',
    description: 'Maintenance shutdown tomorrow from 10am to 2pm.',
    category: 'Maintenance',
    priority: 'High',
    isPinned: true,
  });

  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.actionType, 'CREATE_NOTICE');
  assert.equal(adminRes.data.title, 'Water Supply Shutdown');
  assert.equal(adminRes.data.priority, 'High');
  assert.ok(adminRes.data.confirmationToken);
  assert.equal(adminRes.action.confirmLabel, 'Confirm & Publish Notice');

  // Confirm and execute action
  const confirmRes = await executeAssistantTool(mockAdminUser, mockTenant, 'confirm_pending_action', {
    actionId: adminRes.data.actionId,
    confirmationToken: adminRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.noticeId, 'notice_water_777');
  assert.equal(confirmRes.action.actionType, 'CREATE_NOTICE');
  assert.equal(confirmRes.action.title, 'Notice Published');
  assert.equal(createdNoticeData.title, 'Water Supply Shutdown');
  assert.equal(createdNoticeData.priority, 'High');
});

test('29. Amenity Booking Wallet Balance Check: Guided to Online Payment (GPay / PhonePe / UPI) when wallet is insufficient', async () => {
  const mockBadmintonAmenity = {
    _id: 'amenity_badminton_101',
    name: 'Badminton Court 1',
    pricing: { baseRate: 400 },
  };

  setTestServices({
    amenityService: {
      getAllAmenities: async () => [mockBadmintonAmenity],
      getAmenityById: async () => mockBadmintonAmenity,
      getAvailableSlots: async () => [{ startTime: '18:00', endTime: '19:00' }],
    },
    walletService: {
      getWallet: async () => ({ balance: 50 }), // Only 50 in wallet, fee is 400
    },
    amenityBookingService: {
      createBooking: async (payload) => {
        if (payload.paymentMethod === 'WALLET') {
          throw new Error('Insufficient wallet balance. Total due is ₹400, but current available balance is ₹50.');
        }
        return {
          _id: 'bkg_online_123',
          bookingId: payload.bookingId,
          status: 'confirmed',
          pricingDetails: { totalAmount: 400 },
        };
      },
    },
  });

  // Prepare booking: wallet is short (balance 50 < 400)
  const proposalRes = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking', {
    amenityName: 'Badminton Court 1',
    dateStr: '2026-11-05',
    slotTime: '18:00',
  });

  assert.equal(proposalRes.success, true);
  assert.equal(proposalRes.data.isWalletShort, true);
  assert.equal(proposalRes.data.walletBalance, 50);
  assert.equal(proposalRes.action.confirmLabel, 'Click to Pay Online (GPay / PhonePe / UPI)');
  assert.match(proposalRes.action.details['Payment Method'], /Online Payment/i);
  assert.match(proposalRes.action.details['Wallet Status'], /Insufficient/i);

  // Confirming pending action returns graceful pending_payment guidance to online checkout rather than crashing
  const confirmRes = await executeAssistantTool(mockResidentUser, mockTenant, 'confirm_pending_action', {
    actionId: proposalRes.data.actionId,
    confirmationToken: proposalRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.status, 'pending_payment');
  assert.equal(confirmRes.data.requiresOnlinePayment, true);
  assert.match(confirmRes.data.message, /Google Pay, PhonePe, UPI/i);
  assert.equal(confirmRes.action.title, 'Online Payment Required');
});



