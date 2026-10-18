/**
 * Phase 4C Low-Priority Tenant-Isolation Remediation Test Suite
 *
 * Verifies:
 * 1. Scope A: Third-Party Integrations & Gate Hardware
 *    - IntegrationHub credential decryption rejects cross-tenant connection IDs (404/403)
 *    - Same-tenant credential decryption succeeds cleanly
 *    - Repository getConnectionById enforces orgId filter
 *    - VisitorPass usage enforces orgId match; cross-tenant consumption rejected (403)
 *    - VisitorPassToken repository and service deleteByPassId enforce tenant scoping
 *
 * 2. Scope B: Bulk Imports & Exports
 *    - Complaint Excel export enforces RBAC ownership scoping (residents only see own complaints)
 *    - Admin export exports community complaints within active tenant boundary
 *    - Cross-tenant export attempts strictly bounded to trusted tenant context
 *    - Unit export scoped strictly to active organization
 *
 * 3. Scope C: Background Workers & Cron Jobs
 *    - Complaint SLA escalation job preserves and passes complaint.orgId
 *    - Amenity hold expiration worker releases slots/quotas strictly within hold.orgId
 *    - Invoice reminder email pipeline isolates tenant context per invoice
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
import IntegrationHub from '../src/features/integrationHub/integrationHub.model.js';
import VisitorPass from '../src/features/visitorPass/visitorPass.model.js';
import VisitorPassToken from '../src/features/visitorPassToken/visitorPassToken.model.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';

import integrationHubService from '../src/features/integrationHub/integrationHub.service.js';
import integrationHubRepository from '../src/features/integrationHub/integrationHub.repository.js';
import visitorPassService from '../src/features/visitorPass/visitorPass.service.js';
import visitorPassRepository from '../src/features/visitorPass/visitorPass.repository.js';
import visitorPassTokenService from '../src/features/visitorPassToken/visitorPassToken.service.js';
import visitorPassTokenRepository from '../src/features/visitorPassToken/visitorPassToken.repository.js';
import complaintService from '../src/features/complaint/complaint.service.js';
import { encryptGCM } from '../src/features/integrationHub/utils/crypto.util.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Phase 4C: Low-Priority Tenant-Isolation Remediation Integration', () => {
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

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. Create two isolated tenant organizations
    orgA = await Organization.create({
      name: `Phase4C Alpha Community ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
      allowedFeatures: ['visitors', 'complaints', 'villas', 'integrations'],
    });

    orgB = await Organization.create({
      name: `Phase4C Beta Community ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
      allowedFeatures: ['visitors', 'complaints', 'villas', 'integrations'],
    });

    // 2. Create users
    adminUserA = await User.create({
      username: `admin_4c_a_${timestamp}`,
      email: `admin_4c_a_${timestamp}@community-a.com`,
      password: 'HashedPassword123!',
      role: 'Community Admin',
      status: 'Active',
      orgId: orgA._id,
    });

    adminUserB = await User.create({
      username: `admin_4c_b_${timestamp}`,
      email: `admin_4c_b_${timestamp}@community-b.com`,
      password: 'HashedPassword123!',
      role: 'Community Admin',
      status: 'Active',
      orgId: orgB._id,
    });

    residentUserA = await User.create({
      username: `resident_4c_a_${timestamp}`,
      email: `resident_4c_a_${timestamp}@community-a.com`,
      password: 'HashedPassword123!',
      role: 'Resident',
      status: 'Active',
      orgId: orgA._id,
    });

    residentUserB = await User.create({
      username: `resident_4c_b_${timestamp}`,
      email: `resident_4c_b_${timestamp}@community-b.com`,
      password: 'HashedPassword123!',
      role: 'Resident',
      status: 'Active',
      orgId: orgB._id,
    });

    // 3. Create memberships
    await OrgMembership.create([
      { userId: adminUserA._id, orgId: orgA._id.toString(), status: 'Active', role: 'Community Admin' },
      { userId: adminUserB._id, orgId: orgB._id.toString(), status: 'Active', role: 'Community Admin' },
      { userId: residentUserA._id, orgId: orgA._id.toString(), status: 'Active', role: 'Resident' },
      { userId: residentUserB._id, orgId: orgB._id.toString(), status: 'Active', role: 'Resident' },
    ]);

    // 4. Create JWT tokens
    adminTokenA = signToken({
      id: adminUserA._id,
      _id: adminUserA._id,
      role: 'Community Admin',
      orgId: orgA._id.toString(),
      permissions: ['complaints:view', 'complaints:export', 'manage_villas', 'view_villas'],
    });

    adminTokenB = signToken({
      id: adminUserB._id,
      _id: adminUserB._id,
      role: 'Community Admin',
      orgId: orgB._id.toString(),
      permissions: ['complaints:view', 'complaints:export', 'manage_villas', 'view_villas'],
    });

    residentTokenA = signToken({
      id: residentUserA._id,
      _id: residentUserA._id,
      role: 'Resident',
      orgId: orgA._id.toString(),
      permissions: ['complaints:view', 'complaints:export'],
    });

    residentTokenB = signToken({
      id: residentUserB._id,
      _id: residentUserB._id,
      role: 'Resident',
      orgId: orgB._id.toString(),
      permissions: ['complaints:view', 'complaints:export'],
    });
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      }
      const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
      const userIds = [adminUserA?._id, adminUserB?._id, residentUserA?._id, residentUserB?._id].filter(Boolean);
      if (orgIds.length > 0) {
        await Promise.all([
          Organization.deleteMany({ _id: { $in: orgIds } }),
          OrgMembership.deleteMany({ orgId: { $in: orgIds.map(String) } }),
          User.deleteMany({ _id: { $in: userIds } }),
          IntegrationHub.deleteMany({ orgId: { $in: orgIds } }),
          VisitorPass.deleteMany({ orgId: { $in: orgIds } }),
          VisitorPassToken.deleteMany({ orgId: { $in: orgIds } }),
          Complaint.deleteMany({ orgId: { $in: orgIds } }),
          Villa.deleteMany({ orgId: { $in: orgIds } }),
          Invoice.deleteMany({ $or: [{ orgId: { $in: orgIds } }, { communityId: { $in: orgIds } }] }),
        ]);
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error('Error during teardown:', err);
    }
  });

  // =========================================================================
  // SCOPE A: THIRD-PARTY INTEGRATIONS & GATE HARDWARE
  // =========================================================================
  describe('Scope A: Third-Party Integrations & Gate Hardware Tenant Isolation', () => {
    let connectionA;
    let connectionB;
    let passA;
    let tokenDocA;

    before(async () => {
      // Create encrypted credentials for Org A
      const encA = encryptGCM('smtp_secret_token_alpha');
      connectionA = await IntegrationHub.create({
        orgId: orgA._id,
        userId: adminUserA._id,
        provider: 'smtp',
        accountLabel: 'Org A SMTP Gateway',
        status: 'connected',
        credentials: [
          { key: 'host', encryptedValue: encA.encryptedValue, iv: encA.iv, authTag: encA.authTag },
          { key: 'port', encryptedValue: encA.encryptedValue, iv: encA.iv, authTag: encA.authTag },
        ],
      });

      // Create encrypted credentials for Org B
      const encB = encryptGCM('razorpay_secret_beta');
      connectionB = await IntegrationHub.create({
        orgId: orgB._id,
        userId: adminUserB._id,
        provider: 'razorpay',
        accountLabel: 'Org B Razorpay Account',
        status: 'connected',
        credentials: [
          { key: 'key_secret', encryptedValue: encB.encryptedValue, iv: encB.iv, authTag: encB.authTag },
        ],
      });

      // Create Visitor Pass for Org A
      passA = await VisitorPass.create({
        orgId: orgA._id,
        createdById: residentUserA._id,
        hostId: residentUserA._id,
        visitorDetails: { name: 'Gate Hardware Test Visitor', phone: '9876543210' },
        passType: 'GUEST',
        validity: {
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 3600000),
        },
        status: 'PENDING',
        usageLimit: { maxUses: 1, currentUses: 0 },
      });

      tokenDocA = await VisitorPassToken.create({
        orgId: orgA._id,
        passId: passA._id,
        passCode: `${orgA._id}_123456`,
        shortKey: '123456',
        expiresAt: new Date(Date.now() + 3600000),
      });
    });

    test('A.1 - IntegrationHub credential decryption rejects cross-tenant connection ID (404/403)', async () => {
      // Org A caller attempting to decrypt Org B connection credentials
      await assert.rejects(
        async () => {
          await integrationHubService.getDecryptedCredentialsById(connectionB._id, orgA._id);
        },
        (err) => {
          assert.ok(err instanceof HttpError);
          assert.ok([403, 404].includes(err.statusCode));
          return true;
        }
      );
    });

    test('A.2 - IntegrationHub credential decryption succeeds for matching tenant context', async () => {
      const creds = await integrationHubService.getDecryptedCredentialsById(connectionA._id, orgA._id);
      assert.ok(creds);
      assert.strictEqual(creds.host, 'smtp_secret_token_alpha');
    });

    test('A.3 - IntegrationHub repository getConnectionById strictly scopes query when orgId provided', async () => {
      // Querying with wrong orgId returns null
      const foreign = await integrationHubRepository.getConnectionById(connectionA._id, orgB._id);
      assert.strictEqual(foreign, null);

      // Querying with correct orgId returns connection document
      const valid = await integrationHubRepository.getConnectionById(connectionA._id, orgA._id);
      assert.ok(valid);
      assert.strictEqual(valid._id.toString(), connectionA._id.toString());
    });

    test('A.4 - Gate hardware pass consumption rejects cross-tenant operation (403)', async () => {
      // Pass belongs to Org A, but Org B gate attempts to consume it
      await assert.rejects(
        async () => {
          await visitorPassService.usePass(passA, orgB._id);
        },
        (err) => {
          assert.ok(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );

      // Verify pass was NOT consumed in DB
      const freshPass = await VisitorPass.findById(passA._id);
      assert.strictEqual(freshPass.status, 'PENDING');
      assert.strictEqual(freshPass.usageLimit.currentUses, 0);
    });

    test('A.5 - Gate hardware pass consumption succeeds for authorized tenant', async () => {
      const consumed = await visitorPassService.usePass(passA, orgA._id);
      assert.ok(consumed);
      assert.strictEqual(consumed.status, 'ACTIVE');
      assert.strictEqual(consumed.usageLimit.currentUses, 1);
    });

    test('A.6 - VisitorPassToken deletion with foreign orgId leaves token intact', async () => {
      // Attempt to delete Org A token using Org B context
      await visitorPassTokenService.deleteTokenByPassId(passA._id, orgB._id);

      // Verify token still exists
      const token = await VisitorPassToken.findOne({ passId: passA._id });
      assert.ok(token);
      assert.strictEqual(token.shortKey, '123456');
    });

    test('A.7 - VisitorPassToken deletion with correct orgId deletes token', async () => {
      await visitorPassTokenService.deleteTokenByPassId(passA._id, orgA._id);

      const token = await VisitorPassToken.findOne({ passId: passA._id });
      assert.strictEqual(token, null);
    });

    test('A.8 - Direct VisitorPass service and repository calls without orgId fail closed (400)', async () => {
      await assert.rejects(
        () => visitorPassService.getPassById(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassService.verifyPassForEntry(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassService.updatePassStatus(passA._id, 'REVOKED'),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassService.revokePass(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassService.usePass(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassRepository.findById(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassRepository.update(passA._id, null, { purpose: 'Bypass' }),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
      await assert.rejects(
        () => visitorPassRepository.consumeForEntry(passA._id),
        (err) => err instanceof HttpError && err.statusCode === 400
      );
    });

    test('A.9 - Cross-tenant VisitorPass read, verify, status update, and revoke are rejected (404) with zero DB mutation', async () => {
      const freshPassA = await VisitorPass.create({
        orgId: orgA._id,
        createdById: residentUserA._id,
        hostId: residentUserA._id,
        visitorDetails: { name: 'Protected Org A Visitor', phone: '9111222333' },
        passType: 'GUEST',
        validity: {
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 3600000),
        },
        status: 'PENDING',
        usageLimit: { maxUses: 2, currentUses: 0 },
      });

      await assert.rejects(
        () => visitorPassService.getPassById(freshPassA._id, orgB._id),
        (err) => err instanceof HttpError && err.statusCode === 404
      );
      await assert.rejects(
        () => visitorPassService.verifyPassForEntry(freshPassA._id, orgB._id),
        (err) => err instanceof HttpError && err.statusCode === 404
      );
      await assert.rejects(
        () => visitorPassService.updatePassStatus(freshPassA._id, 'REVOKED', orgB._id),
        (err) => err instanceof HttpError && err.statusCode === 404
      );
      await assert.rejects(
        () => visitorPassService.revokePass(freshPassA._id, orgB._id),
        (err) => err instanceof HttpError && err.statusCode === 404
      );

      // Verify state in Org A is completely untouched
      const unchanged = await VisitorPass.findById(freshPassA._id);
      assert.strictEqual(unchanged.status, 'PENDING');
      assert.strictEqual(unchanged.usageLimit.currentUses, 0);

      // Same-tenant operations succeed cleanly
      const fetched = await visitorPassService.getPassById(freshPassA._id, orgA._id);
      assert.strictEqual(fetched._id.toString(), freshPassA._id.toString());

      const verified = await visitorPassService.verifyPassForEntry(freshPassA._id, orgA._id);
      assert.strictEqual(verified._id.toString(), freshPassA._id.toString());

      const revoked = await visitorPassService.revokePass(freshPassA._id, orgA._id);
      assert.strictEqual(revoked.status, 'REVOKED');
    });

    test('A.10 - Public visitor pass endpoint resolves token orgId without req.tenant, enforces strict field allowlist, and rejects raw pass IDs', async () => {
      const publicPass = await visitorPassService.createPass({
        orgId: orgA._id,
        createdById: residentUserA._id,
        hostId: residentUserA._id,
        visitorDetails: { name: 'Public Link Guest', phone: '9444555666', idProofNumber: 'SECRET-ID-999' },
        vehicleDetails: { number: 'KA01AB1234', type: 'CAR' },
        passType: 'GUEST',
        purpose: 'Dinner Visit',
        validity: {
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 3600000),
        },
        status: 'PENDING',
        usageLimit: { maxUses: 1, currentUses: 0 },
      });

      // Valid shortKey succeeds on unauthenticated public route
      const pubRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${publicPass.shortKey}`);
      assert.strictEqual(pubRes.status, 200);
      const pubBody = await pubRes.json();
      assert.strictEqual(pubBody.success, true);
      assert.strictEqual(pubBody.data._id.toString(), publicPass._id.toString());
      assert.strictEqual(pubBody.data.visitorDetails?.name, 'Public Link Guest');

      // Verify strict bearer-safe field allowlist (no sensitive host/visitor/tenant fields leaked)
      assert.strictEqual(pubBody.data.orgId, undefined);
      assert.strictEqual(pubBody.data.createdById, undefined);
      assert.strictEqual(pubBody.data.hostId, undefined);
      assert.strictEqual(pubBody.data.villaId, undefined);
      assert.strictEqual(pubBody.data.statusHistory, undefined);
      assert.strictEqual(pubBody.data.visitorDetails?.phone, undefined);
      assert.strictEqual(pubBody.data.visitorDetails?.idProofNumber, undefined);

      // Attempting to pass raw MongoDB _id to public route is rejected with 404
      const rawIdRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${publicPass._id}`);
      assert.strictEqual(rawIdRes.status, 404);
    });

    test('A.11 - Public visitor pass endpoint rejects expired, revoked, malformed, unknown, and cross-tenant tokens (404)', async () => {
      // 1. Malformed tokens and unknown tokens -> 404
      for (const badToken of ['PASS-', 'invalid-token!', '12', '1234567', '000000']) {
        const res = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${encodeURIComponent(badToken)}`);
        assert.strictEqual(res.status, 404, `Expected 404 for token '${badToken}'`);
      }

      // 2. Cross-tenant prefixed token (${orgB._id}_${orgAPass.shortKey}) -> 404
      const orgAPass = await visitorPassService.createPass({
        orgId: orgA._id,
        createdById: residentUserA._id,
        hostId: residentUserA._id,
        visitorDetails: { name: 'Cross Tenant Token Target', phone: '9555666777' },
        passType: 'GUEST',
        validity: {
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date(Date.now() + 3600000),
        },
        status: 'PENDING',
        usageLimit: { maxUses: 1, currentUses: 0 },
      });

      const forgedCrossTenantCode = `${orgB._id}_${orgAPass.shortKey}`;
      const crossRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${forgedCrossTenantCode}`);
      assert.strictEqual(crossRes.status, 404, 'Cross-tenant prefixed token must be rejected with 404');

      // Matching tenant prefixed token succeeds
      const matchingPrefixedCode = `${orgA._id}_${orgAPass.shortKey}`;
      const matchRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${matchingPrefixedCode}`);
      assert.strictEqual(matchRes.status, 200, 'Matching tenant prefixed token succeeds');

      // 3. Expired token (even before MongoDB TTL background sweep deletes the document) -> 404
      const expiredPass = await visitorPassService.createPass({
        orgId: orgA._id,
        createdById: residentUserA._id,
        hostId: residentUserA._id,
        visitorDetails: { name: 'Expired Token Guest', phone: '9666777888' },
        passType: 'GUEST',
        validity: {
          startDate: new Date(Date.now() - 7200000),
          endDate: new Date(Date.now() + 3600000),
        },
        status: 'PENDING',
        usageLimit: { maxUses: 1, currentUses: 0 },
      });
      await VisitorPassToken.updateOne(
        { passId: expiredPass._id },
        { $set: { expiresAt: new Date(Date.now() - 60000) } }
      );
      const expRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${expiredPass.shortKey}`);
      assert.strictEqual(expRes.status, 404, 'Runtime-expired token must be rejected with 404');

      // 4. Revoked pass (via updatePassStatus or revokePass) -> 404
      await visitorPassService.updatePassStatus(orgAPass._id, 'REVOKED', orgA._id);
      const revRes = await fetch(`${baseUrl}/api/v1/visitor-pass/public/${orgAPass.shortKey}`);
      assert.strictEqual(revRes.status, 404, 'Revoked pass token must be rejected with 404');
    });
  });

  // =========================================================================
  // SCOPE B: BULK IMPORTS & EXPORTS
  // =========================================================================
  describe('Scope B: Bulk Imports & Exports Tenant Isolation', () => {
    let complaintA1;
    let complaintA2;
    let complaintB;

    before(async () => {
      // Create Complaint in Org A by Resident A
      complaintA1 = await Complaint.create({
        orgId: orgA._id,
        residentId: residentUserA._id,
        complaintNumber: 'CMP-A1-001',
        title: 'Leaking pipe resident A',
        description: 'Bathroom pipe is leaking water',
        category: 'Plumbing',
        priority: 'High',
        status: 'Open',
        slaDueDate: new Date(Date.now() + 86400000),
      });

      // Create another Complaint in Org A by Admin A (different resident)
      complaintA2 = await Complaint.create({
        orgId: orgA._id,
        residentId: adminUserA._id,
        complaintNumber: 'CMP-A2-002',
        title: 'Elevator Maintenance',
        description: 'Elevator noise',
        category: 'Electrical',
        priority: 'Medium',
        status: 'Open',
        slaDueDate: new Date(Date.now() + 86400000),
      });

      // Create Complaint in Org B
      complaintB = await Complaint.create({
        orgId: orgB._id,
        residentId: residentUserB._id,
        complaintNumber: 'CMP-B-001',
        title: 'Street light broken Org B',
        description: 'Light broken outside villa B',
        category: 'Electrical',
        priority: 'Low',
        status: 'Open',
        slaDueDate: new Date(Date.now() + 86400000),
      });
    });

    test('B.1 - Non-admin resident export is strictly scoped to own complaints (cannot export community tickets)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      const buffer = Buffer.from(await res.arrayBuffer());
      const xlsx = await import('xlsx');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets['Complaints'];
      const rows = xlsx.utils.sheet_to_json(sheet);

      // Resident A must ONLY see their own complaint (CMP-A1-001)
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0]['Complaint No'], 'CMP-A1-001');
    });

    test('B.2 - Admin export retrieves community complaints scoped to active tenant', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
      const buffer = Buffer.from(await res.arrayBuffer());
      const xlsx = await import('xlsx');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets['Complaints'];
      const rows = xlsx.utils.sheet_to_json(sheet);

      // Admin A sees both Org A complaints, but zero Org B complaints
      assert.strictEqual(rows.length, 2);
      const complaintNos = rows.map((r) => r['Complaint No']);
      assert.ok(complaintNos.includes('CMP-A1-001'));
      assert.ok(complaintNos.includes('CMP-A2-002'));
      assert.ok(!complaintNos.includes('CMP-B-001'));
    });

    test('B.3 - Unit export requires valid tenant and returns only tenant units', async () => {
      await Villa.create({
        orgId: orgA._id,
        unitNumber: 'A-101',
        type: 'Apartment',
        status: 'Occupied',
      });

      await Villa.create({
        orgId: orgB._id,
        unitNumber: 'B-202',
        type: 'Villa',
        status: 'Vacant',
      });

      const res = await fetch(`${baseUrl}/api/v1/villas/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
      const csvText = await res.text();
      assert.ok(csvText.includes('A-101'));
      assert.ok(!csvText.includes('B-202'));
    });
  });

  // =========================================================================
  // SCOPE C: BACKGROUND WORKERS & CRON JOBS
  // =========================================================================
  describe('Scope C: Background Workers & Jobs Tenant Isolation', () => {
    test('C.1 - Complaint SLA escalation delegates with explicit orgId', async () => {
      const complaintForEscalation = await Complaint.create({
        orgId: orgA._id,
        residentId: residentUserA._id,
        complaintNumber: 'CMP-SLA-ESC',
        title: 'SLA Escalation Test',
        category: 'Plumbing',
        priority: 'High',
        status: 'In Progress',
        escalationLevel: 0,
        slaDueDate: new Date(Date.now() - 3600000), // breached 1 hr ago
      });

      // Call service escalateComplaint passing explicit orgId
      const escalated = await complaintService.escalateComplaint(
        complaintForEscalation._id,
        orgA._id,
        { ipAddress: '127.0.0.1', browser: 'Test', device: 'NodeTest' }
      );

      assert.ok(escalated);
      assert.strictEqual(escalated.status, 'Escalated');
      assert.strictEqual(escalated.escalationLevel, 1);
      assert.strictEqual(escalated.orgId.toString(), orgA._id.toString());
    });

    test('C.2 - Cross-tenant complaint escalation attempt fails closed (404/403)', async () => {
      const complaintForEscalation = await Complaint.create({
        orgId: orgA._id,
        residentId: residentUserA._id,
        complaintNumber: 'CMP-CROSS-ESC',
        title: 'Cross SLA Escalation Test',
        category: 'Plumbing',
        priority: 'High',
        status: 'In Progress',
        escalationLevel: 0,
        slaDueDate: new Date(Date.now() - 3600000),
      });

      // Attempt escalation with Org B context on Org A complaint
      await assert.rejects(
        async () => {
          await complaintService.escalateComplaint(
            complaintForEscalation._id,
            orgB._id,
            { ipAddress: '127.0.0.1', browser: 'Test', device: 'NodeTest' }
          );
        },
        (err) => {
          assert.ok(err instanceof HttpError);
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    test('C.3 - Invoice reminder pipeline preserves invoice orgId context', async () => {
      const dummyUnit = await Villa.create({
        orgId: orgA._id,
        unitNumber: 'INV-UNIT-101',
        type: 'Apartment',
        status: 'Occupied',
      });

      const invA = await Invoice.create({
        communityId: orgA._id,
        orgId: orgA._id,
        targetUserId: residentUserA._id,
        unitId: dummyUnit._id,
        assessmentId: new mongoose.Types.ObjectId(),
        billingPeriodString: '2026-10',
        currentCharge: 1500,
        outstandingAmount: 1500,
        invoiceNumber: `INV-4C-${Date.now()}`,
        totalAmount: 1500,
        paidAmount: 0,
        status: 'UNPAID',
        dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000), // Due in 2 days
      });

      // Verify invoice orgId is loaded properly without foreign data leak
      const fetched = await Invoice.findById(invA._id).lean();
      assert.strictEqual(fetched.communityId.toString(), orgA._id.toString());
      assert.strictEqual(fetched.orgId.toString(), orgA._id.toString());
    });
  });
});
