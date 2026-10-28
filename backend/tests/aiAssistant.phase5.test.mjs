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
  WORKFLOWS,
  detectDirectIntent,
  analyzeConversationTurn,
} from '../src/features/aiAssistant/aiAssistant.conversation.js';
import {
  createPendingActionProposal,
  verifyPendingAction,
  cancelPendingAction,
  resetActionStoreForTesting,
  lockActionForExecution,
  recordActionSuccess,
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

const userB = {
  id: '507f191e810c19729de860eb',
  _id: '507f191e810c19729de860eb',
  orgId: 'community_alpha',
  name: 'Bhavna Patel',
  role: 'Resident',
};

const adminUser = {
  id: '507f191e810c19729de860ec',
  _id: '507f191e810c19729de860ec',
  orgId: 'community_alpha',
  name: 'Admin Priya',
  role: 'Admin',
};

const tenantAlpha = { orgId: 'community_alpha', name: 'Alpha Palm Meadows' };
const tenantBeta = { orgId: 'community_beta', name: 'Beta Heights' };

// ==========================================
// 1. Tool Declaration Verification
// ==========================================
test('1. Tool Declarations: Phase 5 tools are registered with schemas', () => {
  const toolNames = ASSISTANT_TOOL_DECLARATIONS.map((t) => t.name);
  assert.ok(toolNames.includes('prepare_personal_expense'), 'prepare_personal_expense must be declared');
  assert.ok(toolNames.includes('get_personal_expense_summary'), 'get_personal_expense_summary must be declared');
  assert.ok(toolNames.includes('preview_receipt_ocr'), 'preview_receipt_ocr must be declared');
  assert.ok(toolNames.includes('prepare_complaint'), 'prepare_complaint must be declared');
  assert.ok(toolNames.includes('prepare_complaint_cancellation'), 'prepare_complaint_cancellation must be declared');
  assert.ok(toolNames.includes('get_my_complaints'), 'get_my_complaints must be declared');
  assert.ok(toolNames.includes('get_resident_dues_and_invoices'), 'get_resident_dues_and_invoices must be declared');
});

// ==========================================
// 2. Personal Expense Management Tests
// ==========================================
test('2. Personal Expense: Prepares proposal card with amount, category, and HMAC token', async () => {
  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    {
      amount: 450,
      category: 'Groceries',
      merchantOrSource: 'Zepto Supermarket',
      date: '2026-10-28',
      paymentMethod: 'UPI',
      notes: 'Weekly vegetables and milk',
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.actionType, 'CREATE_PERSONAL_EXPENSE');
  assert.equal(res.data.amount, 450);
  assert.equal(res.data.category, 'Groceries');
  assert.equal(res.data.categoryId, 'groceries');
  assert.equal(res.data.merchantOrSource, 'Zepto Supermarket');
  assert.equal(res.data.paymentMethod, 'UPI');
  assert.ok(res.data.actionId.startsWith('act_'));
  assert.ok(typeof res.data.confirmationToken === 'string');

  assert.equal(res.action.type, 'confirmation');
  assert.equal(res.action.actionType, 'CREATE_PERSONAL_EXPENSE');
  assert.equal(res.action.details['Amount'], '₹450');
  assert.equal(res.action.details['Category'], 'Groceries');
});

test('3. Personal Expense: Rejects zero or negative expense amounts', async () => {
  const resZero = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 0, category: 'Food' }
  );
  assert.equal(resZero.success, false);
  assert.match(resZero.error, /valid expense amount greater than zero/i);

  const resNeg = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: -150, category: 'Food' }
  );
  assert.equal(resNeg.success, false);
  assert.match(resNeg.error, /valid expense amount greater than zero/i);
});

