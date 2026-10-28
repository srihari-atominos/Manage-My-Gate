import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPendingActionProposal,
  verifyPendingAction,
  acquireExecutionLease,
  recordActionSuccess,
  recordActionFailure,
  isLeaseActive,
  resetActionStoreForTesting,
} from '../src/features/aiAssistant/aiAssistant.actions.js';

import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

const orgAlpha = '507f191e810c19729de860ea';
const orgBeta = '507f191e810c19729de860eb';

const residentAlpha1 = {
  id: '507f1f77bcf86cd799439011',
  name: 'Resident Alpha One',
  email: 'alpha1@nahom.test',
  role: 'Resident',
  orgId: orgAlpha,
  organizationId: orgAlpha,
  villaId: '507f1f77bcf86cd799439099',
};

const residentAlpha2 = {
  id: '507f1f77bcf86cd799439022',
  name: 'Resident Alpha Two',
  email: 'alpha2@nahom.test',
  role: 'Resident',
  orgId: orgAlpha,
  organizationId: orgAlpha,
  villaId: '507f1f77bcf86cd799439088',
};

const residentBeta = {
  id: '507f1f77bcf86cd799439033',
  name: 'Resident Beta One',
  email: 'beta1@nahom.test',
  role: 'Resident',
  orgId: orgBeta,
  organizationId: orgBeta,
};

const adminAlpha = {
  id: '507f1f77bcf86cd799439044',
  name: 'Admin Alpha',
  email: 'admin@nahom.test',
  role: 'Community Admin',
  orgId: orgAlpha,
  organizationId: orgAlpha,
};

const tenantAlpha = {
  orgId: orgAlpha,
  permissions: ['visitor:resident', 'amenity:book', 'complaints:resident'],
};

const tenantBeta = {
  orgId: orgBeta,
  permissions: ['visitor:resident', 'amenity:book', 'complaints:resident'],
};

test.beforeEach(() => {
  resetActionStoreForTesting();
  resetTestServices();
});

test.after(() => {
  resetActionStoreForTesting();
  resetTestServices();
});

// ============================================================================
// PRIORITY 1: CONCURRENCY, FENCING, AND IDEMPOTENCY BOUNDARIES
// ============================================================================

test('P1.1 Concurrency: Stalled Worker A with expired lease cannot write domain mutation if lease is lost', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: residentAlpha1.id,
    orgId: residentAlpha1.orgId,
    params: {
      visitorName: 'Ahmed Al-Mansoor',
      dateStr: '2026-10-29',
      timeWindowStart: '14:00',
      timeWindowEnd: '18:00',
    },
    summary: 'Stalled worker test',
  });

  // Worker A acquires lease
  const leaseA = await acquireExecutionLease(proposal.actionId);
  assert.equal(leaseA.acquired, true);

  // Worker A simulates stalling > 60s; Worker B preempts and acquires lease
  const memAction = (await import('../src/features/aiAssistant/aiAssistant.actions.js')).getPendingActionById(proposal.actionId);
  memAction.lockedAt = Date.now() - 65000;

  const leaseB = await acquireExecutionLease(proposal.actionId);
  assert.equal(leaseB.acquired, true);
  assert.notEqual(leaseA.leaseToken, leaseB.leaseToken);

  // Worker A checks whether its lease is still active before writing to domain
  const isAActive = await isLeaseActive(proposal.actionId, leaseA.leaseToken);
  assert.equal(isAActive, false, 'Worker A must detect that its execution lease was preempted');

  const isBActive = await isLeaseActive(proposal.actionId, leaseB.leaseToken);
  assert.equal(isBActive, true, 'Worker B must hold the active execution lease');
});

