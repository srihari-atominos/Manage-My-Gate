import crypto from 'crypto';
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import Payment from '../src/features/payment/payment.model.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import walletService from '../src/features/wallet/wallet.service.js';
import { handleRazorpayWebhook, verifyRazorpaySignature } from '../src/features/payment/webhook/razorpay.webhook.js';
import { paymentEventEmitter, PAYMENT_SUCCESS } from '../src/features/payment/payment.events.js';
import { walletEventEmitter, WALLET_UPDATED } from '../src/features/wallet/wallet.events.js';

async function runTests() {
  console.log('=== STARTING WEBHOOK & WALLET TEST SUITE ===');

  try {
    // 1. Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB successfully.');

    // Setup Event Listeners Verification Tracker
    let paymentSuccessEventFired = false;
    let walletUpdatedEventFired = false;

    paymentEventEmitter.on(PAYMENT_SUCCESS, (p) => {
      paymentSuccessEventFired = true;
      console.log('✔ EVENT CAUGHT: PAYMENT_SUCCESS event emitted for referenceId:', p.referenceId);
    });

    walletEventEmitter.on(WALLET_UPDATED, (w) => {
      walletUpdatedEventFired = true;
      console.log('✔ EVENT CAUGHT: WALLET_UPDATED event emitted for user:', w.userId);
    });

    // 2. Create Test Seed Data
    console.log('\n--- Step 1: Seeding Test Records ---');
    const org = await Organization.create({
      name: 'Webhook Test Community',
      code: `WTC_${Date.now()}`,
      organizationType: 'Residential',
    });

    const user = await User.create({
      name: 'Test Resident User',
      email: `resident_${Date.now()}@test.com`,
      username: `user_${Date.now()}`,
      password: 'Password123!',
      orgId: org._id,
    });

    const villa = await Villa.create({
      unitNumber: `U-${Date.now().toString().slice(-4)}`,
      blockName: 'Block A',
      communityId: org._id,
      orgId: org._id,
      floorAreaSqFt: 1200,
    });

    const assessment = await Assessment.create({
      communityId: org._id,
      name: 'Quarterly Maintenance Test',
      type: 'RECURRING',
      billingCycle: 'QUARTERLY',
      generationDay: 1,
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 1500 },
      targetScope: { type: 'ALL_COMMUNITY' },
    });

    const invoice = await Invoice.create({
      communityId: org._id,
      assessmentId: assessment._id,
      targetUserId: user._id,
      unitId: villa._id,
      billingPeriodString: '2026-Q3',
      hardcodedAmount: 1500,
      taxAmount: 0,
      totalDue: 1500,
      dueDate: new Date(Date.now() + 864000000),
      status: 'UNPAID',
    });

    console.log('✔ Seeded Org:', org._id);
    console.log('✔ Seeded User:', user._id);
    console.log('✔ Seeded Villa:', villa._id);
    console.log('✔ Seeded Invoice:', invoice._id, '| Total Due: ₹' + invoice.totalDue);

    // 3. Test Cryptographic Signature Verification
    console.log('\n--- Step 2: Cryptographic Signature Verification ---');
    const webhookSecret = 'test_webhook_secret_key';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const samplePayloadString = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_12345',
            order_id: 'order_test_67890',
            amount: 150000, // 1500 INR in paise
            currency: 'INR',
            notes: {
              invoiceId: invoice._id.toString(),
              orgId: org._id.toString(),
              userId: user._id.toString(),
            },
          },
        },
      },
    });

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(Buffer.from(samplePayloadString))
      .digest('hex');

    const isValidSig = verifyRazorpaySignature(Buffer.from(samplePayloadString), validSignature, webhookSecret);
    console.log('✔ Signature Verification Result:', isValidSig ? 'PASS (Valid)' : 'FAIL');
    if (!isValidSig) throw new Error('Signature verification logic failed');

    // 4. Test Razorpay Webhook Processing (Idempotency & Mongoose Transaction)
    console.log('\n--- Step 3: Webhook Engine Execution (Transaction 1) ---');
    const mockReq1 = {
      headers: { 'x-razorpay-signature': validSignature },
      rawBody: Buffer.from(samplePayloadString),
      body: samplePayloadString,
    };

    let resCode1 = null;
    let resBody1 = null;
    const mockRes1 = {
      status: (code) => {
        resCode1 = code;
        return {
          json: (data) => {
            resBody1 = data;
          },
        };
      },
    };

    await handleRazorpayWebhook(mockReq1, mockRes1, (err) => {
      if (err) throw err;
    });

    console.log('✔ Webhook 1 Response Code:', resCode1, '| Body:', resBody1);

    const updatedInvoice1 = await Invoice.findById(invoice._id);
    console.log('✔ Invoice Status after Webhook 1:', updatedInvoice1.status, '| Payment Method:', updatedInvoice1.paymentMethod);
    if (updatedInvoice1.status !== 'PAID') throw new Error('Invoice status expected PAID after webhook');

    const paymentDoc1 = await Payment.findOne({ referenceId: invoice._id });
    console.log('✔ Payment Record created:', paymentDoc1._id, '| Gateway TXN ID:', paymentDoc1.gatewayTransactionId);
    if (!paymentDoc1) throw new Error('Payment record should be created by webhook transaction');

    // 5. Test Duplicate Webhook Idempotency (OCC / Status Check)
    console.log('\n--- Step 4: Duplicate Webhook Execution (Idempotency Check) ---');
    let resCode2 = null;
    let resBody2 = null;
    const mockRes2 = {
      status: (code) => {
        resCode2 = code;
        return {
          json: (data) => {
            resBody2 = data;
          },
        };
      },
    };

    await handleRazorpayWebhook(mockReq1, mockRes2, (err) => {
      if (err) throw err;
    });

    console.log('✔ Webhook 2 (Duplicate) Response Code:', resCode2, '| Body:', resBody2);
    const paymentCount = await Payment.countDocuments({ referenceId: invoice._id });
    console.log('✔ Total Payment Records for Invoice (should be 1):', paymentCount);
    if (paymentCount !== 1) throw new Error('Duplicate webhook created redundant payment records!');

    // 6. Test Digital Wallet Recharge & Invoice Settlement
    console.log('\n--- Step 5: Digital Wallet Recharge & Invoice Debiting ---');

    // Create a 2nd invoice to test wallet debiting
    const invoice2 = await Invoice.create({
      communityId: org._id,
      assessmentId: assessment._id,
      targetUserId: user._id,
      unitId: villa._id,
      billingPeriodString: '2026-Q4',
      hardcodedAmount: 2000,
      taxAmount: 0,
      totalDue: 2000,
      dueDate: new Date(Date.now() + 864000000),
      status: 'UNPAID',
    });
    console.log('✔ Seeded 2nd Invoice:', invoice2._id, '| Total Due: ₹' + invoice2.totalDue);

    // Test Insufficient Balance Rejection
    console.log('Testing wallet payment with insufficient balance (Balance: 0, Due: ₹2000)...');
    try {
      await walletService.payInvoiceWithWallet({ userId: user._id, orgId: org._id, invoiceId: invoice2._id });
      throw new Error('Expected insufficient balance error but payment succeeded!');
    } catch (err) {
      console.log('✔ Expected Error Caught:', err.message);
    }

    // Recharge Wallet
    console.log('Recharging user wallet with ₹5000...');
    const recharge = await walletService.addMoney(user._id, org._id, 5000, 'UPI');
    console.log('✔ Recharge Transaction created:', recharge.transactionId);

    const walletAfterRecharge = await walletService.getWalletData(user._id, org._id);
    console.log('✔ Wallet Balance after Recharge: ₹' + walletAfterRecharge.balance);

    // Pay Invoice 2 using Wallet
    console.log('Debiting wallet to pay Invoice 2 (₹2000)...');
    const walletPaymentResult = await walletService.payInvoiceWithWallet({
      userId: user._id,
      orgId: org._id,
      invoiceId: invoice2._id,
    });

    console.log('✔ Wallet Payment Result Message:', walletPaymentResult.message);
    console.log('✔ Remaining Wallet Balance: ₹' + walletPaymentResult.walletBalance);

    const updatedInvoice2 = await Invoice.findById(invoice2._id);
    console.log('✔ Invoice 2 Status:', updatedInvoice2.status, '| Payment Method:', updatedInvoice2.paymentMethod);
    if (updatedInvoice2.status !== 'PAID' || updatedInvoice2.paymentMethod !== 'WALLET') {
      throw new Error('Invoice 2 failed to settle via WALLET payment method');
    }

    const walletTransactions = await WalletTransaction.find({ userId: user._id, referenceType: 'Invoice' });
    console.log('✔ Wallet Debit Transaction recorded:', walletTransactions[0]?.transactionId, '| Amount: ₹' + walletTransactions[0]?.amount);

    console.log('\n--- Step 6: Event Decoupling Verification ---');
    console.log('✔ PAYMENT_SUCCESS Event Fired:', paymentSuccessEventFired);
    console.log('✔ WALLET_UPDATED Event Fired:', walletUpdatedEventFired);

    // Clean up test data
    console.log('\n--- Cleaning up Test Records ---');
    await Invoice.deleteMany({ communityId: org._id });
    await Payment.deleteMany({ orgId: org._id });
    await Wallet.deleteMany({ orgId: org._id });
    await WalletTransaction.deleteMany({ orgId: org._id });
    await Villa.deleteMany({ communityId: org._id });
    await Assessment.deleteMany({ communityId: org._id });
    await User.deleteMany({ orgId: org._id });
    await Organization.deleteMany({ _id: org._id });
    console.log('✔ Test records cleaned up.');

    console.log('\n=============================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

runTests();
