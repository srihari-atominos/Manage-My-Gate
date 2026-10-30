import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeConversationTurn,
  INTERACTIVE_OPTION_SETS,
  attachUniversalInteractiveOptions,
  INTENTS,
  WORKFLOWS,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';
import aiAssistantService from '../src/features/aiAssistant/aiAssistant.service.js';

test('UNIVERSAL HYBRID INPUT EXPERIENCE - AUTOMATED TEST SUITE', async (t) => {
  const residentUser = {
    _id: '507f191e810c19729de860ea',
    name: 'Vikram Sharma',
    role: 'resident',
    permissions: ['amenities:my_booking', 'visitor:resident', 'complaints:raise_ticket'],
  };

  const adminUser = {
    _id: '507f191e810c19729de860eb',
    name: 'Society Admin',
    role: 'admin',
    permissions: ['*'],
  };

  const tenant = { organizationId: 'org_nesus_001' };
  const refDate = new Date('2026-10-30T10:00:00.000Z');

  await t.test('1. Visitor Pass: Generic query attaches 5 rich invitation archetypes with interactiveConfig', () => {
    const turn = analyzeConversationTurn('Create a visitor pass', null, [], refDate, residentUser);
    assert.equal(turn.activeIntent, INTENTS.VISITOR_MANAGEMENT);
    assert.equal(turn.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);
    assert.ok(Array.isArray(turn.options));
    assert.equal(turn.options.length, 5);

    // Verify the 5 archetypes matching the user's screenshot
    const types = turn.options.map((o) => o.type || o.value);
    assert.ok(types.includes('GUEST'));
    assert.ok(types.includes('GROUP'));
    assert.ok(types.includes('CAB'));
    assert.ok(types.includes('DELIVERY'));
    assert.ok(types.includes('SERVICE'));

    // Check badges
    const groupOpt = turn.options.find((o) => o.value === 'GROUP');
    assert.equal(groupOpt.badge, 'Multi-Guest');
    const serviceOpt = turn.options.find((o) => o.value === 'SERVICE');
    assert.equal(serviceOpt.badge, 'Recurring');

    // Check interactiveConfig
    assert.ok(turn.interactiveConfig);
    assert.equal(turn.interactiveConfig.mode, 'single');
    assert.equal(turn.interactiveConfig.targetField, 'passType');
    assert.equal(turn.interactiveConfig.allowDeselect, true);
    assert.equal(turn.interactiveConfig.allowCustomText, true);
  });

  await t.test('2. Single Selection: Selecting Cab / Auto sets passType and presents arrival presets', () => {
    const turn1 = analyzeConversationTurn('Create a visitor pass', null, [], refDate, residentUser);
    const turn2 = analyzeConversationTurn('Cab / Auto', turn1, [], refDate, residentUser);

    assert.equal(turn2.collectedDetails.passType, 'CAB');
    assert.ok(Array.isArray(turn2.options));
    // When time is missing, arrival presets are provided
    const hasImmediate = turn2.options.some((o) => o.value === 'right now');
    assert.ok(hasImmediate);
    assert.equal(turn2.interactiveConfig.targetField, 'slotTime');
  });

  await t.test('3. Option Switching: User switches archetype from Guest to Delivery without losing context', () => {
    const turn1 = analyzeConversationTurn('Guest pass for tomorrow at 4 PM', null, [], refDate, residentUser);
    assert.equal(turn1.collectedDetails.passType, 'GUEST');
    assert.ok(turn1.collectedDetails.slotTime === '16:00' || turn1.collectedDetails.slotTime === '04:00 PM');

    // Switch archetype to Delivery
    const turn2 = analyzeConversationTurn('Actually make that a Delivery pass', turn1, [], refDate, residentUser);
    assert.equal(turn2.collectedDetails.passType, 'DELIVERY');
    // Notice slotTime is preserved!
    assert.ok(turn2.collectedDetails.slotTime === '16:00' || turn2.collectedDetails.slotTime === '04:00 PM');
  });

  await t.test('4. Deselection: User deselects Cab pass type using "deselect cab"', () => {
    const turn1 = analyzeConversationTurn('Cab / Auto', {
      activeIntent: INTENTS.VISITOR_MANAGEMENT,
      workflow: WORKFLOWS.VISITOR_PASS_INTAKE,
      collectedDetails: { passType: 'CAB', slotTime: '11:00 AM' },
    }, [], refDate, residentUser);

    const turn2 = analyzeConversationTurn('deselect cab', turn1, [], refDate, residentUser);
    assert.equal(turn2.collectedDetails.passType, undefined);
    assert.ok(turn2.missingFields.includes('passType'));
    // PassType options are re-attached
    assert.ok(turn2.options.some((o) => o.value === 'GUEST'));
  });

  await t.test('5. Amenity Booking: Switches payment method between Digital Wallet and Online Payment without losing booking details', () => {
    const initialBooking = {
      activeIntent: INTENTS.AMENITY_BOOKING,
      workflow: WORKFLOWS.AMENITY_BOOKING_READY,
      collectedDetails: {
        amenityName: 'Badminton Court',
        date: '2026-10-31',
        slotTime: '06:00 PM',
        preferredPaymentMethod: 'WALLET',
      },
      missingFields: [],
      awaitingConfirmation: true,
    };

    const turn = analyzeConversationTurn('Pay Online', initialBooking, [], refDate, residentUser);
    assert.equal(turn.collectedDetails.preferredPaymentMethod, 'ONLINE');
    assert.equal(turn.collectedDetails.amenityName, 'Badminton Court');
    assert.equal(turn.collectedDetails.slotTime, '06:00 PM');
    assert.equal(turn.collectedDetails.date, '2026-10-31');
  });

  await t.test('6. Combined Selection and Text: User provides category chip + custom description simultaneously', () => {
    const turn = analyzeConversationTurn('Raise a complaint: Plumbing - kitchen sink pipe is leaking heavily', null, [], refDate, residentUser);
    assert.equal(turn.activeIntent, INTENTS.COMPLAINT_CREATE);
    assert.equal(turn.collectedDetails.category, 'Plumbing');
    assert.ok(turn.collectedDetails.title.toLowerCase().includes('sink'));
  });

  await t.test('7. Maintenance Intake: Presents rich trades options and captures urgency', () => {
    const turn1 = analyzeConversationTurn('Schedule maintenance', null, [], refDate, residentUser);
    assert.equal(turn1.activeIntent, INTENTS.MAINTENANCE_CREATE);
    assert.ok(Array.isArray(turn1.options));
    assert.ok(turn1.options.some((o) => o.value === 'ac_service'));
    assert.ok(turn1.options.some((o) => o.value === 'electrician'));
    assert.ok(turn1.options.some((o) => o.value === 'plumber'));

    const turn2 = analyzeConversationTurn('AC & HVAC Service tomorrow morning', turn1, [], refDate, residentUser);
    assert.equal(turn2.collectedDetails.trade, 'ac_service');
    assert.ok(turn2.collectedDetails.preferredVisitDate);
  });

  await t.test('8. Multi-Select: Amenity Creation supports facilities options with multi-select mode', () => {
    const state = {
      activeIntent: INTENTS.AMENITY_CREATE,
      workflow: WORKFLOWS.AMENITY_CREATE_INTAKE,
      collectedDetails: { name: 'New Olympic Pool' },
      missingFields: ['facilities'],
    };

    const withOpts = attachUniversalInteractiveOptions(state, adminUser);
    assert.ok(Array.isArray(withOpts.options));
    assert.equal(withOpts.interactiveConfig.mode, 'multiple');
    assert.equal(withOpts.interactiveConfig.targetField, 'facilities');
    assert.ok(withOpts.options.some((o) => o.label === 'Air Conditioning'));
    assert.ok(withOpts.options.some((o) => o.label === 'Shower Rooms'));
  });

  await t.test('9. Awaiting Confirmation: Exposes [Confirm & Proceed], [Change Details], and [Cancel Request]', () => {
    const state = {
      activeIntent: INTENTS.AMENITY_BOOKING,
      workflow: WORKFLOWS.AMENITY_BOOKING_READY,
      collectedDetails: { amenityName: 'Tennis Court', date: '2026-10-31', slotTime: '07:00 AM' },
      missingFields: [],
      awaitingConfirmation: true,
      pendingAction: { id: 'act_test_123', actionType: 'CREATE_AMENITY_BOOKING' },
    };

    const withOpts = attachUniversalInteractiveOptions(state, residentUser);
    assert.ok(Array.isArray(withOpts.options));
    assert.equal(withOpts.interactiveConfig.targetField, 'confirmation');
    assert.equal(withOpts.options.length, 3);
    assert.equal(withOpts.options[0].value, 'yes');
    assert.equal(withOpts.options[1].value, 'change');
    assert.equal(withOpts.options[2].value, 'cancel');
  });

  await t.test('10. Community Finance & Resident Dues: Period and view filter chips attached', () => {
    const finTurn = analyzeConversationTurn('Show community finance overview', null, [], refDate, adminUser);
    assert.equal(finTurn.activeIntent, INTENTS.COMMUNITY_FINANCE);
    assert.ok(Array.isArray(finTurn.options));
    assert.ok(finTurn.options.some((o) => o.value === 'this_month'));
    assert.ok(finTurn.options.some((o) => o.value === 'quarter'));

    const duesTurn = analyzeConversationTurn('Show my pending dues', null, [], refDate, residentUser);
    assert.equal(duesTurn.activeIntent, INTENTS.RESIDENT_DUES);
    assert.ok(Array.isArray(duesTurn.options));
    assert.ok(duesTurn.options.some((o) => o.value === 'dues'));
  });
});
