/**
 * Phase 4B.1 Critical API & Controller Tenant-Isolation Remediation Test Suite
 *
 * Verifies:
 * A. Financial Reconciliation:
 *    - Route-level security: isAuthenticated, tenantContext, and authorizePermission
 *    - Fail-closed on missing tenant context
 *    - Cross-tenant exception update rejection (404) & zero DB mutation
 *    - Cross-tenant migration run report retrieval rejection (404)
 *    - Mandatory organization scope on historicalReconciliationService methods
 *
 * B. Invoice Offline Settlement:
 *    - Fail-closed on missing tenant context
 *    - Cross-tenant invoice settlement rejection (404)
 *    - Zero DB mutation (invoice remains UNPAID, zero Payment records created)
 *    - Legitimate same-tenant offline settlement succeeds
 *
 * C. Manual Invoice Generation:
 *    - Fail-closed on missing tenant context
 *    - Non-privileged resident role blocked (403)
 *    - Cross-tenant assessment template ID rejected (404) & zero invoices created
 *    - Poisoned payload (client-supplied communityId/orgId) safely stripped & overridden
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { signToken } from '../src/utils/jwt.utils.js';

import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import User from '../src/features/user/user.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import Payment from '../src/features/payment/payment.model.js';
import { Assessment } from '../src/features/assessment/assessment.model.js';
import { ReconciliationException } from '../src/features/ledger/reconciliation/models/reconciliationException.model.js';
import { HistoricalMigrationRun } from '../src/features/ledger/reconciliation/models/historicalMigrationRun.model.js';

import invoiceController from '../src/features/invoice/invoice.controller.js';
import invoiceService from '../src/features/invoice/invoice.services.js';
import historicalReconciliationService from '../src/features/ledger/reconciliation/historicalReconciliation.service.js';
import reconciliationReportService from '../src/features/ledger/reconciliation/reconciliationReport.service.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Phase 4B.1: Critical Tenant-Isolation Remediation Integration', () => {
  let server;
  let baseUrl;
  let orgA;
  let orgB;
  let adminUserA;
  let adminUserB;
  let residentUserA;
  let residentUserB;
  let adminTokenA;
  let adminTokenB;
  let residentTokenA;
  let residentTokenB;

  let invoiceOrgA;
  let assessmentOrgA;
  let exceptionOrgA;
  let runOrgA;

  before(async () => {
    await connectToDb();

    // Start HTTP server on random ephemeral port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Create test organizations
    orgA = await Organization.create({
      name: `Tenant Org Alpha ${suffix}`,
      code: `TOA_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users'],
    });

    orgB = await Organization.create({
      name: `Tenant Org Beta ${suffix}`,
      code: `TOB_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users'],
    });

    // Create test users
    adminUserA = await User.create({
      name: `Admin A ${suffix}`,
      username: `admin_a_${suffix}`,
      email: `admin.a.${suffix}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      orgId: orgA._id,
      status: 'Active',
    });

    adminUserB = await User.create({
      name: `Admin B ${suffix}`,
      username: `admin_b_${suffix}`,
      email: `admin.b.${suffix}@example.com`,
      password: 'Password123!',
      role: 'Community Admin',
      orgId: orgB._id,
      status: 'Active',
    });

    residentUserA = await createTestUser(`resident_a_${suffix}`, orgA._id, 'Resident');
    residentUserB = await createTestUser(`resident_b_${suffix}`, orgB._id, 'Resident');

    // Create memberships
    await OrgMembership.create({ userId: adminUserA._id, orgId: orgA._id, status: 'Active' });
    await OrgMembership.create({ userId: adminUserB._id, orgId: orgB._id, status: 'Active' });
    await OrgMembership.create({ userId: residentUserA._id, orgId: orgA._id, status: 'Active' });
    await OrgMembership.create({ userId: residentUserB._id, orgId: orgB._id, status: 'Active' });

    // JWT tokens
    adminTokenA = signToken({ id: adminUserA._id, role: 'Community Admin', isPlatform: false, orgId: orgA._id.toString() });
    adminTokenB = signToken({ id: adminUserB._id, role: 'Community Admin', isPlatform: false, orgId: orgB._id.toString() });
    residentTokenA = signToken({ id: residentUserA._id, role: 'Resident', isPlatform: false, orgId: orgA._id.toString() });
    residentTokenB = signToken({ id: residentUserB._id, role: 'Resident', isPlatform: false, orgId: orgB._id.toString() });

    // Seed test invoice for Org A
    invoiceOrgA = await Invoice.create({
      invoiceNumber: `INV-4B1-${suffix}`,
      communityId: orgA._id,
      orgId: orgA._id,
      assessmentId: new mongoose.Types.ObjectId(),
      targetUserId: residentUserA._id,
      unitId: new mongoose.Types.ObjectId(),
      billingPeriodString: '2026-06',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentCharge: 4500,
      totalAmount: 4500,
      totalDue: 4500,
      paidAmount: 0,
      outstandingAmount: 4500,
      status: 'UNPAID',
    });

    // Seed test assessment template for Org A
    assessmentOrgA = await Assessment.create({
      communityId: orgA._id,
      name: `Quarterly Maintenance ${suffix}`,
      type: 'RECURRING',
      billingCycle: 'QUARTERLY',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY' },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 3000 },
      isActive: true,
    });

    // Seed reconciliation exception for Org A
    exceptionOrgA = await ReconciliationException.create({
      orgId: orgA._id,
      sourceType: 'Invoice',
      sourceId: invoiceOrgA._id,
      domain: 'INVOICE',
      classification: 'UNMATCHED',
      reason: 'Missing payment record for legacy invoice',
      status: 'OPEN',
    });

    // Seed historical migration run for Org A
    runOrgA = await HistoricalMigrationRun.create({
      runId: `RUN-4B1-${suffix}`,
      orgId: orgA._id,
      mode: 'DRY_RUN',
      status: 'COMPLETED',
      summary: { totalProcessed: 1, unmatchedCount: 1 },
    });
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      }
      if (orgA && orgB) {
        const orgIds = [orgA._id, orgB._id];
        await Payment.deleteMany({ orgId: { $in: orgIds } });
        await Invoice.deleteMany({ orgId: { $in: orgIds } });
        await Assessment.deleteMany({ communityId: { $in: orgIds } });
        await ReconciliationException.deleteMany({ orgId: { $in: orgIds } });
        await HistoricalMigrationRun.deleteMany({ orgId: { $in: orgIds } });
        await OrgMembership.deleteMany({ orgId: { $in: orgIds } });
        await User.deleteMany({ orgId: { $in: orgIds } });
        await Organization.deleteMany({ _id: { $in: orgIds } });
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error('Teardown error:', err);
    }
  });

  async function createTestUser(username, orgId, role) {
    return await User.create({
      name: username,
      username,
      email: `${username}@test.com`,
      password: 'Password123!',
      role,
      userRole: role.toLowerCase(),
      orgId,
      status: 'Active',
    });
  }

  // ==========================================================================
  // SECTION A: Financial Reconciliation Tenant Isolation
  // ==========================================================================

  test('A.1: Unauthenticated request to reconciliation routes is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/inventory`);
    assert.strictEqual(res.status, 401);
  });

  test('A.2: Ordinary Resident role is blocked from reconciliation operations (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/inventory`, {
      headers: {
        'Authorization': `Bearer ${residentTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    assert.strictEqual(res.status, 403);
  });

  test('A.3: Reconciliation routes reject missing workspace context (400 Bad Request)', async () => {
    const tokenWithoutOrg = signToken({ id: adminUserA._id, role: 'Community Admin', isPlatform: false });
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/inventory`, {
      headers: {
        'Authorization': `Bearer ${tokenWithoutOrg}`,
      },
    });
    assert.strictEqual(res.status, 400);
  });

  test('A.4: Admin with valid tenant context can access reconciliation inventory (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/inventory`, {
      headers: {
        'Authorization': `Bearer ${adminTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.tenants));
    // Verify only Org A data is returned, not Org B
    assert.strictEqual(body.data.tenants.length, 1);
    assert.strictEqual(body.data.tenants[0].orgId, orgA._id.toString());
  });

  test('A.5: Cross-tenant exception update is rejected with 404 & causes zero mutation', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/exceptions/${exceptionOrgA._id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminTokenB}`,
        'X-Organization-Id': orgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'RESOLVED', resolutionNotes: 'Illegitimately resolved by Tenant B' }),
    });

    assert.strictEqual(res.status, 404);

    // Verify database immutability: exception remains OPEN and notes empty
    const freshException = await ReconciliationException.findById(exceptionOrgA._id);
    assert.strictEqual(freshException.status, 'OPEN');
    assert.strictEqual(freshException.resolutionNotes, '');
  });

  test('A.6: Authorized same-tenant exception update succeeds (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/exceptions/${exceptionOrgA._id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'REVIEWED', resolutionNotes: 'Reviewed by Tenant A Admin' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const freshException = await ReconciliationException.findById(exceptionOrgA._id);
    assert.strictEqual(freshException.status, 'REVIEWED');
    assert.strictEqual(freshException.resolutionNotes, 'Reviewed by Tenant A Admin');
  });

  test('A.7: Cross-tenant run report retrieval is rejected with 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/reports/${runOrgA.runId}`, {
      headers: {
        'Authorization': `Bearer ${adminTokenB}`,
        'X-Organization-Id': orgB._id.toString(),
      },
    });
    assert.strictEqual(res.status, 404);
  });

  test('A.8: Authorized same-tenant run report retrieval succeeds (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/reports/${runOrgA.runId}`, {
      headers: {
        'Authorization': `Bearer ${adminTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.run.runId, runOrgA.runId);
  });

  test('A.9: Reconciliation service methods fail closed when orgId is omitted', async () => {
    // 1. reconcile without orgId
    await assert.rejects(
      async () => {
        await historicalReconciliationService.reconcile({ orgId: null });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Organization context is required/i);
        return true;
      }
    );

    // 2. getExceptions without orgId
    await assert.rejects(
      async () => {
        await historicalReconciliationService.getExceptions({ orgId: null });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // 3. updateException without orgId
    await assert.rejects(
      async () => {
        await historicalReconciliationService.updateException(exceptionOrgA._id, { status: 'RESOLVED', orgId: null });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // 4. getRunReport without orgId
    await assert.rejects(
      async () => {
        await reconciliationReportService.getRunReport(runOrgA.runId, null);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  test('A.10: Forged orgId and communityId in exception update request body are ignored for non-platform admin', async () => {
    // Admin B sends X-Organization-Id: Org B, but tries to forge orgId: Org A and communityId: Org A in body/query
    const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/exceptions/${exceptionOrgA._id}?orgId=${orgA._id}&communityId=${orgA._id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminTokenB}`,
        'X-Organization-Id': orgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgId: orgA._id.toString(),
        communityId: orgA._id.toString(),
        status: 'IGNORED',
        resolutionNotes: 'Forged tenant body bypass attempt',
      }),
    });

    assert.strictEqual(res.status, 404);
    const freshException = await ReconciliationException.findById(exceptionOrgA._id);
    assert.strictEqual(freshException.status, 'REVIEWED');
    assert.strictEqual(freshException.resolutionNotes, 'Reviewed by Tenant A Admin');
  });

  test('A.11: Explicitly authorized Platform Super Admin can access reconciliation run report for target org', async () => {
    const platformAdmin = await User.create({
      name: `plat_admin_4b1_${Date.now()}`,
      username: `plat_admin_4b1_${Date.now()}`,
      email: `plat_admin_4b1_${Date.now()}@platform.com`,
      password: 'Password123!',
      role: 'Super Admin',
      userRole: 'super admin',
      isPlatform: true,
      orgId: orgA._id,
      status: 'Active',
      emailVerified: true,
    });
    const platformToken = signToken({
      id: platformAdmin._id,
      _id: platformAdmin._id,
      role: 'Super Admin',
      isPlatform: true,
    });

    try {
      const reportRes = await fetch(
        `${baseUrl}/api/v1/ledger/reconciliation/reports/${runOrgA.runId}?orgId=${orgA._id.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${platformToken}`,
            'X-Organization-Id': orgA._id.toString(),
          },
        }
      );
      assert.strictEqual(reportRes.status, 200);
      const reportBody = await reportRes.json();
      assert.strictEqual(reportBody.success, true);
      assert.strictEqual(reportBody.data.run.runId, runOrgA.runId);
    } finally {
      await User.deleteOne({ _id: platformAdmin._id });
    }
  });

  // ==========================================================================
  // SECTION B: Invoice Offline Settlement Tenant Isolation
  // ==========================================================================

  test('B.1: Offline settlement controller fails closed when tenant context is missing', async () => {
    const fakeReq = {
      params: { id: invoiceOrgA._id.toString() },
      body: { paymentReference: 'UTR-TEST-123', amount: 4500 },
      tenant: null,
    };
    let capturedError = null;
    const next = (err) => { capturedError = err; };

    await invoiceController.settleOffline(fakeReq, {}, next);
    assert.ok(capturedError instanceof HttpError);
    assert.strictEqual(capturedError.statusCode, 400);
    assert.strictEqual(capturedError.message, 'Workspace context is required.');
  });

  test('B.2: Non-privileged resident role is forbidden from settling offline (403)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgA._id}/settle-offline`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${residentTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentReference: `UTR-RES-${Date.now()}`,
        amountPaid: 4500,
        paymentMethod: 'BANK_TRANSFER',
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  test('B.3: Cross-tenant offline settlement is rejected with 404 & causes zero DB mutation or payment records', async () => {
    const paymentsBefore = await Payment.countDocuments({ invoiceId: invoiceOrgA._id });

    // Admin of Org B attempts to submit offline payment for Org A's invoice
    const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgA._id}/settle-offline`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminTokenB}`,
        'X-Organization-Id': orgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentReference: `UTR-CROSS-${Date.now()}`,
        amountPaid: 4500,
        paymentMethod: 'BANK_TRANSFER',
      }),
    });

    assert.strictEqual(res.status, 404);

    // 1. Verify invoice was NOT updated to VERIFICATION_PENDING
    const freshInvoice = await Invoice.findById(invoiceOrgA._id);
    assert.strictEqual(freshInvoice.status, 'UNPAID');
    assert.strictEqual(freshInvoice.offlineReference, null);

    // 2. Verify NO Payment document was created
    const paymentsAfter = await Payment.countDocuments({ invoiceId: invoiceOrgA._id });
    assert.strictEqual(paymentsAfter, paymentsBefore, 'Zero payment records must be created on cross-tenant rejection');
  });

  test('B.4: Authorized same-tenant offline settlement succeeds (200 OK)', async () => {
    const utrRef = `UTR-LEGIT-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgA._id}/settle-offline`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentReference: utrRef,
        amountPaid: 4500,
        paymentMethod: 'BANK_TRANSFER',
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Verify invoice transitioned to VERIFICATION_PENDING
    const freshInvoice = await Invoice.findById(invoiceOrgA._id);
    assert.strictEqual(freshInvoice.status, 'VERIFICATION_PENDING');
    assert.strictEqual(freshInvoice.offlineReference, utrRef);

    // Verify pending Payment record was created
    const payment = await Payment.findOne({ invoiceId: invoiceOrgA._id, paymentReference: utrRef });
    assert.ok(payment);
    assert.strictEqual(payment.status, 'VERIFICATION_PENDING');
    assert.strictEqual(payment.orgId.toString(), orgA._id.toString());
  });

  // ==========================================================================
  // SECTION C: Manual Invoice Generation Tenant Isolation
  // ==========================================================================

  test('C.1: Manual invoice generation controller fails closed when tenant context is missing', async () => {
    const fakeReq = {
      body: { assessmentId: assessmentOrgA._id.toString() },
      tenant: null,
    };
    let capturedError = null;
    const next = (err) => { capturedError = err; };

    await invoiceController.triggerManual(fakeReq, {}, next);
    assert.ok(capturedError instanceof HttpError);
    assert.strictEqual(capturedError.statusCode, 400);
  });

  test('C.2: Non-privileged resident role is forbidden from triggering manual invoice generation (403)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/invoices/trigger-manual`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${residentTokenA}`,
        'X-Organization-Id': orgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assessmentId: assessmentOrgA._id.toString() }),
    });

    assert.strictEqual(res.status, 403);
  });

  test('C.3: Cross-tenant assessment template ID is rejected with 404 & zero invoices generated', async () => {
    const invoicesBeforeA = await Invoice.countDocuments({ communityId: orgA._id });
    const invoicesBeforeB = await Invoice.countDocuments({ communityId: orgB._id });

    // Org B Admin attempts to trigger billing using Org A's assessment template ID
    const res = await fetch(`${baseUrl}/api/v1/invoices/trigger-manual`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminTokenB}`,
        'X-Organization-Id': orgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assessmentId: assessmentOrgA._id.toString(),
        billingPeriodString: '2026-07',
      }),
    });

    assert.strictEqual(res.status, 404);

    // Verify zero invoices created for either tenant
    const invoicesAfterA = await Invoice.countDocuments({ communityId: orgA._id });
    const invoicesAfterB = await Invoice.countDocuments({ communityId: orgB._id });
    assert.strictEqual(invoicesAfterA, invoicesBeforeA);
    assert.strictEqual(invoicesAfterB, invoicesBeforeB);
  });

  test('C.4: Client-supplied poisoned communityId in payload is overridden by trusted tenant context', async () => {
    // Calling service directly with trusted orgA, but body payload carries malicious communityId pointing to orgB
    const poisonedPayload = {
      assessmentId: assessmentOrgA._id.toString(),
      communityId: orgB._id.toString(), // Attacker trying to redirect billing output
      orgId: orgB._id.toString(),
    };

    try {
      await invoiceService.triggerManualBilling(poisonedPayload, orgA._id.toString());
    } catch (e) {
      // If generateBatchInvoices fails because no units exist in orgA, it's expected
    }

    // Verify zero invoices were generated for orgB
    const invoicesInB = await Invoice.countDocuments({ communityId: orgB._id });
    assert.strictEqual(invoicesInB, 0, 'No invoices should ever be generated for Tenant B');
  });
});
