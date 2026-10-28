import test from 'node:test';
import assert from 'node:assert/strict';

import config from '../src/config/config.js';
import HttpError from '../src/utils/httpError.utils.js';
import {
  INTENTS,
  WORKFLOWS,
  detectDirectIntent,
  resolveDateExpression,
  resolveTimeExpression,
  extractAmenityName,
  analyzeConversationTurn,
  sanitizeConversationState,
  buildPromptContextInstruction,
  formatDate,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';

import aiAssistantService, {
  setFetchImplementation,
} from '../src/features/aiAssistant/aiAssistant.service.js';

import {
  setTestServices,
  resetTestServices,
  executeAssistantTool,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

// Fixed reference date: Wednesday, October 28, 2026
const FIXED_REF_DATE = new Date('2026-10-28T10:00:00+05:30');

test.beforeEach(() => {
  resetTestServices();
  setFetchImplementation(null);
  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'test-secret-server-key-xyz123';
  config.aiAssistant.geminiModel = 'gemini-2.0-flash';
});

// -------------------------------------------------------------
// 1. Natural Language Intent Understanding across Phrasings & Typos
// -------------------------------------------------------------
test('1. NLU: Recognizes resident maintenance & dues across varied phrasings', () => {
  const duesQueries = [
    'How much maintenance do I need to pay?',
    'Show my pending dues.',
    'Any unpaid bills?',
    "What is my current month's maintenance amount?",
    'how much do i owe for maintenance',
    'pay my dues',
    'what are my unpaid invoices',
  ];

  for (const q of duesQueries) {
    const intent = detectDirectIntent(q);
    assert.equal(intent, INTENTS.RESIDENT_DUES, `Failed for query: "${q}"`);
  }
});

test('2. NLU: Recognizes community finance & society expenses across phrasings', () => {
  const financeQueries = [
    'How much did our community spend this month?',
    'Show the expenses for October.',
    'What is our total community expenses?',
    'How much was spent by society in October 2026?',
    'Community budget and balance',
  ];

  for (const q of financeQueries) {
    const intent = detectDirectIntent(q);
    assert.equal(intent, INTENTS.COMMUNITY_FINANCE, `Failed for query: "${q}"`);
  }
});

test('3. NLU: Recognizes personal expense tracking queries', () => {
  const personalQueries = [
    'How much did I spend on groceries?',
    'Show my personal expense summary',
    'What did I spend this month?',
    'Check my personal budget and wallet balance',
  ];

  for (const q of personalQueries) {
    const intent = detectDirectIntent(q);
    assert.equal(intent, INTENTS.PERSONAL_EXPENSE, `Failed for query: "${q}"`);
  }
});

test('4. NLU: Recognizes amenity inquiry, availability, and bookings', () => {
  assert.equal(detectDirectIntent('What amenities can I book?'), INTENTS.AMENITY_INQUIRY);
  assert.equal(detectDirectIntent('What sports facilities do we have?'), INTENTS.AMENITY_INQUIRY);

  assert.equal(detectDirectIntent('Is badminton available tomorrow?'), INTENTS.AMENITY_AVAILABILITY);
  assert.equal(detectDirectIntent('Check gym timings'), INTENTS.AMENITY_AVAILABILITY);

  assert.equal(detectDirectIntent('I want to book an amenity'), INTENTS.AMENITY_BOOKING);
  assert.equal(detectDirectIntent('Book badminton court'), INTENTS.AMENITY_BOOKING);
  assert.equal(detectDirectIntent('Reserve the clubhouse'), INTENTS.AMENITY_BOOKING);

  assert.equal(detectDirectIntent('Show me my bookings'), INTENTS.MY_BOOKINGS);
  assert.equal(detectDirectIntent('Do I have any bookings?'), INTENTS.MY_BOOKINGS);
});

test('5. NLU: Recognizes complaints and maintenance helpdesk requests', () => {
  const complaintsQueries = [
    'Show my complaints',
    'Water leakage ticket status',
    'Raise a maintenance request for plumbing',
    'Check status of my helpdesk ticket',
  ];

  for (const q of complaintsQueries) {
    const intent = detectDirectIntent(q);
    assert.equal(intent, INTENTS.COMPLAINTS_HELPDESK, `Failed for query: "${q}"`);
  }
});

test('6. NLU: Recognizes visitor management requests', () => {
  const visitorQueries = [
    'Who visited today?',
    'Create a visitor pass for Rahul',
    'Invite a guest to my villa',
    'Show gate entry console',
  ];

  for (const q of visitorQueries) {
    const intent = detectDirectIntent(q);
    assert.equal(intent, INTENTS.VISITOR_MANAGEMENT, `Failed for query: "${q}"`);
  }
});

// -------------------------------------------------------------
// 2. Relative Date & Time Interpretation
// -------------------------------------------------------------
test('7. Date Resolution: Correctly resolves relative date expressions from reference date', () => {
  // FIXED_REF_DATE is Wednesday, Oct 28, 2026

  const todayRes = resolveDateExpression('today', FIXED_REF_DATE);
  assert.equal(todayRes.date, '2026-10-28');

  const tmrRes = resolveDateExpression('tomorrow', FIXED_REF_DATE);
  assert.equal(tmrRes.date, '2026-10-29');

  const datRes = resolveDateExpression('day after tomorrow', FIXED_REF_DATE);
  assert.equal(datRes.date, '2026-10-30');

  // Next week: Wednesday -> Next Monday (Nov 02) to Next Sunday (Nov 08)
  const nextWeekRes = resolveDateExpression('what about next week?', FIXED_REF_DATE);
  assert.equal(nextWeekRes.type, 'range');
  assert.equal(nextWeekRes.startDate, '2026-11-02');
  assert.equal(nextWeekRes.endDate, '2026-11-08');

  // This weekend: Saturday (Oct 31) to Sunday (Nov 01)
  const weekendRes = resolveDateExpression('this weekend', FIXED_REF_DATE);
  assert.equal(weekendRes.type, 'range');
  assert.equal(weekendRes.startDate, '2026-10-31');
  assert.equal(weekendRes.endDate, '2026-11-01');

  // Weekday: "Saturday" -> Oct 31, 2026
  const satRes = resolveDateExpression('Saturday', FIXED_REF_DATE);
  assert.equal(satRes.date, '2026-10-31');
});

test('8. Time Resolution: Resolves 12-hour, 24-hour, and approximate times', () => {
  assert.equal(resolveTimeExpression('Saturday at 6 PM'), '18:00');
  assert.equal(resolveTimeExpression('6:30 pm'), '18:30');
  assert.equal(resolveTimeExpression('9 AM'), '09:00');
  assert.equal(resolveTimeExpression('10:15 am'), '10:15');
  assert.equal(resolveTimeExpression('18:00'), '18:00');
  assert.equal(resolveTimeExpression('morning'), '09:00');
  assert.equal(resolveTimeExpression('evening'), '18:00');
});

test('9. Amenity Extraction: Identifies canonical amenities and aliases', () => {
  assert.equal(extractAmenityName('The clubhouse'), 'Clubhouse');
  assert.equal(extractAmenityName('Book badminton court 2'), 'Badminton');
  assert.equal(extractAmenityName('Can I use the swimming pool?'), 'Swimming Pool');
  assert.equal(extractAmenityName('Check the gym'), 'Gym');
  assert.equal(extractAmenityName('Tennis court booking'), 'Tennis');
});

// -------------------------------------------------------------
// 3. Multi-Turn Clarification vs. Confirmation State Machine
// -------------------------------------------------------------
test('10. Multi-Turn: Step-by-step intake for amenity booking with clarification and confirmation', () => {
  // Step 1: User expresses booking intent without details
  const step1 = analyzeConversationTurn('I want to book an amenity', null, [], FIXED_REF_DATE);
  assert.equal(step1.activeIntent, INTENTS.AMENITY_BOOKING);
  assert.equal(step1.workflow, WORKFLOWS.AMENITY_BOOKING_INTAKE);
  assert.deepEqual(step1.missingFields, ['amenityName', 'date', 'slotTime']);
  assert.equal(step1.interactionType, 'clarification');
  assert.match(step1.nextQuestion, /Which amenity would you like to book/i);
  assert.equal(step1.awaitingConfirmation, false);

  // Step 2: User responds with amenity name ("The clubhouse")
  const step2 = analyzeConversationTurn('The clubhouse.', step1, [], FIXED_REF_DATE);
  assert.equal(step2.activeIntent, INTENTS.AMENITY_BOOKING);
  assert.equal(step2.workflow, WORKFLOWS.AMENITY_BOOKING_INTAKE);
  assert.equal(step2.collectedDetails.amenityName, 'Clubhouse');
  assert.deepEqual(step2.missingFields, ['date', 'slotTime']);
  assert.equal(step2.interactionType, 'clarification');
  assert.match(step2.nextQuestion, /What date would you like to book the Clubhouse/i);
  assert.equal(step2.awaitingConfirmation, false);

  // Step 3: User responds with date and time ("Saturday at 6 PM")
  const step3 = analyzeConversationTurn('Saturday at 6 PM.', step2, [], FIXED_REF_DATE);
  assert.equal(step3.activeIntent, INTENTS.AMENITY_BOOKING);
  assert.equal(step3.workflow, WORKFLOWS.AMENITY_BOOKING_READY);
  assert.equal(step3.collectedDetails.amenityName, 'Clubhouse');
  assert.equal(step3.collectedDetails.date, '2026-10-31');
  assert.equal(step3.collectedDetails.slotTime, '18:00');
  assert.deepEqual(step3.missingFields, []);
  assert.equal(step3.interactionType, 'confirmation');
  assert.equal(step3.awaitingConfirmation, true);
});

// -------------------------------------------------------------
// 4. Task Switching
// -------------------------------------------------------------
test('11. Task Switching: Cleanly resets in-progress booking workflow when user pivots to dues', () => {
  // Start in-progress booking workflow
  const bookingState = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
    collectedDetails: { amenityName: 'Clubhouse' },
    missingFields: ['date', 'slotTime'],
    nextQuestion: 'What date would you like to book the Clubhouse for?',
    interactionType: 'clarification',
    awaitingConfirmation: false,
  };

  // User pivots to an unrelated task: "Wait, how much maintenance do I need to pay?"
  const switchedState = analyzeConversationTurn(
    'Wait, how much maintenance do I need to pay?',
    bookingState,
    [],
    FIXED_REF_DATE
  );

  assert.equal(switchedState.activeIntent, INTENTS.RESIDENT_DUES);
  assert.equal(switchedState.workflow, null);
  assert.deepEqual(switchedState.collectedDetails, {});
  assert.deepEqual(switchedState.missingFields, []);
  assert.equal(switchedState.interactionType, 'answering');
  assert.equal(switchedState.awaitingConfirmation, false);
});

// -------------------------------------------------------------
// 5. Follow-Up Queries referencing Prior Context
// -------------------------------------------------------------
test('12. Follow-Up: "What about next week?" retains my_bookings intent with resolved date range', () => {
  const previousState = {
    activeIntent: INTENTS.MY_BOOKINGS,
    workflow: null,
    collectedDetails: {},
    missingFields: [],
    nextQuestion: null,
    interactionType: 'answering',
    awaitingConfirmation: false,
  };

  const followUpState = analyzeConversationTurn('What about next week?', previousState, [], FIXED_REF_DATE);

  assert.equal(followUpState.activeIntent, INTENTS.MY_BOOKINGS);
  assert.equal(followUpState.collectedDetails.dateRangeLabel, 'Next week');
  assert.equal(followUpState.collectedDetails.startDate, '2026-11-02');
  assert.equal(followUpState.collectedDetails.endDate, '2026-11-08');
  assert.equal(followUpState.interactionType, 'answering');
});

// -------------------------------------------------------------
// 6. Tool Calling with Date Range & Empty Result Distinction
// -------------------------------------------------------------
test('13. Tool Calling: get_my_bookings tool accepts startDate and endDate filters', async () => {
  let passedFilters = null;
  setTestServices({
    amenityBookingService: {
      getMyBookings: async (userId, orgId, filters) => {
        passedFilters = filters;
        return [
          {
            _id: 'book_101',
            amenityName: 'Badminton Court 1',
            bookingDate: '2026-11-03',
            startTime: '07:00',
            endTime: '08:00',
            status: 'confirmed',
            qrCode: 'qr_pass_123',
          },
        ];
      },
    },
  });

  const user = { id: 'user_test', orgId: 'org_test' };
  const tenant = { orgId: 'org_test' };

  const result = await executeAssistantTool(
    user,
    tenant,
    'get_my_bookings',
    {
      startDate: '2026-11-02',
      endDate: '2026-11-08',
      dateRangeLabel: 'Next week',
    },
    [{ id: 'amenities_my_booking', route: '/(resident)/amenities/my-bookings' }]
  );

  assert.equal(result.success, true);
  assert.deepEqual(passedFilters, { startDate: '2026-11-02', endDate: '2026-11-08' });
  assert.equal(result.data.count, 1);
  assert.equal(result.data.dateRangeLabel, 'Next week');
  assert.equal(result.data.bookings[0].amenityName, 'Badminton Court 1');
});

test('14. Result Discrimination: Distinguishes empty bookings from service error', async () => {
  // Case A: Genuine empty dataset (user has 0 bookings for next week)
  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [],
    },
  });

  const user = { id: 'user_test', orgId: 'org_test' };
  const tenant = { orgId: 'org_test' };

  const emptyResult = await executeAssistantTool(
    user,
    tenant,
    'get_my_bookings',
    { startDate: '2026-11-02', endDate: '2026-11-08', dateRangeLabel: 'Next week' }
  );

  assert.equal(emptyResult.success, true);
  assert.equal(emptyResult.data.count, 0);
  assert.match(emptyResult.data.emptyMessage, /do not have any active amenity bookings Next week/i);

  // Case B: Backend service failure
  setTestServices({
    amenityBookingService: null, // Service unavailable
  });

  const failureResult = await executeAssistantTool(
    user,
    tenant,
    'get_my_bookings',
    { startDate: '2026-11-02' }
  );

  assert.equal(failureResult.success, false);
  assert.match(failureResult.error, /service is currently unavailable/i);
});

