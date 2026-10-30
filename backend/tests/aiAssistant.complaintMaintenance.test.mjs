import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeConversationTurn,
  detectDirectIntent,
  extractComplaintDetails,
  extractMaintenanceDetails,
  extractIssueLocation,
  formatComplaintSummary,
  formatMaintenanceSummary,
  INTENTS,
  WORKFLOWS,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';
import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

const FIXED_REF_DATE = new Date('2026-10-30T10:00:00.000Z'); // Friday
const TEST_ORG_ID = '507f191e810c19729de860ea';
const TEST_USER_ID = '507f191e810c19729de860eb';

const RESIDENT_USER = {
  _id: TEST_USER_ID,
  id: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role: 'Resident',
  name: 'Ananya Sharma',
  villaId: '607f191e810c19729de860aa',
  permissions: ['complaints:my_tickets', 'complaints:raise_ticket'],
};

const UNAUTHORIZED_USER = {
  _id: '507f191e810c19729de860ec',
  id: '507f191e810c19729de860ec',
  orgId: TEST_ORG_ID,
  role: 'Guest',
  permissions: [],
};

test.beforeEach(() => {
  resetTestServices();
});

test.afterEach(() => {
  resetTestServices();
});

// =========================================================================
// 1. Scenario 1: Direct Complaint Workflow (Housekeeping)
// =========================================================================
test('Scenario 1: Direct complaint - correctly classifies intent, extracts category, location, and prepares proposal', async () => {
  const query = 'The housekeeping team is not cleaning the 4th floor corridor properly.';
  
  // 1a. Intent classification
  const intent = detectDirectIntent(query);
  assert.equal(intent, INTENTS.COMPLAINT_CREATE);

  // 1b. Location extraction
  const location = extractIssueLocation(query);
  assert.equal(location, '4th Floor Corridor');

  // 1c. Conversation turn analysis
  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'complaint_create');
  assert.equal(turn.workflow, WORKFLOWS.COMPLAINT_READY);
  assert.equal(turn.collectedDetails.category, 'Housekeeping');
  assert.ok(turn.collectedDetails.title.includes('Housekeeping'));
  assert.equal(turn.collectedDetails.location, '4th Floor Corridor');

  // 1d. Proposal preparation
  let createdRecord = null;
  const mockComplaintService = {
    createComplaint: async (orgId, residentId, residentNameOrData, maybeData) => {
      const data = (maybeData && typeof maybeData === 'object') ? maybeData : residentNameOrData;
      createdRecord = {
        _id: '607f191e810c19729de86001',
        complaintNumber: 'CMP-2026-000001',
        title: data.title,
        category: data.category,
        priority: data.priority,
        department: data.department || 'Helpdesk',
        status: 'Open',
        slaDueDate: new Date(FIXED_REF_DATE.getTime() + 24 * 3600 * 1000).toISOString(),
      };
      return createdRecord;
    },
    getComplaints: async () => ({ data: [] }),
  };

  setTestServices({ complaintService: mockComplaintService });

  const prepRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_complaint',
    turn.collectedDetails,
    ['complaints']
  );

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.data.proposalReady, true);
  assert.equal(prepRes.data.actionType, 'CREATE_COMPLAINT');
  assert.ok(prepRes.data.summary.includes('Housekeeping'));

  // 1e. Confirm action executes backend createComplaint
  const confirmRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prepRes.data.actionId,
      confirmationToken: prepRes.data.confirmationToken,
    },
    ['complaints']
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.complaintNumber, 'CMP-2026-000001');
  assert.equal(confirmRes.data.status, 'Open');
  assert.ok(createdRecord !== null);
  assert.equal(createdRecord.title, turn.collectedDetails.title);
});