test('4. Personal Expense Confirmation: Invokes personalExpenseService.createTransaction and returns real record', async () => {
  let createdPayload = null;
  const mockExpenseService = {
    createTransaction: async (user, body) => {
      createdPayload = { user, body };
      return {
        transaction: {
          _id: '671f28b49912019a3b4e1001',
          id: '671f28b49912019a3b4e1001',
          amountMinor: 45000,
          categoryId: body.categoryId,
          merchantOrSource: body.merchantOrSource,
          transactionDate: body.transactionDate,
          paymentMethod: body.paymentMethod,
        },
        duplicateWarning: false,
      };
    },
  };

  setTestServices({ personalExpenseService: mockExpenseService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 450, category: 'Groceries', merchantOrSource: 'Zepto', date: '2026-10-28' }
  );

  const confirmRes = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.executed, true);
  assert.equal(confirmRes.actionType, 'CREATE_PERSONAL_EXPENSE');
  assert.equal(confirmRes.data.transactionId, '671f28b49912019a3b4e1001');
  assert.equal(confirmRes.action.type, 'action_result');
  assert.equal(confirmRes.action.status, 'success');
  assert.equal(confirmRes.action.route, '/(resident)/expense-manager');

  assert.ok(createdPayload);
  assert.equal(createdPayload.body.amount, 450);
  assert.equal(createdPayload.body.categoryId, 'groceries');
  assert.equal(createdPayload.body.merchantOrSource, 'Zepto');
});

test('5. Personal Expense Idempotency: Duplicate confirmation returns cached result without re-executing', async () => {
  let callCount = 0;
  const mockExpenseService = {
    createTransaction: async () => {
      callCount++;
      return {
        transaction: { _id: '671f28b49912019a3b4e1002', amountMinor: 30000 },
        duplicateWarning: false,
      };
    },
  };

  setTestServices({ personalExpenseService: mockExpenseService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 300, category: 'Food' }
  );

  const firstConfirm = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );
  assert.equal(firstConfirm.success, true);
  assert.equal(firstConfirm.executed, true);
  assert.equal(callCount, 1);

  const secondConfirm = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );
  assert.equal(secondConfirm.success, true);
  assert.equal(secondConfirm.idempotentReplay, true);
  assert.equal(secondConfirm.action.type, 'action_result');
  assert.equal(callCount, 1, 'Service must not be called again on replay');
});