test('P1.2 Concurrency: Worker B recovers domain record created by Worker A without creating duplicate pass', async () => {
  let createdPassCount = 0;
  const passDatabase = new Map();

  const mockVisitorPassService = {
    getPassByClientReference: async (orgId, createdById, clientRef) => {
      for (const pass of passDatabase.values()) {
        if (pass.orgId === orgId && pass.createdById === createdById && pass.clientReference === clientRef) {
          return pass;
        }
      }
      return null;
    },
    createPass: async (passData) => {
      // Simulate race condition / duplicate check
      for (const pass of passDatabase.values()) {
        if (pass.clientReference === passData.clientReference) {
          const err = new Error('E11000 duplicate key error collection: visitorpasses index: clientReference_1');
          err.code = 11000;
          throw err;
        }
      }
      createdPassCount++;
      const created = {
        _id: `vp_${Date.now()}_${createdPassCount}`,
        ...passData,
        shortKey: 'VP-SUCCESS-KEY',
        status: 'PENDING',
      };
      passDatabase.set(created._id, created);
      return created;
    },
  };

  setTestServices({ visitorPassService: mockVisitorPassService });

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: residentAlpha1.id,
    orgId: residentAlpha1.orgId,
    params: {
      visitorName: 'Sara Ali',
      dateStr: '2026-10-30',
      timeWindowStart: '10:00',
      timeWindowEnd: '12:00',
    },
    summary: 'Visit for Sara Ali',
  });

  // Worker A executes and writes to pass database, but crashes before recording action success
  await mockVisitorPassService.createPass({
    orgId: residentAlpha1.orgId,
    createdById: residentAlpha1.id,
    clientReference: proposal.actionId,
    visitorDetails: { name: 'Sara Ali' },
  });
  assert.equal(createdPassCount, 1);

  // Worker B runs confirm_pending_action on retry
  const resultB = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });

  assert.equal(resultB.success, true);
  assert.equal(resultB.executed, true);
  assert.equal(createdPassCount, 1, 'Worker B must NOT invoke createPass again; must recover existing pass');
  assert.equal(resultB.data.visitorName, 'Sara Ali');
});

test('P1.3 Concurrency: Amenity booking propagates deterministic bookingId and handles race collision', async () => {
  let bookingCallCount = 0;
  const bookingDb = new Map();

  const mockAmenityBookingService = {
    getBookingById: async (bookingId, orgId) => {
      return bookingDb.get(bookingId) || null;
    },
    createBooking: async (payload) => {
      bookingCallCount++;
      if (bookingDb.has(payload.bookingId)) {
        const err = new Error('E11000 duplicate key error collection: amenitybookings index: bookingId_1');
        err.code = 11000;
        throw err;
      }
      const record = {
        _id: `bkg_doc_${bookingCallCount}`,
        bookingId: payload.bookingId,
        amenityName: 'Tennis Court 1',
        status: 'confirmed',
        qrCode: 'data:image/png;base64,mockqr',
      };
      bookingDb.set(payload.bookingId, record);
      return record;
    },
  };

  setTestServices({ amenityBookingService: mockAmenityBookingService });

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_AMENITY_BOOKING',
    userId: residentAlpha1.id,
    orgId: residentAlpha1.orgId,
    params: {
      amenityId: '507f1f77bcf86cd799439055',
      amenityName: 'Tennis Court 1',
      dateStr: '2026-10-31',
      startTime: '16:00',
      endTime: '17:00',
    },
    summary: 'Tennis Court Booking',
  });

  // First run creates booking
  const res1 = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });
  assert.equal(res1.success, true);
  assert.equal(bookingCallCount, 1);

  // Repeated confirmation returns cached result idempotently
  const res2 = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });
  assert.equal(res2.success, true);
  assert.equal(res2.idempotentReplay, true);
  assert.equal(bookingCallCount, 1, 'No duplicate booking created on repeated confirmation');
});

test('P1.4 Legitimate Separate Operations: Two distinct requests for identical visitor name receive different action IDs and create separate passes', async () => {
  let createdCount = 0;
  const mockVisitorPassService = {
    getPassByClientReference: async () => null,
    createPass: async (data) => {
      createdCount++;
      return {
        _id: `pass_${createdCount}`,
        ...data,
        shortKey: `VP-KEY-${createdCount}`,
        status: 'PENDING',
      };
    },
  };

  setTestServices({ visitorPassService: mockVisitorPassService });

  // Resident invites "John Smith" today at 10 AM
  const proposal1 = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: residentAlpha1.id,
    orgId: residentAlpha1.orgId,
    params: {
      visitorName: 'John Smith',
      dateStr: '2026-10-29',
      timeWindowStart: '10:00',
      timeWindowEnd: '12:00',
    },
    summary: 'Visit 1 for John Smith',
  });

  // Resident invites "John Smith" today at 4 PM (e.g. return trip)
  const proposal2 = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: residentAlpha1.id,
    orgId: residentAlpha1.orgId,
    params: {
      visitorName: 'John Smith',
      dateStr: '2026-10-29',
      timeWindowStart: '16:00',
      timeWindowEnd: '18:00',
    },
    summary: 'Visit 2 for John Smith',
  });

  assert.notEqual(proposal1.actionId, proposal2.actionId, 'Distinct proposals must receive distinct actionIds');

  const res1 = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal1.actionId,
    confirmationToken: proposal1.confirmationToken,
  });

  const res2 = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal2.actionId,
    confirmationToken: proposal2.confirmationToken,
  });

  assert.equal(res1.success, true);
  assert.equal(res2.success, true);
  assert.equal(createdCount, 2, 'Both legitimate distinct passes must be created successfully');
});

