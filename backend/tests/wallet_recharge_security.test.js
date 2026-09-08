/**
 * ============================================================================
 *  Automated Test Suite: Wallet Recharge Security, Idempotency & Webhooks
 *  Validates:
 *   1. Authoritative order creation with Payment record linkage
 *   2. Normal signature verification and balance crediting
 *   3. Rejection of amount tampering (tampered client payload)
 *   4. Replay attack idempotency (preventing double-crediting on retries)
 *   5. Webhook reconciliation for dropped network connections
 *   6. Webhook idempotency protection
 * ============================================================================
 */

import mongoose from 'mongoose';
import assert from 'assert';
import dotenv from 'dotenv';
import http from 'http';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { initSocket } from '../src/config/socket.js';

import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Payment from '../src/features/payment/payment.model.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import walletService from '../src/features/wallet/wallet.service.js';
import integrationHubService from '../src/features/integrationHub/integrationHub.service.js';
import IntegrationHub from '../src/features/integrationHub/integrationHub.model.js';

dotenv.config();
process.env.NODE_ENV = 'test';

async function runWalletSecurityTests() {
  console.log('\n==================================================================');
  console.log('  🔒 STARTING WALLET RECHARGE SECURITY & IDEMPOTENCY TEST SUITE');
  console.log('==================================================================\n');

  await connectToDb();

  const httpServer = http.createServer();
  await initSocket(httpServer);

  const testOrgId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();

  let testOrg, testUser;

  try {
    // 0. Setup test organization & user
    testOrg = await Organization.create({
      _id: testOrgId,
      name: 'Security Test Community',
      code: `SEC_${Date.now()}`.substring(0, 10),
      organizationType: 'Residential',
      status: 'Active',
      address: { street: '123 Safe St', city: 'Bangalore', state: 'KA', zip: '560001' }
    });

    testUser = await User.create({
      _id: testUserId,
      name: 'Security Tester',
      firstName: 'Security',
      lastName: 'Tester',
      username: `sectest_${Date.now()}`,
      email: `sectest_${Date.now()}@example.com`,
      phoneNumber: '+919999988888',
      password: 'HashedPassword123!',
      userRole: 'resident',
      orgId: testOrgId,
      status: 'Active'
    });

    console.log('✅ Test Org and Resident User initialized.');

    // --------------------------------------------------------------------------
    // Test 0: Attempt Recharge on Unconfigured Community MUST Be Rejected
    // --------------------------------------------------------------------------
    console.log('\n--- Test 0: Rejection of Recharge on Unconfigured Community ---');
    let unconfiguredErrorCaught = false;
    try {
      await walletService.createRechargeOrder(testUserId, testOrgId, 500);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Online payment gateway (Razorpay) has not been configured')) {
        unconfiguredErrorCaught = true;
      } else {
        throw err;
      }
    }
    assert.strictEqual(unconfiguredErrorCaught, true, 'createRechargeOrder must throw 400 when Razorpay is not configured');
    console.log('  ✓ Unconfigured community correctly blocked from creating wallet recharge order');

    // --------------------------------------------------------------------------
    // Admin Configuration: Setup Razorpay in IntegrationHub for the Community
    // --------------------------------------------------------------------------
    console.log('\n--- Admin Action: Community Admin configures Razorpay in Integration Hub ---');
    await integrationHubService.connect(
      testUserId,
      testOrgId,
      'razorpay',
      'Community Primary Razorpay',
      {
        keyId: 'rzp_test_12345678901234',
        keySecret: 'mock_key_secret_12345'
      }
    );
    console.log('  ✓ Community Admin successfully configured Razorpay in Integration Hub');

    // --------------------------------------------------------------------------
    // Test 1: Authoritative Order Creation & Normal Top-Up Verification
    // --------------------------------------------------------------------------
    console.log('\n--- Test 1: Authoritative Order Creation & Normal Top-Up ---');
    const rechargeAmount = 500;
    const orderData = await walletService.createRechargeOrder(testUserId, testOrgId, rechargeAmount);

    assert.ok(orderData.orderId, 'Should return orderId');
    assert.ok(orderData.paymentId, 'Should return authoritative paymentId');
    assert.strictEqual(orderData.amount, 50000, 'Razorpay amount in paise should be 50000 (₹500)');

    // Verify Payment document was persisted in pending state
    const paymentRecord = await Payment.findById(orderData.paymentId);
    assert.ok(paymentRecord, 'Authoritative Payment record must exist in DB');
    assert.strictEqual(paymentRecord.status, 'pending');
    assert.strictEqual(paymentRecord.amount, 500);
    assert.strictEqual(paymentRecord.referenceType, 'WalletRecharge');
    console.log('  ✓ Authoritative Payment record created in DB with status "pending"');

    // Simulate verification
    const mockPaymentId1 = `pay_mock_${Date.now()}_1`;
    const verifyResult1 = await walletService.verifyPaymentSignature(testUserId, testOrgId, {
      paymentId: orderData.paymentId.toString(),
      razorpay_order_id: orderData.orderId,
      razorpay_payment_id: mockPaymentId1,
      razorpay_signature: 'sig_mock_valid',
      amount: 500,
    });

    assert.strictEqual(verifyResult1.balance, 500, 'Wallet balance should now be 500');

    const updatedPayment1 = await Payment.findById(orderData.paymentId);
    assert.strictEqual(updatedPayment1.status, 'success', 'Payment status should be success');
    assert.strictEqual(updatedPayment1.gatewayTransactionId, mockPaymentId1);

    const txnCount1 = await WalletTransaction.countDocuments({ razorpay_payment_id: mockPaymentId1 });
    assert.strictEqual(txnCount1, 1, 'Exactly 1 transaction record should exist');
    console.log('  ✓ Normal top-up verified and credited balance to ₹500 successfully');

    // --------------------------------------------------------------------------
    // Test 2: Amount Tampering Vulnerability Rejection
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Amount Tampering Vulnerability Rejection ---');
    // Resident orders ₹200
    const orderDataTamper = await walletService.createRechargeOrder(testUserId, testOrgId, 200);
    const mockPaymentIdTamper = `pay_mock_${Date.now()}_tamper`;

    // Attacker submits verification claiming amount was ₹50,000
    let tamperingDetected = false;
    try {
      await walletService.verifyPaymentSignature(testUserId, testOrgId, {
        paymentId: orderDataTamper.paymentId.toString(),
        razorpay_order_id: orderDataTamper.orderId,
        razorpay_payment_id: mockPaymentIdTamper,
        razorpay_signature: 'sig_mock_tamper',
        amount: 50000, // Tampered client amount!
      });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Amount tampering detected')) {
        tamperingDetected = true;
      } else {
        throw err;
      }
    }

    assert.strictEqual(tamperingDetected, true, 'System MUST reject tampered amount with 400 HttpError');

    // Confirm wallet balance remained at ₹500, did not increase
    const walletAfterTamper = await walletService.getWalletData(testUserId, testOrgId);
    assert.strictEqual(walletAfterTamper.balance, 500, 'Wallet balance must remain unchanged at 500');
    console.log('  ✓ Amount tampering successfully blocked! Balance preserved.');

    // --------------------------------------------------------------------------
    // Test 3: Idempotency & Replay Attack Prevention
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Idempotency & Replay Attack Prevention (3x Replay) ---');
    // Replay the first valid verification payload 3 times
    for (let i = 1; i <= 3; i++) {
      const replayResult = await walletService.verifyPaymentSignature(testUserId, testOrgId, {
        paymentId: orderData.paymentId.toString(),
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: mockPaymentId1,
        razorpay_signature: 'sig_mock_valid',
        amount: 500,
      });

      assert.strictEqual(replayResult.balance, 500, `Replay attempt #${i} balance must remain ₹500`);
    }

    const txnCountAfterReplay = await WalletTransaction.countDocuments({ razorpay_payment_id: mockPaymentId1 });
    assert.strictEqual(txnCountAfterReplay, 1, 'Must still be exactly 1 transaction record despite 3 replays');

    const walletAfterReplay = await walletService.getWalletData(testUserId, testOrgId);
    assert.strictEqual(walletAfterReplay.balance, 500, 'Wallet balance MUST NOT be double-credited (must be 500)');
    console.log('  ✓ Replay attack mitigated! Balance was not double-credited across 3 retry requests.');

    // --------------------------------------------------------------------------
    // Test 4: Webhook Reconciliation Flow (Dropped Network Recovery)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Webhook Reconciliation Flow ---');
    // User places order for ₹1,000, but client loses internet before /verify-payment
    const webhookOrder = await walletService.createRechargeOrder(testUserId, testOrgId, 1000);
    const webhookPaymentRecord = await Payment.findById(webhookOrder.paymentId);
    assert.strictEqual(webhookPaymentRecord.status, 'pending');

    const webhookPaymentId = `pay_webhook_${Date.now()}`;

    const runInTransactionIfSupported = async (fn) => {
      try {
        await mongoose.connection.transaction(fn);
      } catch (err) {
        if (err.message && err.message.includes('Transaction numbers are only allowed on a replica set member')) {
          await fn(null);
        } else {
          throw err;
        }
      }
    };

    // Razorpay Webhook fires asynchronously
    await runInTransactionIfSupported(async (session) => {
      await walletService.handleWebhookRecharge(webhookPaymentRecord, webhookPaymentId, session);
      webhookPaymentRecord.status = 'success';
      webhookPaymentRecord.gatewayTransactionId = webhookPaymentId;
      await webhookPaymentRecord.save({ session });
    });

    const walletAfterWebhook = await walletService.getWalletData(testUserId, testOrgId);
    assert.strictEqual(walletAfterWebhook.balance, 1500, 'Wallet balance should now be 500 + 1000 = 1500');

    const webhookPaymentUpdated = await Payment.findById(webhookOrder.paymentId);
    assert.strictEqual(webhookPaymentUpdated.status, 'success', 'Payment record marked success by webhook');
    assert.strictEqual(webhookPaymentUpdated.gatewayTransactionId, webhookPaymentId);

    const webhookTxn = await WalletTransaction.findOne({ razorpay_payment_id: webhookPaymentId });
    assert.ok(webhookTxn, 'Wallet transaction created via webhook');
    assert.strictEqual(webhookTxn.amount, 1000);
    console.log('  ✓ Webhook successfully reconciled payment and credited ₹1,000 to wallet');

    // --------------------------------------------------------------------------
    // Test 5: Webhook Idempotency (Duplicate Webhook Delivery)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Duplicate Webhook Delivery Idempotency ---');
    // Razorpay resends webhook event
    await runInTransactionIfSupported(async (session) => {
      await walletService.handleWebhookRecharge(webhookPaymentUpdated, webhookPaymentId, session);
    });

    const walletAfterDupWebhook = await walletService.getWalletData(testUserId, testOrgId);
    assert.strictEqual(walletAfterDupWebhook.balance, 1500, 'Balance must remain 1500, no double crediting');
    console.log('  ✓ Duplicate webhook safely ignored without re-crediting.');

    console.log('\n==================================================================');
    console.log('  🎉 ALL WALLET SECURITY & IDEMPOTENCY TESTS PASSED CLEANLY!');
    console.log('==================================================================\n');

  } finally {
    // Cleanup test artifacts
    if (testOrgId) {
      await Organization.deleteOne({ _id: testOrgId });
      await IntegrationHub.deleteMany({ orgId: testOrgId });
    }
    if (testUserId) {
      await User.deleteOne({ _id: testUserId });
      await Wallet.deleteMany({ userId: testUserId });
      await WalletTransaction.deleteMany({ userId: testUserId });
      await Payment.deleteMany({ userId: testUserId });
    }
    await mongoose.disconnect();
  }
}

runWalletSecurityTests().catch((err) => {
  console.error('❌ Wallet Security Test Failed:', err);
  process.exit(1);
});
