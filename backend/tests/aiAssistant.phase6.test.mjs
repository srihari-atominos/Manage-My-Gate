import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  setTestServices,
  resetTestServices,
  executeAssistantTool,
  ASSISTANT_TOOL_DECLARATIONS,
} from '../src/features/aiAssistant/aiAssistant.tools.js';
import {
  INTENTS,
  detectDirectIntent,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';
import {
  createPendingActionProposal,
  verifyPendingAction,
  cancelPendingAction,
  resetActionStoreForTesting,
  acquireExecutionLease,
  lockActionForExecution,
  recordActionSuccess,
  recordActionFailure,
  getPendingActionById,
} from '../src/features/aiAssistant/aiAssistant.actions.js';

test.beforeEach(() => {
  resetTestServices();
  resetActionStoreForTesting();
});

test.afterEach(() => {
  resetTestServices();
  resetActionStoreForTesting();
});

const userA = {
  id: '507f191e810c19729de860ea',
  _id: '507f191e810c19729de860ea',
  orgId: 'community_alpha',
  name: 'Aarav Sharma',
  email: 'aarav@nahom.app',
  flat: 'Flat 402, Block B',
  role: 'Resident',
};

const adminUser = {
  id: '507f191e810c19729de860ec',
  _id: '507f191e810c19729de860ec',
  orgId: 'community_alpha',
  name: 'Pooja Mehta',
  email: 'pooja@nahom.app',
  role: 'Community Admin',
  permissions: ['*'],
};

const tenantAlpha = {
  orgId: 'community_alpha',
  name: 'Palm Meadows',
};

// -------------------------------------------------------------
// 1. Tool Declarations & Registration Audit
// -------------------------------------------------------------
test('1. Tool Declarations: Phase 6 tools are registered in ASSISTANT_TOOL_DECLARATIONS', () => {
  const toolNames = ASSISTANT_TOOL_DECLARATIONS.map((t) => t.name);
  const expectedPhase6Tools = [
    'get_community_notices',
    'get_notice_details',
    'prepare_notice_acknowledgement',
    'search_staff_directory',
    'get_my_unit_staff',
    'get_active_staff_attendance',
    'get_my_household_members',
    'get_my_vehicles_and_parking',
    'get_active_polls',
    'get_poll_details',
    'prepare_poll_vote',
    'get_my_settings_and_preferences',
    'get_admin_analytics_summary',
  ];

  for (const tool of expectedPhase6Tools) {
    assert.ok(toolNames.includes(tool), `Missing Phase 6 tool declaration: ${tool}`);
  }
});

// -------------------------------------------------------------
// 2. Action Recovery & Monotonic Lease Fencing
// -------------------------------------------------------------
test('2. Fencing: Slow worker cannot commit after losing execution lease', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amount: 250 },
    summary: 'Slow worker lease test',
  });

  // Worker 1 acquires initial lease
  const lease1 = await acquireExecutionLease(proposal.actionId);
  assert.equal(lease1.acquired, true);
  assert.ok(lease1.leaseToken, 'Lease token must be generated');

  // Simulate timeout: manually advance lockedAt past 60s
  const memAction = getPendingActionById(proposal.actionId);
  memAction.lockedAt = Date.now() - 65000;

  // Worker 2 takes over stale lock
  const lease2 = await acquireExecutionLease(proposal.actionId);
  assert.equal(lease2.acquired, true);
  assert.notEqual(lease2.leaseToken, lease1.leaseToken, 'Successor lease must have a new token');

  // Worker 1 (slow) finally finishes and attempts to commit with its stale token
  await assert.rejects(
    async () => {
      await recordActionSuccess(proposal.actionId, { transactionId: 'TX-STALE' }, lease1.leaseToken);
    },
    /lease expired or was preempted/i,
    'Stale worker commit must be rejected with LEASE_LOST error'
  );

  // Worker 2 commits successfully with current lease token
  const success2 = await recordActionSuccess(
    proposal.actionId,
    { transactionId: 'TX-VALID' },
    lease2.leaseToken
  );
  assert.equal(success2, true);
  assert.equal(memAction.status, 'EXECUTED');
});

test('3. Concurrent Execution: Simultaneous acquire attempts only allow one winner', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_COMPLAINT',
    userId: userA.id,
    orgId: userA.orgId,
    params: { title: 'Elevator sound' },
    summary: 'Concurrent lock test',
  });

  const [res1, res2] = await Promise.all([
    acquireExecutionLease(proposal.actionId),
    acquireExecutionLease(proposal.actionId),
  ]);

  const acquiredCount = [res1.acquired, res2.acquired].filter(Boolean).length;
  assert.equal(acquiredCount, 1, 'Exactly one concurrent worker must acquire the execution lease');
});