// -------------------------------------------------------------
// 7. Sanitization & Resilience
// -------------------------------------------------------------
test('15. Security: Sanitizes conversation state to prevent prototype pollution and bound lengths', () => {
  const maliciousState = {
    __proto__: { polluted: true },
    activeIntent: 'a'.repeat(500),
    workflow: 'valid_workflow',
    interactionType: 'invalid_type',
    awaitingConfirmation: 'truthy_value',
    missingFields: ['field1', 'b'.repeat(1000)],
    collectedDetails: {
      amenityName: 'Clubhouse',
      ['c'.repeat(200)]: 'value',
    },
  };

  const clean = sanitizeConversationState(maliciousState);

  assert.equal(clean.activeIntent.length, 50);
  assert.equal(clean.interactionType, 'answering'); // Falls back to safe default
  assert.equal(clean.awaitingConfirmation, true);
  assert.equal(clean.missingFields[1].length, 50);
  assert.equal(clean.collectedDetails.amenityName, 'Clubhouse');
  assert.equal(Object.prototype.polluted, undefined);
});

// -------------------------------------------------------------
// 8. End-to-End Chat Generation with Conversation State Flow
// -------------------------------------------------------------
test('16. End-to-End: generateChatResponse returns conversationState and handles multi-turn clarification', async () => {
  // Mock Gemini responding to booking clarification
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
                  text: 'Which amenity would you like to book? We have Badminton Courts, Tennis Courts, Clubhouse, and the Swimming Pool available.',
                },
              ],
            },
          },
        ],
      }),
    };
  });

  const user = { id: 'u1', orgId: 'org1', permissions: ['amenities:my_booking'] };
  const tenant = { orgId: 'org1' };

  const res = await aiAssistantService.generateChatResponse(user, tenant, {
    message: 'I want to book an amenity',
    history: [],
    context: { referenceDate: '2026-10-28T10:00:00+05:30' },
  });

  assert.equal(res.status, 'clarification');
  assert.ok(res.conversationState);
  assert.equal(res.conversationState.activeIntent, INTENTS.AMENITY_BOOKING);
  assert.equal(res.conversationState.workflow, WORKFLOWS.AMENITY_BOOKING_INTAKE);
  assert.deepEqual(res.conversationState.missingFields, ['amenityName', 'date', 'slotTime']);
  assert.match(res.message, /Which amenity would you like to book/i);
});

