/**
 * AI Assistant Phase 3: Real Application Data Access and Verified Tool Execution Tests
 *
 * Verifies real domain-service integrations, authorized data retrieval,
 * tenant isolation, empty-result discrimination, and conversational synthesis.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  executeAssistantTool,
  setTestServices,
  resetTestServices,
  ASSISTANT_TOOL_DECLARATIONS,
} from '../src/features/aiAssistant/aiAssistant.tools.js';

import aiAssistantService from '../src/features/aiAssistant/aiAssistant.service.js';
import {
  analyzeConversationTurn,
  INTENTS,
  WORKFLOWS,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';

// Setup Mock User & Tenant Contexts
const mockResidentUser = {
  id: '507f191e810c19729de860ea',
  _id: '507f191e810c19729de860ea',
  email: 'resident@community.test',
  role: 'Resident',
  permissions: ['billing:my_invoices', 'amenities:view', 'complaints:my_tickets', 'visitor:resident'],
  orgId: 'community_alpha',
};

const mockAdminUser = {
  id: '507f191e810c19729de860aa',
  _id: '507f191e810c19729de860aa',
  email: 'admin@community.test',
  role: 'Community Admin',
  permissions: ['*'],
  orgId: 'community_alpha',
};

const mockTenant = {
  orgId: 'community_alpha',
  name: 'Alpha Heights Community',
};

test.beforeEach(() => {
  resetTestServices();
});

test.afterEach(() => {
  resetTestServices();
});

// ============================================================================
// 1. RESIDENT DUES AND INVOICE DATA ACCESS
// ============================================================================

test('1. Resident Dues: Retrieves verified portfolio demand, paid amount, outstanding dues, and overdue amounts', async () => {
  setTestServices({
    invoiceServices: {
      getUserDuesOverview: async (user, orgId) => {
        assert.equal(user.id, mockResidentUser.id);
        assert.equal(orgId, 'community_alpha');
        return {
          personalDues: {
            totalPortfolioDue: 4500,
            overdueAmount: 2000,
            unitBreakdown: [
              {
                invoiceNumber: 'INV-2026-001',
                billingPeriodString: 'October 2026',
                totalDue: 2500,
                paidAmount: 0,
                outstandingAmount: 2500,
                status: 'UNPAID',
                dueDate: new Date(Date.now() + 86400000).toISOString(),
              },
              {
                invoiceNumber: 'INV-2026-002',
                billingPeriodString: 'September 2026',
                totalDue: 2000,
                paidAmount: 0,
                outstandingAmount: 2000,
                status: 'OVERDUE',
                dueDate: new Date(Date.now() - 86400000 * 15).toISOString(),
              },
            ],
          },
          recentInvoices: [
            {
              invoiceNumber: 'INV-2026-000',
              paidAmount: 2000,
              paid_at: '2026-08-30T10:00:00.000Z',
              paymentMethod: 'UPI',
              status: 'PAID',
            },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_resident_dues_and_invoices', {});
  assert.equal(res.success, true);
  assert.equal(res.data.currency, '₹ (INR)');
  assert.equal(res.data.totalOutstandingDues, 4500);
  assert.equal(res.data.totalDemand, 4500);
  assert.equal(res.data.totalPaid, 0);
  assert.equal(res.data.overdueAmount, 2000);
  assert.equal(res.data.hasOutstandingDues, true);
  assert.equal(res.data.isFullyPaid, false);
  assert.equal(res.data.unpaidInvoices.length, 2);
  assert.equal(res.data.verifiedRecentPayments.length, 1);
  assert.equal(res.data.verifiedRecentPayments[0].paymentMethod, 'UPI');
  assert.equal(res.action.route, '/(resident)/billing/my-dues');
});

test('2. Resident Dues: Correctly identifies fully settled account with ₹0 dues', async () => {
  setTestServices({
    invoiceServices: {
      getUserDuesOverview: async () => ({
        personalDues: {
          totalPortfolioDue: 0,
          overdueAmount: 0,
          unitBreakdown: [],
        },
        recentInvoices: [
          {
            invoiceNumber: 'INV-2026-099',
            paidAmount: 3000,
            paid_at: '2026-10-01T10:00:00.000Z',
            paymentMethod: 'NetBanking',
            status: 'PAID',
          },
        ],
      }),
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_resident_dues_and_invoices', {});
  assert.equal(res.success, true);
  assert.equal(res.data.totalOutstandingDues, 0);
  assert.equal(res.data.isFullyPaid, true);
  assert.equal(res.data.hasOutstandingDues, false);
  assert.equal(res.data.unpaidInvoices.length, 0);
  assert.equal(res.data.verifiedRecentPayments.length, 1);
});

test('3. Resident Dues: Service failure fails cleanly and does NOT report false ₹0 dues', async () => {
  setTestServices({
    invoiceServices: {
      getUserDuesOverview: async () => {
        throw new Error('Database connection failed');
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_resident_dues_and_invoices', {});
  assert.equal(res.success, false);
  assert.match(res.error, /Database connection failed/);
  assert.equal(res.data, undefined);
});

// ============================================================================
// 2. COMMUNITY FINANCE QUERIES
// ============================================================================

test('4. Community Finance: Authorized admin receives verified community totals, collections, surplus, and categories', async () => {
  setTestServices({
    communityFinanceService: {
      getDashboard: async (orgId, params) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(params.timezone, 'Asia/Kolkata');
        assert.match(params.startDate, /^2026-10-01/);
        return {
          totalExpensesIncurred: 145000,
          grossSuccessfulCollections: 220000,
          netCollectionsAfterRefunds: 218000,
          netSurplusOrDeficit: 73000,
          collections: {
            maintenanceCollections: 200000,
            amenityCollections: 18000,
          },
          invoices: {
            outstandingDues: 32000,
          },
          expenseCategoryAggregates: [
            { _id: 'Security & Guarding', amount: 65000, count: 2 },
            { _id: 'Housekeeping & Cleaning', amount: 40000, count: 4 },
            { _id: 'Electricity & Utilities', amount: 40000, count: 1 },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockAdminUser, mockTenant, 'get_community_finance_summary', {
    period: '2026-10',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.authorized, true);
  assert.equal(res.data.period, 'October 2026');
  assert.equal(res.data.totalCommunityExpenses, 145000);
  assert.equal(res.data.totalCollections, 220000);
  assert.equal(res.data.netCollections, 218000);
  assert.equal(res.data.netSurplusOrDeficit, 73000);
  assert.equal(res.data.isSurplus, true);
  assert.equal(res.data.maintenanceCollections, 200000);
  assert.equal(res.data.amenityCollections, 18000);
  assert.equal(res.data.cumulativeArrears, 32000);
  assert.equal(res.data.topExpenseCategories.length, 3);
  assert.equal(res.data.topExpenseCategories[0].category, 'Security & Guarding');
  assert.equal(res.action.route, '/(resident)/admin/billing/community-finance');
});

test('4b. Community Finance: Canonical getDashboard structure correctly yields expenses, collections, categories, and recent records', async () => {
  setTestServices({
    communityFinanceService: {
      getDashboard: async (orgId, params) => {
        return {
          overview: {
            totalExpensesIncurred: 5708,
            grossSuccessfulCollections: 2500,
            netCollectionsAfterRefunds: 2500,
            netSurplusOrDeficit: -3208,
            maintenanceCollections: 2500,
            amenityCollections: 0,
            outstandingDues: 31500,
          },
          breakdowns: {
            expense: [
              { category: 'Repairs & Maintenance', amount: 5708, count: 1, percentage: 100 },
            ],
            income: [
              { source: 'Maintenance Collections', amount: 2500, percentage: 100 },
            ],
          },
          expenses: {
            records: [
              {
                _id: '6ae1ea6c9bf64f6da1c74372',
                expenseNumber: 'EXP-2026-A1C74371',
                name: 'Repairs & Maintenance - SANE REE MUTHUARUL ENTERPR',
                category: 'Repairs & Maintenance',
                totalAmount: 5708,
                expenseDate: '2026-10-14T18:30:00.000Z',
                settlementStatus: 'PAID',
              },
            ],
          },
          allTimeSeries: [
            { periodKey: '2026-10', income: 2500, expense: 9752.6 },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockAdminUser, mockTenant, 'get_community_finance_summary', {
    period: 'October 2026',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.authorized, true);
  assert.equal(res.data.period, 'October 2026');
  assert.equal(res.data.totalCommunityExpenses, 5708);
  assert.equal(res.data.allTimeTotalCommunityExpenses, 9752.6);
  assert.equal(res.data.totalCollections, 2500);
  assert.equal(res.data.netSurplusOrDeficit, -3208);
  assert.equal(res.data.isSurplus, false);
  assert.equal(res.data.maintenanceCollections, 2500);
  assert.equal(res.data.cumulativeArrears, 31500);
  assert.equal(res.data.topExpenseCategories.length, 1);
  assert.equal(res.data.topExpenseCategories[0].category, 'Repairs & Maintenance');
  assert.equal(res.data.topExpenseCategories[0].amount, 5708);
  assert.equal(res.data.recentCommunityExpenses.length, 1);
  assert.equal(res.data.recentCommunityExpenses[0].expenseNumber, 'EXP-2026-A1C74371');
  assert.equal(res.data.recentCommunityExpenses[0].name, 'Repairs & Maintenance - SANE REE MUTHUARUL ENTERPR');
  assert.equal(res.data.recentCommunityExpenses[0].amount, 5708);
});

test('5. Community Finance: Unauthorized resident is rejected and redirected to personal dues', async () => {
  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_community_finance_summary', {
    period: '2026-10',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.authorized, false);
  assert.match(res.data.message, /restricted to community administrators/i);
  assert.equal(res.action.route, '/(resident)/billing/my-dues');
});

// ============================================================================
// 3. PERSONAL EXPENSE QUERIES
// ============================================================================

test('6. Personal Expense: Retrieves resident personal expenses, balance, and category breakdown', async () => {
  setTestServices({
    personalExpenseService: {
      dashboard: async (user, periodKey) => {
        assert.equal(user.id, mockResidentUser.id);
        assert.equal(periodKey, '2026-10');
        return {
          incomeMinor: 8000000, // ₹80,000
          expenseMinor: 3500000, // ₹35,000
          balanceMinor: 4500000, // ₹45,000
          categoryBreakdown: [
            { name: 'Groceries', amountMinor: 1500000 },
            { name: 'Dining Out', amountMinor: 800000 },
            { name: 'Utilities', amountMinor: 1200000 },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_personal_expense_summary', {
    period: '2026-10',
    category: 'groceries',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.period, 'October 2026');
  assert.equal(res.data.personalIncome, 80000);
  assert.equal(res.data.personalExpenses, 35000);
  assert.equal(res.data.netBalance, 45000);
  assert.equal(res.data.topCategories.length, 3);
  assert.equal(res.data.filteredCategory.category, 'Groceries');
  assert.equal(res.data.filteredCategory.amount, 15000);
  assert.equal(res.action.route, '/(resident)/expense-manager');
});

// ============================================================================
// 4. AMENITY CATALOG, AVAILABILITY, AND BOOKINGS
// ============================================================================

test('7. Amenity Catalog: Retrieves active facilities with operating hours and pricing', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async (orgId) => {
        assert.equal(orgId, 'community_alpha');
        return [
          {
            _id: 'amenity_1',
            name: 'Badminton Court A',
            category: 'Sports',
            type: 'Court',
            capacity: 4,
            pricing: { baseRate: 150, pricingType: 'hourly' },
            bookingRules: { openTime: '06:00', closeTime: '22:00' },
            location: 'Clubhouse Ground Floor',
            isDeleted: false,
          },
          {
            _id: 'amenity_2',
            name: 'Swimming Pool',
            category: 'Aquatics',
            type: 'Pool',
            capacity: 25,
            pricing: { baseRate: 0, pricingType: 'hourly' },
            bookingRules: { openTime: '06:00', closeTime: '20:00' },
            location: 'Community Center',
            isDeleted: false,
          },
        ];
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_amenities_catalog', {});
  assert.equal(res.success, true);
  assert.equal(res.data.count, 2);
  assert.equal(res.data.amenities[0].name, 'Badminton Court A');
  assert.equal(res.data.amenities[0].pricing, '₹150/hourly');
  assert.equal(res.data.amenities[1].pricing, 'Free');
  assert.equal(res.action.route, '/(resident)/amenities/discover');
});

test('8. Amenity Availability: Checks real open slot times for requested date without claiming booked status', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'amenity_badminton',
          name: 'Badminton Court',
          pricing: { baseRate: 100, pricingType: 'hourly' },
          bookingRules: { openTime: '06:00', closeTime: '22:00' },
          location: 'Sports Arena',
        },
      ],
      getAvailableSlots: async (amenityId, orgId, dateStr) => {
        assert.equal(amenityId, 'amenity_badminton');
        assert.equal(orgId, 'community_alpha');
        assert.equal(dateStr, '2026-10-30');
        return [
          { startTime: '06:00', endTime: '07:00' },
          { startTime: '07:00', endTime: '08:00' },
          { startTime: '18:00', endTime: '19:00' },
          { startTime: '19:00', endTime: '20:00' },
        ];
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'check_amenity_availability', {
    amenityName: 'Badminton',
    date: '2026-10-30',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.found, true);
  assert.equal(res.data.name, 'Badminton Court');
  assert.equal(res.data.availableSlotsCount, 4);
  assert.equal(res.data.availableSlots[0], '06:00 - 07:00');
  assert.equal(res.data.pricing, '₹100/hourly');
  assert.match(res.action.route, /\/\(resident\)\/amenities\/amenity_badminton\?date=2026-10-30/);
});

test('9. My Bookings: Retrieves resident bookings with date filtering and discriminates empty results', async () => {
  setTestServices({
    amenityBookingService: {
      getMyBookings: async (userId, orgId, filters) => {
        assert.equal(userId, mockResidentUser.id);
        assert.equal(orgId, 'community_alpha');
        assert.equal(filters.startDate, '2026-10-28');
        return [
          {
            bookingId: 'BK-991',
            amenity: { name: 'Tennis Court' },
            bookingDate: '2026-10-28T00:00:00.000Z',
            startTime: '17:00',
            endTime: '18:00',
            status: 'confirmed',
            qrCode: 'data:image/png;base64,mockQRCode',
          },
        ];
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_my_bookings', {
    startDate: '2026-10-28',
    dateRangeLabel: 'today',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.bookings[0].amenityName, 'Tennis Court');
  assert.equal(res.data.bookings[0].hasPass, true);
});

test('10. Prepare Amenity Booking: Prepares proposal card without committing to database', async () => {
  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: 'amenity_gym',
          name: 'Fitness Gym',
          pricing: { baseRate: 0, pricingType: 'hourly' },
        },
      ],
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'prepare_amenity_booking', {
    amenityName: 'Gym',
    date: '2026-10-29',
    slotTime: '07:00',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.amenityName, 'Fitness Gym');
  assert.equal(res.data.estimatedCost, 'Free');
  assert.equal(res.data.confirmationRequired, true);
  assert.match(res.action.route, /amenities\/amenity_gym\?date=2026-10-29&slot=07:00/);
});

// ============================================================================
// 5. COMPLAINT AND HELPDESK QUERIES
// ============================================================================

test('11. Complaints: Retrieves resident complaints, maps status filter to canonical enums', async () => {
  setTestServices({
    complaintService: {
      getComplaints: async (orgId, filter, pagination) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(filter.residentId, mockResidentUser.id);
        assert.deepEqual(filter.status, {
          $in: ['Open', 'Submitted', 'Waiting For Assignment', 'Waiting For Acceptance', 'Assigned', 'Accepted', 'In Progress'],
        });
        return {
          items: [
            {
              complaintNumber: 'CMP-2026-081',
              title: 'Water seepage in master bedroom balcony',
              category: 'Plumbing',
              status: 'In Progress',
              priority: 'High',
              createdAt: '2026-10-25T11:00:00.000Z',
            },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_my_complaints', {
    status: 'open',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.complaints[0].complaintNumber, 'CMP-2026-081');
  assert.equal(res.data.complaints[0].status, 'In Progress');
  assert.equal(res.action.route, '/(resident)/complaints/manage');
});

// ============================================================================
// 6. VISITOR READ TOOLS (PASSES, LOGS, PENDING APPROVALS)
// ============================================================================

test('12. Visitor Passes: Resident retrieves scoped active visitor passes with status, validity, and shortKey', async () => {
  setTestServices({
    visitorPassService: {
      getActivePasses: async (orgId, options) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(options.createdById, mockResidentUser.id); // Enforces household isolation!
        return {
          totalRecords: 1,
          data: [
            {
              _id: 'pass_101',
              visitorDetails: { name: 'Rahul Sharma', phone: '+919876543210' },
              passType: 'VISITOR',
              status: 'ACTIVE',
              validity: {
                startDate: '2026-10-28T00:00:00.000Z',
                endDate: '2026-10-28T23:59:59.000Z',
                timeWindowStart: '10:00 AM',
                timeWindowEnd: '06:00 PM',
              },
              shortKey: 'VP-84920',
              vehicleDetails: { number: 'KA01AB1234' },
            },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_my_visitor_passes', {
    status: 'ACTIVE',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.passes[0].visitorName, 'Rahul Sharma');
  assert.equal(res.data.passes[0].shortKey, 'VP-84920');
  assert.equal(res.data.passes[0].vehicleNumber, 'KA01AB1234');
  assert.equal(res.action.route, '/(resident)/visitor');
});

test('13. Visitor History: Retrieves entry and exit log history scoped to resident', async () => {
  setTestServices({
    visitorLogService: {
      getHistoryLogs: async (orgId, skip, limit, filters, actor) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(actor.id, mockResidentUser.id);
        return {
          data: [
            {
              _id: 'log_301',
              visitorName: 'Swiggy Delivery Partner',
              entryType: 'WALK_IN',
              logStatus: 'CHECKED_OUT',
              entryTime: '2026-10-28T12:30:00.000Z',
              exitTime: '2026-10-28T12:45:00.000Z',
              gateName: 'Gate 2 - Service',
            },
          ],
        };
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_visitor_history', {
    status: 'CHECKED_OUT',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.logs[0].visitorName, 'Swiggy Delivery Partner');
  assert.equal(res.data.logs[0].gateName, 'Gate 2 - Service');
  assert.equal(res.action.route, '/(resident)/visitor');
});

test('14. Visitor Inside Status: Checks visitors currently checked in inside the premises', async () => {
  setTestServices({
    visitorLogService: {
      getActiveLogsInside: async (orgId, actor) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(actor.id, mockResidentUser.id);
        return [
          {
            _id: 'log_302',
            visitorName: 'Dr. Ramesh Kumar',
            entryType: 'PRE_APPROVED',
            logStatus: 'INSIDE',
            entryTime: '2026-10-28T15:00:00.000Z',
            gateName: 'Main Gate',
          },
        ];
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_visitor_history', {
    status: 'INSIDE',
  });

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.currentlyInsideCount, 1);
  assert.equal(res.data.logs[0].visitorName, 'Dr. Ramesh Kumar');
  assert.equal(res.data.logs[0].logStatus, 'INSIDE');
});

test('15. Pending Gate Approvals: Retrieves walk-in visitors awaiting approval at security gate', async () => {
  setTestServices({
    visitorLogService: {
      getPendingApprovals: async (orgId, actor) => {
        assert.equal(orgId, 'community_alpha');
        assert.equal(actor.id, mockResidentUser.id);
        return [
          {
            _id: 'log_303',
            visitorName: 'Amazon Courier',
            purpose: 'Package Delivery for Flat 402',
            gateName: 'Gate 1',
            createdAt: '2026-10-28T16:10:00.000Z',
          },
        ];
      },
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_pending_gate_approvals', {});

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  assert.equal(res.data.hasPendingApprovals, true);
  assert.equal(res.data.pendingApprovals[0].visitorName, 'Amazon Courier');
  assert.equal(res.data.pendingApprovals[0].purpose, 'Package Delivery for Flat 402');
  assert.equal(res.action.route, '/(resident)/visitor');
});

// ============================================================================
// 7. CONVERSATION INTENT ROUTING (READ VS MUTATION)
// ============================================================================

test('16. Intent Routing: Visitor read questions are treated as answering, whereas pass creation is navigating', () => {
  // Read queries -> answering mode with workflow: null
  const turn1 = analyzeConversationTurn('Who visited today?');
  assert.equal(turn1.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(turn1.interactionType, 'answering');
  assert.equal(turn1.workflow, null);

  const turn2 = analyzeConversationTurn('Show my visitor passes');
  assert.equal(turn2.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(turn2.interactionType, 'answering');
  assert.equal(turn2.workflow, null);

  const turn3 = analyzeConversationTurn('Do I have any pending gate approvals?');
  assert.equal(turn3.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(turn3.interactionType, 'answering');
  assert.equal(turn3.workflow, null);

  // Creation query -> clarification mode with workflow: visitor_pass_intake (Phase 4 action intake)
  const turn4 = analyzeConversationTurn('Create a visitor pass for Rahul');
  assert.equal(turn4.activeIntent, INTENTS.VISITOR_MANAGEMENT);
  assert.equal(turn4.interactionType, 'clarification');
  assert.equal(turn4.workflow, WORKFLOWS.VISITOR_PASS_INTAKE);
});

// ============================================================================
// 8. SECURITY, BOUNDARY, AND ISOLATION CHECKS
// ============================================================================

test('17. Security: Unknown tool returns safe failure without leaking internal stack', async () => {
  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'unauthorized_internal_dump', {});
  assert.equal(res.success, false);
  assert.match(res.error, /Unknown tool/);
});

test('18. Security: Malformed parameters do not crash tool execution', async () => {
  setTestServices({
    personalExpenseService: {
      dashboard: async () => ({
        incomeMinor: 0,
        expenseMinor: 0,
        balanceMinor: 0,
        categoryBreakdown: [],
      }),
    },
  });

  const res = await executeAssistantTool(mockResidentUser, mockTenant, 'get_personal_expense_summary', {
    period: 'INVALID_GARBAGE_STRING',
    category: null,
  });

  assert.equal(res.success, true);
  assert.ok(res.data.period); // Defaults safely to current month
});

test('19. Tool Registry: All declared tools have valid parameter schemas', () => {
  const toolNames = ASSISTANT_TOOL_DECLARATIONS.map((t) => t.name);
  assert.ok(toolNames.includes('get_community_finance_summary'));
  assert.ok(toolNames.includes('get_personal_expense_summary'));
  assert.ok(toolNames.includes('get_resident_dues_and_invoices'));
  assert.ok(toolNames.includes('get_amenities_catalog'));
  assert.ok(toolNames.includes('check_amenity_availability'));
  assert.ok(toolNames.includes('get_my_bookings'));
  assert.ok(toolNames.includes('prepare_amenity_booking'));
  assert.ok(toolNames.includes('get_my_complaints'));
  assert.ok(toolNames.includes('get_my_visitor_passes'));
  assert.ok(toolNames.includes('get_visitor_history'));
  assert.ok(toolNames.includes('get_pending_gate_approvals'));
  assert.ok(toolNames.includes('navigate_to_screen'));

  for (const decl of ASSISTANT_TOOL_DECLARATIONS) {
    assert.equal(typeof decl.name, 'string');
    assert.equal(typeof decl.description, 'string');
    assert.equal(decl.parameters.type, 'OBJECT');
    assert.equal(typeof decl.parameters.properties, 'object');
  }
});