// ============================================================================
// PRIORITY 2: AUTHORIZATION AND DATA ISOLATION AUDIT
// ============================================================================

test('P2.1 Cross-Tenant Isolation: Tenant Beta user cannot confirm Tenant Alpha action proposal', async () => {
  const proposalAlpha = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: residentAlpha1.id,
    orgId: orgAlpha,
    params: {
      amount: 250,
      categoryId: 'cat_groceries',
      categoryName: 'Groceries',
      transactionDate: '2026-10-28',
      merchantOrSource: 'Supermarket',
    },
    summary: 'Expense in Alpha',
  });

  // User from Tenant Beta attempts confirmation with valid token structure
  const result = await executeAssistantTool(residentBeta, tenantBeta, 'confirm_pending_action', {
    actionId: proposalAlpha.actionId,
    confirmationToken: proposalAlpha.confirmationToken,
  });

  assert.equal(result.success, false);
  assert.match(result.error, /belongs to another user|different community workspace/i);
});

test('P2.2 Cross-User Isolation: Resident Alpha Two cannot confirm Resident Alpha One proposal', async () => {
  const proposal1 = createPendingActionProposal({
    actionType: 'ACKNOWLEDGE_NOTICE',
    userId: residentAlpha1.id,
    orgId: orgAlpha,
    params: {
      noticeId: '507f1f77bcf86cd799439077',
      noticeTitle: 'Elevator Maintenance',
    },
    summary: 'Acknowledge Notice',
  });

  const result = await executeAssistantTool(residentAlpha2, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal1.actionId,
    confirmationToken: proposal1.confirmationToken,
  });

  assert.equal(result.success, false);
  assert.match(result.error, /belongs to another user/i);
});

test('P2.3 Parameter Tampering: Caller cannot change amount or parameters during confirmation', async () => {
  let capturedExpenseAmount = null;

  const mockPersonalExpenseService = {
    createTransaction: async (userCtx, payload) => {
      capturedExpenseAmount = payload.amount;
      return {
        _id: 'tx_tamper_test',
        amountMinor: payload.amount * 100,
        merchantOrSource: payload.merchantOrSource,
      };
    },
  };

  setTestServices({ personalExpenseService: mockPersonalExpenseService });

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: residentAlpha1.id,
    orgId: orgAlpha,
    params: {
      amount: 100, // Legitimate proposed amount
      categoryId: 'cat_food',
      categoryName: 'Food',
      transactionDate: '2026-10-28',
      merchantOrSource: 'Cafe',
    },
    summary: 'Coffee ₹100',
  });

  // Malicious request attempts to pass amount: 99999 in toolArgs during confirmation
  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
    amount: 99999, // Should be completely ignored
    merchantOrSource: 'Hacked Merchant', // Should be completely ignored
  });

  assert.equal(result.success, true);
  assert.equal(capturedExpenseAmount, 100, 'Server must enforce canonical proposal parameters, ignoring toolArgs tampering');
  assert.equal(result.data.amount, 100);
});