test('17. End-to-End: Task Switching resets state on live assistant call', async () => {
  // Mock Gemini responding to dues question
  setTestServices({
    invoiceServices: {
      getUserDuesOverview: async () => ({
        personalDues: { totalOutstanding: 2500, overdueAmount: 0 },
        recentInvoices: [{ invoiceNumber: 'INV-2026-10-01', totalAmount: 2500, status: 'UNPAID' }],
      }),
    },
  });

  setFetchImplementation(async (url, opts) => {
    const body = JSON.parse(opts.body);
    const hasFunctionResponse = body.contents.some((c) => (c.role === 'function' || c.role === 'user') && c.parts?.some((p) => p.functionResponse));

    if (!hasFunctionResponse) {
      // Step 1: Model calls get_resident_dues_and_invoices
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'get_resident_dues_and_invoices',
                      args: {},
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    }

    // Step 2: Final response
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'You have a pending maintenance charge of ₹2,500 on invoice INV-2026-10-01.',
                },
              ],
            },
          },
        ],
      }),
    };
  });

  const user = { id: 'u1', orgId: 'org1', permissions: ['billing:my_invoices'] };
  const tenant = { orgId: 'org1' };

  // Previous state was in amenity booking intake
  const priorBookingState = {
    activeIntent: INTENTS.AMENITY_BOOKING,
    workflow: WORKFLOWS.AMENITY_BOOKING_INTAKE,
    collectedDetails: { amenityName: 'Clubhouse' },
    missingFields: ['date', 'slotTime'],
    nextQuestion: 'What date would you like to book the Clubhouse for?',
    interactionType: 'clarification',
    awaitingConfirmation: false,
  };

  const res = await aiAssistantService.generateChatResponse(user, tenant, {
    message: 'Wait, how much maintenance do I need to pay?',
    history: [],
    context: {
      conversationState: priorBookingState,
      referenceDate: '2026-10-28T10:00:00+05:30',
    },
  });

  assert.equal(res.status, 'success');
  assert.equal(res.conversationState.activeIntent, INTENTS.RESIDENT_DUES);
  assert.equal(res.conversationState.workflow, null);
  assert.deepEqual(res.conversationState.collectedDetails, {});
  assert.match(res.message, /2,500/i);
});