// =========================================================================
// 2. Scenario 2: Maintenance Request (Plumbing with schedule)
// =========================================================================
test('Scenario 2: Maintenance request - classifies maintenance, extracts plumber & schedule, prepares and confirms', async () => {
  const query = 'My bathroom tap is leaking. Send a plumber tomorrow morning.';
  
  // 2a. Intent classification
  const intent = detectDirectIntent(query);
  assert.equal(intent, INTENTS.MAINTENANCE_CREATE);

  // 2b. Maintenance details extraction
  const details = extractMaintenanceDetails(query, {}, FIXED_REF_DATE);
  assert.equal(details.category, 'Plumbing');
  assert.equal(details.serviceType, 'Plumber');
  assert.equal(details.location, 'Bathroom');
  assert.ok(details.title.toLowerCase().includes('tap'));
  assert.equal(details.preferredVisitDate, '2026-10-31');
  assert.equal(details.preferredVisitTime, 'Morning (09:00 AM - 12:00 PM)');

  // 2c. Multi-turn state
  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'maintenance_create');
  assert.equal(turn.workflow, WORKFLOWS.MAINTENANCE_READY);
  assert.equal(turn.collectedDetails.preferredVisitDate, '2026-10-31');

  // 2d. Prepare maintenance request
  let createdMaint = null;
  const mockComplaintService = {
    createComplaint: async (orgId, residentId, residentNameOrData, maybeData) => {
      const data = (maybeData && typeof maybeData === 'object') ? maybeData : residentNameOrData;
      createdMaint = {
        _id: '607f191e810c19729de86002',
        complaintNumber: 'MNT-2026-000002',
        title: data.title,
        category: data.category,
        subCategory: data.subCategory,
        department: data.department,
        priority: data.priority,
        status: 'Open',
        preferredVisitDate: data.preferredVisitDate,
        preferredVisitTime: data.preferredVisitTime,
        slaDueDate: new Date(FIXED_REF_DATE.getTime() + 12 * 3600 * 1000).toISOString(),
      };
      return createdMaint;
    },
    getComplaints: async () => ({ data: [] }),
  };

  setTestServices({ complaintService: mockComplaintService });

  const prepRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_maintenance_request',
    turn.collectedDetails,
    ['complaints']
  );

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.data.proposalReady, true);
  assert.equal(prepRes.data.actionType, 'CREATE_MAINTENANCE_REQUEST');
  assert.ok(prepRes.data.summary.includes('Plumbing'));
  assert.ok(prepRes.data.summary.includes('2026-10-31'));

  // 2e. Confirmation executes backend
  const confirmRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prepRes.data.actionId,
      confirmationToken: prepRes.data.confirmationToken,
    },
    ['complaints']
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.complaintNumber, 'MNT-2026-000002');
  assert.equal(confirmRes.data.department, 'Maintenance');
  assert.equal(createdMaint.department, 'Maintenance');
  assert.equal(createdMaint.category, 'Plumbing');
});

// =========================================================================
// 3. Scenario 3: Complex Maintenance (AC Repair with Saturday schedule)
// =========================================================================
test('Scenario 3: Complex AC maintenance - extracts AC technician, room, and Saturday 3 PM schedule', async () => {
  const query = 'AC in master bedroom is making noise and not cooling. Schedule technician visit for Saturday 3 PM.';

  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'maintenance_create');
  assert.equal(turn.workflow, WORKFLOWS.MAINTENANCE_READY);
  assert.equal(turn.collectedDetails.category, 'AC & HVAC');
  assert.equal(turn.collectedDetails.serviceType, 'AC Technician');
  assert.equal(turn.collectedDetails.location, 'Master Bedroom');
  assert.equal(turn.collectedDetails.preferredVisitDate, '2026-10-31'); // Saturday
  assert.ok(turn.collectedDetails.preferredVisitTime.includes('3 PM') || turn.collectedDetails.preferredVisitTime.includes('Afternoon'));
});

// =========================================================================
// 4. Scenario 4: General request mapped to maintenance ("I need an electrician")
// =========================================================================
test('Scenario 4: "I need an electrician" is routed to MAINTENANCE_INTAKE, not staff directory', () => {
  const query = 'I need an electrician';
  
  const intent = detectDirectIntent(query);
  assert.equal(intent, INTENTS.MAINTENANCE_CREATE);

  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'maintenance_create');
  assert.equal(turn.workflow, WORKFLOWS.MAINTENANCE_INTAKE);
  assert.equal(turn.interactionType, 'clarification');
  assert.equal(turn.collectedDetails.category, 'Electrical');
  assert.equal(turn.collectedDetails.serviceType, 'Electrician');
  assert.ok(turn.nextQuestion.includes('what electrical problem'));
});

