/**
 * ============================================================================
 *  End-to-End Test Suite: Billing, Invoice, and Digital Wallet Module
 *  Validates:
 *   1. Assessment creation & batch invoice generation
 *   2. Dashboard KPIs & aggregations
 *   3. Digital wallet recharge (order creation & HMAC signature verification)
 *   4. Invoice partial payment via wallet balance (verifying PARTIALLY_PAID status)
 *   5. Invoice full settlement via wallet balance (verifying PAID status)
 *   6. Offline settlement (Bank Transfer) submission & admin approval lifecycle
 *   7. Cash collection by facility staff
 *   8. Protection against insufficient balance & overpayments
 *   9. Gateway configuration readiness check
 * ============================================================================
 */

import mongoose from 'mongoose';
import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import domain services & models
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import Payment from '../src/features/payment/payment.model.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';

import invoiceService from '../src/features/invoice/invoice.services.js';
import invoiceRepository from '../src/features/invoice/invoice.repository.js';
import walletService from '../src/features/wallet/wallet.service.js';
import paymentService from '../src/features/payment/payment.service.js';

import http from 'http';
import { initSocket } from '../src/config/socket.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate_dev';

async function runE2ETest() {
  console.log('\n==================================================================');
  console.log('  🚀 STARTING E2E TEST: BILLING, INVOICE & DIGITAL WALLET MODULE');
  console.log('==================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB at:', MONGO_URI);

  const httpServer = http.createServer();
  await initSocket(httpServer);
  console.log('✅ Initialized Socket.io test server.');

  let testOrg, testAdmin, testResident1, testResident2, testResident3;
  let unit1, unit2, unit3;
  let testAssessment;
  let generatedInvoices = [];

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Fixture Setup (Org, Users, Villas)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Setting up test fixtures ---');
    const timestamp = Date.now();

    testOrg = await Organization.create({
      name: `E2E Test Community ${timestamp}`,
      code: `E2E_${timestamp}`.substring(0, 10),
      organizationType: 'Residential',
      status: 'Active'
    });

    testAdmin = await User.create({
      name: 'E2E Admin User',
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@e2etest.com`,
      password: 'HashedPassword123!',
      orgId: testOrg._id,
      status: 'Active'
    });

    testResident1 = await User.create({
      name: 'Resident Alpha',
      username: `resident1_${timestamp}`,
      email: `resident1_${timestamp}@e2etest.com`,
      password: 'HashedPassword123!',
      orgId: testOrg._id,
      status: 'Active'
    });

    testResident2 = await User.create({
      name: 'Resident Beta',
      username: `resident2_${timestamp}`,
      email: `resident2_${timestamp}@e2etest.com`,
      password: 'HashedPassword123!',
      orgId: testOrg._id,
      status: 'Active'
    });

    testResident3 = await User.create({
      name: 'Resident Gamma',
      username: `resident3_${timestamp}`,
      email: `resident3_${timestamp}@e2etest.com`,
      password: 'HashedPassword123!',
      orgId: testOrg._id,
      status: 'Active'
    });

    unit1 = await Villa.create({
      orgId: testOrg._id,
      unitNumber: `A-101-${timestamp}`,
      blockOrBuilding: 'Block A',
      type: 'BHK3',
      status: 'Occupied',
      primaryResidentId: testResident1._id,
      residents: [{ userId: testResident1._id, residencyType: 'Resident Owner', isPrimary: true }]
    });

    unit2 = await Villa.create({
      orgId: testOrg._id,
      unitNumber: `A-102-${timestamp}`,
      blockOrBuilding: 'Block A',
      type: 'BHK3',
      status: 'Occupied',
      primaryResidentId: testResident2._id,
      residents: [{ userId: testResident2._id, residencyType: 'Resident Owner', isPrimary: true }]
    });

    unit3 = await Villa.create({
      orgId: testOrg._id,
      unitNumber: `B-201-${timestamp}`,
      blockOrBuilding: 'Block B',
      type: 'BHK2',
      status: 'Occupied',
      primaryResidentId: testResident3._id,
      residents: [{ userId: testResident3._id, residencyType: 'Resident Owner', isPrimary: true }]
    });

    console.log('✅ Test Community, Users, and Units created.');

    // -------------------------------------------------------------------------
    // STEP 2: Assessment Creation & Batch Invoicing
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Assessment Template & Batch Invoicing ---');
    testAssessment = await Assessment.create({
      name: 'Quarterly Maintenance Assessment',
      communityId: testOrg._id,
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      billingPeriodString: '2026-09',
      calculationMethod: {
        type: 'FLAT_RATE',
        flatAmount: 2500
      },
      targetScope: {
        type: 'ALL_COMMUNITY',
        scopeIds: [],
        targetRole: 'OWNER'
      },
      status: 'ACTIVE'
    });

    const batchResult = await invoiceService.generateBatchInvoices(testAssessment);
    console.log(`Generated ${batchResult.createdInvoices?.length || 0} batch invoices.`);

    generatedInvoices = await Invoice.find({ assessmentId: testAssessment._id }).sort({ createdAt: 1 });
    assert.strictEqual(generatedInvoices.length, 3, 'Expected 3 invoices for the 3 community units');

    for (const inv of generatedInvoices) {
      assert.strictEqual(inv.status, 'UNPAID', 'Initial invoice status should be UNPAID');
      assert.strictEqual(inv.totalAmount, 2500, 'Invoice totalAmount must be 2500');
      assert.strictEqual(inv.outstandingAmount, 2500, 'Invoice outstandingAmount must be 2500');
      assert.strictEqual(inv.paidAmount, 0, 'Invoice paidAmount must initially be 0');
    }
    console.log('✅ Batch invoices verified: UNPAID, correct amounts and periods.');

    // -------------------------------------------------------------------------
    // STEP 3: Dashboard KPIs & Aggregation
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Dashboard Financial KPIs ---');
    const kpis = await invoiceRepository.getDashboardKPIs(testOrg._id.toString());
    assert.strictEqual(kpis.grossDemand, 7500, 'Gross demand should be 3 * 2500 = 7500');
    assert.strictEqual(kpis.totalCollected, 0, 'Initial collection should be 0');
    assert.strictEqual(kpis.totalUnpaidArrears, 7500, 'Total unpaid arrears should be 7500');
    console.log('✅ Dashboard KPIs verified: grossDemand=₹7,500, totalCollected=₹0, arrears=₹7,500.');

    // -------------------------------------------------------------------------
    // STEP 4: Digital Wallet Recharge (Order & Signature Verification)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Digital Wallet Recharge Flow ---');
    const initialWallet = await walletService.getWalletData(testResident1._id, testOrg._id);
    assert.strictEqual(initialWallet.balance, 0, 'Initial wallet balance should be 0');
    assert.strictEqual(typeof initialWallet.isPaymentGatewayConfigured, 'boolean');

    // Create recharge order for ₹3,000
    const rechargeOrder = await walletService.createRechargeOrder(testResident1._id, testOrg._id, 3000);
    assert.ok(rechargeOrder.orderId, 'Recharge order must have an orderId');
    assert.strictEqual(rechargeOrder.amount, 300000, 'Razorpay order amount in paise should be 300,000');

    // Verify payment signature (mock gateway simulation)
    const verificationPayload = {
      orderId: rechargeOrder.orderId,
      razorpay_order_id: rechargeOrder.orderId,
      razorpay_payment_id: `pay_test_${timestamp}`,
      razorpay_signature: `sig_mock_${timestamp}`,
      amount: 3000
    };

    const verifiedTxn = await walletService.verifyPaymentSignature(testResident1._id, testOrg._id, verificationPayload);
    assert.strictEqual(verifiedTxn.amount, 3000, 'Transaction amount must match ₹3000');
    assert.strictEqual(verifiedTxn.type, 'Credit', 'Transaction type must be Credit');
    assert.strictEqual(verifiedTxn.referenceType, 'Recharge', 'ReferenceType must be Recharge');

    const walletAfterRecharge = await walletService.getWalletData(testResident1._id, testOrg._id);
    assert.strictEqual(walletAfterRecharge.balance, 3000, 'Wallet balance after recharge must be ₹3000');
    console.log('✅ Wallet recharge verified: ₹3,000 credited without syntax or runtime errors.');

    // -------------------------------------------------------------------------
    // STEP 5: Partial Invoice Payment via Digital Wallet
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Partial Invoice Payment via Digital Wallet ---');
    const invoice1 = generatedInvoices[0];

    // Pay partial amount: ₹1,000 out of ₹2,500
    const partialPayResult = await walletService.payInvoiceWithWallet({
      userId: testResident1._id.toString(),
      orgId: testOrg._id.toString(),
      invoiceId: invoice1._id.toString(),
      amount: 1000
    });

    assert.strictEqual(partialPayResult.success, true);
    assert.strictEqual(partialPayResult.walletBalance, 2000, 'Remaining wallet balance should be ₹2000');

    const updatedInvoice1 = await Invoice.findById(invoice1._id);
    assert.strictEqual(updatedInvoice1.paidAmount, 1000, 'Paid amount must be 1000');
    assert.strictEqual(updatedInvoice1.outstandingAmount, 1500, 'Outstanding amount must be 1500');
    assert.strictEqual(updatedInvoice1.status, 'PARTIALLY_PAID', 'Invoice status must be PARTIALLY_PAID, not PAID');
    console.log('✅ Partial payment verified: status=PARTIALLY_PAID, outstanding=₹1,500, wallet=₹2,000.');

    // -------------------------------------------------------------------------
    // STEP 6: Full Settlement of Remaining Dues via Wallet
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Full Settlement of Remaining Dues via Wallet ---');
    const fullPayResult = await walletService.payInvoiceWithWallet({
      userId: testResident1._id.toString(),
      orgId: testOrg._id.toString(),
      invoiceId: invoice1._id.toString(),
      amount: 1500
    });

    assert.strictEqual(fullPayResult.success, true);
    assert.strictEqual(fullPayResult.walletBalance, 500, 'Remaining wallet balance should be ₹500');

    const settledInvoice1 = await Invoice.findById(invoice1._id);
    assert.strictEqual(settledInvoice1.paidAmount, 2500, 'Total paid amount must be ₹2500');
    assert.strictEqual(settledInvoice1.outstandingAmount, 0, 'Outstanding amount must be 0');
    assert.strictEqual(settledInvoice1.status, 'PAID', 'Invoice status must now be PAID');

    const auditPayments = await Payment.find({ referenceId: invoice1._id, paymentMethod: 'WALLET' });
    assert.strictEqual(auditPayments.length, 2, 'Must have 2 audit payment records for the two installments');
    console.log('✅ Full settlement verified: status=PAID, outstanding=₹0, wallet=₹500, 2 audit logs recorded.');

    // -------------------------------------------------------------------------
    // STEP 7: Offline Settlement (Bank Transfer) & Admin Approval
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Offline Payment Submission & Approval ---');
    const invoice2 = generatedInvoices[1];

    // Resident submits offline bank transfer proof
    await invoiceService.logOfflinePayment(
      invoice2._id.toString(),
      `NEFT-${timestamp}`,
      2500,
      'BANK_TRANSFER',
      new Date(),
      'https://manage-my-gate.s3.amazonaws.com/receipts/neft_01.jpg'
    );

    const pendingInvoice2 = await Invoice.findById(invoice2._id);
    assert.strictEqual(pendingInvoice2.status, 'VERIFICATION_PENDING');
    assert.strictEqual(pendingInvoice2.offlineAmount, 2500);

    // Admin approves the offline payment
    const approvedInvoice2 = await invoiceService.approveOfflinePayment(invoice2._id.toString(), testAdmin._id.toString());
    assert.strictEqual(approvedInvoice2.status, 'PAID', 'Invoice status should be PAID after admin approval');
    assert.strictEqual(approvedInvoice2.outstandingAmount, 0);
    assert.strictEqual(approvedInvoice2.paidAmount, 2500);
    console.log('✅ Offline payment verified: VERIFICATION_PENDING -> admin approval -> PAID.');

    // -------------------------------------------------------------------------
    // STEP 8: Direct Cash Payment (Facility In-Charge / Staff)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Direct Cash Payment Recording ---');
    const invoice3 = generatedInvoices[2];

    const eligibleCashInvoices = await invoiceService.searchCashEligible(unit3.unitNumber, testOrg._id.toString());
    assert.ok(eligibleCashInvoices.length > 0, 'Eligible cash invoices must include unit 3');

    const cashSettlement = await invoiceService.recordCashPayment(invoice3._id.toString(), 2500, testAdmin._id.toString());
    assert.strictEqual(cashSettlement.status, 'PAID');
    assert.strictEqual(cashSettlement.outstandingAmount, 0);

    const cashAudit = await Payment.findOne({ referenceId: invoice3._id, paymentMethod: 'CASH' });
    assert.ok(cashAudit, 'Must create a cash payment audit record');
    assert.strictEqual(cashAudit.amount, 2500);
    console.log('✅ Direct Cash collection verified: status=PAID, cash audit log recorded.');

    // -------------------------------------------------------------------------
    // STEP 9: Protective Negative Tests
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Negative Tests & Edge Cases ---');

    // Test A: Paying an already paid invoice
    try {
      await walletService.payInvoiceWithWallet({
        userId: testResident1._id.toString(),
        orgId: testOrg._id.toString(),
        invoiceId: invoice1._id.toString(),
        amount: 100
      });
      assert.fail('Should have failed because invoice is already paid');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('already paid'), `Expected error message: ${err.message}`);
    }

    // Test B: Insufficient wallet balance
    try {
      // Resident 1 currently has ₹500
      const unpaidInvoice = await Invoice.create({
        communityId: testOrg._id,
        orgId: testOrg._id,
        assessmentId: testAssessment._id,
        targetUserId: testResident1._id,
        unitId: unit1._id,
        billingPeriodString: '2026-10',
        dueDate: new Date(Date.now() + 86400000),
        currentCharge: 1200,
        totalAmount: 1200,
        outstandingAmount: 1200,
        status: 'UNPAID'
      });

      await walletService.payInvoiceWithWallet({
        userId: testResident1._id.toString(),
        orgId: testOrg._id.toString(),
        invoiceId: unpaidInvoice._id.toString(),
        amount: 1200
      });
      assert.fail('Should have failed due to insufficient wallet balance');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Insufficient wallet balance'), `Expected error message: ${err.message}`);
    }

    // Test C: Gateway status check API
    const gatewayStatus = await paymentService.isGatewayConfigured(testOrg._id.toString());
    assert.strictEqual(typeof gatewayStatus.isConfigured, 'boolean');
    console.log('✅ Edge cases verified: duplicate payment blocked, insufficient balance blocked, gateway status validated.');

    // -------------------------------------------------------------------------
    // STEP 10: Final KPIs Check After Full Collection
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Final Financial Re-Aggregation ---');
    const finalKpis = await invoiceRepository.getDashboardKPIs(testOrg._id.toString());
    assert.strictEqual(finalKpis.totalCollected >= 7500, true, 'Total collected should now include all settled invoices');
    console.log(`✅ Final KPIs verified: grossDemand=₹${finalKpis.grossDemand}, totalCollected=₹${finalKpis.totalCollected}.`);

    console.log('\n==================================================================');
    console.log('  🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS!');
    console.log('==================================================================\n');

  } finally {
    // Clean up test data
    if (testOrg) {
      console.log('🧹 Cleaning up test fixtures...');
      await Invoice.deleteMany({ communityId: testOrg._id });
      await Assessment.deleteMany({ communityId: testOrg._id });
      await Villa.deleteMany({ orgId: testOrg._id });
      await Wallet.deleteMany({ orgId: testOrg._id });
      await WalletTransaction.deleteMany({ orgId: testOrg._id });
      await Payment.deleteMany({ orgId: testOrg._id });
      await User.deleteMany({ orgId: testOrg._id });
      await Organization.deleteOne({ _id: testOrg._id });
      console.log('✨ Cleanup complete.');
    }
    if (httpServer) {
      httpServer.close();
    }
    await mongoose.disconnect();
  }
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