test('P2.4 Complaint Isolation: Resident Alpha 1 cannot view Resident Alpha 2 complaints by ticket number', async () => {
  const mockComplaintsDb = [
    {
      _id: 'cmp_1',
      complaintNumber: 'CMP-2026-000001',
      residentId: residentAlpha1.id,
      title: 'Alpha 1 Tap Leak',
      category: 'Plumbing',
      status: 'Open',
    },
    {
      _id: 'cmp_2',
      complaintNumber: 'CMP-2026-000002',
      residentId: residentAlpha2.id,
      title: 'Alpha 2 Window Crack (Private)',
      category: 'Carpentry',
      status: 'Open',
    },
  ];

  const mockComplaintService = {
    getComplaints: async (orgId, filter) => {
      return mockComplaintsDb.filter((c) => {
        if (filter.residentId && c.residentId !== filter.residentId) return false;
        if (filter.complaintNumber && c.complaintNumber !== filter.complaintNumber) return false;
        return true;
      });
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  // Resident Alpha 1 attempts to query Resident Alpha 2's specific ticket
  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'get_my_complaints', {
    complaintNumber: 'CMP-2026-000002',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.count, 0, 'Must NOT return ticket belonging to another resident');
  assert.equal(result.data.complaints.length, 0);
});

test('P2.5 Visitor Pass Revocation: Resident Alpha 1 cannot revoke Resident Alpha 2 visitor pass', async () => {
  const mockPasses = [
    {
      _id: 'pass_alpha_2',
      createdById: residentAlpha2.id,
      orgId: orgAlpha,
      visitorDetails: { name: 'Alpha 2 Private Guest' },
      status: 'ACTIVE',
    },
  ];

  const mockVisitorPassService = {
    getPassById: async (id) => mockPasses.find((p) => p._id === id) || null,
    getActivePasses: async (orgId, opts) => mockPasses.filter((p) => p.createdById === opts.createdById),
  };

  setTestServices({ visitorPassService: mockVisitorPassService });

  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'prepare_visitor_pass_revocation', {
    passId: 'pass_alpha_2',
  });

  assert.equal(result.success, false);
  assert.match(result.error, /Forbidden|Could not find an active or pending visitor pass/i);
});

test('P2.6 Admin Analytics RBAC: Normal Resident is strictly rejected; Admin is permitted', async () => {
  const mockAnalyticsService = {
    getDashboardStats: async () => ({
      openEnquiries: 12,
      pendingApprovals: 5,
      activeTrials: 3,
      activeSubscriptions: 24,
    }),
  };

  setTestServices({ adminAnalyticsService: mockAnalyticsService });

  // Resident attempt -> REJECTED
  const resResident = await executeAssistantTool(residentAlpha1, tenantAlpha, 'get_admin_analytics_summary', {});
  assert.equal(resResident.success, false);
  assert.match(resResident.error, /Access restricted/i);

  // Admin attempt -> PERMITTED
  const resAdmin = await executeAssistantTool(adminAlpha, tenantAlpha, 'get_admin_analytics_summary', {});
  assert.equal(resAdmin.success, true);
  assert.equal(resAdmin.data.openEnquiries, 12);
  assert.equal(resAdmin.data.activeSubscriptions, 24);
});

test('P2.7 Staff Privacy: Domestic help phone numbers and emails are completely masked/omitted', async () => {
  const mockStaffService = {
    getEligibleStaff: async () => [
      {
        _id: 'tech_1',
        name: 'Ramesh Kumar',
        department: 'Housekeeping',
        designation: 'Cleaner',
        phone: '+966 50 123 4567', // Sensitive
        email: 'ramesh.private@staff.com', // Sensitive
        rating: 4.8,
      },
    ],
  };

  setTestServices({ staffUnitAssociationService: mockStaffService });

  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'search_staff_directory', {
    department: 'Housekeeping',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.staff.length, 1);
  const staffMember = result.data.staff[0];
  assert.equal(staffMember.name, 'Ramesh Kumar');
  assert.equal(staffMember.phone, undefined, 'Raw phone number must NOT be exposed in staff directory');
  assert.equal(staffMember.email, undefined, 'Raw email address must NOT be exposed in staff directory');
});

test('P2.8 Notice Audience Filtering: Expired or unacknowledged notices enforce validation', async () => {
  const mockNoticeBoardService = {
    getNoticeById: async (id) => ({
      _id: id,
      title: 'Water Cut Announcement',
      requiresAcknowledgement: true,
      acknowledgementDeadline: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hr ago
      category: 'Maintenance',
      priority: 'High',
    }),
  };

  setTestServices({
    noticeBoardService: mockNoticeBoardService,
    noticeAcknowledgementService: { acknowledgeNotice: async () => true },
  });

  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'prepare_notice_acknowledgement', {
    noticeId: 'notice_expired_1',
  });

  assert.equal(result.success, false);
  assert.match(result.error, /acknowledgement deadline for this notice has already passed/i);
});

test('P2.9 Poll Eligibility and Duplicate Voting: Multiple votes are rejected', async () => {
  const mockPollServices = {
    getPollById: async () => ({
      _id: 'poll_1',
      title: 'Annual Society Picnic Venue',
      status: 'Active',
      options: [{ text: 'Beach Resort' }, { text: 'Hill Station' }],
    }),
    checkIfUserVoted: async () => true, // Already voted
  };

  setTestServices({ pollServices: mockPollServices });

  const result = await executeAssistantTool(residentAlpha1, tenantAlpha, 'prepare_poll_vote', {
    pollId: 'poll_1',
    selectedOptionIndex: 0,
  });

  assert.equal(result.success, false);
  assert.match(result.error, /already cast your vote/i);
});