test('4. Crash Recovery: Pre-existing domain record is recovered on retry without duplication', async () => {
  let createComplaintCallCount = 0;
  const mockExistingComplaint = {
    _id: 'cmp_crashed_123',
    complaintNumber: 'CMP-2026-CRASHED',
    title: 'Water pipe leak in kitchen',
    status: 'Open',
    priority: 'High',
    createdAt: new Date(),
  };

  const mockComplaintService = {
    getComplaints: async () => [mockExistingComplaint],
    createComplaint: async () => {
      createComplaintCallCount++;
      return { _id: 'cmp_new_duplicate', complaintNumber: 'CMP-2026-DUPLICATE' };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const proposal = createPendingActionProposal({
    actionType: 'CREATE_COMPLAINT',
    userId: userA.id,
    orgId: userA.orgId,
    params: {
      title: 'Water pipe leak in kitchen',
      category: 'Plumbing',
      priority: 'High',
    },
    summary: 'Recover after crash',
  });

  // Execute confirmation retry
  const result = await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: proposal.actionId,
    confirmationToken: proposal.confirmationToken,
  });

  assert.equal(result.success, true);
  assert.equal(result.executed, true);
  assert.equal(result.data.complaintNumber, 'CMP-2026-CRASHED', 'Must recover existing domain ticket');
  assert.equal(createComplaintCallCount, 0, 'Domain create method must NOT be invoked again on recovery');
});

// -------------------------------------------------------------
// 3. Community Notices & Announcements
// -------------------------------------------------------------
test('5. Notices: get_community_notices retrieves notices and restricts residents to published', async () => {
  let restrictArg = null;
  const mockNoticeBoardService = {
    getAllNotices: async (orgId, userId, page, limit, queryParams, restrictToPublished) => {
      restrictArg = restrictToPublished;
      return {
        totalRecords: 2,
        data: [
          {
            _id: 'not_1',
            title: 'Water Supply Maintenance',
            description: 'Water shutdown from 10 AM to 2 PM on Sunday.',
            category: 'Maintenance',
            priority: 'High',
            isCritical: true,
            isPinned: true,
            requiresAcknowledgement: true,
            acknowledgementDeadline: new Date(Date.now() + 86400000),
            createdAt: new Date(),
          },
          {
            _id: 'not_2',
            title: 'Diwali Celebration',
            description: 'Community gathering at clubhouse.',
            category: 'Event',
            priority: 'Normal',
            isCritical: false,
            createdAt: new Date(),
          },
        ],
      };
    },
  };

  setTestServices({ noticeBoardService: mockNoticeBoardService });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_community_notices', {
    category: 'Maintenance',
  });

  assert.equal(res.success, true);
  assert.equal(restrictArg, true, 'Residents must be restricted to published notices');
  assert.equal(res.data.count, 2);
  assert.equal(res.data.notices[0].title, 'Water Supply Maintenance');
  assert.equal(res.data.notices[0].isCritical, true);
  assert.equal(res.action.route, '/(resident)/notices');
});

test('6. Notices: get_notice_details retrieves full notice and details', async () => {
  const mockNoticeBoardService = {
    getNoticeById: async (id, session, userId, orgId, user) => ({
      _id: id,
      title: 'Elevator Modernization',
      description: 'Tower B lift 2 modernization in progress.',
      category: 'Maintenance',
      priority: 'High',
      status: 'Published',
      isCritical: false,
      requiresAcknowledgement: false,
    }),
  };

  setTestServices({ noticeBoardService: mockNoticeBoardService });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_notice_details', {
    noticeId: 'not_elev_123',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.title, 'Elevator Modernization');
  assert.equal(res.data.noticeId, 'not_elev_123');
});