test('6. Personal Expense Query: Accurately retrieves totals, breakdown, budgets, and recent transactions', async () => {
  const mockExpenseService = {
    dashboard: async (user, period) => ({
      period,
      incomeMinor: 12000000,
      expenseMinor: 4500000,
      balanceMinor: 7500000,
      categoryBreakdown: [
        { _id: 'groceries', name: 'Groceries', amountMinor: 2000000 },
        { _id: 'utilities', name: 'Utilities', amountMinor: 1500000 },
        { _id: 'food_dining', name: 'Food and Dining', amountMinor: 1000000 },
      ],
      budgets: [
        { categoryId: 'groceries', categoryName: 'Groceries', amountMinor: 2500000 },
        { categoryId: 'utilities', categoryName: 'Utilities', amountMinor: 2000000 },
      ],
      recentTransactions: [
        { _id: 'tx1', merchantOrSource: 'Zepto', categoryName: 'Groceries', amountMinor: 85000, transactionDate: '2026-10-27', paymentMethod: 'UPI' },
        { _id: 'tx2', merchantOrSource: 'Electricity Board', categoryName: 'Utilities', amountMinor: 120000, transactionDate: '2026-10-25', paymentMethod: 'BANK_TRANSFER' },
      ],
    }),
  };

  setTestServices({ personalExpenseService: mockExpenseService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_personal_expense_summary',
    { period: '2026-10', category: 'Groceries' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.personalIncome, 120000);
  assert.equal(res.data.personalExpenses, 45000);
  assert.equal(res.data.netBalance, 75000);
  assert.equal(res.data.currency, '₹ (INR)');
  assert.equal(res.data.categoryBreakdown.length, 3);
  assert.equal(res.data.filteredCategory.category, 'Groceries');
  assert.equal(res.data.filteredCategory.amount, 20000);

  // Budget utilization check
  const grocBudget = res.data.budgets.find(b => b.categoryName === 'Groceries');
  assert.ok(grocBudget);
  assert.equal(grocBudget.budgetLimit, 25000);
  assert.equal(grocBudget.spent, 20000);
  assert.equal(grocBudget.remaining, 5000);
  assert.equal(grocBudget.utilizationPercent, 80);

  // Recent transactions check
  assert.equal(res.data.recentTransactions.length, 2);
  assert.equal(res.data.recentTransactions[0].merchantOrSource, 'Zepto');
  assert.equal(res.data.recentTransactions[0].amount, 850);
});

test('7. Receipt OCR: Parses receipt text into structured expense fields', async () => {
  const mockReceiptParser = (text) => ({
    totalAmount: 549,
    merchant: 'Apollo Pharmacy',
    inferredCategory: { category: 'Medical' },
    receiptDate: '2026-10-28',
    documentType: 'RECEIPT',
    items: [
      { name: 'Paracetamol', amount: 49 },
      { name: 'Vitamin C', amount: 500 },
    ],
    suggestedNotes: 'Medical expense from Apollo Pharmacy',
  });

  setTestServices({ parseReceiptText: mockReceiptParser });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'preview_receipt_ocr',
    { receiptText: 'Apollo Pharmacy Total ₹549 Date 28/10/2026' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.totalAmount, 549);
  assert.equal(res.data.merchant, 'Apollo Pharmacy');
  assert.equal(res.data.category, 'Medical');
  assert.equal(res.data.itemsCount, 2);
});

// ==========================================
// 3. Complaint Management Tests
// ==========================================
test('8. Complaint: Prepares proposal card with issue, category, priority, and HMAC token', async () => {
  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint',
    {
      title: 'Water leakage in kitchen sink',
      category: 'Plumbing',
      priority: 'High',
      location: 'Flat 402, Block B',
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.proposalReady, true);
  assert.equal(res.data.actionType, 'CREATE_COMPLAINT');
  assert.equal(res.data.title, 'Water leakage in kitchen sink');
  assert.equal(res.data.category, 'Plumbing');
  assert.equal(res.data.priority, 'High');
  assert.ok(res.data.actionId.startsWith('act_'));

  assert.equal(res.action.type, 'confirmation');
  assert.equal(res.action.actionType, 'CREATE_COMPLAINT');
  assert.equal(res.action.details['Issue'], 'Water leakage in kitchen sink');
  assert.equal(res.action.details['Priority'], 'High');
});

test('9. Complaint: Rejects empty or invalid complaint title', async () => {
  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint',
    { title: '   ' }
  );
  assert.equal(res.success, false);
  assert.match(res.error, /clear title or description/i);
});

test('10. Complaint Confirmation: Calls complaintService.createComplaint and returns real ticket number and SLA', async () => {
  let createdArgs = null;
  const mockComplaintService = {
    createComplaint: async (orgId, residentId, residentName, data) => {
      createdArgs = { orgId, residentId, residentName, data };
      return {
        _id: '671f28b49912019a3b4e2001',
        complaintNumber: 'CMP-2026-000101',
        status: 'Open',
        priority: data.priority,
        expectedSLA: 'Standard',
        slaDueDate: new Date('2026-10-30T10:00:00.000Z'),
      };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint',
    { title: 'Corridor light flickering', category: 'Electrical', priority: 'Medium' }
  );

  const confirmRes = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.executed, true);
  assert.equal(confirmRes.actionType, 'CREATE_COMPLAINT');
  assert.equal(confirmRes.data.complaintNumber, 'CMP-2026-000101');
  assert.equal(confirmRes.action.type, 'action_result');
  assert.equal(confirmRes.action.status, 'success');
  assert.equal(confirmRes.action.route, '/(resident)/complaints/manage');
  assert.equal(confirmRes.action.referenceId, 'CMP-2026-000101');

  assert.ok(createdArgs);
  assert.equal(createdArgs.residentName, 'Aarav Sharma');
  assert.equal(createdArgs.data.title, 'Corridor light flickering');
  assert.equal(createdArgs.data.category, 'Electrical');
});

test('11. Complaint Status Query: Retrieves complaints and filters by ticket number or status', async () => {
  const mockComplaintService = {
    getComplaints: async (orgId, filter) => {
      return {
        total: 1,
        data: [
          {
            _id: '671f28b49912019a3b4e2001',
            complaintNumber: 'CMP-2026-000045',
            title: 'Lift stuck on 3rd floor',
            category: 'Lift',
            status: 'In Progress',
            priority: 'Critical',
            department: 'Lift Maintenance',
            slaDueDate: new Date('2026-10-28T18:00:00.000Z'),
            slaStatus: 'Near SLA',
            createdAt: new Date('2026-10-28T12:00:00.000Z'),
          },
        ],
      };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_my_complaints',
    { complaintNumber: 'CMP-2026-000045' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.count, 1);
  const complaint = res.data.complaints[0];
  assert.equal(complaint.complaintNumber, 'CMP-2026-000045');
  assert.equal(complaint.title, 'Lift stuck on 3rd floor');
  assert.equal(complaint.status, 'In Progress');
  assert.equal(complaint.priority, 'Critical');
  assert.equal(complaint.slaStatus, 'Near SLA');
});

test('12. Complaint Cancellation: Prepares proposal for open complaint and executes cancellation', async () => {
  let cancelArgs = null;
  const mockComplaintService = {
    getComplaintById: async (id, orgId) => ({
      _id: '671f28b49912019a3b4e2005',
      complaintNumber: 'CMP-2026-000088',
      title: 'Water tap leaking',
      residentId: userA.id,
      status: 'Open',
    }),
    cancelComplaint: async (id, orgId, userId, userName, userRole, reason) => {
      cancelArgs = { id, orgId, userId, userName, userRole, reason };
      return {
        _id: id,
        complaintNumber: 'CMP-2026-000088',
        status: 'Cancelled',
      };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint_cancellation',
    { complaintId: 'CMP-2026-000088', reason: 'Fixed by myself' }
  );

  assert.equal(prep.success, true);
  assert.equal(prep.data.proposalReady, true);
  assert.equal(prep.data.actionType, 'CANCEL_COMPLAINT');
  assert.equal(prep.data.complaintNumber, 'CMP-2026-000088');

  const confirmRes = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.executed, true);
  assert.equal(confirmRes.actionType, 'CANCEL_COMPLAINT');
  assert.equal(confirmRes.data.status, 'Cancelled');
  assert.equal(confirmRes.action.route, '/(resident)/complaints/manage');

  assert.ok(cancelArgs);
  assert.equal(cancelArgs.id, '671f28b49912019a3b4e2005');
  assert.equal(cancelArgs.userName, 'Aarav Sharma');
});

test('13. Complaint Cancellation: Rejects cancellation if complaint is already assigned or in progress', async () => {
  const mockComplaintService = {
    getComplaintById: async () => ({
      _id: '671f28b49912019a3b4e2009',
      complaintNumber: 'CMP-2026-000099',
      title: 'Short circuit in switchboard',
      residentId: userA.id,
      status: 'In Progress',
    }),
  };

  setTestServices({ complaintService: mockComplaintService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint_cancellation',
    { complaintId: 'CMP-2026-000099' }
  );

  assert.equal(res.success, false);
  assert.match(res.error, /only be cancelled before it is assigned/i);
});

test('14. Complaint Cancellation: Rejects cancellation if ticket belongs to a different resident', async () => {
  const mockComplaintService = {
    getComplaintById: async () => ({
      _id: '671f28b49912019a3b4e2010',
      complaintNumber: 'CMP-2026-000100',
      title: 'Security dispute',
      residentId: userB.id, // belongs to userB, attempted by userA
      status: 'Open',
    }),
  };

  setTestServices({ complaintService: mockComplaintService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint_cancellation',
    { complaintId: 'CMP-2026-000100' }
  );

  assert.equal(res.success, false);
  assert.match(res.error, /Forbidden/i);
});

// ==========================================
// 4. Resident Dues Read Safety Tests
// ==========================================
test('15. Resident Dues: Retrieves verified dues and directs resident to payment screen without direct mutation', async () => {
  const mockInvoiceService = {
    getUserDuesOverview: async (user, orgId) => ({
      personalDues: {
        totalOutstanding: 4500,
        overdueAmount: 1500,
        unitBreakdown: [
          {
            invoiceNumber: 'INV-2026-10-001',
            billingPeriodString: 'October 2026',
            totalDue: 3000,
            paidAmount: 0,
            outstandingAmount: 3000,
            status: 'ISSUED',
            dueDate: new Date('2026-11-05'),
          },
          {
            invoiceNumber: 'INV-2026-09-001',
            billingPeriodString: 'September 2026',
            totalDue: 1500,
            paidAmount: 0,
            outstandingAmount: 1500,
            status: 'OVERDUE',
            dueDate: new Date('2026-10-05'),
          },
        ],
      },
      recentInvoices: [
        {
          invoiceNumber: 'INV-2026-08-001',
          paidAmount: 3000,
          paid_at: new Date('2026-08-10'),
          paymentMethod: 'UPI',
          status: 'PAID',
        },
      ],
    }),
  };

  setTestServices({ invoiceServices: mockInvoiceService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_resident_dues_and_invoices',
    {}
  );

  assert.equal(res.success, true);
  assert.equal(res.data.totalOutstandingDues, 4500);
  assert.equal(res.data.overdueAmount, 1500);
  assert.equal(res.data.hasOutstandingDues, true);
  assert.equal(res.data.unpaidInvoices.length, 2);
  assert.equal(res.data.verifiedRecentPayments.length, 1);

  // Safety check: Directs to checkout route; does NOT execute chat mutation
  assert.equal(res.action.type, 'navigation');
  assert.equal(res.action.route, '/(resident)/billing/my-dues');
});

// ==========================================
// 5. Multi-Turn Conversation NLU Tests
// ==========================================
test('16. Multi-Turn NLU: Conversational expense intake workflow transitions to ready', () => {
  // Turn 1: Fresh intent with missing amount
  const turn1 = analyzeConversationTurn('I want to record an expense for groceries', null, [], new Date('2026-10-28'));
  assert.equal(turn1.activeIntent, INTENTS.PERSONAL_EXPENSE_CREATE);
  assert.equal(turn1.workflow, WORKFLOWS.EXPENSE_INTAKE);
  assert.deepEqual(turn1.missingFields, ['amount']);
  assert.equal(turn1.interactionType, 'clarification');

  // Turn 2: Providing amount in intake workflow
  const turn2 = analyzeConversationTurn('₹450 via UPI', turn1, [], new Date('2026-10-28'));
  assert.equal(turn2.activeIntent, INTENTS.PERSONAL_EXPENSE_CREATE);
  assert.equal(turn2.workflow, WORKFLOWS.EXPENSE_READY);
  assert.equal(turn2.collectedDetails.amount, 450);
  assert.equal(turn2.interactionType, 'confirmation');
  assert.equal(turn2.awaitingConfirmation, true);
});

test('17. Multi-Turn NLU: Conversational complaint intake workflow transitions to ready', () => {
  // Turn 1: Fresh intent with description
  const turn1 = analyzeConversationTurn('Raise a complaint: Lift not working', null, [], new Date('2026-10-28'));
  assert.equal(turn1.activeIntent, INTENTS.COMPLAINT_CREATE);
  assert.equal(turn1.workflow, WORKFLOWS.COMPLAINT_READY);
  assert.equal(turn1.collectedDetails.category, 'Lift');
  assert.equal(turn1.interactionType, 'confirmation');
});

test('18. Multi-Turn NLU: Conversational complaint cancellation intake workflow transitions to ready', () => {
  // Turn 1: Intent without ticket number
  const turn1 = analyzeConversationTurn('I want to cancel a complaint', null, [], new Date('2026-10-28'));
  assert.equal(turn1.activeIntent, INTENTS.COMPLAINT_CANCEL);
  assert.equal(turn1.workflow, WORKFLOWS.COMPLAINT_CANCEL_INTAKE);
  assert.deepEqual(turn1.missingFields, ['complaintId']);

  // Turn 2: Providing ticket number
  const turn2 = analyzeConversationTurn('Ticket CMP-2026-000045', turn1, [], new Date('2026-10-28'));
  assert.equal(turn2.activeIntent, INTENTS.COMPLAINT_CANCEL);
  assert.equal(turn2.workflow, WORKFLOWS.COMPLAINT_CANCEL_READY);
  assert.equal(turn2.collectedDetails.complaintId, 'CMP-2026-000045');
  assert.equal(turn2.interactionType, 'confirmation');
});

// ==========================================
// 6. Cross-User and Cross-Tenant Security Tests
// ==========================================
test('19. Security: Cross-user confirmation is blocked on personal expense action', async () => {
  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 500, category: 'Food' }
  );

  const crossUserConfirm = await executeAssistantTool(
    userB, // userB attempting to confirm userA's action
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(crossUserConfirm.success, false);
  assert.match(crossUserConfirm.error, /Forbidden/i);
});

test('20. Security: Cross-tenant confirmation is blocked on complaint action', async () => {
  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint',
    { title: 'Broken corridor window' }
  );

  const crossTenantConfirm = await executeAssistantTool(
    userA,
    tenantBeta, // wrong tenant
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(crossTenantConfirm.success, false);
  assert.match(crossTenantConfirm.error, /Forbidden/i);
});

// ==========================================
// 7. Audit & Crash Recovery Tests
// ==========================================
test('21. Expense Accuracy: Decimal amounts preserve exact rupee-to-minor precision', async () => {
  let createdBody = null;
  const mockExpenseService = {
    createTransaction: async (user, body) => {
      createdBody = body;
      return {
        transaction: {
          _id: '671f28b49912019a3b4e9999',
          amountMinor: 45075,
        },
      };
    },
  };

  setTestServices({ personalExpenseService: mockExpenseService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 450.75, category: 'Groceries' }
  );
  assert.equal(prep.data.amount, 450.75);

  const confirm = await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(confirm.success, true);
  assert.equal(createdBody.amount, 450.75);
});

test('22. Expense Validation: Rejects Infinity and non-finite amounts', async () => {
  const resInf = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: Infinity, category: 'Food' }
  );
  assert.equal(resInf.success, false);
  assert.match(resInf.error, /valid expense amount/i);

  const resNaN = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_personal_expense',
    { amount: 'not_a_number', category: 'Food' }
  );
  assert.equal(resNaN.success, false);
  assert.match(resNaN.error, /valid expense amount/i);
});

test('23. Period Boundaries: Previous month and specific month formats resolve accurately', async () => {
  let queriedPeriod = null;
  const mockExpenseService = {
    dashboard: async (user, period) => {
      queriedPeriod = period;
      return {
        period,
        incomeMinor: 0,
        expenseMinor: 0,
        balanceMinor: 0,
        categoryBreakdown: [],
        budgets: [],
        recentTransactions: [],
      };
    },
  };

  setTestServices({ personalExpenseService: mockExpenseService });

  const prevRes = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_personal_expense_summary',
    { period: 'previous_month' }
  );
  assert.equal(prevRes.success, true);
  assert.match(queriedPeriod, /^\d{4}-\d{2}$/);
  assert.equal(prevRes.data.periodKey, queriedPeriod);
});

test('24. Complaint Scoping: Resident queries return ONLY records owned by authenticated resident', async () => {
  let appliedFilter = null;
  let appliedOrg = null;
  const mockComplaintService = {
    getComplaints: async (orgId, filter) => {
      appliedOrg = orgId;
      appliedFilter = filter;
      return { total: 0, data: [] };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_my_complaints',
    { status: 'Open' }
  );

  assert.equal(appliedOrg, 'community_alpha');
  assert.equal(appliedFilter.residentId, userA.id, 'Filter must be strictly bound to authenticated residentId');
});

test('25. Complaint Scoping: Non-admin lookup of another resident ticket number is blocked at database layer', async () => {
  let appliedFilter = null;
  const mockComplaintService = {
    getComplaints: async (orgId, filter) => {
      appliedFilter = filter;
      return { total: 0, data: [] };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const res = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_my_complaints',
    { complaintNumber: 'CMP-2026-000999' }
  );

  assert.equal(res.success, true);
  assert.equal(res.data.count, 0);
  assert.equal(appliedFilter.residentId, userA.id, 'Query must enforce residentId = userA even with complaintNumber');
  assert.equal(appliedFilter.complaintNumber, 'CMP-2026-000999');
});

test('26. Complaint Identity Binding: Creation derives residentId and orgId strictly from server context', async () => {
  let receivedResidentId = null;
  let receivedOrgId = null;
  const mockComplaintService = {
    createComplaint: async (orgId, residentId, residentName, data) => {
      receivedOrgId = orgId;
      receivedResidentId = residentId;
      return {
        _id: '671f28b49912019a3b4e3333',
        complaintNumber: 'CMP-2026-000333',
        status: 'Open',
        priority: data.priority,
      };
    },
  };

  setTestServices({ complaintService: mockComplaintService });

  const prep = await executeAssistantTool(
    userA,
    tenantAlpha,
    'prepare_complaint',
    {
      title: 'Water pressure low',
      residentId: 'spoofed_resident_id_evil',
      orgId: 'spoofed_tenant_evil',
    }
  );

  await executeAssistantTool(
    userA,
    tenantAlpha,
    'confirm_pending_action',
    { actionId: prep.data.actionId, confirmationToken: prep.data.confirmationToken }
  );

  assert.equal(receivedOrgId, 'community_alpha', 'orgId must be server-derived');
  assert.equal(receivedResidentId, userA.id, 'residentId must be server-derived and cannot be spoofed');
});

test('27. Crash Recovery: Stale execution lock (>60s) is recoverable on retry', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amount: 100 },
    summary: 'Test crash recovery',
  });

  proposal.status = 'EXECUTING';
  proposal.lockedAt = Date.now() - 65000;

  const reacquired = await lockActionForExecution(proposal.actionId);
  assert.equal(reacquired, true, 'Stale lock (>60s) must be recoverable on retry');
});

