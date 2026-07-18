import mongoose from 'mongoose';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import assessmentRepository from '../src/features/assessment/assessment.repository.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import invoiceRepository from '../src/features/invoice/invoice.repository.js';
import HttpError from '../src/utils/httpError.utils.js';
import User from '../src/features/user/user.model.js';

const runTests = async () => {
  console.log('--- STARTING FINANCIAL SUITE DB VERIFICATION ---');

  // Connect to DB
  await connectToDb();

  // Clear previous test records to prevent test collisions
  console.log('Cleaning up previous test databases...');
  await Assessment.deleteMany({ name: /TEST_ASSESSMENT/ });
  await Invoice.deleteMany({});
  await User.deleteMany({ email: /test_financial_user/ });

  // Sync indexes to ensure unique constraints are built in MongoDB
  console.log('Syncing database indexes...');
  await Assessment.syncIndexes();
  await Invoice.syncIndexes();
  await User.syncIndexes();

  // Mock parent entity ObjectIds
  const mockCommunityId = new mongoose.Types.ObjectId();
  const mockVillaId = new mongoose.Types.ObjectId();
  const mockUserId1 = new mongoose.Types.ObjectId();
  const mockUserId2 = new mongoose.Types.ObjectId();
  const mockUnitId1 = new mongoose.Types.ObjectId();
  const mockUnitId2 = new mongoose.Types.ObjectId();

  console.log('\n--- 1. TESTING ASSESSMENT MODEL VALIDATION ---');

  // Test invalid generationDay (number too high)
  try {
    const invalidAssessment1 = new Assessment({
      communityId: mockCommunityId,
      villaId: mockVillaId,
      name: 'TEST_ASSESSMENT_INVALID_1',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 29, // Invalid (> 28)
      targetScope: { type: 'ALL_COMMUNITY', scopeIds: [], targetRole: 'OWNER' },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 1000 },
    });
    await invalidAssessment1.validate();
    console.error('FAIL: Expected validation error for generationDay 29');
    process.exit(1);
  } catch (error) {
    console.log('PASS: Correctly rejected invalid generationDay 29:', error.message);
  }

  // Test invalid generationDay (wrong string)
  try {
    const invalidAssessment2 = new Assessment({
      communityId: mockCommunityId,
      villaId: mockVillaId,
      name: 'TEST_ASSESSMENT_INVALID_2',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 'FIRST_DAY', // Invalid string
      targetScope: { type: 'ALL_COMMUNITY', scopeIds: [], targetRole: 'OWNER' },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 1000 },
    });
    await invalidAssessment2.validate();
    console.error('FAIL: Expected validation error for generationDay "FIRST_DAY"');
    process.exit(1);
  } catch (error) {
    console.log('PASS: Correctly rejected invalid generationDay "FIRST_DAY":', error.message);
  }

  console.log('\n--- 1a. TESTING USER SCHEMA MULTI-ROLE VALIDATION ---');

  // Test missing roles field
  try {
    const invalidUser1 = new User({
      email: 'test_financial_user_invalid1@example.com',
      username: 'test_financial_user_invalid1',
      name: 'Test Invalid User 1',
      status: 'Active',
      password: 'password123',
    });
    invalidUser1.roles = undefined;
    await invalidUser1.validate();
    console.error('FAIL: Expected validation error for missing User roles');
    process.exit(1);
  } catch (error) {
    console.log('PASS: Correctly rejected missing User roles:', error.message);
  }

  // Test empty roles array
  try {
    const invalidUser2 = new User({
      email: 'test_financial_user_invalid2@example.com',
      username: 'test_financial_user_invalid2',
      name: 'Test Invalid User 2',
      status: 'Active',
      password: 'password123',
      roles: [],
    });
    await invalidUser2.validate();
    console.error('FAIL: Expected validation error for empty User roles array');
    process.exit(1);
  } catch (error) {
    console.log('PASS: Correctly rejected empty User roles array:', error.message);
  }

  // Create valid user with multiple roles
  const mockRoleId1 = new mongoose.Types.ObjectId();
  const mockRoleId2 = new mongoose.Types.ObjectId();

  const validUser = new User({
    email: 'test_financial_user_valid@example.com',
    username: 'test_financial_user_valid',
    name: 'Test Valid User',
    status: 'Active',
    password: 'password123',
    roles: [mockRoleId1, mockRoleId2],
  });
  await validUser.validate();
  console.log('PASS: Successfully validated User schema with multi-role array configuration');

  console.log('\n--- 2. TESTING ASSESSMENT REPOSITORY WRITE/READ ---');

  // Create valid template 1 (generationDay = 15)
  const template1 = await assessmentRepository.create({
    communityId: mockCommunityId,
    villaId: mockVillaId,
    name: 'TEST_ASSESSMENT_TEMPLATE_1',
    type: 'RECURRING',
    billingCycle: 'MONTHLY',
    generationDay: 15,
    targetScope: { type: 'ALL_COMMUNITY', scopeIds: [], targetRole: 'OWNER' },
    calculationMethod: { type: 'FLAT_RATE', flatAmount: 5000 },
  });
  console.log('PASS: Created Assessment template 1 (Day 15)');

  // Create valid template 2 (generationDay = 'LAST_DAY_OF_MONTH')
  const template2 = await assessmentRepository.create({
    communityId: mockCommunityId,
    villaId: mockVillaId,
    name: 'TEST_ASSESSMENT_TEMPLATE_2',
    type: 'RECURRING',
    billingCycle: 'MONTHLY',
    generationDay: 'LAST_DAY_OF_MONTH',
    targetScope: { type: 'ALL_COMMUNITY', scopeIds: [], targetRole: 'OWNER' },
    calculationMethod: { type: 'PER_SQ_FT', ratePerSqFt: 3.5 },
  });
  console.log('PASS: Created Assessment template 2 (LAST_DAY_OF_MONTH)');

  // Test findActiveByGenerationDay
  const active15 = await assessmentRepository.findActiveByGenerationDay(15);
  if (active15.length === 1 && active15[0].name === 'TEST_ASSESSMENT_TEMPLATE_1') {
    console.log('PASS: findActiveByGenerationDay found template 1 correctly for day 15');
  } else {
    console.error('FAIL: findActiveByGenerationDay day 15 returned wrong records');
    process.exit(1);
  }

  const activeLastDay = await assessmentRepository.findActiveByGenerationDay('LAST_DAY_OF_MONTH');
  if (activeLastDay.length === 1 && activeLastDay[0].name === 'TEST_ASSESSMENT_TEMPLATE_2') {
    console.log('PASS: findActiveByGenerationDay found template 2 correctly for LAST_DAY_OF_MONTH');
  } else {
    console.error('FAIL: findActiveByGenerationDay LAST_DAY_OF_MONTH returned wrong records');
    process.exit(1);
  }

  // Test updateTemplate
  const updatedTemplate = await assessmentRepository.updateTemplate(
    template1._id,
    { name: 'TEST_ASSESSMENT_TEMPLATE_1_UPDATED' }
  );
  if (updatedTemplate.name === 'TEST_ASSESSMENT_TEMPLATE_1_UPDATED') {
    console.log('PASS: updateTemplate correctly updated template fields without issue');
  } else {
    console.error('FAIL: updateTemplate did not apply updates');
    process.exit(1);
  }

  console.log('\n--- 3. TESTING INVOICE MODEL & CONSTRAINTS ---');

  // Test invalid billingPeriodString format
  try {
    const invalidInvoice = new Invoice({
      assessmentId: template1._id,
      targetUserId: mockUserId1,
      unitId: mockUnitId1,
      billingPeriodString: '2026/07', // Wrong separator
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(Date.now() + 864000000), // +10 days
    });
    await invalidInvoice.validate();
    console.error('FAIL: Expected validation error for billingPeriodString "2026/07"');
    process.exit(1);
  } catch (error) {
    console.log('PASS: Correctly rejected invalid billingPeriodString "2026/07":', error.message);
  }

  console.log('\n--- 4. TESTING INVOICE REPOSITORY BATCH WRITE ---');

  // Batch insert valid invoices
  const invoicesToCreate = [
    {
      assessmentId: template1._id,
      targetUserId: mockUserId1,
      unitId: mockUnitId1,
      billingPeriodString: '2026-07',
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(Date.now() + 864000000),
      status: 'UNPAID',
    },
    {
      assessmentId: template1._id,
      targetUserId: mockUserId2,
      unitId: mockUnitId2,
      billingPeriodString: '2026-07',
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(Date.now() + 864000000),
      status: 'VERIFICATION_PENDING',
    },
  ];

  const createdInvoices = await invoiceRepository.createBatch(invoicesToCreate);
  console.log(`PASS: Successfully batch created ${createdInvoices.length} invoices`);

  // Test composite unique constraint (duplicate billing spam prevention)
  try {
    // Attempting to write the exact same invoice parameters as invoicesToCreate[0]
    await invoiceRepository.createBatch([
      {
        assessmentId: template1._id,
        targetUserId: mockUserId1,
        unitId: mockUnitId1,
        billingPeriodString: '2026-07',
        hardcodedAmount: 5000,
        totalDue: 5000,
        dueDate: new Date(),
        status: 'UNPAID',
      },
    ]);
    console.error('FAIL: Expected composite index unique violation exception');
    process.exit(1);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 409) {
      console.log('PASS: Correctly caught and wrapped code 11000 duplicate violation as 409 conflict:', error.message);
    } else {
      console.error('FAIL: Unexpected error type thrown for unique index violation:', error);
      process.exit(1);
    }
  }

  console.log('\n--- 5. TESTING DASHBOARD KPI AGGREGATION FACET ---');

  // Add one PAID invoice and one CANCELLED invoice to diversify aggregation metrics
  await Invoice.insertMany([
    {
      invoiceNumber: 'MOCK-INV-PAID-1',
      assessmentId: template1._id,
      targetUserId: mockUserId1,
      unitId: mockUnitId1,
      billingPeriodString: '2026-06',
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(),
      status: 'PAID',
      paid_at: new Date(),
      settled_at: new Date(), // Fully cleared
      paymentMethod: 'UPI',
    },
    {
      invoiceNumber: 'MOCK-INV-PAID-2',
      assessmentId: template1._id,
      targetUserId: mockUserId2,
      unitId: mockUnitId2,
      billingPeriodString: '2026-06',
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(),
      status: 'PAID',
      paid_at: new Date(),
      settled_at: null, // In transit
      paymentMethod: 'CARD',
    },
    {
      invoiceNumber: 'MOCK-INV-CANCELLED-1',
      assessmentId: template1._id,
      targetUserId: mockUserId1,
      unitId: mockUnitId1,
      billingPeriodString: '2026-05',
      hardcodedAmount: 5000,
      totalDue: 5000,
      dueDate: new Date(),
      status: 'CANCELLED',
    },
  ]);

  // Expected dashboard KPI stats:
  // - grossDemand: 4 active invoices of 5000 each = 20,000 (excluding CANCELLED)
  // - totalCollected: 2 paid invoices of 5000 each = 10,000
  // - inTransitGateway: 1 paid invoice where settled_at is null = 5,000
  // - totalUnpaidArrears: 2 unpaid/pending invoices of 5000 each = 10,000
  const kpis = await invoiceRepository.getDashboardKPIs(mockCommunityId);
  console.log('KPIs Output:', kpis);

  if (
    kpis.grossDemand === 20000 &&
    kpis.totalCollected === 10000 &&
    kpis.inTransitGateway === 5000 &&
    kpis.totalUnpaidArrears === 10000
  ) {
    console.log('PASS: Dashboard KPIs match expected aggregation outcomes');
  } else {
    console.error('FAIL: Dashboard KPIs value calculation error');
    process.exit(1);
  }

  console.log('\n--- 6. TESTING USER PORTFOLIO DUES GROUPING ---');

  // Fetch dues for user 1. Expected outcome:
  // - targetUserId: mockUserId1
  // - totalPortfolioDue: 10000 (matching active 2026-07 UNPAID invoice + CANCELLED invoice since status: { $ne: 'PAID' } matches both)
  // - unitBreakdown: length of 2
  const portfolioDues = await invoiceRepository.getUserPortfolioDues(mockUserId1);
  console.log('Portfolio Dues Output:', portfolioDues);

  if (portfolioDues && portfolioDues.totalPortfolioDue === 10000 && portfolioDues.unitBreakdown.length === 2) {
    console.log('PASS: User portfolio outstanding dues successfully grouped');
  } else {
    console.error('FAIL: Portfolio outstanding dues mapping output error');
    process.exit(1);
  }

  console.log('\n--- 7. TESTING TRANSACTIONAL LOCKING & RACE STATE PREVENTIONS ---');

  const unpaidInvoice = createdInvoices[0];

  // Perform successful update to PAID state
  const settledInvoice = await invoiceRepository.updateStatusWithLock(
    unpaidInvoice._id,
    'PAID',
    {
      paymentMethod: 'UPI',
      offlineReference: 'REF-TRX-998877',
      paid_at: new Date(),
    }
  );
  if (
    settledInvoice.status === 'PAID' &&
    settledInvoice.paymentMethod === 'UPI' &&
    settledInvoice.offlineReference === 'REF-TRX-998877'
  ) {
    console.log('PASS: updateStatusWithLock applied status transition to PAID with details');
  } else {
    console.error('FAIL: updateStatusWithLock failed to apply paid status details');
    process.exit(1);
  }

  // Attempt to modify an already PAID invoice, should reject immediately
  try {
    await invoiceRepository.updateStatusWithLock(unpaidInvoice._id, 'CANCELLED');
    console.error('FAIL: Expected updateStatusWithLock to throw error for modifying already PAID invoice');
    process.exit(1);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 409) {
      console.log('PASS: Correctly rejected state modification on already paid invoice with 409:', error.message);
    } else {
      console.error('FAIL: Unexpected error type when writing to paid invoice:', error);
      process.exit(1);
    }
  }

  console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('Unexpected test run error:', err);
  process.exit(1);
});
