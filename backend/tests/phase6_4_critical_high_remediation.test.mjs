/**
 * Phase 6.4 Critical & High-Severity Tenant Isolation Remediation Test Suite
 *
 * Verifies:
 * 1. FIND-6.3-R01 (Invoice Offline Payment Rejection Tenant Context & Error Closure):
 *    - Undeclared contextOrgId ReferenceError is resolved
 *    - Trusted tenant context (req.tenant.orgId) passed from controller to service
 *    - Canonical organization identifier (communityId and orgId) validated
 *    - Non-platform admin with matching orgId can reject offline payment (200)
 *    - Cross-tenant rejection attempt is rejected with 403 Forbidden
 *    - Non-platform admin missing tenant context is rejected with 403 Forbidden
 *    - Legacy invoice with only orgId (no communityId) is correctly validated and rejected if cross-tenant
 *    - Platform admin can reject offline payment globally
 *
 * 2. FIND-6.3-R02 (Payment Verification Organization Scope & Authoritative Binding):
 *    - Authoritative payment record bound strictly to active orgId
 *    - Legitimate wallet recharge verification succeeds for same tenant (200)
 *    - Cross-tenant payment reuse (e.g. Payment created in Org A presented in Org B) rejected with 403
 *    - Mismatched user ID on paymentRecord rejected with 403
 *    - Mismatched gateway order ID rejected with 400
 *    - Missing orgId or userId fails closed with 400
 *    - Idempotent replay: already settled payment returns existing transaction and does not double-credit
 *    - Cross-tenant replay of settled payment rejected with 403
 *
 * 3. FIND-6.3-R03 (Directory Multi-Tenant Villa Lookup Boundary):
 *    - Villa lookup in getPaginatedDirectory strictly constrained to active community (orgId: cleanOrgId)
 *    - Unit details resolved for residents whose villa belongs to active organization
 *    - Multi-tenant user with villa in Org B does NOT leak unitNumber into Org A directory
 *    - Villa ID from foreign organization membership is suppressed
 *    - Villa records with missing or null orgId are not matched
 *    - Search query with special regex characters executes safely without ReDoS
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
import invoiceService from '../src/features/invoice/invoice.services.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import Payment from '../src/features/payment/payment.model.js';
import walletService from '../src/features/wallet/wallet.service.js';
import Villa from '../src/features/villa/villa.model.js';
import { directoryRepository } from '../src/features/directory/directory.repository.js';
import Role from '../src/features/role/role.model.js';
process.env.NODE_ENV = 'test';
process.env.ALLOW_MOCK_PAYMENTS = 'true';

describe('Phase 6.4 Critical & High-Severity Tenant Isolation Remediation Suite', () => {
  let server;
  let baseUrl;

  const testRunId = new mongoose.Types.ObjectId().toString().slice(-6);

  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();

  const userAId = new mongoose.Types.ObjectId(); // Member of Org A
  const userBId = new mongoose.Types.ObjectId(); // Member of Org B
  const multiOrgUserId = new mongoose.Types.ObjectId(); // Member of Org A & Org B
  const adminAId = new mongoose.Types.ObjectId(); // Admin in Org A
  const platformAdminId = new mongoose.Types.ObjectId(); // Platform Super Admin

  let tokenAdminOrgA;
  let tokenUserA_OrgA;
  let tokenUserB_OrgB;
  let tokenPlatformAdmin;

  let invoicePendingOrgA;
  let invoicePendingOrgB;
  let legacyInvoiceOrgB;

  let villaOrgA;
  let villaOrgB;

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const allowedFeatures = [
      'complaints',
      'billing',
      'community_notes',
      'amenities',
      'visitors',
      'directory',
      'notices',
      'polls',
      'wallet',
      'users',
      'roles',
      'workspaces',
    ];

    // Seed Organizations
    await Organization.create([
      {
        _id: orgAId,
        name: `Phase6_4 Test Org A ${testRunId}`,
        code: `OA_${testRunId}`,
        organizationType: 'Residential',
        allowedFeatures,
        status: 'Active',
      },
      {
        _id: orgBId,
        name: `Phase6_4 Test Org B ${testRunId}`,
        code: `OB_${testRunId}`,
        organizationType: 'Residential',
        allowedFeatures,
        status: 'Active',
      },
    ]);

    // Seed Villas
    villaOrgA = await Villa.create({
      _id: new mongoose.Types.ObjectId(),
      orgId: orgAId,
      name: `Villa A-101`,
      unitNumber: `A-101`,
      block: 'A',
      floor: 1,
      isDeleted: false,
    });

    villaOrgB = await Villa.create({
      _id: new mongoose.Types.ObjectId(),
      orgId: orgBId,
      name: `Villa B-999`,
      unitNumber: `B-999`,
      block: 'B',
      floor: 9,
      isDeleted: false,
    });

    const pBase = Math.floor(10000000 + Math.random() * 80000000);

    // Seed Users
    await User.create([
      {
        _id: userAId,
        username: `usera_${testRunId}`,
        email: `usera_${testRunId}@example.com`,
        phone: `+91${pBase}01`,
        password: 'Password123!',
        name: `Resident User A`,
        status: 'Active',
        isVerified: true,
        villaId: villaOrgA._id,
      },
      {
        _id: userBId,
        username: `userb_${testRunId}`,
        email: `userb_${testRunId}@example.com`,
        phone: `+91${pBase}02`,
        password: 'Password123!',
        name: `Resident User B`,
        status: 'Active',
        isVerified: true,
        villaId: villaOrgB._id,
      },
      {
        _id: multiOrgUserId,
        username: `multiorg_${testRunId}`,
        email: `multiorg_${testRunId}@example.com`,
        phone: `+91${pBase}03`,
        password: 'Password123!',
        name: `Multi-Tenant Resident`,
        status: 'Active',
        isVerified: true,
        // Global User.villaId points to villa in Org B!
        villaId: villaOrgB._id,
      },
      {
        _id: adminAId,
        username: `admina_${testRunId}`,
        email: `admina_${testRunId}@example.com`,
        phone: `+91${pBase}04`,
        password: 'Password123!',
        name: `Admin Org A`,
        status: 'Active',
        isVerified: true,
      },
      {
        _id: platformAdminId,
        username: `platform_${testRunId}`,
        email: `platform_${testRunId}@example.com`,
        phone: `+91${pBase}05`,
        password: 'Password123!',
        name: `Super Admin`,
        status: 'Active',
        isVerified: true,
        isPlatform: true,
      },
    ]);

    // Seed Roles
    const adminRoleA = await Role.create({
      orgId: orgAId,
      name: 'Community Admin',
      permissions: ['billing:dashboard', 'billing:assessment_manager', 'billing:action_center', 'billing:wallet', 'directory:read', 'users:read'],
    });

    const residentRoleA = await Role.create({
      orgId: orgAId,
      name: 'Resident',
      permissions: ['directory:read', 'billing:action_center', 'wallet:read', 'wallet:create'],
    });

    const residentRoleB = await Role.create({
      orgId: orgBId,
      name: 'Resident',
      permissions: ['directory:read', 'billing:action_center', 'wallet:read', 'wallet:create'],
    });

    // Seed Memberships
    await OrgMembership.create([
      {
        userId: adminAId,
        orgId: orgAId,
        roleId: adminRoleA._id,
        role: 'Community Admin',
        roleType: 'Community Admin',
        status: 'Active',
      },
      {
        userId: userAId,
        orgId: orgAId,
        roleId: residentRoleA._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: villaOrgA._id,
      },
      {
        userId: userBId,
        orgId: orgBId,
        roleId: residentRoleB._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: villaOrgB._id,
      },
      // multiOrgUserId in Org A has NO villa in Org A membership
      {
        userId: multiOrgUserId,
        orgId: orgAId,
        roleId: residentRoleA._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: null,
      },
      // multiOrgUserId in Org B has villaOrgB
      {
        userId: multiOrgUserId,
        orgId: orgBId,
        roleId: residentRoleB._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: villaOrgB._id,
      },
    ]);

    // Seed Invoices with pending offline payment
    invoicePendingOrgA = await Invoice.create({
      invoiceNumber: `INV-OFFLINE-${testRunId}-A`,
      communityId: orgAId,
      orgId: orgAId,
      targetUserId: userAId,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: villaOrgA._id,
      currentCharge: 300,
      totalDue: 300,
      totalAmount: 300,
      outstandingAmount: 300,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 86400000),
      status: 'VERIFICATION_PENDING',
      offlineAmount: 300,
      paymentMethod: 'BANK_TRANSFER',
      offlineReference: 'NEFT-123456-A',
      billingPeriodString: '2026-10',
      isDeleted: false,
    });

    invoicePendingOrgB = await Invoice.create({
      invoiceNumber: `INV-OFFLINE-${testRunId}-B`,
      communityId: orgBId,
      orgId: orgBId,
      targetUserId: userBId,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: villaOrgB._id,
      currentCharge: 500,
      totalDue: 500,
      totalAmount: 500,
      outstandingAmount: 500,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 86400000),
      status: 'VERIFICATION_PENDING',
      offlineAmount: 500,
      paymentMethod: 'UPI',
      offlineReference: 'UPI-789012-B',
      billingPeriodString: '2026-10',
      isDeleted: false,
    });

    // Seed Legacy Invoice with only orgId (no communityId)
    const legacyDoc = {
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: `INV-LEGACY-${testRunId}-B`,
      orgId: orgBId,
      targetUserId: userBId,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: villaOrgB._id,
      currentCharge: 400,
      totalDue: 400,
      totalAmount: 400,
      outstandingAmount: 400,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 86400000),
      status: 'VERIFICATION_PENDING',
      offlineAmount: 400,
      paymentMethod: 'CASH',
      offlineReference: 'CASH-999-B',
      billingPeriodString: '2026-10',
      isDeleted: false,
    };
    await Invoice.collection.insertOne(legacyDoc);
    legacyInvoiceOrgB = await Invoice.findById(legacyDoc._id);

    // Seed Wallets
    await Wallet.create([
      {
        userId: userAId,
        orgId: orgAId,
        balance: 1000,
      },
      {
        userId: userBId,
        orgId: orgBId,
        balance: 1000,
      },
    ]);

    // Generate JWT Tokens
    tokenAdminOrgA = signToken({
      id: adminAId.toString(),
      _id: adminAId.toString(),
      orgId: orgAId.toString(),
      role: 'Community Admin',
      roles: ['Community Admin'],
      permissions: ['billing:dashboard', 'billing:assessment_manager', 'billing:action_center', 'billing:wallet'],
    });

    tokenUserA_OrgA = signToken({
      id: userAId.toString(),
      _id: userAId.toString(),
      orgId: orgAId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['billing:action_center', 'wallet:read', 'wallet:create'],
    });

    tokenUserB_OrgB = signToken({
      id: userBId.toString(),
      _id: userBId.toString(),
      orgId: orgBId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['billing:action_center', 'wallet:read', 'wallet:create'],
    });

    tokenPlatformAdmin = signToken({
      id: platformAdminId.toString(),
      _id: platformAdminId.toString(),
      role: 'Super Admin',
      roles: ['Super Admin'],
      isPlatform: true,
      permissions: ['*'],
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  // =========================================================================
  // Area 1: FIND-6.3-R01 — Invoice Offline Payment Rejection
  // =========================================================================
  describe('Area 1: FIND-6.3-R01 — Invoice Offline Payment Rejection Scope', () => {
    test('1.1 - Non-platform admin with matching orgId rejects offline payment successfully (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoicePendingOrgA._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdminOrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
        body: JSON.stringify({
          rejectionReason: 'Invalid transaction receipt',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'UNPAID');
      assert.equal(body.data.rejectionReason, 'Invalid transaction receipt');

      // Verify DB state
      const updated = await Invoice.findById(invoicePendingOrgA._id);
      assert.equal(updated.status, 'UNPAID');
      assert.equal(updated.rejectionReason, 'Invalid transaction receipt');
      assert.equal(updated.offlineAmount, null);
      assert.equal(updated.offlineReference, null);
    });

    test('1.2 - Cross-tenant rejection attempt (Admin Org A rejecting Org B invoice) is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoicePendingOrgB._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAdminOrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
        body: JSON.stringify({
          rejectionReason: 'Malicious cross-tenant attempt',
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /belongs to another community/i);

      // Verify Org B invoice remained unmodified
      const unmodified = await Invoice.findById(invoicePendingOrgB._id);
      assert.equal(unmodified.status, 'VERIFICATION_PENDING');
    });

    test('1.3 - Non-platform admin missing tenant context fails closed with 403', async () => {
      await assert.rejects(
        async () => {
          await invoiceService.rejectOfflinePayment(
            invoicePendingOrgB._id,
            adminAId,
            'Test',
            null // missing contextOrgId
          );
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Tenant context is required to reject offline payments/i);
          return true;
        }
      );
    });

    test('1.4 - Legacy invoice with only orgId is correctly validated and rejected if cross-tenant', async () => {
      // Admin in Org A attempting to reject legacy invoice belonging to Org B
      await assert.rejects(
        async () => {
          await invoiceService.rejectOfflinePayment(
            legacyInvoiceOrgB._id,
            adminAId,
            'Test',
            orgAId.toString()
          );
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /belongs to another community/i);
          return true;
        }
      );

      // Rejection with matching orgBId succeeds
      const result = await invoiceService.rejectOfflinePayment(
        legacyInvoiceOrgB._id,
        userBId,
        'Valid reason from Org B admin',
        orgBId.toString()
      );
      assert.equal(result.status, 'UNPAID');
      assert.equal(result.rejectionReason, 'Valid reason from Org B admin');
    });

    test('1.5 - Former ReferenceError path no longer throws ReferenceError', async () => {
      // Re-rejecting or checking error path throws HttpError, NOT ReferenceError
      await assert.rejects(
        async () => {
          await invoiceService.rejectOfflinePayment(
            invoicePendingOrgA._id,
            adminAId,
            'Again',
            orgAId.toString()
          );
        },
        (err) => {
          assert.notEqual(err.name, 'ReferenceError');
          assert.equal(err.statusCode, 400); // Already processed or not pending
          return true;
        }
      );
    });

    test('1.6 - Platform super admin can reject offline payment without tenant constraint', async () => {
      // Create a fresh pending invoice in Org B
      const freshOrgBInvoice = await Invoice.create({
        invoiceNumber: `INV-PLATFORM-TEST-${testRunId}`,
        communityId: orgBId,
        orgId: orgBId,
        unitId: villaOrgB._id,
        assessmentId: new mongoose.Types.ObjectId(),
        targetUserId: userBId,
        currentCharge: 250,
        totalDue: 250,
        totalAmount: 250,
        outstandingAmount: 250,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 86400000),
        status: 'VERIFICATION_PENDING',
        offlineAmount: 250,
        paymentMethod: 'UPI',
        offlineReference: 'UPI-PLATFORM',
        billingPeriodString: '2026-10',
        isDeleted: false,
      });

      const res = await invoiceService.rejectOfflinePayment(
        freshOrgBInvoice._id,
        platformAdminId,
        'Super Admin Override',
        null, // Super admin without tenant context
        true // isPlatform: true
      );

      assert.equal(res.status, 'UNPAID');
      assert.equal(res.rejectionReason, 'Super Admin Override');
    });
  });

  // =========================================================================
  // Area 2: FIND-6.3-R02 — Wallet Payment Verification Binding
  // =========================================================================
  describe('Area 2: FIND-6.3-R02 — Payment Verification Organization Scope', () => {
    test('2.1 - Legitimate wallet recharge verification succeeds for same tenant (200)', async () => {
      const orderId = `order_test_${testRunId}_1`;
      const paymentId = `pay_test_${testRunId}_1`;

      const walletA = await Wallet.findOne({ userId: userAId, orgId: orgAId });

      // Seed authoritative Payment record in Org A
      await Payment.create({
        orgId: orgAId,
        userId: userAId,
        referenceId: walletA._id,
        referenceType: 'WalletRecharge',
        domain: 'WALLET',
        amount: 500,
        currency: 'INR',
        status: 'pending',
        gatewayTransactionId: orderId,
        gatewayOrderId: orderId,
        paymentMethod: 'RAZORPAY',
      });

      const result = await walletService.verifyPaymentSignature(
        userAId.toString(),
        orgAId.toString(),
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: `sig_mock_${testRunId}`,
          isMock: true,
        }
      );

      assert.ok(result);
      assert.equal(result.amount, 500);

      // Verify wallet balance in Org A incremented by 500 (from 1000 to 1500)
      const walletAUpdated = await Wallet.findOne({ userId: userAId, orgId: orgAId });
      assert.equal(walletAUpdated.balance, 1500);
    });

    test('2.2 - Cross-tenant payment reuse attempt (Org A payment presented to Org B) is rejected with 403 Forbidden', async () => {
      const orderId = `order_cross_${testRunId}_2`;
      const paymentId = `pay_cross_${testRunId}_2`;

      // Seed authoritative Payment record in Org A
      await Payment.create({
        orgId: orgAId,
        userId: userAId,
        referenceId: new mongoose.Types.ObjectId(),
        referenceType: 'Wallet',
        amount: 800,
        currency: 'INR',
        status: 'PAID',
        gatewayTransactionId: orderId,
        paymentMethod: 'RAZORPAY',
      });

      // Attacker attempts to verify payment in Org B
      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            userAId.toString(),
            orgBId.toString(), // Wrong org!
            {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: `sig_mock_${testRunId}`,
              isMock: true,
            }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Payment transaction belongs to another organization/i);
          return true;
        }
      );

      // Verify Org B wallet was NOT credited
      const walletB = await Wallet.findOne({ userId: userBId, orgId: orgBId });
      assert.equal(walletB.balance, 1000);
    });

    test('2.3 - Mismatched user ID on paymentRecord is rejected with 403 Forbidden', async () => {
      const orderId = `order_user_mismatch_${testRunId}`;
      const paymentId = `pay_user_mismatch_${testRunId}`;

      // Authoritative Payment record belongs to User A
      await Payment.create({
        orgId: orgAId,
        userId: userAId,
        referenceId: new mongoose.Types.ObjectId(),
        referenceType: 'Wallet',
        amount: 250,
        currency: 'INR',
        status: 'PAID',
        gatewayTransactionId: orderId,
        paymentMethod: 'RAZORPAY',
      });

      // User B attempts to claim the payment
      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            userBId.toString(), // Wrong user!
            orgAId.toString(),
            {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: `sig_mock_${testRunId}`,
              isMock: true,
            }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Payment transaction was initiated by another user/i);
          return true;
        }
      );
    });

    test('2.4 - Mismatched gateway order ID is rejected with 400', async () => {
      const orderId = `order_expected_${testRunId}`;
      const paymentId = `pay_order_mismatch_${testRunId}`;

      const createdPayment = await Payment.create({
        _id: new mongoose.Types.ObjectId(),
        orgId: orgAId,
        userId: userAId,
        referenceId: new mongoose.Types.ObjectId(),
        referenceType: 'Wallet',
        amount: 150,
        currency: 'INR',
        status: 'PAID',
        gatewayTransactionId: orderId,
        paymentMethod: 'RAZORPAY',
      });

      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            userAId.toString(),
            orgAId.toString(),
            {
              paymentId: createdPayment._id.toString(), // finds payment by _id
              razorpay_order_id: 'order_differing_fake', // Mismatch!
              razorpay_payment_id: paymentId,
              razorpay_signature: `sig_mock_${testRunId}`,
              amount: 150,
              isMock: true,
            }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Gateway order ID does not match/i);
          return true;
        }
      );
    });

    test('2.5 - Missing orgId or userId fails closed with 400', async () => {
      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            userAId.toString(),
            null, // missing orgId
            { razorpay_order_id: 'order_x' }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Valid Organization ID is required/i);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            null, // missing userId
            orgAId.toString(),
            { razorpay_order_id: 'order_x' }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Valid User ID is required/i);
          return true;
        }
      );
    });

    test('2.6 - Repeated verification is idempotent and does not credit wallet balance twice', async () => {
      const paymentId = `pay_test_${testRunId}_1`; // Already settled in test 2.1
      const orderId = `order_test_${testRunId}_1`;

      const walletBefore = await Wallet.findOne({ userId: userAId, orgId: orgAId });
      const balanceBefore = walletBefore.balance;

      const repeatResult = await walletService.verifyPaymentSignature(
        userAId.toString(),
        orgAId.toString(),
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: `sig_mock_${testRunId}`,
          amount: 500,
          isMock: true,
        }
      );

      assert.ok(repeatResult);
      assert.equal(repeatResult.amount, 500);

      // Verify balance did NOT change
      const walletAfter = await Wallet.findOne({ userId: userAId, orgId: orgAId });
      assert.equal(walletAfter.balance, balanceBefore);
    });

    test('2.7 - Replay of settled payment across organizations is rejected with 403 Forbidden', async () => {
      const paymentId = `pay_test_${testRunId}_1`; // Settled in Org A
      const orderId = `order_test_${testRunId}_1`;

      await assert.rejects(
        async () => {
          await walletService.verifyPaymentSignature(
            userAId.toString(),
            orgBId.toString(), // Wrong org!
            {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: `sig_mock_${testRunId}`,
              amount: 500,
              isMock: true,
            }
          );
        },
        (err) => {
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // Area 3: FIND-6.3-R03 — Directory Multi-Tenant Villa Lookup Boundary
  // =========================================================================
  describe('Area 3: FIND-6.3-R03 — Directory Multi-Tenant Villa Lookup Isolation', () => {
    test('3.1 - User belonging to Org A with villa in Org A correctly exposes unit details', async () => {
      const directoryResult = await directoryRepository.getPaginatedDirectory({
        orgId: orgAId,
        page: 1,
        limit: 50,
      });

      assert.ok(directoryResult);
      assert.ok(Array.isArray(directoryResult.items));

      const residentA = directoryResult.items.find(
        (entry) => entry._id.toString() === userAId.toString()
      );
      assert.ok(residentA, 'User A should be in Org A directory');
      assert.equal(residentA.unitNumber, 'A-101');
    });

    test('3.2 - Multi-tenant user with villa in Org B does NOT leak unitNumber into Org A directory', async () => {
      const directoryResult = await directoryRepository.getPaginatedDirectory({
        orgId: orgAId,
        page: 1,
        limit: 50,
      });

      const multiTenantEntry = directoryResult.items.find(
        (entry) => entry._id.toString() === multiOrgUserId.toString()
      );
      assert.ok(multiTenantEntry, 'Multi-tenant user should be in Org A directory');
      // In Org A, multiTenant user has no villa in Org A.
      // Must NOT leak 'B-999' from Org B!
      assert.equal(multiTenantEntry.unitNumber, '', 'Foreign villa unitNumber must not leak into Org A directory');
      assert.equal(multiTenantEntry.intercomNumber, '', 'Foreign intercomNumber must not leak into Org A directory');
    });

    test('3.3 - Directory in Org B correctly displays unit details for Org B residents', async () => {
      const directoryResultB = await directoryRepository.getPaginatedDirectory({
        orgId: orgBId,
        page: 1,
        limit: 50,
      });

      const multiTenantEntryB = directoryResultB.items.find(
        (entry) => entry._id.toString() === multiOrgUserId.toString()
      );
      assert.ok(multiTenantEntryB, 'Multi-tenant user should be in Org B directory');
      assert.equal(multiTenantEntryB.unitNumber, 'B-999');

      const residentB = directoryResultB.items.find(
        (entry) => entry._id.toString() === userBId.toString()
      );
      assert.ok(residentB, 'User B should be in Org B directory');
      assert.equal(residentB.unitNumber, 'B-999');
    });

    test('3.4 - Foreign membership villa ID belonging to Org B is suppressed when queried in Org A', async () => {
      // Seed a user whose Org A membership corruptedly has villaOrgB._id
      const corruptedUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: corruptedUserId,
        username: `corrupt_${testRunId}`,
        email: `corrupt_${testRunId}@example.com`,
        phone: `+91${Math.floor(1000000000 + Math.random() * 8000000000)}`,
        password: 'Password123!',
        name: `Corrupted Membership User`,
        status: 'Active',
        isVerified: true,
      });

      const residentRoleA = await Role.findOne({ orgId: orgAId, name: 'Resident' });
      await OrgMembership.create({
        userId: corruptedUserId,
        orgId: orgAId,
        roleId: residentRoleA._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: villaOrgB._id, // References villa belonging to Org B!
      });

      const directoryResult = await directoryRepository.getPaginatedDirectory({
        orgId: orgAId,
        page: 1,
        limit: 50,
      });

      const corruptedEntry = directoryResult.items.find(
        (entry) => entry._id.toString() === corruptedUserId.toString()
      );
      assert.ok(corruptedEntry, 'Corrupted membership user should be in Org A directory');
      // Pipeline enforces villa.orgId == orgAId, so villaOrgB is NOT matched!
      assert.equal(corruptedEntry.unitNumber, '', 'Foreign villa must be suppressed');
    });

    test('3.5 - Villa records with null or missing orgId are not exposed', async () => {
      const unassignedVillaDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Ghost Villa',
        unitNumber: 'GHOST-01',
        block: 'G',
        floor: 1,
        isDeleted: false,
        orgId: null,
      };
      await Villa.collection.insertOne(unassignedVillaDoc);
      const unassignedVilla = await Villa.findById(unassignedVillaDoc._id);

      const ghostUserId = new mongoose.Types.ObjectId();
      await User.create({
        _id: ghostUserId,
        username: `ghost_${testRunId}`,
        email: `ghost_${testRunId}@example.com`,
        phone: `+91${Math.floor(1000000000 + Math.random() * 8000000000)}`,
        password: 'Password123!',
        name: `Ghost Villa User`,
        status: 'Active',
        isVerified: true,
      });

      const residentRoleA = await Role.findOne({ orgId: orgAId, name: 'Resident' });
      await OrgMembership.create({
        userId: ghostUserId,
        orgId: orgAId,
        roleId: residentRoleA._id,
        role: 'Resident',
        roleType: 'Resident',
        status: 'Active',
        villaId: unassignedVilla._id,
      });

      const directoryResult = await directoryRepository.getPaginatedDirectory({
        orgId: orgAId,
        page: 1,
        limit: 50,
      });

      const ghostEntry = directoryResult.items.find(
        (entry) => entry._id.toString() === ghostUserId.toString()
      );
      assert.ok(ghostEntry);
      assert.equal(ghostEntry.unitNumber, '', 'Unassigned villa must not be matched');
    });

    test('3.6 - Directory search with special regex characters executes safely without ReDoS', async () => {
      const result = await directoryRepository.getPaginatedDirectory({
        orgId: orgAId,
        search: 'Resident.*+(test|user)[0-9]*',
        page: 1,
        limit: 50,
      });

      assert.ok(result);
      assert.ok(Array.isArray(result.items));
    });
  });
});