// =========================================================================
// 5. Scenario 5: Multi-Turn Correction Handling
// =========================================================================
test('Scenario 5: Multi-turn intake with corrections updates location without losing previous details', () => {
  // Step 1: User mentions elevator complaint
  const turn1 = analyzeConversationTurn(
    'Lodge a complaint about elevator',
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn1.activeIntent, 'complaint_create');
  assert.equal(turn1.collectedDetails.category, 'Elevators');

  // Step 2: User provides location: Tower B lift
  const turn2 = analyzeConversationTurn(
    'It is Tower B lift',
    turn1,
    [{ role: 'user', content: 'Lodge a complaint about elevator' }],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn2.collectedDetails.category, 'Elevators');
  assert.equal(turn2.collectedDetails.location, 'Tower B');

  // Step 3: User corrects: Actually Tower A passenger lift
  const turn3 = analyzeConversationTurn(
    'Actually Tower A passenger lift',
    turn2,
    [
      { role: 'user', content: 'Lodge a complaint about elevator' },
      { role: 'user', content: 'It is Tower B lift' },
    ],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn3.collectedDetails.category, 'Elevators');
  assert.equal(turn3.collectedDetails.location, 'Tower A');
});

// =========================================================================
// 6. Scenario 6: Complaint Escalation
// =========================================================================
test('Scenario 6: Complaint Escalation - resolves ticket ID, calls escalateComplaint in service', async () => {
  const query = 'Escalate ticket CMP-2026-000001, it has been 3 days with no response.';

  const intent = detectDirectIntent(query);
  assert.equal(intent, INTENTS.COMPLAINT_ESCALATE);

  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'complaint_escalate');
  assert.equal(turn.collectedDetails.complaintId, 'CMP-2026-000001');

  let escalatedTicket = null;
  const mockComplaintService = {
    getComplaintById: async (id, orgId) => ({
      _id: '607f191e810c19729de86001',
      complaintNumber: 'CMP-2026-000001',
      title: 'Water Leakage',
      status: 'Open',
      escalationLevel: 0,
    }),
    getComplaints: async () => ({
      data: [{
        _id: '607f191e810c19729de86001',
        complaintNumber: 'CMP-2026-000001',
        title: 'Water Leakage',
        status: 'Open',
        escalationLevel: 0,
      }],
    }),
    escalateComplaint: async (id, orgId, metaData) => {
      escalatedTicket = {
        _id: id,
        complaintNumber: 'CMP-2026-000001',
        status: 'Escalated',
        escalationLevel: 1,
      };
      return escalatedTicket;
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const prepRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'escalate_complaint',
    turn.collectedDetails,
    ['complaints']
  );

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.data.proposalReady, true);
  assert.equal(prepRes.data.actionType, 'ESCALATE_COMPLAINT');

  const confirmRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prepRes.data.actionId,
      confirmationToken: prepRes.data.confirmationToken,
    },
    ['complaints']
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.status, 'Escalated');
  assert.equal(confirmRes.data.escalationLevel, 1);
  assert.ok(escalatedTicket !== null);
});

// =========================================================================
// 7. Scenario 7: Complaint Reopening
// =========================================================================
test('Scenario 7: Complaint Reopening - verifies work-done status and reopens ticket', async () => {
  const query = 'Reopen ticket CMP-2026-000002, the tap is still leaking.';

  const intent = detectDirectIntent(query);
  assert.equal(intent, INTENTS.COMPLAINT_REOPEN);

  const turn = analyzeConversationTurn(
    query,
    null,
    [],
    FIXED_REF_DATE,
    { user: RESIDENT_USER, authorizedFeatures: ['complaints'] }
  );

  assert.equal(turn.activeIntent, 'complaint_reopen');
  assert.equal(turn.collectedDetails.complaintId, 'CMP-2026-000002');

  let reopenedTicket = null;
  const mockComplaintService = {
    getComplaintById: async (id, orgId) => ({
      _id: '607f191e810c19729de86002',
      complaintNumber: 'CMP-2026-000002',
      title: 'Tap Leakage',
      status: 'Resolved',
      reopenCount: 0,
    }),
    getComplaints: async () => ({
      data: [{
        _id: '607f191e810c19729de86002',
        complaintNumber: 'CMP-2026-000002',
        title: 'Tap Leakage',
        status: 'Resolved',
        reopenCount: 0,
      }],
    }),
    reopenComplaint: async (id, orgId, userId, userName, userRole, reason, metaData) => {
      reopenedTicket = {
        _id: id,
        complaintNumber: 'CMP-2026-000002',
        status: 'Reopened',
        reopenCount: 1,
      };
      return reopenedTicket;
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const prepRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'reopen_complaint',
    turn.collectedDetails,
    ['complaints']
  );

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.data.proposalReady, true);
  assert.equal(prepRes.data.actionType, 'REOPEN_COMPLAINT');

  const confirmRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'confirm_pending_action',
    {
      actionId: prepRes.data.actionId,
      confirmationToken: prepRes.data.confirmationToken,
    },
    ['complaints']
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.data.status, 'Reopened');
  assert.equal(confirmRes.data.reopenCount, 1);
  assert.ok(reopenedTicket !== null);
});

