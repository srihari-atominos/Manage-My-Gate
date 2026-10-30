/**
 * NAHOM AI Assistant — Comprehensive Regression Test Suite
 *
 * Covers:
 * 1. Role-based authorization & unauthorized amenity creation blocking
 * 2. Multi-turn context retention & in-flight entity corrections
 * 3. Multi-visitor pass intake & bulk execution
 * 4. Natural language intent classification across edge-case phrasings
 * 5. Time range & relative date parsing robustness ("between 6 and 7:30 PM", "from 18:00 to 19:30")
 * 6. Affirmative confirmation expansion & preventing false confirmations on updates
 * 7. Revalidation of permissions at confirmation time
 * 8. Prevention of ReferenceError when cloud API key is unconfigured
 * 9. Complaint status lookup & filtering
 * 10. Chat & voice pipeline parity
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../src/config/config.js';
import {
  INTENTS,
  WORKFLOWS,
  VISITOR_INVITATION_TYPES,
  VISITOR_INVITATION_OPTIONS,
  extractPassType,
  extractCabProvider,
  extractDeliveryPartner,
  extractServiceCategory,
  detectDirectIntent,
  resolveDateExpression,
  resolveTimeRange,
  resolveTimeExpression,
  extractVisitorName,
  extractMultipleVisitors,
  splitCompoundQuery,
  analyzeConversationTurn,
  isAffirmativeConfirmation,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';

import aiAssistantService, {
  setFetchImplementation,
} from '../src/features/aiAssistant/aiAssistant.service.js';

import {
  setTestServices,
  resetTestServices,
  executeAssistantTool,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

import {
  createPendingActionProposal,
} from '../src/features/aiAssistant/aiAssistant.actions.js';

// Fixed reference date: Wednesday, October 28, 2026, 10:00 AM IST
const FIXED_REF_DATE = new Date('2026-10-28T10:00:00+05:30');

// Mock User Contexts
const residentUser = {
  id: '507f191e810c19729de860ea',
  _id: '507f191e810c19729de860ea',
  email: 'resident@nahom.test',
  role: 'Resident',
  permissions: ['billing:my_invoices', 'amenities:discover', 'amenities:my_booking', 'visitor:resident', 'complaints:raise_ticket'],
  orgId: 'community_alpha',
};

const residentWithoutBooking = {
  id: '507f191e810c19729de860eb',
  _id: '507f191e810c19729de860eb',
  email: 'resident.nobook@nahom.test',
  role: 'Resident',
  permissions: ['amenities:discover'],
  orgId: 'community_alpha',
};

const adminUser = {
  id: '507f191e810c19729de860aa',
  _id: '507f191e810c19729de860aa',
  email: 'admin@nahom.test',
  role: 'Community Admin',
  permissions: ['*'],
  orgId: 'community_alpha',
};

const tenant = {
  orgId: 'community_alpha',
  name: 'Alpha Heights Community',
};

test.beforeEach(() => {
  resetTestServices();
  setFetchImplementation(null);
  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'test-secret-server-key-xyz123';
  config.aiAssistant.geminiModel = 'gemini-2.0-flash';
});

test.afterEach(() => {
  resetTestServices();
  setFetchImplementation(null);
});

// -------------------------------------------------------------
// 1. Role-Based Access Control: Unauthorized Operations
// -------------------------------------------------------------
test('R1. Unauthorized Amenity Creation: Resident cannot start amenity creation workflow', async () => {
  // Set fetch implementation to simulate fallback or cloud response
  setFetchImplementation(async () => ({
    ok: false,
    status: 404,
    text: async () => 'offline',
  }));

  const res = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Create a new amenity.',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  // Must NOT start the amenity creation intake or ready workflow
  assert.notEqual(res.conversationState?.workflow, 'amenity_create_intake');
  assert.notEqual(res.conversationState?.workflow, 'amenity_create_ready');
  assert.equal(res.conversationState?.awaitingConfirmation, false);

  // Must NOT include proposal action cards or confirm buttons
  assert.equal(res.actions.length, 0);

  // Must clearly inform the resident they lack permission, while offering permitted alternatives (discover/book)
  assert.match(res.message, /(don't have permission|permission denied|not authorized).*amenit/i);
  assert.match(res.message, /(discover|book)/i);
});

test('R2. Authorized Amenity Creation: Admin can initiate amenity creation', async () => {
  const turn = analyzeConversationTurn(
    'Create a new amenity.',
    null,
    [],
    FIXED_REF_DATE,
    { user: adminUser, tenant }
  );

  assert.equal(turn.activeIntent, INTENTS.AMENITY_CREATE);
  assert.equal(turn.workflow, WORKFLOWS.AMENITY_CREATE_INTAKE);
  assert.ok(turn.nextQuestion);
});

test('R3. Resident without booking permission receives clear denial when attempting booking', async () => {
  setFetchImplementation(async () => ({
    ok: false,
    status: 404,
    text: async () => 'offline',
  }));

  const res = await aiAssistantService.generateChatResponse(residentWithoutBooking, tenant, {
    message: 'Book badminton court tomorrow at 6 PM.',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.notEqual(res.conversationState?.workflow, 'amenity_booking_ready');
  assert.equal(res.conversationState?.awaitingConfirmation, false);
  assert.match(res.message, /(permission|not authorized).*book/i);
});

// -------------------------------------------------------------
// 2. Natural Language Intent Understanding across Variations
// -------------------------------------------------------------
test('R4. NLU: Resolves previously failing natural language queries', () => {
  // Outstanding maintenance
  assert.equal(
    detectDirectIntent('How much maintenance is outstanding for my apartment?'),
    INTENTS.RESIDENT_DUES
  );
  assert.equal(
    detectDirectIntent('Show me the latest invoices.'),
    INTENTS.RESIDENT_DUES
  );

  // Bookable discovery
  assert.equal(
    detectDirectIntent('What can I book this weekend?'),
    INTENTS.AMENITY_AVAILABILITY
  );

  // Visitor registration without "visitor" keyword
  assert.equal(
    detectDirectIntent('Create a pass for Rahul tomorrow at 5 PM.'),
    INTENTS.VISITOR_MANAGEMENT
  );
  assert.equal(
    detectDirectIntent('Register Rahul tomorrow at 5 PM.'),
    INTENTS.VISITOR_MANAGEMENT
  );

  // Maintenance issues & complaints
  assert.equal(
    detectDirectIntent('The water supply is not working.'),
    INTENTS.COMPLAINT_CREATE
  );
  assert.equal(
    detectDirectIntent('The lift is not working.'),
    INTENTS.COMPLAINT_CREATE
  );
  assert.equal(
    detectDirectIntent('Pipe is leaking in block B.'),
    INTENTS.COMPLAINT_CREATE
  );
});

// -------------------------------------------------------------
// 3. Time Ranges & Relative Dates
// -------------------------------------------------------------
test('R5. Time Resolution: Supports "between 6 and 7:30 PM" and "from 18:00 to 19:30"', () => {
  const r1 = resolveTimeRange('between 6 and 7:30 PM');
  assert.ok(r1);
  assert.equal(r1.startTime, '18:00');
  assert.equal(r1.endTime, '19:30');

  const r2 = resolveTimeRange('from 18:00 to 19:30');
  assert.ok(r2);
  assert.equal(r2.startTime, '18:00');
  assert.equal(r2.endTime, '19:30');

  const r3 = resolveTimeRange('between 10:00 and 11:30 am');
  assert.ok(r3);
  assert.equal(r3.startTime, '10:00');
  assert.equal(r3.endTime, '11:30');

  // "after lunch" time expression
  const tLunch = resolveTimeExpression('after lunch');
  assert.equal(tLunch, '14:00');
});

// -------------------------------------------------------------
// 4. Multi-Visitor Extraction & Multi-Turn Intake
// -------------------------------------------------------------
test('R6. Multi-Visitor Intake: "Two visitors" is not extracted as human name; names extracted across turns', () => {
  // Turn 1: "Create visitor passes for two visitors today between 6 and 7:30 PM."
  const t1 = analyzeConversationTurn(
    'Create visitor passes for two visitors today between 6 and 7:30 PM.',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);
  assert.equal(t1.collectedDetails.visitorCount, 2);
  assert.notEqual(t1.collectedDetails.visitorName, 'Two Visitors');
  assert.equal(t1.collectedDetails.slotTime, '18:00');
  assert.equal(t1.collectedDetails.endTime, '19:30');
  assert.ok(t1.missingFields.includes('visitorName'));
  assert.match(t1.nextQuestion, /(two visitors|both names)/i);

  // Turn 2: "Rahul and Priya"
  const t2 = analyzeConversationTurn(
    'Rahul and Priya',
    t1,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t2.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t2.awaitingConfirmation, true);
  assert.equal(t2.collectedDetails.visitorCount, 2);
  assert.equal(t2.collectedDetails.visitors?.length, 2);
  assert.equal(t2.collectedDetails.visitors[0].name, 'Rahul');
  assert.equal(t2.collectedDetails.visitors[1].name, 'Priya');
  // Preserved time & date
  assert.equal(t2.collectedDetails.slotTime, '18:00');
  assert.equal(t2.collectedDetails.endTime, '19:30');
  assert.equal(t2.collectedDetails.date, '2026-10-28');
});

test('R7. Multi-Visitor Intake: All names provided in single message', () => {
  const t = analyzeConversationTurn(
    'Create passes for Rahul, Priya, and Arun tomorrow at 5 PM.',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t.awaitingConfirmation, true);
  assert.equal(t.collectedDetails.visitors?.length, 3);
  assert.equal(t.collectedDetails.visitors[0].name, 'Rahul');
  assert.equal(t.collectedDetails.visitors[1].name, 'Priya');
  assert.equal(t.collectedDetails.visitors[2].name, 'Arun');
  assert.equal(t.collectedDetails.slotTime, '17:00');
});

// -------------------------------------------------------------
// 5. In-Flight Corrections & Confirmations
// -------------------------------------------------------------
test('R8. In-Flight Correction: "Actually, make that 6 PM" updates time without dropping visitor name or date', () => {
  // Step 1: Register Rahul tomorrow at 5 PM.
  const s1 = analyzeConversationTurn(
    'Register Rahul tomorrow at 5 PM.',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(s1.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(s1.collectedDetails.visitorName, 'Rahul');
  assert.equal(s1.collectedDetails.slotTime, '17:00');
  assert.equal(s1.collectedDetails.date, '2026-10-29');

  // Step 2: "Actually, make that 6 PM."
  const s2 = analyzeConversationTurn(
    'Actually, make that 6 PM.',
    s1,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(s2.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(s2.collectedDetails.visitorName, 'Rahul');
  assert.equal(s2.collectedDetails.date, '2026-10-29');
  assert.equal(s2.collectedDetails.slotTime, '18:00');
  assert.equal(s2.awaitingConfirmation, true);
});

test('R9. Confirmation vs Update: "book it for three members" updates member count rather than falsely confirming', () => {
  const s1 = analyzeConversationTurn(
    'Book the clubhouse for two members tomorrow at 6 PM.',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(s1.workflow, WORKFLOWS.AMENITY_BOOKING_READY);
  assert.equal(s1.collectedDetails.headcount, 2);

  // User says: "book it for three members"
  const s2 = analyzeConversationTurn(
    'book it for three members',
    s1,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  // Must NOT trigger actionConfirmed / executing_action
  assert.equal(s2.actionConfirmed, false);
  assert.notEqual(s2.workflow, 'executing_action');
  assert.equal(s2.collectedDetails.headcount, 3);
  assert.equal(s2.collectedDetails.amenityName, 'Clubhouse');
  assert.equal(s2.collectedDetails.slotTime, '18:00');
});

test('R10. Affirmative Confirmation: Recognizes diverse conversational agreements', () => {
  assert.equal(isAffirmativeConfirmation('Yeah'), true);
  assert.equal(isAffirmativeConfirmation('Definitely'), true);
  assert.equal(isAffirmativeConfirmation('Please go ahead'), true);
  assert.equal(isAffirmativeConfirmation('Yes, confirm the booking'), true);
  assert.equal(isAffirmativeConfirmation('Yes please'), true);
  assert.equal(isAffirmativeConfirmation('Yup'), true);

  // Must not falsely affirm when user is modifying parameters
  assert.equal(isAffirmativeConfirmation('book it for three members'), false);
  assert.equal(isAffirmativeConfirmation('yes but change it to 7 pm'), false);
});

// -------------------------------------------------------------
// 6. Security: Revalidation of Permissions on Confirmation
// -------------------------------------------------------------
test('R11. Security: Pending action confirmation fails if user permission was revoked', async () => {
  setTestServices({
    amenityService: {
      createAmenity: async () => ({ _id: 'amenity_123', name: 'Rooftop Lounge' }),
    },
  });

  // Create a pending amenity creation proposal
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_AMENITY',
    userId: residentUser.id,
    orgId: tenant.orgId,
    params: { name: 'Rooftop Lounge', type: 'Clubhouse', capacity: 20 },
    summary: 'Create Rooftop Lounge',
  });

  // Attempt to confirm as resident without amenity admin permission
  const confirmResult = await executeAssistantTool(
    residentUser,
    tenant,
    'confirm_pending_action',
    { actionId: proposal.actionId, confirmationToken: proposal.confirmationToken },
    []
  );

  assert.equal(confirmResult.success, false);
  assert.match(confirmResult.error, /permission denied/i);
});

// -------------------------------------------------------------
// 7. Robustness: No ReferenceError on Unconfigured API Key
// -------------------------------------------------------------
test('R12. Robustness: generateChatResponse succeeds cleanly when cloud API key is unset', async () => {
  config.aiAssistant.geminiApiKey = ''; // Clear API key

  const res = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Hello NAHOM, how can you help me?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.ok(res.message);
  assert.match(res.message, /(NAHOM|assistant|amenit|maintenance)/i);
});

// -------------------------------------------------------------
// 8. Complaints: Status Lookup
// -------------------------------------------------------------
test('R13. Complaints: Status lookup retrieves specific matching complaint', async () => {
  setTestServices({
    complaintService: {
      getComplaints: async (orgId, filter) => ({
        data: [
          {
            _id: 'cmp_123',
            complaintNumber: 'CMP-2026-000001',
            title: 'Lift not working in Tower A',
            category: 'Lift',
            status: 'In Progress',
            priority: 'High',
            createdAt: new Date(),
          },
          {
            _id: 'cmp_124',
            complaintNumber: 'CMP-2026-000002',
            title: 'Water tap leaking',
            category: 'Plumbing',
            status: 'Open',
            priority: 'Medium',
            createdAt: new Date(),
          },
        ],
      }),
    },
  });

  setFetchImplementation(async () => ({
    ok: false,
    status: 404,
    text: async () => 'offline',
  }));

  const res = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'What is the status of my lift complaint?',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(res);
  assert.match(res.message, /(lift|CMP-2026-000001|In Progress)/i);
});


// -------------------------------------------------------------
// 10. Visitor Pass Archetypes & 5 Invitation Types Workflow
// -------------------------------------------------------------
test('R11. Generic "Create a visitor pass" presents 5 invitation types and interactive options', async () => {
  const t1 = analyzeConversationTurn(
    'Create a visitor pass',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);
  assert.deepEqual(t1.missingFields, ['passType']);
  assert.ok(Array.isArray(t1.options));
  assert.equal(t1.options.length, 5);

  const optionTypes = t1.options.map((o) => o.type);
  assert.deepEqual(optionTypes, ['GUEST', 'GROUP', 'CAB', 'DELIVERY', 'SERVICE']);

  // Next question must enumerate all 5 invitation choices with titles
  assert.match(t1.nextQuestion, /Guest Pass/i);
  assert.match(t1.nextQuestion, /Group Visit/i);
  assert.match(t1.nextQuestion, /Cab \/ Auto/i);
  assert.match(t1.nextQuestion, /Delivery/i);
  assert.match(t1.nextQuestion, /Service \/ Staff/i);

  // End-to-End Chat API returns options in data and sanitized conversationState
  const chatRes = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Create a visitor pass',
    history: [],
    context: { referenceDate: FIXED_REF_DATE.toISOString() },
  });

  assert.ok(chatRes.data?.options);
  assert.equal(chatRes.data.options.length, 5);
  assert.equal(chatRes.status, 'clarification');
  assert.match(chatRes.message, /Which type of visitor pass would you like to create/i);
});

test('R12. Multi-Turn: Selection of "Cab / Auto" in Turn 2 transitions to Cab Intake', () => {
  const t1 = analyzeConversationTurn(
    'Create a visitor pass',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);

  // Turn 2: User selects "Cab / Auto"
  const t2 = analyzeConversationTurn(
    'Cab / Auto',
    t1,
    [{ role: 'user', content: 'Create a visitor pass' }, { role: 'assistant', content: t1.nextQuestion }],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t2.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);
  assert.equal(t2.collectedDetails.passType, 'CAB');
  assert.ok(t2.missingFields.includes('slotTime'));
  assert.match(t2.nextQuestion, /(cab|Uber|arriving)/i);

  // Turn 3: User provides "Uber KA01AB1234 in 15 mins"
  const t3 = analyzeConversationTurn(
    'Uber KA01AB1234 in 15 mins',
    t2,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t3.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t3.interactionType, 'confirmation');
  assert.equal(t3.collectedDetails.passType, 'CAB');
  assert.equal(t3.collectedDetails.vendor, 'Uber');
  assert.equal(t3.collectedDetails.vehicleNumber, 'KA01AB1234');
  assert.ok(t3.collectedDetails.slotTime);
});

test('R13. Direct Cab Pass: "Cab pass for Uber KA01AB1234 in 15 mins" creates ready proposal with archetype card', async () => {
  const t1 = analyzeConversationTurn(
    'Cab pass for Uber KA01AB1234 in 15 mins',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t1.collectedDetails.passType, 'CAB');
  assert.equal(t1.collectedDetails.vendor, 'Uber');
  assert.equal(t1.collectedDetails.vehicleNumber, 'KA01AB1234');
  assert.equal(t1.collectedDetails.dateLabel, 'Today');
  assert.ok(t1.collectedDetails.slotTime);

  // Tool execution prepare_visitor_pass
  const toolRes = await executeAssistantTool(
    residentUser,
    tenant,
    'prepare_visitor_pass',
    t1.collectedDetails,
    ['visitor_management']
  );

  assert.equal(toolRes.success, true);
  assert.equal(toolRes.action.title, 'Confirm Cab / Auto Pass');
  assert.equal(toolRes.action.details['Type'], 'Cab / Auto');
  assert.equal(toolRes.action.details['Provider'], 'Uber');
  assert.equal(toolRes.action.details['Vehicle'], 'KA01AB1234');
});

test('R14. Direct Delivery Pass: "Delivery pass for Swiggy at 1:30 PM"', async () => {
  const t1 = analyzeConversationTurn(
    'Delivery pass for Swiggy at 1:30 PM',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t1.collectedDetails.passType, 'DELIVERY');
  assert.equal(t1.collectedDetails.deliveryPartner, 'Swiggy');
  assert.equal(t1.collectedDetails.slotTime, '13:30');

  const toolRes = await executeAssistantTool(
    residentUser,
    tenant,
    'prepare_visitor_pass',
    t1.collectedDetails,
    ['visitor_management']
  );

  assert.equal(toolRes.success, true);
  assert.equal(toolRes.action.title, 'Confirm Delivery Pass');
  assert.equal(toolRes.action.details['Type'], 'Delivery');
  assert.equal(toolRes.action.details['Partner'], 'Swiggy');
});

test('R15. Direct Service Pass: "Staff pass for electrician Ramesh tomorrow at 10 AM"', async () => {
  const t1 = analyzeConversationTurn(
    'Staff pass for electrician Ramesh tomorrow at 10 AM',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_READY);
  assert.equal(t1.collectedDetails.passType, 'SERVICE');
  assert.equal(t1.collectedDetails.serviceCategory, 'Electrician');
  assert.equal(t1.collectedDetails.slotTime, '10:00');

  const toolRes = await executeAssistantTool(
    residentUser,
    tenant,
    'prepare_visitor_pass',
    t1.collectedDetails,
    ['visitor_management']
  );

  assert.equal(toolRes.success, true);
  assert.equal(toolRes.action.title, 'Confirm Service / Staff Pass');
  assert.equal(toolRes.action.details['Type'], 'Service / Staff');
});

test('R16. Direct Group Pass: "Group pass for 5 guests tonight at 8 PM"', async () => {
  const t1 = analyzeConversationTurn(
    'Group pass for 5 guests tonight at 8 PM',
    null,
    [],
    FIXED_REF_DATE,
    { user: residentUser, tenant }
  );

  assert.equal(t1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(t1.collectedDetails.passType, 'GROUP');
  assert.equal(t1.collectedDetails.isGroupPass, true);
  assert.equal(t1.collectedDetails.visitorCount, 5);
  assert.equal(t1.collectedDetails.slotTime, '20:00');
  assert.equal(t1.collectedDetails.dateLabel, 'Tonight');
  assert.equal(t1.workflow, WORKFLOWS.VISITOR_PASS_READY);

  const toolRes = await executeAssistantTool(
    residentUser,
    tenant,
    'prepare_visitor_pass',
    t1.collectedDetails,
    ['visitor_management']
  );

  assert.equal(toolRes.success, true);
  assert.equal(toolRes.action.title, 'Confirm Group Visit Pass');
  assert.equal(toolRes.action.details['Type'], 'Group Visit');
  assert.equal(toolRes.action.details['Headcount'], '5');
});

test('R17. End-to-End Action Confirmation: Cab pass is created with passType CAB in visitorPassService', async () => {
  let createdPayload = null;
  setTestServices({
    visitorPassService: {
      createPass: async (payload) => {
        createdPayload = payload;
        return {
          _id: 'vp_cab_test_123',
          id: 'vp_cab_test_123',
          shortKey: 'VP-998811',
          status: 'PENDING',
          passType: payload.passType,
        };
      },
    },
  });

  const prepareRes = await executeAssistantTool(
    residentUser,
    tenant,
    'prepare_visitor_pass',
    {
      passType: 'CAB',
      vendor: 'Uber',
      vehicleNumber: 'KA05MN4321',
      date: '2026-10-30',
      time: '18:15',
    },
    ['visitor_management']
  );

  assert.equal(prepareRes.success, true);
  assert.ok(prepareRes.action.actionId);
  assert.ok(prepareRes.action.confirmationToken);

  const confirmRes = await executeAssistantTool(
    residentUser,
    tenant,
    'confirm_pending_action',
    {
      actionId: prepareRes.action.actionId,
      confirmationToken: prepareRes.action.confirmationToken,
    },
    ['visitor_management']
  );

  assert.equal(confirmRes.success, true);
  assert.ok(createdPayload);
  assert.equal(createdPayload.passType, 'CAB');
  assert.equal(createdPayload.vehicleDetails?.number, 'KA05MN4321');
  assert.equal(createdPayload.vehicleDetails?.vendor, 'Uber');
  assert.equal(confirmRes.data.passId, 'vp_cab_test_123');
});

test('R18. NLU: Recognizes Digital Wallet, Notifications, Emergency Contacts, Issue Reports, Feedback intents', () => {
  assert.equal(detectDirectIntent('What is my wallet balance?'), INTENTS.WALLET_BALANCE);
  assert.equal(detectDirectIntent('How much money is in my wallet?'), INTENTS.WALLET_BALANCE);
  assert.equal(detectDirectIntent('Show my wallet transactions'), INTENTS.WALLET_TRANSACTIONS);
  assert.equal(detectDirectIntent('Wallet ledger history'), INTENTS.WALLET_TRANSACTIONS);

  assert.equal(detectDirectIntent('Show my notifications'), INTENTS.NOTIFICATIONS);
  assert.equal(detectDirectIntent('Do I have any unread alerts?'), INTENTS.NOTIFICATIONS);
  assert.equal(detectDirectIntent('Mark all notifications as read'), INTENTS.NOTIFICATIONS_MARK_READ);

  assert.equal(detectDirectIntent('Emergency contacts for security guard'), INTENTS.EMERGENCY_CONTACTS);
  assert.equal(detectDirectIntent('What is the main gate intercom number?'), INTENTS.EMERGENCY_CONTACTS);
  assert.equal(detectDirectIntent('Ambulance emergency helpline'), INTENTS.EMERGENCY_CONTACTS);

  assert.equal(detectDirectIntent('Report an app bug: login screen is frozen'), INTENTS.ISSUE_REPORT_CREATE);
  assert.equal(detectDirectIntent('Submit technical issue with bluetooth key'), INTENTS.ISSUE_REPORT_CREATE);
  assert.equal(detectDirectIntent('Show my reported issues'), INTENTS.ISSUE_REPORTS_LIST);

  assert.equal(detectDirectIntent('Rate the assistant 5 stars'), INTENTS.AI_FEEDBACK);
  assert.equal(detectDirectIntent('Submit AI feedback: very helpful response'), INTENTS.AI_FEEDBACK);
});

test('R19. NLU & Typo Tolerance: Handles informal language, typos, and Indian English', () => {
  assert.equal(detectDirectIntent('wat is my wallat balence?'), INTENTS.WALLET_BALANCE);
  assert.equal(detectDirectIntent('bhai check pool availability tomorrow'), INTENTS.AMENITY_AVAILABILITY);
  assert.equal(detectDirectIntent('plz show my unpaid bills'), INTENTS.RESIDENT_DUES);
  assert.equal(detectDirectIntent('cretae a amentity in amenity master'), INTENTS.AMENITY_CREATE);
});

test('R20. Multi-Intent Processing: splitCompoundQuery splits independent clauses and protects entities', () => {
  const compoundQuery = 'Show my outstanding dues, check if badminton court is available tomorrow, and show my notifications';
  const split = splitCompoundQuery(compoundQuery);
  assert.ok(Array.isArray(split));
  assert.equal(split.length, 3);
  assert.equal(split[0].intent, INTENTS.RESIDENT_DUES);
  assert.equal(split[1].intent, INTENTS.AMENITY_AVAILABILITY);
  assert.equal(split[2].intent, INTENTS.NOTIFICATIONS);

  // Protected coordinated entity queries should NOT split
  assert.equal(splitCompoundQuery('Create a visitor pass for Rahul and Rohit'), null);
  assert.equal(splitCompoundQuery('Show my invoices and dues'), null);
  assert.equal(splitCompoundQuery('Check badminton court for 2 hours'), null);
});

test('R21. Multi-Intent End-to-End: generateChatResponse processes compound requests and formats multi-section response', async () => {
  resetTestServices();

  setTestServices({
    invoiceServices: {
      getResidentBillingOverview: async () => ({
        totalOutstandingDues: 3500,
        unpaidInvoicesCount: 1,
        unpaidInvoices: [{ invoiceNumber: 'INV-OCT-001', billingPeriod: 'October 2026', totalDue: 3500, outstandingAmount: 3500 }],
      }),
    },
    amenityBookingService: {
      checkAvailability: async () => ({
        amenityName: 'Badminton Court',
        date: '2026-10-31',
        availableSlots: [{ startTime: '18:00', endTime: '19:00', available: true }],
      }),
    },
    notificationService: {
      getUserNotifications: async () => ({
        notifications: [
          { _id: 'n_1', title: 'Gate Arrival', message: 'Swiggy delivery agent at Gate 2', isRead: false },
        ],
        pagination: { totalRecords: 1, unreadRecords: 1 },
      }),
    },
  });

  const residentUser = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    name: 'Ananya Sharma',
    role: 'Resident',
    permissions: ['invoices:read', 'amenity:read', 'notifications:read'],
  };
  const tenant = { orgId: 'community_alpha' };

  const res = await aiAssistantService.generateChatResponse(
    residentUser,
    tenant,
    {
      message: 'Show my dues and check badminton availability and show notifications',
      context: { requestId: 'req_compound_test' },
    }
  );

  assert.equal(res.status, 'success');
  assert.ok(res.message.includes('### 1. Invoices & Dues'));
  assert.ok(res.message.includes('3,500'));
  assert.ok(res.message.includes('### 2. Amenity Availability'));
  assert.ok(res.message.includes('### 3. In-App Notifications'));
  assert.ok(res.data?.isCompound);
  assert.ok(res.actions.length >= 2);
});

test('R22. Digital Wallet Tools: get_wallet_balance & get_wallet_transactions execute correctly', async () => {
  resetTestServices();

  setTestServices({
    walletService: {
      getWalletData: async () => ({
        balance: 2450.50,
        activePasses: [{ _id: 'p1', amenityName: 'Tennis Court' }],
        transactions: [{ _id: 'tx1', amount: 500, type: 'CREDIT', description: 'Monthly Recharge' }],
      }),
      getWalletTransactions: async (userId, orgId) => [
        { _id: 'tx1', amount: 500, type: 'CREDIT', description: 'Monthly Recharge', status: 'SUCCESS' },
        { _id: 'tx2', amount: 150, type: 'DEBIT', description: 'Badminton Booking', status: 'SUCCESS' },
      ],
    },
  });

  const user = { _id: 'u_wallet', id: 'u_wallet', name: 'Kavita Nair', role: 'Resident', permissions: ['wallet:read'] };
  const tenant = { orgId: 'community_alpha' };

  const balRes = await executeAssistantTool(user, tenant, 'get_wallet_balance', {});
  assert.equal(balRes.success, true);
  assert.equal(balRes.data.balance, 2450.50);
  assert.equal(balRes.data.activePassesCount, 1);
  assert.equal(balRes.action.route, '/(resident)/wallet');

  const txRes = await executeAssistantTool(user, tenant, 'get_wallet_transactions', { limit: 5 });
  assert.equal(txRes.success, true);
  assert.equal(txRes.data.count, 2);
  assert.equal(txRes.data.transactions[0].type, 'CREDIT');
});

test('R23. Notifications Tools: get_my_notifications & prepare_notifications_mark_read', async () => {
  resetTestServices();

  let markedAllCalled = false;
  setTestServices({
    notificationService: {
      getUserNotifications: async () => ({
        notifications: [
          { _id: 'n_1', title: 'Maintenance Notice', message: 'Elevator maintenance tomorrow', isRead: false },
          { _id: 'n_2', title: 'Pass Approved', message: 'Guest pass #102 approved', isRead: true },
        ],
        pagination: { totalRecords: 2, unreadRecords: 1 },
      }),
      markAllAsRead: async () => { markedAllCalled = true; },
    },
  });

  const user = { _id: 'u_notif', id: 'u_notif', name: 'Vikram', role: 'Resident', permissions: [] };
  const tenant = { orgId: 'community_alpha' };

  const getRes = await executeAssistantTool(user, tenant, 'get_my_notifications', { unreadOnly: true });
  assert.equal(getRes.success, true);
  assert.equal(getRes.data.notifications.length, 1);
  assert.equal(getRes.data.notifications[0].title, 'Maintenance Notice');

  const markRes = await executeAssistantTool(user, tenant, 'prepare_notifications_mark_read', { markAll: true });
  assert.equal(markRes.success, true);
  assert.equal(markedAllCalled, true);
});

test('R24. Emergency Contacts Tool: get_emergency_contacts returns security & emergency numbers', async () => {
  resetTestServices();

  setTestServices({
    directoryService: {
      getDirectory: async () => ({
        data: [
          { name: 'Ramesh Guard', role: 'guard', designation: 'Main Gate Incharge', phone: '9876543210', intercomNumber: '100' },
        ],
      }),
    },
  });

  const user = { _id: 'u_dir', id: 'u_dir', name: 'Resident', role: 'Resident', permissions: [] };
  const tenant = { orgId: 'community_alpha' };

  const emRes = await executeAssistantTool(user, tenant, 'get_emergency_contacts', { category: 'security' });
  assert.equal(emRes.success, true);
  assert.ok(emRes.data.emergencyContacts.length >= 2);
  assert.ok(emRes.data.emergencyContacts.some(c => c.role.includes('Main Gate')));
  assert.equal(emRes.data.directoryStaff.length, 1);
  assert.equal(emRes.data.directoryStaff[0].name, 'Ramesh Guard');
});

test('R25. Technical Issue Reports: 2-phase proposal and execution via confirm_pending_action', async () => {
  resetTestServices();

  let submittedReport = null;
  setTestServices({
    issueReportService: {
      getCommunityReports: async () => ({
        reports: [
          { reportNumber: 'IR-2026-000001', title: 'Gate barrier sensor lag', feature: 'VISITOR', status: 'IN_REVIEW' },
        ],
      }),
      submitReport: async (u, t, payload) => {
        submittedReport = payload;
        return { reportNumber: 'IR-2026-000042', status: 'SUBMITTED' };
      },
    },
  });

  const user = { _id: '507f191e810c19729de860ea', id: '507f191e810c19729de860ea', name: 'Tester', role: 'Resident', permissions: [] };
  const tenant = { orgId: 'community_alpha' };

  // 1. Query reports
  const listRes = await executeAssistantTool(user, tenant, 'get_issue_reports', {});
  assert.equal(listRes.success, true);
  assert.equal(listRes.data.reports[0].reportNumber, 'IR-2026-000001');

  // 2. Prepare proposal
  const prepRes = await executeAssistantTool(user, tenant, 'prepare_issue_report', {
    title: 'Biometric gate scanner timeout',
    description: 'Scanner takes over 30 seconds to authenticate finger scan at Gate 2',
    feature: 'VISITOR',
    reportType: 'BUG',
  });
  assert.equal(prepRes.success, true);
  assert.ok(prepRes.action.actionId);
  assert.ok(prepRes.action.confirmationToken);

  // 3. Confirm proposal
  const confirmRes = await executeAssistantTool(user, tenant, 'confirm_pending_action', {
    actionId: prepRes.action.actionId,
    confirmationToken: prepRes.action.confirmationToken,
  });
  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.reportNumber, 'IR-2026-000042');
  assert.equal(submittedReport.title, 'Biometric gate scanner timeout');
});

test('R26. Evaluation Dataset Integrity: All 12 categories A through L are present and valid', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const datasetPath = path.resolve('docs/AI_ASSISTANT_EVALUATION_DATASET.json');
  assert.ok(fs.existsSync(datasetPath), 'AI_ASSISTANT_EVALUATION_DATASET.json must exist');

  const content = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  assert.ok(Array.isArray(content.categories));
  assert.equal(content.categories.length, 12, 'Must have exactly 12 categories (A through L)');

  const expectedCategoryIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const actualCategoryIds = content.categories.map(c => c.id);
  assert.deepEqual(actualCategoryIds, expectedCategoryIds);

  assert.ok(Array.isArray(content.examples));
  assert.ok(content.examples.length >= 12, 'Must have at least one test case per category');

  for (const ex of content.examples) {
    assert.ok(ex.id, 'Example must have id');
    assert.ok(ex.category, 'Example must have category');
    assert.ok(ex.userInput, 'Example must have userInput');
    assert.ok(ex.intent, 'Example must have intent');
    assert.ok(ex.feature, 'Example must have feature');
  }
});