test('18. Realistic Workflows: Accurately detects and maps all 9 Priority 4 real-world queries', () => {
  const cases = [
    { text: 'What were my community expenses this month?', expected: INTENTS.COMMUNITY_FINANCE },
    { text: 'Show my pending maintenance dues.', expected: INTENTS.RESIDENT_DUES },
    { text: 'Show my complaints.', expected: INTENTS.COMPLAINTS_HELPDESK },
    { text: 'Show the latest community notices.', expected: INTENTS.COMMUNITY_NOTICES },
    { text: 'Who is assigned to my unit?', expected: INTENTS.STAFF_DIRECTORY },
    { text: 'Show the active community polls.', expected: INTENTS.COMMUNITY_POLLS },
    { text: 'Vote for option 2 in this poll.', expected: INTENTS.COMMUNITY_POLLS },
    { text: 'Book the gym tomorrow at 6 PM.', expected: INTENTS.AMENITY_BOOKING },
    { text: 'Record a personal expense of 450 rupees for groceries.', expected: INTENTS.PERSONAL_EXPENSE_CREATE },
  ];

  for (const c of cases) {
    const detected = detectDirectIntent(c.text);
    assert.equal(detected, c.expected, `Query "${c.text}" should map to intent "${c.expected}", got "${detected}"`);
  }
});