test('7. Notices: prepare_notice_acknowledgement and confirm_pending_action', async () => {
  let acknowledgedNoticeId = null;
  const mockNoticeBoardService = {
    getNoticeById: async () => ({
      _id: 'not_crit_99',
      title: 'Emergency Fire Drill',
      requiresAcknowledgement: true,
      acknowledgementDeadline: new Date(Date.now() + 10000000),
      category: 'Security',
      priority: 'Critical',
    }),
  };

  const mockNoticeAckService = {
    acknowledgeNotice: async (noticeId, userId, orgId) => {
      acknowledgedNoticeId = noticeId;
      return { success: true };
    },
  };

  setTestServices({
    noticeBoardService: mockNoticeBoardService,
    noticeAcknowledgementService: mockNoticeAckService,
  });

  // Step 1: Prepare proposal
  const prepRes = await executeAssistantTool(userA, tenantAlpha, 'prepare_notice_acknowledgement', {
    noticeId: 'not_crit_99',
  });

  assert.equal(prepRes.success, true);
  assert.equal(prepRes.action.type, 'confirmation');
  assert.equal(prepRes.action.actionType, 'ACKNOWLEDGE_NOTICE');

  // Step 2: Confirm
  const confirmRes = await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: prepRes.data.actionId,
    confirmationToken: prepRes.data.confirmationToken,
  });

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.executed, true);
  assert.equal(acknowledgedNoticeId, 'not_crit_99');
  assert.equal(confirmRes.action.title, 'Notice Acknowledged');
});

// -------------------------------------------------------------
// 4. Staff and Domestic Help
// -------------------------------------------------------------
test('8. Staff: search_staff_directory returns privacy-safe fields', async () => {
  const mockStaffUnitAssocService = {
    getEligibleStaff: async () => [
      {
        _id: 'tech_1',
        name: 'Ramesh Kumar',
        department: 'Maintenance',
        designation: 'Electrician',
        phone: '+919876543210', // PII
        email: 'ramesh@staff.com', // PII
      },
      {
        _id: 'tech_2',
        name: 'Sunita Devi',
        department: 'Housekeeping',
        designation: 'Maid',
      },
    ],
  };

  setTestServices({ staffUnitAssociationService: mockStaffUnitAssocService });

  const res = await executeAssistantTool(userA, tenantAlpha, 'search_staff_directory', {
    department: 'Maintenance',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.staff[0].name, 'Ramesh Kumar');
  assert.equal(res.data.staff[0].phone, undefined, 'Raw phone must never leak in AI assistant staff query');
  assert.equal(res.data.staff[0].email, undefined, 'Raw email must never leak in AI assistant staff query');
});

test('9. Staff: get_my_unit_staff returns domestic help associated with user unit', async () => {
  const mockStaffUnitAssocService = {
    getAssociations: async () => [
      {
        _id: 'assoc_101',
        technicianId: { name: 'Lakshmi Bai', department: 'Domestic Help', designation: 'House Cook' },
        villaId: { unitNumber: '402' },
        serviceType: 'Daily Cooking',
        accessSchedule: { timeWindow: { start: '07:00', end: '09:00' } },
        status: 'Active',
      },
    ],
  };

  setTestServices({ staffUnitAssociationService: mockStaffUnitAssocService });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_my_unit_staff', {});

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.staffAssociations[0].staffName, 'Lakshmi Bai');
  assert.equal(res.data.staffAssociations[0].serviceType, 'Daily Cooking');
});

test('10. Staff Attendance: get_active_staff_attendance returns allocated staff currently inside', async () => {
  const mockStaffAttendanceService = {
    getActiveStaffForMyUnits: async (userId, orgId) => [
      {
        name: 'Lakshmi Bai',
        department: 'Domestic Help',
        designation: 'House Cook',
        checkInTime: new Date(),
        checkInGate: 'North Gate',
        unitNumbers: ['402'],
      },
    ],
  };

  setTestServices({ staffAttendanceService: mockStaffAttendanceService });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_active_staff_attendance', {});

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.activeInsideStaff[0].staffName, 'Lakshmi Bai');
  assert.equal(res.data.activeInsideStaff[0].checkInGate, 'North Gate');
});

// -------------------------------------------------------------
// 5. Household Members and Registered Vehicles
// -------------------------------------------------------------
test('11. Household: get_my_household_members retrieves unit residents with masked phone', async () => {
  const mockVillaServices = {
    getUnitsByResidentUserIds: async () => [
      {
        _id: 'villa_402',
        orgId: 'community_alpha',
        unitNumber: '402',
        blockOrBuilding: 'Block B',
        type: 'Apartment',
        status: 'Occupied',
        metadata: { parkingSlots: ['P-402', 'P-403'] },
      },
    ],
    getVillaDetailsWithResidents: async () => ({
      residents: [
        {
          id: userA.id,
          name: 'Aarav Sharma',
          residentType: 'Owner',
          email: 'aarav@nahom.app',
          phone: '+919876543210',
        },
        {
          id: 'user_priya',
          name: 'Priya Sharma',
          residentType: 'Co-resident',
          email: 'priya@nahom.app',
          phone: '+919876543211',
        },
      ],
    }),
  };

  setTestServices({ villaServices: mockVillaServices });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_my_household_members', {});

  assert.equal(res.success, true);
  assert.equal(res.data.unitsCount, 1);
  const unit = res.data.units[0];
  assert.equal(unit.unitNumber, '402');
  assert.equal(unit.residents.length, 2);
  assert.equal(unit.residents[0].name, 'Aarav Sharma');
  assert.ok(unit.residents[0].phone.includes('****'), 'Phone numbers must be masked for privacy');
});

