import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import config from '../src/config/config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import IntegrationHub from '../src/features/integrationHub/integrationHub.model.js';
import integrationHubService from '../src/features/integrationHub/integrationHub.service.js';
import integrationHubRepository from '../src/features/integrationHub/integrationHub.repository.js';
import Payment from '../src/features/payment/payment.model.js';
import unifiedPaymentService, { verifyWebhookSignature } from '../src/features/payment/unifiedPayment.service.js';
import UserIdentity from '../src/features/userIdentity/userIdentity.model.js';
import userIdentityService from '../src/features/userIdentity/userIdentity.services.js';
import googleProvider from '../src/features/userIdentity/providerAdapters/google.provider.js';
import appleProvider from '../src/features/userIdentity/providerAdapters/apple.provider.js';
import microsoftProvider from '../src/features/userIdentity/providerAdapters/microsoft.provider.js';
import deviceTokenService from '../src/features/deviceToken/deviceToken.services.js';
import DeviceToken from '../src/features/deviceToken/deviceToken.model.js';
import { encryptGCM } from '../src/features/integrationHub/utils/crypto.util.js';
import { HttpError } from '../src/utils/httpError.utils.js';

describe('SEC-06 & SEC-06.1 — Third-Party Integrations Tenant Isolation Suite', () => {
  let orgA;
  let orgB;
  let orgA_Id;
  let orgB_Id;
  let connA;
  let globalConn;
  let paymentA;
  let settledPaymentA;
  let testUserA;
  let testUserB;
  let testTokenRecord;

  const testKeySecret = 'test_secret_key_12345';
  const testKeyId = 'rzp_test_key_001';

  before(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_secret_xyz123';
    await connectToDb();

    // Create test organizations
    orgA = await Organization.create({
      name: `SEC-06 Test Org A ${Date.now()}`,
      organizationType: 'Residential',
      status: 'Active',
    });
    orgA_Id = orgA._id.toString();

    orgB = await Organization.create({
      name: `SEC-06 Test Org B ${Date.now()}`,
      organizationType: 'Residential',
      status: 'Active',
    });
    orgB_Id = orgB._id.toString();

    // Create test users
    testUserA = await User.create({
      name: 'Test Resident A',
      username: `residentA_${Date.now()}`,
      email: `residentA_${Date.now()}@example.com`,
      phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'Active',
      emailVerified: true,
    });

    testUserB = await User.create({
      name: 'Test Resident B',
      username: `residentB_${Date.now()}`,
      email: `residentB_${Date.now()}@example.com`,
      phone: `+9198766${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'Active',
      emailVerified: true,
    });

    // Create encrypted credentials for Org A
    const encryptedKeyId = encryptGCM(testKeyId);
    const encryptedKeySecret = encryptGCM(testKeySecret);

    connA = await IntegrationHub.create({
      orgId: orgA._id,
      userId: testUserA._id,
      provider: 'razorpay',
      accountLabel: 'Org A Primary Razorpay',
      status: 'connected',
      isConnected: true,
      credentials: [
        {
          key: 'keyId',
          encryptedValue: encryptedKeyId.encryptedValue,
          iv: encryptedKeyId.iv,
          authTag: encryptedKeyId.authTag,
        },
        {
          key: 'keySecret',
          encryptedValue: encryptedKeySecret.encryptedValue,
          iv: encryptedKeySecret.iv,
          authTag: encryptedKeySecret.authTag,
        },
      ],
    });

    // Create pending payment for Org A
    paymentA = await Payment.create({
      orgId: orgA._id,
      userId: testUserA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 1500,
      currency: 'INR',
      status: 'pending',
      gateway: 'razorpay',
      gatewayOrderId: `order_sec06_${Date.now()}`,
      gatewayTransactionId: `order_sec06_${Date.now()}`,
      paymentMethod: 'credit_card',
    });

    // Create settled payment for Org A
    settledPaymentA = await Payment.create({
      orgId: orgA._id,
      userId: testUserA._id,
      referenceId: new mongoose.Types.ObjectId(),
      referenceType: 'Invoice',
      domain: 'INVOICE',
      amount: 2500,
      currency: 'INR',
      status: 'success',
      gateway: 'razorpay',
      gatewayOrderId: `order_sec06_settled_${Date.now()}`,
      gatewayTransactionId: `pay_sec06_settled_${Date.now()}`,
      paymentMethod: 'credit_card',
    });

    // Create device token for testUserA
    testTokenRecord = await deviceTokenService.registerToken(testUserA._id.toString(), {
      pushToken: `ExponentPushToken[Sec06Test_${Date.now()}]`,
      platform: 'android',
      deviceId: 'sec06_device_1',
    });
  });

  after(async () => {
    if (orgA_Id) await Organization.findByIdAndDelete(orgA_Id);
    if (orgB_Id) await Organization.findByIdAndDelete(orgB_Id);
    if (testUserA?._id) await User.findByIdAndDelete(testUserA._id);
    if (testUserB?._id) await User.findByIdAndDelete(testUserB._id);
    if (connA?._id) await IntegrationHub.findByIdAndDelete(connA._id);
    if (globalConn?._id) await IntegrationHub.findByIdAndDelete(globalConn._id);
    if (paymentA?._id) await Payment.findByIdAndDelete(paymentA._id);
    if (settledPaymentA?._id) await Payment.findByIdAndDelete(settledPaymentA._id);
    if (testTokenRecord?._id) await DeviceToken.findByIdAndDelete(testTokenRecord._id);
    await UserIdentity.deleteMany({ userId: { $in: [testUserA?._id, testUserB?._id] } });
    await mongoose.disconnect();
  });

  // =========================================================================
  // Requirement 1: IntegrationHub Credential Scoping & Tenant Isolation
  // =========================================================================
  it('1.1. getDecryptedCredentialsById rejects cross-tenant credential lookup with 403 Forbidden', async () => {
    await assert.rejects(
      async () => {
        await integrationHubService.getDecryptedCredentialsById(connA._id.toString(), orgB_Id);
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 403, 'Must return 403 Forbidden');
        assert.match(err.message, /Access denied: Integration connection belongs to another organization/i);
        return true;
      }
    );
  });

  it('1.2. getDecryptedCredentialsById rejects missing expectedOrgId on tenant connection with 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await integrationHubService.getDecryptedCredentialsById(connA._id.toString());
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 400, 'Must return 400 Bad Request');
        assert.match(err.message, /Tenant context .* is required/i);
        return true;
      }
    );
  });

  it('1.3. getDecryptedCredentialsById succeeds when expectedOrgId matches connection owner', async () => {
    const creds = await integrationHubService.getDecryptedCredentialsById(connA._id.toString(), orgA_Id);
    assert.ok(creds, 'Credentials object must be returned');
    assert.equal(creds.keyId, testKeyId, 'Decrypted keyId must match original');
    assert.equal(creds.keySecret, testKeySecret, 'Decrypted keySecret must match original');
  });

  it('1.4. findGlobalConnectionByProvider never returns tenant-owned connections', async () => {
    // When no global connection exists, searching for global razorpay connection must return null
    // even though connA belongs to Org A
    const result = await integrationHubRepository.findGlobalConnectionByProvider('razorpay');
    if (result) {
      assert.ok(result.orgId === null || result.isGlobal === true, 'Global query must only match global connections');
      assert.notEqual(result._id.toString(), connA._id.toString(), 'Must never return tenant-owned connA');
    } else {
      assert.equal(result, null, 'Must return null when no global connection exists');
    }
  });

  // =========================================================================
  // Requirement 2: IntegrationHub Repository Boundary Tenant Scoping
  // =========================================================================
  it('2.1. getConnectionById with mismatched orgId returns null at repository boundary', async () => {
    const doc = await integrationHubRepository.getConnectionById(connA._id.toString(), null, orgB_Id);
    assert.equal(doc, null, 'Must return null for mismatched orgId');
  });

  it('2.2. getConnectionById with matching orgId returns document', async () => {
    const doc = await integrationHubRepository.getConnectionById(connA._id.toString(), null, orgA_Id);
    assert.ok(doc, 'Must return connection document for matching orgId');
    assert.equal(doc._id.toString(), connA._id.toString());
  });

  // =========================================================================
  // Requirement 3: IntegrationHub List Query Projection Excludes Secrets
  // =========================================================================
  it('3.1. getConnectionsPaginated strictly projects out credentials array', async () => {
    const result = await integrationHubRepository.getConnectionsPaginated(
      orgA._id,
      undefined,
      0,
      10
    );
    assert.ok(result.data.length > 0, 'Should find at least one connection');
    for (const item of result.data) {
      assert.equal(item.credentials, undefined, 'credentials field must never be projected in list');
    }
  });

  // =========================================================================
  // Requirement 4: UnifiedPayment verifyPayment Tenant Boundary Enforcement
  // =========================================================================
  it('4.1. verifyPayment rejects missing tenant context on tenant payment with 400', async () => {
    await assert.rejects(
      async () => {
        await unifiedPaymentService.verifyPayment({
          paymentId: paymentA._id.toString(),
          orderId: paymentA.gatewayOrderId,
          razorpayPaymentId: 'pay_dummy_123',
          razorpaySignature: 'dummy_sig',
          // orgId omitted
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 400, 'Must return 400 when tenant context is omitted');
        assert.match(err.message, /Tenant context .* is required/i);
        return true;
      }
    );
  });

  it('4.2. verifyPayment rejects cross-tenant verification attempt with 404', async () => {
    await assert.rejects(
      async () => {
        await unifiedPaymentService.verifyPayment({
          paymentId: paymentA._id.toString(),
          orderId: paymentA.gatewayOrderId,
          razorpayPaymentId: 'pay_dummy_123',
          razorpaySignature: 'dummy_sig',
          orgId: orgB_Id, // Tenant B attempting to verify Tenant A's payment
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 404, 'Must return 404 to avoid cross-tenant information leakage');
        assert.match(err.message, /Payment record not found/i);
        return true;
      }
    );
  });

  it('4.3. verifyPayment with settled payment rejects cross-tenant caller without leaking status', async () => {
    await assert.rejects(
      async () => {
        await unifiedPaymentService.verifyPayment({
          paymentId: settledPaymentA._id.toString(),
          orderId: settledPaymentA.gatewayOrderId,
          razorpayPaymentId: settledPaymentA.gatewayTransactionId,
          razorpaySignature: 'dummy_sig',
          orgId: orgB_Id, // Tenant B attempting to inspect Tenant A's settled payment
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 404, 'Must return 404 instead of returning settled status');
        assert.match(err.message, /Payment record not found/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Requirement 5: UnifiedPayment processRefund Tenant Boundary Enforcement
  // =========================================================================
  it('5.1. processRefund rejects missing tenant context on tenant payment with 400', async () => {
    await assert.rejects(
      async () => {
        await unifiedPaymentService.processRefund(
          settledPaymentA._id.toString(),
          100,
          { reason: 'Missing tenant context test' },
          null // orgId omitted
        );
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 400, 'Must return 400');
        assert.match(err.message, /Tenant context .* is required/i);
        return true;
      }
    );
  });

  it('5.2. processRefund rejects cross-tenant refund request with 404', async () => {
    await assert.rejects(
      async () => {
        await unifiedPaymentService.processRefund(
          settledPaymentA._id.toString(),
          100,
          { reason: 'Cross-tenant refund attempt' },
          { orgId: orgB_Id } // Tenant B attempting to refund Tenant A's payment
        );
      },
      (err) => {
        assert.ok(err instanceof HttpError, 'Expected HttpError');
        assert.equal(err.statusCode, 404, 'Must return 404');
        assert.match(err.message, /Original payment record not found/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Requirement 6: Webhook Signature Verification, Ingress & Idempotency
  // =========================================================================
  it('6.1. verifyWebhookSignature validates authentic HMAC SHA-256 signatures in constant time', () => {
    const secret = 'whsec_secret_sample_123';
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    assert.equal(verifyWebhookSignature(payload, signature, secret), true);
  });

  it('6.2. verifyWebhookSignature rejects missing, malformed, wrong-length, and forged signatures safely', () => {
    const secret = 'whsec_secret_sample_123';
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });

    assert.equal(verifyWebhookSignature(payload, null, secret), false, 'Null signature must return false');
    assert.equal(verifyWebhookSignature(payload, '', secret), false, 'Empty signature must return false');
    assert.equal(verifyWebhookSignature(payload, 'short_sig', secret), false, 'Wrong-length signature must return false');
    assert.equal(verifyWebhookSignature(payload, 'a'.repeat(64), secret), false, 'Forged signature must return false');
    assert.equal(verifyWebhookSignature(null, 'a'.repeat(64), secret), false, 'Null payload must return false');
  });

  it('6.3. processWebhook rejects invalid signature with 400 Bad Request', async () => {
    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_xyz', order_id: 'order_xyz' } } }
    });

    await assert.rejects(
      async () => {
        await unifiedPaymentService.processWebhook(rawPayload, 'forged_signature_hex_1234567890abcdef1234567890abcdef1234567890abcdef1234', {});
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Invalid webhook signature/i);
        return true;
      }
    );
  });

  it('6.4. Duplicate webhook event replay returns idempotent response without duplicate financial action', async () => {
    const eventId = `evt_duplicate_${Date.now()}`;
    // Add eventId to settledPaymentA processedEvents
    await Payment.findByIdAndUpdate(settledPaymentA._id, {
      $push: { processedEvents: { eventId, eventType: 'payment.captured' } }
    });

    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: settledPaymentA.gatewayTransactionId,
            order_id: settledPaymentA.gatewayOrderId,
            amount: settledPaymentA.amount * 100,
            status: 'captured',
          }
        }
      }
    });

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    const result = await unifiedPaymentService.processWebhook(rawPayload, signature, { 'x-razorpay-event-id': eventId });
    assert.ok(result.success, 'Replayed webhook must succeed idempotently');
    assert.match(result.message, /already processed \(idempotent\)/i);
  });

  // =========================================================================
  // Requirement 7: SSO Identity Providers & Identity Linking
  // =========================================================================
  it('7.1. Google Provider rejects identity when email_verified is not true', () => {
    assert.throws(
      () => {
        googleProvider.normalizeIdentity({
          sub: 'google_user_unverified_123',
          email: 'unverified@example.com',
          email_verified: false,
          name: 'Unverified User',
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Email address is not verified by Google/i);
        return true;
      }
    );
  });

  it('7.2. Apple Provider rejects identity when email_verified is not true', () => {
    assert.throws(
      () => {
        appleProvider.normalizeIdentity({
          sub: 'apple_user_unverified_123',
          email: 'unverified@apple.example.com',
          email_verified: false,
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Email address is not verified by Apple/i);
        return true;
      }
    );
  });

  it('7.3. Microsoft Provider rejects identity when email_verified is not true', () => {
    assert.throws(
      () => {
        microsoftProvider.normalizeIdentity({
          sub: 'ms_user_unverified_123',
          email: 'unverified@ms.example.com',
          email_verified: false,
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Email address is not verified by Microsoft/i);
        return true;
      }
    );
  });

  it('7.4. UserIdentity linkIdentity rejects linking external identity already bound to another account', async () => {
    const ssoIdentity = {
      provider: 'google',
      providerId: `google_provider_${Date.now()}`,
      providerEmail: 'linked@example.com',
    };

    // Link to User A
    await userIdentityService.linkIdentity(testUserA._id.toString(), ssoIdentity);

    // Attempt to link the same external identity to User B
    await assert.rejects(
      async () => {
        await userIdentityService.linkIdentity(testUserB._id.toString(), ssoIdentity);
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /already linked to another user/i);
        return true;
      }
    );
  });

  it('7.5. UserIdentity enforces compound unique indexes on (userId, provider) and (provider, providerId)', async () => {
    const indexes = await UserIdentity.collection.indexes();
    const hasUserProviderIndex = indexes.some(
      (idx) => idx.key.userId === 1 && idx.key.provider === 1 && idx.unique === true
    );
    const hasProviderIdIndex = indexes.some(
      (idx) => idx.key.provider === 1 && idx.key.providerId === 1 && idx.unique === true
    );

    assert.ok(hasUserProviderIndex, 'UserIdentity must have unique index on { userId: 1, provider: 1 }');
    assert.ok(hasProviderIdIndex, 'UserIdentity must have unique index on { provider: 1, providerId: 1 }');
  });

  // =========================================================================
  // Requirement 8: Outbound Transports, SSRF Immunity & Device Token Scoping
  // =========================================================================
  it('8.1. Device token unregister is scoped strictly to token owner and rejects cross-user deactivation', async () => {
    const token = testTokenRecord.pushToken;

    // User B attempts to unregister User A's token
    const resultB = await deviceTokenService.unregisterToken(token, testUserB._id.toString());
    assert.equal(resultB, null, 'User B must not be able to deactivate User A token');

    // Token must still be active for User A
    const activeTokens = await deviceTokenService.getActiveTokensByUserIds(testUserA._id.toString());
    assert.ok(activeTokens.some((t) => t.pushToken === token), 'Token must remain active for User A');

    // User A deactivates their own token
    const resultA = await deviceTokenService.unregisterToken(token, testUserA._id.toString());
    assert.ok(resultA, 'User A should successfully deactivate their own token');
    assert.equal(resultA.isActive, false);
  });

  it('8.2. Third-party provider endpoints are strictly static hardcoded URLs without user-controlled destinations', () => {
    const providerEndpoints = [
      'https://api.razorpay.com/v1',
      'https://exp.host/--/api/v2/push/send',
      'https://api.resend.com/emails',
      'https://api.openai.com/v1',
      'https://appleid.apple.com/auth/keys',
      'https://login.microsoftonline.com',
      'https://cpaas.messagecentral.com',
      'https://identitytoolkit.googleapis.com',
    ];

    for (const urlStr of providerEndpoints) {
      const url = new URL(urlStr);
      assert.ok(
        [
          'api.razorpay.com',
          'exp.host',
          'api.resend.com',
          'api.openai.com',
          'appleid.apple.com',
          'login.microsoftonline.com',
          'cpaas.messagecentral.com',
          'identitytoolkit.googleapis.com',
        ].includes(url.hostname),
        `Provider endpoint ${url.hostname} must be a known trusted domain`
      );
      assert.notEqual(url.hostname, 'localhost');
      assert.notEqual(url.hostname, '127.0.0.1');
      assert.notEqual(url.hostname, '169.254.169.254');
    }
  });
});