test('19. NLU & Intent: Correctly detects Amenity Facility Creation for complex natural language admin prompt', () => {
  const query = 'create one amenities in ameniities in amenity master Basketball Court slot based with per slot rupees of 500 for the maximum member of 10';
  const detected = detectDirectIntent(query);
  assert.equal(detected, INTENTS.AMENITY_CREATE);

  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);
  assert.equal(turnState.activeIntent, INTENTS.AMENITY_CREATE);
  assert.equal(turnState.workflow, WORKFLOWS.AMENITY_CREATE_READY);
  assert.equal(turnState.collectedDetails.name, 'Basketball');
  assert.equal(turnState.collectedDetails.ratePerHour, 500);
  assert.equal(turnState.collectedDetails.capacity, 10);
  assert.equal(turnState.awaitingConfirmation, true);
});

test('20. NLU & Intent: Correctly detects Maintenance Assessment Creation for user prompt with typo', () => {
  const query = 'create a new assestement for the billing and invoice page for all users name november maintenance amount of 10000';
  const detected = detectDirectIntent(query);
  assert.equal(detected, INTENTS.ASSESSMENT_CREATE);

  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);
  assert.equal(turnState.activeIntent, INTENTS.ASSESSMENT_CREATE);
  assert.equal(turnState.workflow, WORKFLOWS.ASSESSMENT_CREATE_READY);
  assert.equal(turnState.collectedDetails.name, 'November maintenance');
  assert.equal(turnState.collectedDetails.flatAmount, 10000);
  assert.equal(turnState.collectedDetails.targetScopeType, 'ALL_COMMUNITY');
  assert.equal(turnState.awaitingConfirmation, true);
});