test('12. Vehicles & Parking: get_my_vehicles_and_parking returns slots and recent passes', async () => {
  const mockVillaServices = {
    getUnitsByResidentUserIds: async () => [
      {
        _id: 'villa_402',
        orgId: 'community_alpha',
        unitNumber: '402',
        blockOrBuilding: 'Block B',
        metadata: { parkingSlots: ['Slot B-402 (Basement 1)'] },
      },
    ],
  };

  const mockVisitorPassService = {
    getActivePasses: async () => ({
      data: [
        {
          vehicleDetails: { number: 'KA01AB1234', vehicleType: 'CAR' },
          visitorDetails: { name: 'Delivery Van' },
          status: 'ACTIVE',
        },
      ],
    }),
  };

  setTestServices({
    villaServices: mockVillaServices,
    visitorPassService: mockVisitorPassService,
  });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_my_vehicles_and_parking', {});

  assert.equal(res.success, true);
  assert.equal(res.data.parkingAllocations[0].slots[0], 'Slot B-402 (Basement 1)');
  assert.equal(res.data.recentVisitorVehicles[0].vehicleNumber, 'KA01AB1234');
});

// -------------------------------------------------------------
// 6. Polls and Surveys
// -------------------------------------------------------------
test('13. Polls: get_active_polls returns choices, closing dates, and vote status', async () => {
  const mockPollServices = {
    getActivePolls: async () => ({
      totalRecords: 1,
      data: [
        {
          _id: 'poll_clubhouse_paint',
          title: 'Clubhouse Repainting Colors',
          question: 'Which color palette do you prefer for the clubhouse exterior?',
          choiceType: 'SINGLE_CHOICE',
          options: [{ text: 'Warm Beige & Terracotta' }, { text: 'Modern Grey & Slate' }],
          endDate: new Date(Date.now() + 5000000),
          status: 'Active',
        },
      ],
    }),
    checkIfUserVoted: async () => false,
  };

  setTestServices({ pollServices: mockPollServices });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_active_polls', {});

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.polls[0].title, 'Clubhouse Repainting Colors');
  assert.equal(res.data.polls[0].hasVoted, false);
});

test('14. Polls: prepare_poll_vote and confirm_pending_action casts vote', async () => {
  let votedChoice = null;
  const mockPollServices = {
    getPollById: async () => ({
      _id: 'poll_speed_bump',
      title: 'Speed Bumps on Internal Roads',
      status: 'Active',
      endDate: new Date(Date.now() + 10000000),
      options: [{ text: 'Yes, add 2 speed bumps' }, { text: 'No, keep roads as is' }],
    }),
    checkIfUserVoted: async () => false,
    voteOnPoll: async (pollId, orgId, userId, payload) => {
      votedChoice = payload.selectedOptionIndex;
      return { success: true };
    },
  };

  setTestServices({ pollServices: mockPollServices });

  // Prepare proposal
  const prep = await executeAssistantTool(userA, tenantAlpha, 'prepare_poll_vote', {
    pollId: 'poll_speed_bump',
    selectedOptionIndex: 0,
  });

  assert.equal(prep.success, true);
  assert.equal(prep.action.actionType, 'CAST_POLL_VOTE');
  assert.equal(prep.data.chosenOptionTexts[0], 'Yes, add 2 speed bumps');

  // Confirm vote
  const confirm = await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: prep.data.actionId,
    confirmationToken: prep.data.confirmationToken,
  });

  assert.equal(confirm.success, true);
  assert.equal(confirm.executed, true);
  assert.equal(votedChoice, 0);
  assert.equal(confirm.action.title, 'Vote Recorded');
});

// -------------------------------------------------------------
// 7. Settings and Notification Preferences
// -------------------------------------------------------------
test('15. Settings: get_my_settings_and_preferences returns quick actions and unread count', async () => {
  const mockUserPrefService = {
    getUserPreferences: async () => ({
      activeQuickActions: ['visitor_invite', 'pay_dues', 'amenity_booking'],
      isCustomized: true,
    }),
  };

  const mockNotifService = {
    getUserNotifications: async () => ({
      notifications: [{ isRead: false }, { isRead: true }, { isRead: false }],
    }),
  };

  setTestServices({
    userPreferenceService: mockUserPrefService,
    notificationService: mockNotifService,
  });

  const res = await executeAssistantTool(userA, tenantAlpha, 'get_my_settings_and_preferences', {});

  assert.equal(res.success, true);
  assert.equal(res.data.isCustomized, true);
  assert.equal(res.data.unreadNotificationsCount, 2);
  assert.equal(res.action.route, '/(resident)/settings');
});

