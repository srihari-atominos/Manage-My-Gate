/**
 * Verification Test Suite for Phase 4: Secure Mobile Deep Linking & Installation Recovery
 * 
 * Verifies:
 * 1. Mobile handoff ticket creation by authenticated active user
 * 2. Successful atomic exchange for authenticated mobile session and scoped JWT
 * 3. Replay attack resistance (second exchange fails with 400)
 * 4. Expiration enforcement (expired handoff ticket rejected with 400)
 * 5. Unauthenticated handoff creation rejection (401)
 * 6. Server-side context derivation (tamper resistance)
 * 7. Concurrent race condition handling (atomic findOneAndUpdate guarantees single consumer)
 * 8. Invalid / non-existent handoff ticket rejection (400)
 * 9. Suspended / inactive user protection (403)
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import authService from '../src/features/auth/auth.services.js';
import tokenService from '../src/features/token/token.services.js';
import Token from '../src/features/token/token.model.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import Session from '../src/features/session/session.model.js';
import { verifyToken } from '../src/utils/jwt.utils.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  PASS: ${message}`);
}

async function runTests() {
  console.log('=== Starting Phase 4 Mobile Handoff Verification Tests ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  try {
    // 0. Setup test fixtures
    const timestamp = Date.now();
    const testOrgName = `Phase4 Test Org ${timestamp}`;
    const org = await Organization.create({
      name: testOrgName,
      address: '404 Mobile Link Ave',
      contactEmail: `admin_${timestamp}@phase4test.com`,
      contactPhone: '+19998887777',
      organizationType: 'Residential',
      status: 'Active',
    });

    let residentRole = await Role.findOne({ name: 'Resident' });
    if (!residentRole) {
      residentRole = await Role.create({
        name: 'Resident',
        description: 'Resident Role',
        isSystem: true,
      });
    }

    const testActiveUser = await User.create({
      email: `active_mobile_${timestamp}@phase4test.com`,
      username: `active_mob_${timestamp}`,
      password: 'HashedPassword123!',
      name: 'Active Mobile User',
      status: 'Active',
      organizationId: org._id,
      role: 'Resident',
    });

    await OrgMembership.create({
      userId: testActiveUser._id,
      orgId: org._id,
      roleId: residentRole._id,
      roleIds: [residentRole._id],
      status: 'Active',
    });

    const testInactiveUser = await User.create({
      email: `inactive_mobile_${timestamp}@phase4test.com`,
      username: `inact_mob_${timestamp}`,
      password: 'HashedPassword123!',
      name: 'Inactive Mobile User',
      status: 'Suspended',
      organizationId: org._id,
    });

    // -------------------------------------------------------------
    // Test 1: Handoff ticket creation by authenticated active user
    // -------------------------------------------------------------
    console.log('Test 1: Handoff ticket creation by authenticated active user');
    const handoffResult = await authService.createInviteHandoff(testActiveUser._id, org._id);

    assert(!!handoffResult.handoffId, 'Opaque handoffId generated');
    assert(handoffResult.handoffId.length === 64, 'handoffId is 64-character hex (32 secure bytes)');
    assert(handoffResult.deepLink.startsWith('managemygate://invite/handoff/'), 'deepLink uses managemygate scheme and /invite/handoff path');
    assert(handoffResult.deepLink.includes(handoffResult.handoffId), 'deepLink embeds opaque handoffId');
    assert(handoffResult.universalLink.includes('/invite/handoff/'), 'universalLink uses HTTPS domain and /invite/handoff path');
    assert(handoffResult.playStoreUrl.includes('referrer='), 'playStoreUrl contains install referrer parameter');
    assert(decodeURIComponent(handoffResult.playStoreUrl).includes(`handoffId=${handoffResult.handoffId}`), 'playStoreUrl embeds handoffId in referrer');

    // Verify stored representation in DB
    const rawHandoffId = handoffResult.handoffId;
    const hashedToken = crypto.createHash('sha256').update(rawHandoffId).digest('hex');
    const tokenDoc = await Token.findOne({ token: hashedToken, type: 'MOBILE_HANDOFF' });

    assert(!!tokenDoc, 'Token document exists in database matching SHA-256 hash');
    assert(tokenDoc.status === 'PENDING', 'Token initial status is PENDING');
    assert(tokenDoc.used === false, 'Token used flag is false');
    assert(tokenDoc.userId.toString() === testActiveUser._id.toString(), 'Token userId matches active user');
    assert(tokenDoc.orgId.toString() === org._id.toString(), 'Token orgId matches active org');
    console.log('');

    // -------------------------------------------------------------
    // Test 2: Successful atomic exchange of mobile handoff ticket
    // -------------------------------------------------------------
    console.log('Test 2: Successful atomic exchange of mobile handoff ticket');
    const exchangeResult = await authService.exchangeInviteHandoff(rawHandoffId, {
      deviceName: 'Pixel 8 Test Device',
      os: 'Android 14',
    });

    assert(!!exchangeResult.token, 'Exchange returns signed access JWT');
    assert(!!exchangeResult.refreshToken, 'Exchange returns session refresh token');
    assert(!!exchangeResult.user, 'Exchange returns formatted user profile');
    assert(exchangeResult.user.id.toString() === testActiveUser._id.toString(), 'Exchanged user matches authenticated user');
    assert(exchangeResult.user.email === testActiveUser.email, 'Exchanged user email matches');
    assert(exchangeResult.user.orgId.toString() === org._id.toString(), 'User active workspace orgId matches');

    // Verify JWT claims
    const decodedJwt = verifyToken(exchangeResult.token);
    assert(decodedJwt.id === testActiveUser._id.toString(), 'JWT claim matches user ID');
    assert(decodedJwt.orgId === org._id.toString(), 'JWT claim matches org ID');

    // Verify database state transitioned to EXCHANGED
    const updatedTokenDoc = await Token.findById(tokenDoc._id);
    assert(updatedTokenDoc.status === 'EXCHANGED', 'Token status atomically updated to EXCHANGED');
    assert(updatedTokenDoc.used === true, 'Token used flag updated to true');
    assert(!!updatedTokenDoc.usedAt, 'Token usedAt timestamp recorded');

    // Verify Session collection entry
    const sessionDoc = await Session.findOne({ userId: testActiveUser._id, status: 'Active' });
    assert(!!sessionDoc, 'Active mobile session record created in database');
    assert(sessionDoc.deviceName === 'Pixel 8 Test Device', 'Session records client deviceName');
    console.log('');

    // -------------------------------------------------------------
    // Test 3: Replay attack resistance
    // -------------------------------------------------------------
    console.log('Test 3: Replay attack resistance (second exchange must fail)');
    let replayFailedAsExpected = false;
    try {
      await authService.exchangeInviteHandoff(rawHandoffId);
    } catch (err) {
      replayFailedAsExpected = true;
      assert(err.statusCode === 400, 'Replay attempt fails with 400 Bad Request');
      assert(err.message.includes('already been used'), 'Replay error message explicitly states already used');
    }
    assert(replayFailedAsExpected, 'Replay attack prevented successfully');
    console.log('');

    // -------------------------------------------------------------
    // Test 4: Expiration enforcement
    // -------------------------------------------------------------
    console.log('Test 4: Expiration enforcement (expired handoff ticket rejected)');
    const expiredTicket = await authService.createInviteHandoff(testActiveUser._id, org._id);
    const expiredHash = crypto.createHash('sha256').update(expiredTicket.handoffId).digest('hex');
    
    // Forcibly expire token in DB
    await Token.updateOne(
      { token: expiredHash },
      { $set: { expiresAt: new Date(Date.now() - 60 * 1000) } }
    );

    let expiredFailedAsExpected = false;
    try {
      await authService.exchangeInviteHandoff(expiredTicket.handoffId);
    } catch (err) {
      expiredFailedAsExpected = true;
      assert(err.statusCode === 400, 'Expired handoff fails with 400 Bad Request');
      assert(err.message.includes('expired'), 'Expired error message explicitly states expired');
    }
    assert(expiredFailedAsExpected, 'Expired handoff rejected successfully');
    console.log('');

    // -------------------------------------------------------------
    // Test 5: Unauthenticated handoff creation rejection
    // -------------------------------------------------------------
    console.log('Test 5: Unauthenticated handoff creation rejection');
    let unauthFailed = false;
    try {
      await authService.createInviteHandoff(null);
    } catch (err) {
      unauthFailed = true;
      assert(err.statusCode === 401, 'Unauthenticated creation rejected with 401');
    }
    assert(unauthFailed, 'Unauthenticated handoff creation prevented');
    console.log('');

    // -------------------------------------------------------------
    // Test 6: Server-side context derivation (tamper resistance)
    // -------------------------------------------------------------
    console.log('Test 6: Server-side context derivation (tamper resistance)');
    const ticket6 = await authService.createInviteHandoff(testActiveUser._id, org._id);
    // Exchange endpoint only accepts rawHandoffId - client cannot pass forged userId or targetOrgId
    const res6 = await authService.exchangeInviteHandoff(ticket6.handoffId);
    assert(res6.user.orgId.toString() === org._id.toString(), 'Server authoritative orgId derived correctly');
    assert(res6.user.id.toString() === testActiveUser._id.toString(), 'Server authoritative userId derived correctly');
    console.log('');

    // -------------------------------------------------------------
    // Test 7: Concurrent race condition handling (atomic findOneAndUpdate)
    // -------------------------------------------------------------
    console.log('Test 7: Concurrent race condition handling');
    const raceTicket = await authService.createInviteHandoff(testActiveUser._id, org._id);
    
    const results = await Promise.allSettled([
      authService.exchangeInviteHandoff(raceTicket.handoffId),
      authService.exchangeInviteHandoff(raceTicket.handoffId),
      authService.exchangeInviteHandoff(raceTicket.handoffId),
    ]);

    const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = results.filter((r) => r.status === 'rejected').length;

    assert(fulfilledCount === 1, `Exactly 1 concurrent request succeeded (actual: ${fulfilledCount})`);
    assert(rejectedCount === 2, `Remaining 2 concurrent requests failed (actual: ${rejectedCount})`);
    console.log('');

    // -------------------------------------------------------------
    // Test 8: Invalid / non-existent handoff ticket rejection
    // -------------------------------------------------------------
    console.log('Test 8: Invalid / non-existent handoff ticket rejection');
    let invalidFailed = false;
    try {
      await authService.exchangeInviteHandoff('non_existent_fake_handoff_identifier_1234567890');
    } catch (err) {
      invalidFailed = true;
      assert(err.statusCode === 400, 'Non-existent handoff rejected with 400 Bad Request');
      assert(err.message.includes('Invalid') || err.message.includes('not valid'), 'Informative error message returned');
    }
    assert(invalidFailed, 'Invalid handoff rejected safely');
    console.log('');

    // -------------------------------------------------------------
    // Test 9: Suspended / inactive user protection
    // -------------------------------------------------------------
    console.log('Test 9: Suspended / inactive user protection');
    let suspendedCreationBlocked = false;
    try {
      await authService.createInviteHandoff(testInactiveUser._id, org._id);
    } catch (err) {
      suspendedCreationBlocked = true;
      assert(err.statusCode === 403, 'Inactive user handoff creation blocked with 403');
    }
    assert(suspendedCreationBlocked, 'Suspended user creation blocked');

    // Create a ticket for an active user, then suspend the user before exchange
    const doomedUser = await User.create({
      email: `doomed_${timestamp}@phase4test.com`,
      username: `doomed_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      organizationId: org._id,
    });
    const doomedTicket = await authService.createInviteHandoff(doomedUser._id, org._id);
    
    // Suspend user
    await User.updateOne({ _id: doomedUser._id }, { $set: { status: 'Suspended' } });

    let suspendedExchangeBlocked = false;
    try {
      await authService.exchangeInviteHandoff(doomedTicket.handoffId);
    } catch (err) {
      suspendedExchangeBlocked = true;
      assert(err.statusCode === 403, 'Suspended user handoff exchange blocked with 403');
    }
    assert(suspendedExchangeBlocked, 'Suspended user handoff exchange blocked safely');
    console.log('');

    // Cleanup test artifacts
    await User.deleteMany({ email: { $regex: `@phase4test\\.com$` } });
    await Organization.deleteOne({ _id: org._id });
    await OrgMembership.deleteMany({ orgId: org._id });
    await Token.deleteMany({ orgId: org._id });
    await Session.deleteMany({ userId: testActiveUser._id });

    console.log(`\n========================================`);
    console.log(`All Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`========================================\n`);

  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