test('21. NLU & Intent: Correctly detects Amenity Facility Creation with user typo "create a amentity"', () => {
  const query = 'create a amentity for tennis court';
  const detected = detectDirectIntent(query);
  assert.equal(detected, INTENTS.AMENITY_CREATE);

  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);
  assert.equal(turnState.activeIntent, INTENTS.AMENITY_CREATE);
  assert.equal(turnState.workflow, WORKFLOWS.AMENITY_CREATE_READY);
  assert.equal(turnState.collectedDetails.name, 'Tennis');
});

test('22. NLU & Intent: Correctly detects Community Poll Creation and extracts question and options', () => {
  const query = 'create a poll on whether to renovate the pool with options Yes, No, Maybe';
  const detected = detectDirectIntent(query);
  assert.equal(detected, INTENTS.POLL_CREATE);

  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);
  assert.equal(turnState.activeIntent, INTENTS.POLL_CREATE);
  assert.equal(turnState.workflow, WORKFLOWS.POLL_CREATE_READY);
  assert.match(turnState.collectedDetails.question, /whether to renovate the pool/i);
  assert.deepEqual(turnState.collectedDetails.options, ['Yes', 'No', 'Maybe']);
  assert.equal(turnState.awaitingConfirmation, true);
});

test('23. NLU & Intent: Correctly detects Notice Board Publication and extracts title and priority', () => {
  const query = 'post a notice on water shutdown tomorrow at 10am priority high';
  const detected = detectDirectIntent(query);
  assert.equal(detected, INTENTS.NOTICE_CREATE);

  const turnState = analyzeConversationTurn(query, null, [], FIXED_REF_DATE);
  assert.equal(turnState.activeIntent, INTENTS.NOTICE_CREATE);
  assert.equal(turnState.workflow, WORKFLOWS.NOTICE_CREATE_READY);
  assert.match(turnState.collectedDetails.title, /water shutdown/i);
  assert.equal(turnState.collectedDetails.priority, 'High');
  assert.equal(turnState.collectedDetails.category, 'Maintenance');
  assert.equal(turnState.awaitingConfirmation, true);
});

test('24. Phase 3 NL Requests: All 12 primary voice requests resolve to intended canonical intents', () => {
  const testMatrix = [
    { query: 'Show my outstanding maintenance dues.', expected: INTENTS.RESIDENT_DUES },
    { query: 'How much did I spend on groceries this month?', expected: INTENTS.PERSONAL_EXPENSE },
    { query: 'Show my open complaints.', expected: INTENTS.COMPLAINTS_HELPDESK },
    { query: 'Show my visitor passes.', expected: INTENTS.VISITOR_MANAGEMENT },
    { query: 'Check swimming pool availability tomorrow.', expected: INTENTS.AMENITY_AVAILABILITY },
    { query: 'Book the swimming pool at 6 PM.', expected: INTENTS.AMENITY_BOOKING },
    { query: 'Cancel my booking.', expected: INTENTS.AMENITY_CANCELLATION },
    { query: 'Report a water leakage complaint.', expected: INTENTS.COMPLAINT_CREATE },
    { query: 'Create a poll about clubhouse renovation.', expected: INTENTS.POLL_CREATE },
    { query: "Publish a notice about tomorrow's water interruption.", expected: INTENTS.NOTICE_CREATE },
    { query: 'How much did our community spend this month?', expected: INTENTS.COMMUNITY_FINANCE },
    { query: 'Open the amenities screen.', expected: INTENTS.AMENITY_INQUIRY },
  ];

  for (const item of testMatrix) {
    const detected = detectDirectIntent(item.query);
    assert.equal(
      detected,
      item.expected,
      `Failed to match intent for "${item.query}". Expected ${item.expected}, got ${detected}`
    );
  }
});