// -------------------------------------------------------------
// 8. Admin Analytics Access Control
// -------------------------------------------------------------
test('16. Admin Analytics: Resident access is blocked; Admin access is permitted', async () => {
  const mockAnalyticsService = {
    getDashboardStats: async () => ({
      openEnquiries: 14,
      pendingApprovals: 5,
      activeTrials: 3,
      activeSubscriptions: 28,
    }),
  };

  setTestServices({ adminAnalyticsService: mockAnalyticsService });

  // Resident attempt -> Blocked
  const residentRes = await executeAssistantTool(userA, tenantAlpha, 'get_admin_analytics_summary', {});
  assert.equal(residentRes.success, false);
  assert.ok(residentRes.error.includes('Access restricted'));

  // Admin attempt -> Allowed
  const adminRes = await executeAssistantTool(adminUser, tenantAlpha, 'get_admin_analytics_summary', {});
  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.openEnquiries, 14);
  assert.equal(adminRes.data.activeSubscriptions, 28);
});

// -------------------------------------------------------------
// 9. NLU Intent Detection
// -------------------------------------------------------------
test('17. NLU Intent Detection: Maps new Phase 6 queries accurately', () => {
  assert.equal(detectDirectIntent('What are the latest community notices?'), INTENTS.COMMUNITY_NOTICES);
  assert.equal(detectDirectIntent('Who can I contact about facility maintenance?'), INTENTS.STAFF_DIRECTORY);
  assert.equal(detectDirectIntent('Show my registered vehicles and parking'), INTENTS.HOUSEHOLD_VEHICLES);
  assert.equal(detectDirectIntent('Is there an active poll for our society?'), INTENTS.COMMUNITY_POLLS);
  assert.equal(detectDirectIntent('What are my notification preferences?'), INTENTS.USER_SETTINGS);
  assert.equal(detectDirectIntent('Show platform kpi admin analytics stats'), INTENTS.ADMIN_ANALYTICS);
});

// -------------------------------------------------------------
// 10. Regression Check on Previous 7 Actions
// -------------------------------------------------------------
test('18. Regression: Visitor pass, amenity booking, and expense mutations remain fully functional', async () => {
  let createdPass = false;
  let createdBooking = false;
  let createdExpense = false;

  setTestServices({
    visitorPassService: {
      createPass: async (data) => {
        createdPass = true;
        return { _id: 'pass_reg_1', shortKey: 'VP-999', status: 'PENDING' };
      },
    },
    amenityBookingService: {
      createBooking: async (payload) => {
        createdBooking = true;
        return { _id: 'book_reg_1', status: 'confirmed' };
      },
    },
    personalExpenseService: {
      createTransaction: async (ctx, payload) => {
        createdExpense = true;
        return { transaction: { _id: 'tx_reg_1', amount: payload.amount } };
      },
    },
  });

  // 1. Visitor pass
  const p1 = createPendingActionProposal({
    actionType: 'CREATE_VISITOR_PASS',
    userId: userA.id,
    orgId: userA.orgId,
    params: { visitorName: 'John', dateStr: '2026-10-30', timeWindowStart: '10:00', timeWindowEnd: '12:00' },
    summary: 'Test Pass',
  });
  await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: p1.actionId,
    confirmationToken: p1.confirmationToken,
  });
  assert.equal(createdPass, true);

  // 2. Amenity booking
  const p2 = createPendingActionProposal({
    actionType: 'CREATE_AMENITY_BOOKING',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amenityId: 'am_1', amenityName: 'Tennis', dateStr: '2026-10-30', startTime: '18:00', endTime: '19:00' },
    summary: 'Test Booking',
  });
  await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: p2.actionId,
    confirmationToken: p2.confirmationToken,
  });
  assert.equal(createdBooking, true);

  // 3. Personal expense
  const p3 = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amount: 500, categoryId: 'groceries', transactionDate: '2026-10-28', merchantOrSource: 'Supermart' },
    summary: 'Test Expense',
  });
  await executeAssistantTool(userA, tenantAlpha, 'confirm_pending_action', {
    actionId: p3.actionId,
    confirmationToken: p3.confirmationToken,
  });
  assert.equal(createdExpense, true);
});