test('28. Concurrent Execution Prevention: Active lock (<60s) blocks concurrent execution', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amount: 100 },
    summary: 'Test active lock contention',
  });

  const firstLock = await lockActionForExecution(proposal.actionId);
  assert.equal(firstLock, true);

  const secondLock = await lockActionForExecution(proposal.actionId);
  assert.equal(secondLock, false, 'Concurrent execution call must be blocked while lock is active');
});

test('29. TTL Preservation: Executed proposals extend expiresAt to 30 days to protect against premature TTL deletion', async () => {
  const proposal = createPendingActionProposal({
    actionType: 'CREATE_PERSONAL_EXPENSE',
    userId: userA.id,
    orgId: userA.orgId,
    params: { amount: 100 },
    summary: 'Test TTL preservation',
  });

  const originalExpiresAt = proposal.expiresAt;

  await recordActionSuccess(proposal.actionId, { transactionId: 'TX-123' });

  const executedAction = getPendingActionById(proposal.actionId);
  assert.ok(executedAction, 'Executed action must remain accessible');
  assert.equal(executedAction.status, 'EXECUTED');
  assert.ok(executedAction.expiresAt > originalExpiresAt + 20 * 24 * 60 * 60 * 1000, 'expiresAt must be extended to ~30 days on success');
});

test('30. Community Finance Access Control: Non-admin resident is blocked; Community Admin is permitted', async () => {
  const mockFinanceService = {
    getDashboard: async () => ({
      totalExpensesIncurred: 500000,
      grossSuccessfulCollections: 600000,
      netCollectionsAfterRefunds: 580000,
      netSurplusOrDeficit: 80000,
      expenseCategoryAggregates: [],
    }),
  };

  setTestServices({ communityFinanceService: mockFinanceService });

  const residentRes = await executeAssistantTool(
    userA,
    tenantAlpha,
    'get_community_finance_summary',
    {}
  );
  assert.equal(residentRes.success, true);
  assert.equal(residentRes.data.authorized, false, 'Resident must not be authorized to view community-wide finances');
  assert.equal(residentRes.action.route, '/(resident)/billing/my-dues');

  const adminRes = await executeAssistantTool(
    adminUser,
    tenantAlpha,
    'get_community_finance_summary',
    {}
  );
  assert.equal(adminRes.success, true);
  assert.equal(adminRes.data.authorized, true);
  assert.equal(adminRes.data.totalCommunityExpenses, 500000);
});