// =========================================================================
// 8. Scenario 8: Duplicate Prevention & Idempotency
// =========================================================================
test('Scenario 8: Duplicate prevention - prepares identical ticket proposal with duplicate detection flag', async () => {
  const existingTicket = {
    _id: '607f191e810c19729de86003',
    complaintNumber: 'CMP-2026-000003',
    title: 'Water Leakage in Kitchen',
    category: 'Plumbing',
    status: 'In Progress',
    createdAt: new Date().toISOString(),
  };

  const mockComplaintService = {
    getComplaints: async () => ({
      data: [existingTicket],
    }),
  };

  setTestServices({ complaintService: mockComplaintService });

  const prepRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'prepare_complaint',
    { title: 'Water Leakage in Kitchen', category: 'Plumbing' },
    ['complaints']
  );

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.data.isDuplicateWarning, true);
  assert.equal(prepRes.data.existingTicketNumber, 'CMP-2026-000003');
  assert.ok(prepRes.data.summary.includes('Existing Open Ticket Detected'));
});

// =========================================================================
// 9. Scenario 9: RBAC Enforcement
// =========================================================================
test('Scenario 9: RBAC enforcement - Guest role cannot raise complaint or maintenance request', async () => {
  const turn = analyzeConversationTurn(
    'My bathroom tap is leaking. Send a plumber.',
    null,
    [],
    FIXED_REF_DATE,
    { user: UNAUTHORIZED_USER, authorizedFeatures: [] }
  );

  assert.equal(turn.interactionType, 'permission_denied');
  assert.ok(/permission/i.test(turn.denialReason));

  // Also test direct tool execution rejection
  const toolRes = await executeAssistantTool(
    UNAUTHORIZED_USER,
    { _id: TEST_ORG_ID },
    'prepare_maintenance_request',
    { title: 'Leaking tap', category: 'Plumbing' },
    []
  );

  assert.equal(toolRes.success, false);
  assert.ok(toolRes.error.includes('Permission denied') || toolRes.error.includes('authorized'));
});

// =========================================================================
// 10. Scenario 10: Truthful Status Reporting with Technician Details & SLA
// =========================================================================
test('Scenario 10: Truthful status reporting - get_my_complaints returns assigned technician and SLA status', async () => {
  const mockTickets = [
    {
      _id: '607f191e810c19729de86010',
      complaintNumber: 'CMP-2026-000010',
      title: 'Balcony Door Broken',
      category: 'Carpentry',
      status: 'In Progress',
      priority: 'High',
      department: 'Maintenance',
      assignedTechnicianName: 'Ramesh Carpenter',
      assignedTechnicianPhone: '+91 98765 43210',
      preferredVisitDate: '2026-10-31',
      preferredVisitTime: 'Morning (09:00 AM - 12:00 PM)',
      slaDueDate: new Date(FIXED_REF_DATE.getTime() + 4 * 3600 * 1000).toISOString(),
    },
  ];

  const mockComplaintService = {
    getComplaints: async () => ({
      data: mockTickets,
      pagination: { totalRecords: 1, totalPages: 1, currentPage: 1 },
    }),
    calculateSLAStatus: () => 'Within SLA',
  };

  setTestServices({ complaintService: mockComplaintService });

  const statusRes = await executeAssistantTool(
    RESIDENT_USER,
    { _id: TEST_ORG_ID },
    'get_my_complaints',
    { category: 'Carpentry' },
    ['complaints']
  );

  assert.equal(statusRes.success, true);
  assert.equal(statusRes.data.totalComplaintsCount, 1);
  const ticket = statusRes.data.complaints[0];
  assert.equal(ticket.complaintNumber, 'CMP-2026-000010');
  assert.equal(ticket.assignedTechnician, 'Ramesh Carpenter');
  assert.equal(ticket.assignedTechnicianPhone, '+91 98765 43210');
  assert.equal(ticket.slaStatus, 'Within SLA');
  assert.equal(ticket.preferredVisitSchedule, '2026-10-31 Morning (09:00 AM - 12:00 PM)');
});
