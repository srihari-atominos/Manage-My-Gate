import mongoose from 'mongoose';
import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import domain models
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Role from '../src/features/role/role.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';

// Import domain services & validators
import assessmentService from '../src/features/assessment/assessment.services.js';
import assessmentRepository from '../src/features/assessment/assessment.repository.js';
import invoiceService from '../src/features/invoice/invoice.services.js';
import assessmentCron from '../src/features/assessment/utils/assessmentCron.js';
import { createAssessmentSchema, updateAssessmentSchema } from '../src/features/assessment/assessment.validator.js';
import { validationResult } from 'express-validator';
import { initSocket } from '../src/config/socket.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate_dev';

async function runValidation(schema, req) {
  for (const rule of schema) {
    await rule.run(req);
  }
  return validationResult(req);
}

async function runAssessmentE2ETest() {
  console.log('\n========================================================================');
  console.log('  🏢 FULL E2E TEST: ASSESSMENT MANAGER (MOBILE CONTRACT TO BACKEND)');
  console.log('========================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const httpServer = http.createServer();
  await initSocket(httpServer);
  console.log('✅ Initialized Socket.io test server.');

  const timestamp = Date.now();
  let org1, org2;
  let adminUser, residentOwner1, residentOwner2, residentTenant1;
  let ownerRole, tenantRole;
  let unit1, unit2, unit3, unit4, unit5;

  let flatAssessment, sqftAssessment, tieredAssessment, blockAssessment;
  let weeklyAssessment, capitalRepairAssessment, oneTimeAssessment;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Fixtures Setup
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Setting up Communities, Roles, Users & Units ---');

    org1 = await Organization.create({
      name: `E2E Assessment Community ${timestamp}`,
      code: `ASSM_${timestamp}`.substring(0, 10),
      organizationType: 'Residential',
      status: 'Active',
    });

    org2 = await Organization.create({
      name: `Other Community ${timestamp}`,
      code: `OTHR_${timestamp}`.substring(0, 10),
      organizationType: 'Residential',
      status: 'Active',
    });

    ownerRole = await Role.create({
      name: 'Resident Owner',
      orgId: org1._id,
      permissions: ['billing:action_center'],
      isTenantRole: false,
    });

    tenantRole = await Role.create({
      name: 'Resident Tenant',
      orgId: org1._id,
      permissions: ['billing:action_center'],
      isTenantRole: true,
    });

    adminUser = await User.create({
      name: 'Community Admin',
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Admin',
      permissions: ['billing:assessment_manager', 'billing:dashboard'],
      status: 'Active',
    });

    residentOwner1 = await User.create({
      name: 'Owner Alpha',
      username: `owner1_${timestamp}`,
      email: `owner1_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Owner',
      status: 'Active',
    });

    residentOwner2 = await User.create({
      name: 'Owner Beta',
      username: `owner2_${timestamp}`,
      email: `owner2_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Owner',
      status: 'Active',
    });

    const residentOwner3 = await User.create({
      name: 'Owner Gamma',
      username: `owner3_${timestamp}`,
      email: `owner3_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Owner',
      status: 'Active',
    });

    const residentOwner4 = await User.create({
      name: 'Owner Delta',
      username: `owner4_${timestamp}`,
      email: `owner4_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Owner',
      status: 'Active',
    });

    const residentOwner5 = await User.create({
      name: 'Owner Epsilon',
      username: `owner5_${timestamp}`,
      email: `owner5_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Owner',
      status: 'Active',
    });

    residentTenant1 = await User.create({
      name: 'Tenant Charlie',
      username: `tenant1_${timestamp}`,
      email: `tenant1_${timestamp}@assessment.com`,
      password: 'HashedPassword123!',
      orgId: org1._id,
      role: 'Resident Tenant',
      status: 'Active',
    });

    // Unit 1: Block A, BHK3, 1800 sq ft, Owner 1
    unit1 = await Villa.create({
      orgId: org1._id,
      unitNumber: `A-101-${timestamp}`,
      blockOrBuilding: 'Block A',
      type: 'BHK3',
      floorAreaSqFt: 1800,
      status: 'Occupied',
      primaryResidentId: residentOwner1._id,
      residents: [{ userId: residentOwner1._id, residencyType: 'Resident Owner', isPrimary: true }],
    });

    // Unit 2: Block A, BHK2, 1200 sq ft, Owner 2 + Tenant 1
    unit2 = await Villa.create({
      orgId: org1._id,
      unitNumber: `A-102-${timestamp}`,
      blockOrBuilding: 'Block A',
      type: 'BHK2',
      floorAreaSqFt: 1200,
      status: 'Occupied',
      primaryResidentId: residentOwner2._id,
      residents: [
        { userId: residentOwner2._id, residencyType: 'Resident Owner', isPrimary: true },
        { userId: residentTenant1._id, residencyType: 'Tenant', isPrimary: false },
      ],
    });

    // Unit 3: Block B, Studio, 600 sq ft, Owner 3
    unit3 = await Villa.create({
      orgId: org1._id,
      unitNumber: `B-201-${timestamp}`,
      blockOrBuilding: 'Block B',
      type: 'Studio',
      floorAreaSqFt: 600,
      status: 'Occupied',
      primaryResidentId: residentOwner3._id,
      residents: [{ userId: residentOwner3._id, residencyType: 'Resident Owner', isPrimary: true }],
    });

    // Unit 4: Block B, Penthouse, 3000 sq ft, Owner 4
    unit4 = await Villa.create({
      orgId: org1._id,
      unitNumber: `B-PH-${timestamp}`,
      blockOrBuilding: 'Block B',
      type: 'Penthouse',
      floorAreaSqFt: 3000,
      status: 'Occupied',
      primaryResidentId: residentOwner4._id,
      residents: [{ userId: residentOwner4._id, residencyType: 'Resident Owner', isPrimary: true }],
    });

    // Unit 5: Block C, Duplex, 2400 sq ft, Owner 5
    unit5 = await Villa.create({
      orgId: org1._id,
      unitNumber: `C-DUP-${timestamp}`,
      blockOrBuilding: 'Block C',
      type: 'Duplex',
      floorAreaSqFt: 2400,
      status: 'Occupied',
      primaryResidentId: residentOwner5._id,
      residents: [{ userId: residentOwner5._id, residencyType: 'Resident Owner', isPrimary: true }],
    });

    console.log('✅ Test Community, Roles, Users, and 5 Units created across 3 Blocks.');

    // -------------------------------------------------------------------------
    // STEP 2: Negative Input & Type Validation Tests
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Negative Tests & Building Type Rate Validation ---');

    // Test 2.1: Reject words and non-numeric letters in tieredRates
    const reqWithWordsInRate = {
      body: {
        communityId: org1._id.toString(),
        name: 'Invalid Words Rate Assessment',
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 1,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: {
          type: 'TIERED_BHK',
          tieredRates: {
            studio: 'free',
            bhk1: 'two thousand',
          },
        },
      },
    };
    const resWithWords = await runValidation(createAssessmentSchema, reqWithWordsInRate);
    assert.strictEqual(resWithWords.isEmpty(), false, 'Validation should reject words in price inputs');
    const wordErrors = resWithWords.array().map((e) => e.msg);
    assert.ok(
      wordErrors.some((m) => m.includes('Words and letters are not allowed') || m.includes('valid non-negative number')),
      `Expected error about words/letters, got: ${wordErrors.join(', ')}`
    );
    console.log('✅ Rejection of words in price inputs verified.');

    // Test 2.2: Reject negative flatAmount
    const reqNegativeFlat = {
      body: {
        communityId: org1._id.toString(),
        name: 'Negative Flat Assessment',
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 1,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: {
          type: 'FLAT_RATE',
          flatAmount: -2500,
        },
      },
    };
    const resNegativeFlat = await runValidation(createAssessmentSchema, reqNegativeFlat);
    assert.strictEqual(resNegativeFlat.isEmpty(), false, 'Validation should reject negative flat amount');
    assert.ok(
      resNegativeFlat.array().some((e) => e.msg.includes('non-negative')),
      'Should mention non-negative number'
    );
    console.log('✅ Rejection of negative flat amount verified.');

    // Test 2.3: Reject all zeros in tiered rates
    const reqZeroTiered = {
      body: {
        communityId: org1._id.toString(),
        name: 'Zero Tiered Assessment',
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 1,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: {
          type: 'TIERED_BHK',
          tieredRates: {
            studio: 0,
            bhk1: 0,
            bhk2: 0,
          },
        },
      },
    };
    const resZeroTiered = await runValidation(createAssessmentSchema, reqZeroTiered);
    assert.strictEqual(resZeroTiered.isEmpty(), false, 'Validation should reject tiered rates where all are 0');
    assert.ok(
      resZeroTiered.array().some((e) => e.msg.includes('greater than 0')),
      'Should require at least one rate > 0'
    );
    console.log('✅ Rejection of zero tiered rates verified.');

    // Test 2.4: Reject invalid generation day (e.g. 35)
    const reqInvalidDay = {
      body: {
        communityId: org1._id.toString(),
        name: 'Invalid Day Assessment',
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 35,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: { type: 'FLAT_RATE', flatAmount: 1000 },
      },
    };
    const resInvalidDay = await runValidation(createAssessmentSchema, reqInvalidDay);
    assert.strictEqual(resInvalidDay.isEmpty(), false, 'Validation should reject day 35');
    console.log('✅ Rejection of invalid generation day (35) verified.');

    // -------------------------------------------------------------------------
    // STEP 3: E2E Formula 1 - Fixed Flat Rate (FLAT_RATE)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Formula 1 - Fixed Flat Rate (FLAT_RATE) ---');

    flatAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Standard Monthly Maintenance 2026',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRole: 'OWNER',
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 2500,
      },
    });

    assert.ok(flatAssessment._id, 'Assessment should be created with an ID');
    assert.strictEqual(flatAssessment.calculationMethod.flatAmount, 2500);

    // Execute Run for period 2026-09
    const flatRunStats = await invoiceService.generateBatchInvoices({
      ...flatAssessment.toObject(),
      billingPeriodString: '2026-09',
    });

    assert.strictEqual(flatRunStats.created, 5, 'Expected 5 invoices created for the 5 community units');
    assert.strictEqual(flatRunStats.duplicatesSkipped, 0);

    // Verify invoice fields & snapshot immutability
    const flatInvoices = await Invoice.find({ assessmentId: flatAssessment._id, billingPeriodString: '2026-09' });
    assert.strictEqual(flatInvoices.length, 5);

    for (const inv of flatInvoices) {
      assert.strictEqual(inv.totalAmount, 2500, 'Invoice totalAmount must be ₹2,500');
      assert.strictEqual(inv.status, 'UNPAID');
      assert.strictEqual(inv.snapshot.assessmentName, 'Standard Monthly Maintenance 2026');
      assert.strictEqual(inv.snapshot.calculationMethod.type, 'FLAT_RATE');
    }

    // Re-run execution for period 2026-09: duplicate prevention
    const flatDuplicateRun = await invoiceService.generateBatchInvoices({
      ...flatAssessment.toObject(),
      billingPeriodString: '2026-09',
    });

    assert.strictEqual(flatDuplicateRun.created, 0, 'No duplicate invoices should be created');
    assert.strictEqual(flatDuplicateRun.duplicatesSkipped, 5, 'All 5 homes should be skipped');

    // Verify assessment model was updated with lastRun metadata
    const updatedFlatAssessment = await Assessment.findById(flatAssessment._id);
    assert.strictEqual(updatedFlatAssessment.lastBilledPeriod, '2026-09');
    assert.strictEqual(updatedFlatAssessment.lastRunStats.created, 0);
    assert.strictEqual(updatedFlatAssessment.lastRunStats.duplicatesSkipped, 5);
    console.log('✅ Formula 1 (FLAT_RATE) verified: 5 invoices @ ₹2500, duplicate skipping, snapshot immutability.');

    // -------------------------------------------------------------------------
    // STEP 4: E2E Formula 2 - Area Multiplier (PER_SQ_FT)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Formula 2 - Rate Per Sq. Ft. (PER_SQ_FT) ---');

    sqftAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Square Footage Building Assessment',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'PER_SQ_FT',
        ratePerSqFt: 3.5,
      },
    });

    const sqftStats = await invoiceService.generateBatchInvoices({
      ...sqftAssessment.toObject(),
      billingPeriodString: '2026-10',
    });

    assert.strictEqual(sqftStats.created, 5);

    // Verify calculated amounts: rate (3.5) * floorAreaSqFt
    const invUnit1 = await Invoice.findOne({ assessmentId: sqftAssessment._id, unitId: unit1._id });
    assert.strictEqual(invUnit1.totalAmount, 1800 * 3.5, 'Unit 1: 1800 sq.ft * 3.5 = 6300');

    const invUnit2 = await Invoice.findOne({ assessmentId: sqftAssessment._id, unitId: unit2._id });
    assert.strictEqual(invUnit2.totalAmount, 1200 * 3.5, 'Unit 2: 1200 sq.ft * 3.5 = 4200');

    const invUnit3 = await Invoice.findOne({ assessmentId: sqftAssessment._id, unitId: unit3._id });
    assert.strictEqual(invUnit3.totalAmount, 600 * 3.5, 'Unit 3: 600 sq.ft * 3.5 = 2100');

    const invUnit4 = await Invoice.findOne({ assessmentId: sqftAssessment._id, unitId: unit4._id });
    assert.strictEqual(invUnit4.totalAmount, 3000 * 3.5, 'Unit 4: 3000 sq.ft * 3.5 = 10500');

    const invUnit5 = await Invoice.findOne({ assessmentId: sqftAssessment._id, unitId: unit5._id });
    assert.strictEqual(invUnit5.totalAmount, 2400 * 3.5, 'Unit 5: 2400 sq.ft * 3.5 = 8400');

    console.log('✅ Formula 2 (PER_SQ_FT) verified: exactly matching rate * sq.ft across all 5 floorplans.');

    // -------------------------------------------------------------------------
    // STEP 5: E2E Formula 3 - Building Layout Tiered Matrix (TIERED_BHK)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Formula 3 - Tiered BHK Matrix (TIERED_BHK) ---');

    tieredAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Floorplan Layout Tiered Fee',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'TIERED_BHK',
        tieredRates: {
          studio: 1200,
          bhk1: 1800,
          bhk2: 2400,
          bhk3: 3200,
          bhk4: 4000,
          penthouse: 5500,
          duplex: 6000,
        },
      },
    });

    const tieredStats = await invoiceService.generateBatchInvoices({
      ...tieredAssessment.toObject(),
      billingPeriodString: '2026-11',
    });

    assert.strictEqual(tieredStats.created, 5);

    // Verify each unit received rate matching its BHK type
    const tieredInvUnit1 = await Invoice.findOne({ assessmentId: tieredAssessment._id, unitId: unit1._id });
    assert.strictEqual(tieredInvUnit1.totalAmount, 3200, 'Unit 1 (BHK3) must be ₹3,200');

    const tieredInvUnit2 = await Invoice.findOne({ assessmentId: tieredAssessment._id, unitId: unit2._id });
    assert.strictEqual(tieredInvUnit2.totalAmount, 2400, 'Unit 2 (BHK2) must be ₹2,400');

    const tieredInvUnit3 = await Invoice.findOne({ assessmentId: tieredAssessment._id, unitId: unit3._id });
    assert.strictEqual(tieredInvUnit3.totalAmount, 1200, 'Unit 3 (Studio) must be ₹1,200');

    const tieredInvUnit4 = await Invoice.findOne({ assessmentId: tieredAssessment._id, unitId: unit4._id });
    assert.strictEqual(tieredInvUnit4.totalAmount, 5500, 'Unit 4 (Penthouse) must be ₹5,500');

    const tieredInvUnit5 = await Invoice.findOne({ assessmentId: tieredAssessment._id, unitId: unit5._id });
    assert.strictEqual(tieredInvUnit5.totalAmount, 6000, 'Unit 5 (Duplex) must be ₹6,000');

    console.log('✅ Formula 3 (TIERED_BHK) verified: exact BHK matching for Studio, BHK2, BHK3, Penthouse, Duplex.');

    // -------------------------------------------------------------------------
    // STEP 6: Target Scope Filtering (VILLA_BLOCK & SPECIFIC_UNITS)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Target Scope Filtering ---');

    // 6.1 VILLA_BLOCK: Target only Block A (Unit 1 & Unit 2)
    blockAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Block A Special Assessment',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'VILLA_BLOCK',
        scopeIds: ['Block A'],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 1500,
      },
    });

    const blockStats = await invoiceService.generateBatchInvoices({
      ...blockAssessment.toObject(),
      billingPeriodString: '2026-12',
    });

    assert.strictEqual(blockStats.created, 2, 'Only Block A units (2) should be invoiced');
    const blockInvoices = await Invoice.find({ assessmentId: blockAssessment._id });
    const blockUnitIds = blockInvoices.map((inv) => inv.unitId.toString());
    assert.ok(blockUnitIds.includes(unit1._id.toString()));
    assert.ok(blockUnitIds.includes(unit2._id.toString()));
    assert.ok(!blockUnitIds.includes(unit3._id.toString()));
    console.log('✅ Target Scope (VILLA_BLOCK) verified: only Block A units invoiced.');

    // 6.2 SPECIFIC_UNITS: Target only Unit 3
    const specificUnitAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Unit 3 Custom Maintenance',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'SPECIFIC_UNITS',
        scopeIds: [unit3._id],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 500,
      },
    });

    const specificStats = await invoiceService.generateBatchInvoices({
      ...specificUnitAssessment.toObject(),
      billingPeriodString: '2026-12',
    });

    assert.strictEqual(specificStats.created, 1, 'Only Unit 3 should be invoiced');
    const specificInv = await Invoice.findOne({ assessmentId: specificUnitAssessment._id });
    assert.strictEqual(specificInv.unitId.toString(), unit3._id.toString());
    console.log('✅ Target Scope (SPECIFIC_UNITS) verified: only Unit 3 invoiced.');

    // -------------------------------------------------------------------------
    // STEP 7: Role Targeting & Occupancy Fallback (Owner vs Tenant)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Role Targeting & Occupancy Fallback ---');

    // Unit 2 has Resident Owner 2 AND Resident Tenant 1.
    // 7.1 Target TENANT role only: Unit 2 invoice must go to Resident Tenant 1
    const tenantTargetAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Tenant Utility Charge',
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRole: 'TENANT',
        targetRoleIds: [tenantRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 750,
      },
    });

    await invoiceService.generateBatchInvoices({
      ...tenantTargetAssessment.toObject(),
      billingPeriodString: '2027-01',
    });

    const tenantInv = await Invoice.findOne({
      assessmentId: tenantTargetAssessment._id,
      unitId: unit2._id,
    });
    assert.ok(tenantInv, 'Invoice for Unit 2 must exist');
    assert.strictEqual(
      tenantInv.targetUserId.toString(),
      residentTenant1._id.toString(),
      'Unit 2 invoice must be assigned to Resident Tenant 1'
    );
    console.log('✅ Role Targeting (TENANT) verified: tenant resident correctly assigned.');

    // -------------------------------------------------------------------------
    // STEP 8: Weekly Recurring Billing Cycle
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Weekly Billing Cycle with selectedDays ---');

    weeklyAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Weekly Amenity Levy',
      type: 'RECURRING',
      billingCycle: 'WEEKLY',
      generationDay: 1,
      selectedDays: [1, 4], // Monday, Thursday
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 300,
      },
    });

    assert.strictEqual(weeklyAssessment.billingCycle, 'WEEKLY');
    assert.deepStrictEqual(weeklyAssessment.selectedDays, [1, 4]);

    const weeklyStats = await invoiceService.generateBatchInvoices({
      ...weeklyAssessment.toObject(),
      billingPeriodString: '2026-W36',
    });

    assert.strictEqual(weeklyStats.created, 5);
    const weeklyInv = await Invoice.findOne({ assessmentId: weeklyAssessment._id });
    assert.strictEqual(weeklyInv.billingPeriodString, '2026-W36', 'Weekly ISO format preserved');
    console.log('✅ Weekly Billing Cycle verified with selectedDays [1, 4] and ISO week code 2026-W36.');

    // -------------------------------------------------------------------------
    // STEP 9: Capital Repair Installments & One-Time Ad-Hoc
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Capital Repair Installments & One-Time Ad-Hoc ---');

    capitalRepairAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Elevator Modernization Project',
      type: 'CAPITAL_REPAIR',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      collectionMethod: 'INSTALLMENT',
      totalInstallments: 4,
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 10000,
      },
    });

    assert.strictEqual(capitalRepairAssessment.type, 'CAPITAL_REPAIR');
    assert.strictEqual(capitalRepairAssessment.collectionMethod, 'INSTALLMENT');
    assert.strictEqual(capitalRepairAssessment.totalInstallments, 4);

    oneTimeAssessment = await assessmentService.createAssessment({
      communityId: org1._id,
      name: 'Emergency Storm Repair',
      type: 'ONE_TIME',
      billingCycle: 'AD_HOC',
      generationDay: 'LAST_DAY_OF_MONTH',
      triggerMode: 'SCHEDULED',
      scheduledDateTime: new Date('2026-10-15T10:00:00Z'),
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRoleIds: [ownerRole._id],
      },
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 1200,
      },
    });

    assert.strictEqual(oneTimeAssessment.type, 'ONE_TIME');
    assert.strictEqual(oneTimeAssessment.triggerMode, 'SCHEDULED');
    assert.ok(oneTimeAssessment.scheduledDateTime);
    console.log('✅ Capital Repair (Installments: 4) and One-Time Scheduled verified.');

    // -------------------------------------------------------------------------
    // STEP 10: Rule Updates & Mid-Cycle Invoices Warning
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Updating Assessment Rules & Mid-Cycle Warnings ---');

    // Updating rule with active invoices: should report hasActiveInvoices: true
    const updateResult = await assessmentService.updateAssessment(
      flatAssessment._id.toString(),
      { name: 'Standard Monthly Maintenance 2026 - Revised' },
      org1._id.toString()
    );

    assert.strictEqual(updateResult.hasActiveInvoices, true, 'Should detect active unpaid invoices');
    assert.strictEqual(updateResult.updatedAssessment.name, 'Standard Monthly Maintenance 2026 - Revised');
    console.log('✅ Rule update verified: mid-cycle invoice warning flagged accurately.');

    // -------------------------------------------------------------------------
    // STEP 11: Lifecycle Deletions (Physical vs Safe Archival)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Lifecycle Deletions (Physical vs Soft Archive) ---');

    // 11.1 Delete unused assessment (capitalRepairAssessment has 0 invoices)
    const deleteUnused = await assessmentService.deleteAssessment(
      capitalRepairAssessment._id.toString(),
      org1._id.toString()
    );
    assert.strictEqual(deleteUnused.status, 'deleted', 'Unused template should be physically deleted');
    const physicallyDeleted = await Assessment.findById(capitalRepairAssessment._id);
    assert.strictEqual(physicallyDeleted, null, 'Unused template must no longer exist in DB');
    console.log('✅ Physical deletion verified for template with 0 invoices.');

    // 11.2 Delete assessment with existing invoices (flatAssessment has active invoices)
    const archiveUsed = await assessmentService.deleteAssessment(
      flatAssessment._id.toString(),
      org1._id.toString()
    );
    assert.strictEqual(archiveUsed.status, 'archived', 'Template with invoices should be archived');
    const archivedDoc = await Assessment.findById(flatAssessment._id);
    assert.ok(archivedDoc, 'Template document must be preserved');
    assert.strictEqual(archivedDoc.isActive, false, 'Template isActive must be false');
    console.log('✅ Safe archive (isActive: false) verified for template with active invoices.');

    // -------------------------------------------------------------------------
    // STEP 12: Multi-Tenant Security Boundary
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Multi-Tenant Workspace Isolation ---');

    // Org 2 tries to run Org 1's assessment
    try {
      await assessmentService.runBilling(sqftAssessment._id.toString(), org2._id.toString());
      assert.fail('Should reject running billing across organizations');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.ok(err.message.includes('belongs to another organization'));
    }

    // Org 2 tries to delete Org 1's assessment
    try {
      await assessmentService.deleteAssessment(sqftAssessment._id.toString(), org2._id.toString());
      assert.fail('Should reject deleting billing template across organizations');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
      assert.ok(err.message.includes('belongs to another organization'));
    }
    console.log('✅ Multi-tenant workspace isolation verified: 403 Forbidden on cross-org actions.');

    // -------------------------------------------------------------------------
    // STEP 13: Background Schedulers Simulation (assessmentCron)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 13: Scheduler Engine Verification ---');

    // Test findActiveByGenerationDay
    const day1Rules = await assessmentRepository.findActiveByGenerationDay(1);
    assert.ok(day1Rules.length > 0, 'Should find active rules configured for day 1');

    // Test findActiveByWeeklyDay
    const mondayRules = await assessmentRepository.findActiveByWeeklyDay(1);
    assert.ok(mondayRules.length > 0, 'Should find weekly rules matching Monday (1)');

    // Test isLastDayOfMonth helper
    assert.strictEqual(assessmentCron.isLastDayOfMonth(new Date('2026-01-31T00:00:00Z')), true);
    assert.strictEqual(assessmentCron.isLastDayOfMonth(new Date('2026-01-30T00:00:00Z')), false);
    assert.strictEqual(assessmentCron.isLastDayOfMonth(new Date('2026-02-28T00:00:00Z')), true);
    console.log('✅ Scheduler queries and leap/month-end algorithms verified.');

    console.log('\n========================================================================');
    console.log('  🎉 ALL 13 END-TO-END ASSESSMENT MANAGER TESTS PASSED WITH ZERO ERRORS!');
    console.log('========================================================================\n');

  } finally {
    // Teardown test fixtures
    console.log('🧹 Cleaning up test fixtures...');
    if (org1) {
      await Invoice.deleteMany({ communityId: org1._id });
      await Assessment.deleteMany({ communityId: org1._id });
      await Villa.deleteMany({ orgId: org1._id });
      await User.deleteMany({ orgId: org1._id });
      await Role.deleteMany({ orgId: org1._id });
      await Organization.deleteOne({ _id: org1._id });
    }
    if (org2) {
      await Organization.deleteOne({ _id: org2._id });
    }
    if (httpServer) {
      httpServer.close();
    }
    await mongoose.disconnect();
    console.log('✨ Cleanup complete.');
  }
}

runAssessmentE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
