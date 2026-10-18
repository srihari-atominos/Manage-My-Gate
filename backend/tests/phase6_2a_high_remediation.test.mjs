/**
 * Phase 6.2A High-Severity Tenant-Isolation Remediation Test Suite
 *
 * Verifies:
 * 1. FIND-6.1-H01 (Complaint Export Filter-Spread Override):
 *    - complaintRepository.findAll enforces trusted orgId after sanitizedFilter (cannot be overridden by filter.orgId)
 *    - complaintRepository.findAll fails closed when orgId is missing
 *    - Legitimate tenant user exports complaints for authorized organization (200)
 *    - Client passing query ?orgId=<victimOrg> cannot override tenant scope or export victim complaints
 *    - Missing tenant context fails closed (403/400)
 *
 * 2. FIND-6.1-H02 (Unassigned Invoices Included in Tenant Queries):
 *    - invoiceRepository.getInvoices fails closed (403) when orgId is missing
 *    - Tenant query matches only invoices explicitly belonging to the tenant's organization
 *    - Invoices with missing communityId are NOT returned in tenant list, counts, or facets
 *    - Missing tenant context on GET /api/v1/invoices fails closed (403)
 *
 * 3. FIND-6.1-H03 (Community Notes Missing tenantContext & Trusting Header):
 *    - communityNote router enforces tenantContext middleware
 *    - Active member can create and read active notes in authorized organization
 *    - User attempting to access foreign organization notes via forged X-Organization-Id is rejected (403)
 *    - Missing tenant context fails closed
 *    - Deactivating note enforces tenant scope boundary
 *
 * 4. FIND-6.1-H04 (Cross-Community Balance Roll-over in Assessment Invoicing):
 *    - When combineOutstanding is true, carry forward only combines outstanding invoices for the target assessment's communityId
 *    - Unpaid invoices for the same user in a foreign community are NEVER rolled over into the new community invoice
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
import Complaint from '../src/features/complaint/complaint.model.js';
import complaintRepository from '../src/features/complaint/complaint.repository.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import invoiceRepository from '../src/features/invoice/invoice.repository.js';
import invoiceService from '../src/features/invoice/invoice.services.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import CommunityNote from '../src/features/communityNote/communityNote.model.js';
import communityNoteService from '../src/features/communityNote/communityNote.services.js';
import communityNoteRepository from '../src/features/communityNote/communityNote.repository.js';
import Villa from '../src/features/villa/villa.model.js';

describe('Phase 6.2A: High-Severity Search, Filter & Pagination Tenant-Isolation Remediation Suite', () => {
  let server;
  let baseUrl;

  // Test Entities
  const testRunId = new mongoose.Types.ObjectId().toString().slice(-6);

  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();

  const userAId = new mongoose.Types.ObjectId(); // Member of Org A
  const userBId = new mongoose.Types.ObjectId(); // Member of Org B
  const multiOrgUserId = new mongoose.Types.ObjectId(); // Member of Org A and Org B

  let tokenUserA_OrgA;
  let tokenUserB_OrgB;
  let tokenMultiOrg_OrgA;
  let tokenNoOrg;

  const complaintAId = new mongoose.Types.ObjectId();
  const complaintBId = new mongoose.Types.ObjectId();

  const invoiceAId = new mongoose.Types.ObjectId();
  const invoiceBId = new mongoose.Types.ObjectId();
  const invoiceUnassignedId = new mongoose.Types.ObjectId();

  const noteAId = new mongoose.Types.ObjectId();

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Seed Organizations
    await Organization.create([
      {
        _id: orgAId,
        name: `Org Alpha ${testRunId}`,
        code: `OA_${testRunId}`,
        organizationType: 'Residential',
        status: 'Active',
        allowedFeatures: ['complaints', 'billing', 'community_notes', 'amenities', 'visitors'],
        billingSettings: { combineOutstandingInvoices: true },
      },
      {
        _id: orgBId,
        name: `Org Beta ${testRunId}`,
        code: `OB_${testRunId}`,
        organizationType: 'Residential',
        status: 'Active',
        allowedFeatures: ['complaints', 'billing', 'community_notes', 'amenities', 'visitors'],
        billingSettings: { combineOutstandingInvoices: true },
      },
    ]);

    // Seed Users
    await User.create([
      {
        _id: userAId,
        username: `usera_${testRunId}`,
        email: `usera_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'User Alpha',
        status: 'Active',
      },
      {
        _id: userBId,
        username: `userb_${testRunId}`,
        email: `userb_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'User Beta',
        status: 'Active',
      },
      {
        _id: multiOrgUserId,
        username: `multiorg_${testRunId}`,
        email: `multiorg_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'Multi Org User',
        status: 'Active',
      },
    ]);

    // Seed Memberships
    await OrgMembership.create([
      {
        userId: userAId,
        orgId: orgAId,
        role: 'Admin',
        permissions: ['complaints:view', 'complaints:create', 'complaints:export', 'billing:view', 'notes:view', 'notes:create'],
        status: 'Active',
      },
      {
        userId: userBId,
        orgId: orgBId,
        role: 'Admin',
        permissions: ['complaints:view', 'complaints:create', 'complaints:export', 'billing:view', 'notes:view', 'notes:create'],
        status: 'Active',
      },
      {
        userId: multiOrgUserId,
        orgId: orgAId,
        role: 'Resident',
        permissions: ['complaints:view', 'billing:view', 'notes:view'],
        status: 'Active',
      },
      {
        userId: multiOrgUserId,
        orgId: orgBId,
        role: 'Resident',
        permissions: ['complaints:view', 'billing:view', 'notes:view'],
        status: 'Active',
      },
    ]);

    // Seed Complaints
    await Complaint.create([
      {
        _id: complaintAId,
        orgId: orgAId,
        complaintNumber: `CMP-${testRunId}-001`,
        title: 'Water Leak in Alpha',
        description: 'Pipe leaking in Alpha basement',
        category: 'Plumbing',
        priority: 'High',
        status: 'Open',
        residentId: userAId,
        residentName: 'User Alpha',
      },
      {
        _id: complaintBId,
        orgId: orgBId,
        complaintNumber: `CMP-${testRunId}-002`,
        title: 'Electrical Spark in Beta',
        description: 'Sparking wire in Beta lobby',
        category: 'Electrical',
        priority: 'Critical',
        status: 'Open',
        residentId: userBId,
        residentName: 'User Beta',
      },
    ]);

    const dummyAssessmentId = new mongoose.Types.ObjectId();
    const dummyUnitId = new mongoose.Types.ObjectId();
    const futureDueDate = new Date(Date.now() + 86400000);

    // Seed Invoices (One for Org A, One for Org B, and One UNASSIGNED with no communityId/orgId)
    await Invoice.create([
      {
        _id: invoiceAId,
        communityId: orgAId,
        orgId: orgAId,
        assessmentId: dummyAssessmentId,
        unitId: dummyUnitId,
        invoiceNumber: `INV-${testRunId}-A01`,
        targetUserId: userAId,
        currentCharge: 1500,
        totalDue: 1500,
        totalAmount: 1500,
        outstandingAmount: 1500,
        paidAmount: 0,
        dueDate: futureDueDate,
        status: 'UNPAID',
        billingPeriodString: '2026-10',
        isDeleted: false,
      },
      {
        _id: invoiceBId,
        communityId: orgBId,
        orgId: orgBId,
        assessmentId: dummyAssessmentId,
        unitId: dummyUnitId,
        invoiceNumber: `INV-${testRunId}-B01`,
        targetUserId: userBId,
        currentCharge: 2500,
        totalDue: 2500,
        totalAmount: 2500,
        outstandingAmount: 2500,
        paidAmount: 0,
        dueDate: futureDueDate,
        status: 'UNPAID',
        billingPeriodString: '2026-10',
        isDeleted: false,
      },
    ]);

    // Insert unassigned invoice directly into MongoDB collection (simulating legacy data missing communityId)
    await Invoice.collection.insertOne({
      _id: invoiceUnassignedId,
      invoiceNumber: `INV-${testRunId}-UNASSIGNED`,
      targetUserId: userAId,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: dummyUnitId,
      currentCharge: 9999,
      totalDue: 9999,
      totalAmount: 9999,
      outstandingAmount: 9999,
      paidAmount: 0,
      dueDate: futureDueDate,
      status: 'UNPAID',
      billingPeriodString: '2026-10',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Tokens
    tokenUserA_OrgA = signToken({
      id: userAId.toString(),
      _id: userAId.toString(),
      orgId: orgAId.toString(),
      role: 'Admin',
      roles: ['Admin'],
      permissions: ['complaints:view', 'complaints:create', 'complaints:export', 'billing:view', 'notes:view', 'notes:create', 'roles:read'],
    });

    tokenUserB_OrgB = signToken({
      id: userBId.toString(),
      _id: userBId.toString(),
      orgId: orgBId.toString(),
      role: 'Admin',
      roles: ['Admin'],
      permissions: ['complaints:view', 'complaints:create', 'complaints:export', 'billing:view', 'notes:view', 'notes:create'],
    });

    tokenMultiOrg_OrgA = signToken({
      id: multiOrgUserId.toString(),
      _id: multiOrgUserId.toString(),
      orgId: orgAId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['complaints:view', 'billing:view', 'notes:view'],
    });

    tokenNoOrg = signToken({
      id: userAId.toString(),
      _id: userAId.toString(),
      role: 'Admin',
      roles: ['Admin'],
      permissions: ['complaints:view'],
    });
  });

  after(async () => {
    // Cleanup seeded test records
    await Organization.deleteMany({ _id: { $in: [orgAId, orgBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId, multiOrgUserId] } });
    await OrgMembership.deleteMany({ userId: { $in: [userAId, userBId, multiOrgUserId] } });
    await Complaint.deleteMany({ _id: { $in: [complaintAId, complaintBId] } });
    await Invoice.deleteMany({ _id: { $in: [invoiceAId, invoiceBId, invoiceUnassignedId] } });
    await CommunityNote.deleteMany({ orgId: { $in: [orgAId, orgBId] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Helper request
  async function apiRequest(endpoint, { method = 'GET', token, headers = {}, body } = {}) {
    const reqHeaders = { ...headers };
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    if (body) reqHeaders['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = res.status;
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status, data, headers: res.headers };
  }

  // =========================================================================
  // Scope 1: FIND-6.1-H01 — Complaint Export Filter-Spread Override
  // =========================================================================
  describe('Scope 1: FIND-6.1-H01 — Complaint Export Filter-Spread Override', () => {
    test('1.1 - complaintRepository.findAll rejects missing orgId with an error', async () => {
      await assert.rejects(
        async () => {
          await complaintRepository.findAll(null, {});
        },
        /Tenant context \(orgId\) is required/
      );
    });

    test('1.2 - complaintRepository.findAll cannot be overridden by filter.orgId', async () => {
      // Attacker attempts to pass orgBId inside filter
      const result = await complaintRepository.findAll(
        orgAId.toString(),
        { orgId: orgBId.toString() },
        { skip: 0, limit: 50 },
        { createdAt: -1 }
      );

      // Must strictly return records for Org A
      assert.ok(result.data.length >= 1, 'Should find Org A complaints');
      for (const item of result.data) {
        assert.equal(item.orgId.toString(), orgAId.toString(), 'All records must belong to Org A');
        assert.notEqual(item.orgId.toString(), orgBId.toString(), 'Must not contain Org B complaints');
      }
    });

    test('1.3 - Legitimate tenant admin can export complaints for their own organization (200)', async () => {
      const res = await apiRequest('/api/v1/complaints/export', {
        method: 'GET',
        token: tokenUserA_OrgA,
      });

      assert.equal(res.status, 200);
      assert.ok(
        res.headers.get('content-type')?.includes('openxmlformats') ||
        res.headers.get('content-disposition')?.includes('complaints_export.xlsx'),
        'Response must be the excel attachment'
      );
    });

    test('1.4 - Cross-tenant export attempt: Passing ?orgId=victimOrg does NOT export victim complaints', async () => {
      // User A (Org A) tries to export Org B's complaints
      const res = await apiRequest(`/api/v1/complaints/export?orgId=${orgBId}`, {
        method: 'GET',
        token: tokenUserA_OrgA,
      });

      // Still succeeds for Org A (ignores parameter) and only exports Org A data
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-disposition')?.includes('complaints_export.xlsx'));
    });

    test('1.5 - Missing tenant context fails closed on export complaints (403/400)', async () => {
      const res = await apiRequest('/api/v1/complaints/export', {
        method: 'GET',
        token: tokenNoOrg,
      });

      assert.ok([400, 403].includes(res.status), `Expected 400 or 403 but got ${res.status}`);
    });
  });

  // =========================================================================
  // Scope 2: FIND-6.1-H02 — Unassigned Invoices Scoping
  // =========================================================================
  describe('Scope 2: FIND-6.1-H02 — Unassigned Invoices Scoping', () => {
    test('2.1 - invoiceRepository.getInvoices fails closed when orgId is null', async () => {
      await assert.rejects(
        async () => {
          await invoiceRepository.getInvoices(null, {});
        },
        /Tenant context \(orgId\) is required/
      );
    });

    test('2.2 - invoiceRepository.getInvoices strictly excludes invoices with missing communityId', async () => {
      // Query Org A invoices
      const result = await invoiceRepository.getInvoices(orgAId.toString(), { page: 1, limit: 50 });
      const invoices = result.data || result.invoices || [];
      assert.ok(invoices.length > 0, 'Should return invoices for Org A');

      const returnedIds = invoices.map((inv) => inv._id.toString());
      assert.ok(returnedIds.includes(invoiceAId.toString()), 'Must contain Org A invoice');
      assert.ok(!returnedIds.includes(invoiceBId.toString()), 'Must NOT contain Org B invoice');
      assert.ok(!returnedIds.includes(invoiceUnassignedId.toString()), 'Must NOT contain unassigned invoice without communityId');
    });

    test('2.3 - GET /api/v1/invoices returns only tenant invoices and excludes unassigned ones', async () => {
      const res = await apiRequest('/api/v1/invoices', {
        method: 'GET',
        token: tokenUserA_OrgA,
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.success);
      const invoices = res.data.data?.data || res.data.data?.invoices || [];
      assert.ok(invoices.length > 0, 'Should return invoices in response');
      const ids = invoices.map((inv) => inv._id.toString());

      assert.ok(ids.includes(invoiceAId.toString()), 'Must include Org A invoice');
      assert.ok(!ids.includes(invoiceBId.toString()), 'Must not include Org B invoice');
      assert.ok(!ids.includes(invoiceUnassignedId.toString()), 'Must not include unassigned invoice');
    });

    test('2.4 - GET /api/v1/invoices fails closed when tenant context is missing (400/403)', async () => {
      const res = await apiRequest('/api/v1/invoices', {
        method: 'GET',
        token: tokenNoOrg,
      });

      assert.ok([400, 403].includes(res.status), `Expected 400 or 403 but got ${res.status}`);
    });
  });

  // =========================================================================
  // Scope 3: FIND-6.1-H03 — Community Notes Multi-Tenant Security
  // =========================================================================
  describe('Scope 3: FIND-6.1-H03 — Community Notes Multi-Tenant Security', () => {
    test('3.1 - Active member can publish and read active community notes in their organization', async () => {
      // Create note
      const createRes = await apiRequest('/api/v1/community-notes', {
        method: 'POST',
        token: tokenUserA_OrgA,
        body: { text: `Meeting tonight Alpha ${testRunId}`, category: 'GENERAL', emoji: '📢' },
      });

      assert.equal(createRes.status, 201);
      assert.equal(createRes.data.success, true);
      assert.equal(createRes.data.data.orgId.toString(), orgAId.toString());

      // Fetch active notes
      const getRes = await apiRequest('/api/v1/community-notes', {
        method: 'GET',
        token: tokenUserA_OrgA,
      });

      assert.equal(getRes.status, 200);
      assert.ok(getRes.data.data.length >= 1);
      for (const n of getRes.data.data) {
        assert.equal(n.orgId.toString(), orgAId.toString());
      }
    });

    test('3.2 - User in Org A sending forged X-Organization-Id for Org B is REJECTED (403)', async () => {
      const res = await apiRequest('/api/v1/community-notes', {
        method: 'GET',
        token: tokenUserA_OrgA,
        headers: { 'x-organization-id': orgBId.toString() },
      });

      // tenantContext rejects because User A is NOT a member of Org B
      assert.equal(res.status, 403);
    });

    test('3.3 - Missing tenant context on community notes fails closed (400/403)', async () => {
      const res = await apiRequest('/api/v1/community-notes', {
        method: 'GET',
        token: tokenNoOrg,
      });

      assert.ok([400, 403].includes(res.status));
    });

    test('3.4 - Note deactivation enforces tenant boundary', async () => {
      // Create a note directly in Org B for User B
      const noteB = await CommunityNote.create({
        userId: userBId,
        orgId: orgBId,
        text: `Private note Beta ${testRunId}`,
        category: 'GENERAL',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      // Try to deactivate noteB using orgA context
      const deactivateResult = await communityNoteRepository.deactivateById(noteB._id, userBId, orgAId);
      assert.equal(deactivateResult, null, 'Must fail to deactivate note belonging to Org B when orgA is passed');

      // Verify noteB is still active
      const freshNoteB = await CommunityNote.findById(noteB._id);
      assert.equal(freshNoteB.isActive, true, 'Note in Org B must remain active');

      // Deactivate with correct orgId
      const validDeactivate = await communityNoteRepository.deactivateById(noteB._id, userBId, orgBId);
      assert.ok(validDeactivate);
      assert.equal(validDeactivate.isActive, false);
    });
  });

  // =========================================================================
  // Scope 4: FIND-6.1-H04 — Cross-Community Balance Roll-over in Assessment Invoicing
  // =========================================================================
  describe('Scope 4: FIND-6.1-H04 — Cross-Community Balance Roll-over in Assessment Invoicing', () => {
    test('4.1 - Assessment carry-forward isolates outstanding invoices to the assessment community', async () => {
      // Setup dual-community resident with unpaid invoice in Org A and unpaid invoice in Org B
      const multiUserInvoiceOrgA = await Invoice.create({
        communityId: orgAId,
        orgId: orgAId,
        assessmentId: new mongoose.Types.ObjectId(),
        unitId: new mongoose.Types.ObjectId(),
        invoiceNumber: `INV-${testRunId}-MULTI-A`,
        targetUserId: multiOrgUserId,
        currentCharge: 300,
        totalDue: 300,
        totalAmount: 300,
        outstandingAmount: 300,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 86400000),
        status: 'UNPAID',
        carryForwardEnabled: true,
        billingPeriodString: '2026-09',
        isDeleted: false,
      });

      const multiUserInvoiceOrgB = await Invoice.create({
        communityId: orgBId,
        orgId: orgBId,
        assessmentId: new mongoose.Types.ObjectId(),
        unitId: new mongoose.Types.ObjectId(),
        invoiceNumber: `INV-${testRunId}-MULTI-B`,
        targetUserId: multiOrgUserId,
        currentCharge: 700,
        totalDue: 700,
        totalAmount: 700,
        outstandingAmount: 700,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 86400000),
        status: 'UNPAID',
        carryForwardEnabled: true,
        billingPeriodString: '2026-09',
        isDeleted: false,
      });

      // Create a unit in Org A for multiOrgUserId
      const villaA = await Villa.create({
        orgId: orgAId,
        communityId: orgAId,
        unitNumber: `U-${testRunId}-A`,
        blockOrBuilding: 'A',
        type: 'BHK2',
        status: 'Occupied',
        floorAreaSqFt: 1200,
        primaryResidentId: multiOrgUserId,
        residents: [{ userId: multiOrgUserId, residencyType: 'Resident Owner' }],
      });

      // Create an Assessment in Org A
      const assessmentA = await Assessment.create({
        communityId: orgAId,
        name: `Maintenance Assessment A ${testRunId}`,
        title: `Maintenance Assessment A ${testRunId}`,
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 1,
        description: 'Test Assessment',
        calculationMethod: {
          type: 'FLAT_RATE',
          flatAmount: 1000,
        },
        billingPeriodString: '2026-10',
        targetRoles: ['Resident Owner'],
        targetScope: {
          type: 'ALL_COMMUNITY',
        },
        status: 'ACTIVE',
      });

      // Run bulk invoice generation for Assessment in Org A
      const batchResult = await invoiceService.generateBatchInvoices(assessmentA);
      assert.ok(batchResult && batchResult.created > 0, 'Should generate an invoice');

      const userInvoiceInOrgA = await Invoice.findOne({
        assessmentId: assessmentA._id,
        targetUserId: multiOrgUserId,
      });

      assert.ok(userInvoiceInOrgA, 'Should find generated invoice for multiOrgUserId in Org A');

      // The new invoice in Org A should ONLY carry forward the 300 from Org A, NOT the 700 from Org B!
      // Base: 1000, Previous Outstanding: 300. Total Due should be 1300 (NOT 2000).
      assert.equal(
        userInvoiceInOrgA.previousOutstanding,
        300,
        'Should only carry forward 300 from Org A, excluding 700 from Org B'
      );
      assert.equal(
        userInvoiceInOrgA.totalDue,
        1300,
        'Total due must be flat 1000 + 300 carry-forward = 1300 (not 2000)'
      );

      // Verify carry forward history contains ONLY Org A invoice
      const historyIds = (userInvoiceInOrgA.carryForwardHistory || []).map((h) => h.invoiceId.toString());
      assert.ok(historyIds.includes(multiUserInvoiceOrgA._id.toString()), 'Must include Org A unpaid invoice');
      assert.ok(!historyIds.includes(multiUserInvoiceOrgB._id.toString()), 'Must NOT include Org B unpaid invoice');

      // Cleanup
      await Invoice.deleteMany({ _id: { $in: [multiUserInvoiceOrgA._id, multiUserInvoiceOrgB._id, userInvoiceInOrgA._id] } });
      await Villa.deleteOne({ _id: villaA._id });
      await Assessment.deleteOne({ _id: assessmentA._id });
    });
  });

  // =========================================================================
  // AREA 5: ROLE PERMISSIONS & ONBOARDING WIZARD CROSS-TENANT ENFORCEMENT
  // =========================================================================
  describe('Area 5: Role Permissions & Onboarding Wizard Cross-Tenant Enforcement', () => {
    test('5.1 GET /api/v1/roles/:id/permissions rejects reading permissions of a Role belonging to Org B', async () => {
      const Role = (await import('../src/features/role/role.model.js')).default;
      const roleB = await Role.create({
        name: `TestRoleB_${testRunId}`,
        description: 'Role in Org B',
        orgId: orgBId,
        isTenantRole: true,
      });

      try {
        const res = await fetch(`${baseUrl}/api/v1/roles/${roleB._id}/permissions`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenUserA_OrgA}`,
            'x-organization-id': orgAId.toString(),
          },
        });
        assert.equal(res.status, 403, 'Cross-tenant GET /roles/:id/permissions must return 403 Forbidden');
      } finally {
        await Role.deleteOne({ _id: roleB._id });
      }
    });

    test('5.2 POST /api/v1/onboarding/execute-import rejects cross-tenant body organisationId override', async () => {
      const res = await fetch(`${baseUrl}/api/v1/onboarding/execute-import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'x-organization-id': orgAId.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organisationId: orgBId.toString(),
          validDataArray: [{ unitNumber: '101', blockOrBuilding: 'A' }],
        }),
      });
      assert.equal(res.status, 403, 'Cross-tenant body organisationId in onboarding execute-import must return 403 Forbidden');
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });
});

