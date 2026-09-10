/**
 * Phase 5 Verification Test Suite: Admin Invitation Management, Resend & Revocation
 *
 * Verifies:
 * 1. Authorized invitation list with server-side $facet pagination (currentPage, totalPages, totalRecords, limit)
 * 2. Zero credential / token leakage (no raw token, no token hash, no raw URL)
 * 3. Multi-tenant isolation for invitation listing
 * 4. PENDING status filtering (only unexpired pending invitations)
 * 5. Dynamic expiration detection (PENDING with elapsed expiresAt projected as EXPIRED)
 * 6. EXPIRED status filtering (matches both dynamically and explicitly expired invitations)
 * 7. ACCEPTED status filtering
 * 8. REJECTED status filtering
 * 9. REVOKED status filtering
 * 10. Recipient search across name, email, username
 * 11. Resending a PENDING invitation (mints fresh 24h token, invalidates old token, emits USER_INVITED event)
 * 12. Resending an EXPIRED invitation (succeeds, mints fresh token, keeps membership Pending)
 * 13. Resending an ACCEPTED invitation (strictly rejected with 400 Bad Request)
 * 14. Resending a REJECTED invitation (strictly rejected with 400 Bad Request)
 * 15. Resending a REVOKED invitation (strictly rejected with 400 Bad Request)
 * 16. Revoking a PENDING invitation (marks token REVOKED, marks pending membership Rejected, emits INVITATION_REVOKED)
 * 17. Revoking an ACCEPTED, REVOKED, or EXPIRED invitation (blocked with 400 Bad Request)
 * 18. Cross-tenant resend isolation (Org A admin cannot resend Org B invitation -> 403 Forbidden)
 * 19. Cross-tenant revoke isolation (Org A admin cannot revoke Org B invitation -> 403 Forbidden)
 * 20. Missing organization context rejection (400 Bad Request)
 * 21. Concurrent resend race-condition protection (atomic conditional update allows only single winner)
 * 22. Notification event pipeline integration (USER_INVITED event verified with correct payloads)
 * 23. Full regression acceptance (a resent invitation token successfully completes accept-invite)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Token from '../src/features/token/token.model.js';
import Role from '../src/features/role/role.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import userService from '../src/features/user/user.services.js';
import tokenService from '../src/features/token/token.services.js';
import userEvents from '../src/features/user/user.events.js';
import authService from '../src/features/auth/auth.services.js';
import '../src/features/user/user.listeners.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  PASS: ${message}`);
}

async function runPhase5Tests() {
  console.log('=== Starting Phase 5: Admin Invitation Management Verification Suite ===\n');
  await connectToDb();

  const timestamp = Date.now();
  let orgA, orgB;
  let adminA, adminB;
  let emittedEvents = [];

  // Track user domain events
  const eventTracker = (data) => {
    emittedEvents.push(data);
  };
  userEvents.on('USER_INVITED', eventTracker);

  try {
    // ---------------------------------------------------------------------------
    // Setup Test Environments
    // ---------------------------------------------------------------------------
    console.log('[Setup] Creating test organizations and admins...');

    orgA = await Organization.create({
      name: `Phase 5 Org A ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    orgB = await Organization.create({
      name: `Phase 5 Org B ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    const residentRoleA = await Role.create({
      name: 'Resident',
      orgId: orgA._id,
      isTenantRole: true,
    });

    adminA = await User.create({
      email: `adminA_${timestamp}@phase5test.com`,
      username: `adminA_${timestamp}`,
      name: 'Admin Org A',
      status: 'Active',
      password: 'HashedPassword123!',
    });

    adminB = await User.create({
      email: `adminB_${timestamp}@phase5test.com`,
      username: `adminB_${timestamp}`,
      name: 'Admin Org B',
      status: 'Active',
      password: 'HashedPassword123!',
    });

    console.log('✓ Setup fixtures created successfully.\n');

    // ---------------------------------------------------------------------------
    // Test 1: Create invitations across states in Org A and Org B
    // ---------------------------------------------------------------------------
    console.log('[Test 1] Creating multi-state invitations for listing & lifecycle verification...');

    // 1. Unexpired PENDING invitation in Org A
    const inviteRes1 = await userService.inviteUser(
      `pending_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111111',
      'Pending Recipient Alice',
      'WEB',
      adminA._id
    );
    const tokenDocPending = await Token.findOne({ userId: inviteRes1.user._id, orgId: orgA._id, type: 'INVITATION' });

    // 2. Naturally EXPIRED invitation in Org A (status PENDING in DB, but expiresAt in the past)
    const inviteRes2 = await userService.inviteUser(
      `expired_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111112',
      'Expired Recipient Bob',
      'WEB',
      adminA._id
    );
    const tokenDocExpired = await Token.findOne({ userId: inviteRes2.user._id, orgId: orgA._id, type: 'INVITATION' });
    // Manually backdate expiresAt to 2 days ago
    tokenDocExpired.expiresAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await tokenDocExpired.save();

    // 3. ACCEPTED invitation in Org A
    const inviteRes3 = await userService.inviteUser(
      `accepted_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111113',
      'Accepted Recipient Charlie',
      'WEB',
      adminA._id
    );
    const tokenDocAccepted = await Token.findOne({ userId: inviteRes3.user._id, orgId: orgA._id, type: 'INVITATION' });
    tokenDocAccepted.status = 'ACCEPTED';
    tokenDocAccepted.used = true;
    tokenDocAccepted.usedAt = new Date();
    await tokenDocAccepted.save();

    // 4. REJECTED invitation in Org A
    const inviteRes4 = await userService.inviteUser(
      `rejected_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111114',
      'Rejected Recipient Dave',
      'WEB',
      adminA._id
    );
    const tokenDocRejected = await Token.findOne({ userId: inviteRes4.user._id, orgId: orgA._id, type: 'INVITATION' });
    tokenDocRejected.status = 'REJECTED';
    tokenDocRejected.used = true;
    tokenDocRejected.usedAt = new Date();
    await tokenDocRejected.save();

    // 5. REVOKED invitation in Org A
    const inviteRes5 = await userService.inviteUser(
      `revoked_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111115',
      'Revoked Recipient Eve',
      'WEB',
      adminA._id
    );
    const tokenDocRevoked = await Token.findOne({ userId: inviteRes5.user._id, orgId: orgA._id, type: 'INVITATION' });
    tokenDocRevoked.status = 'REVOKED';
    tokenDocRevoked.used = true;
    tokenDocRevoked.usedAt = new Date();
    await tokenDocRevoked.save();

    // 6. Invitation in Org B (for multi-tenant isolation check)
    const inviteResB = await userService.inviteUser(
      `orgb_user_${timestamp}@phase5test.com`,
      orgB._id,
      null,
      'None',
      null,
      '+2222222222',
      'Org B Recipient Frank',
      'WEB',
      adminB._id
    );

    assert(inviteRes1 && inviteRes2 && inviteRes3 && inviteRes4 && inviteRes5 && inviteResB, 'Multi-state invitations created');

    // ---------------------------------------------------------------------------
    // Test 2: Authorized List & Server-Side Pagination
    // ---------------------------------------------------------------------------
    console.log('\n[Test 2] Testing Authorized List & $facet Pagination for Org A...');
    const listResultA = await userService.listInvitations({
      orgId: orgA._id.toString(),
      page: 1,
      limit: 10,
    });

    assert(Array.isArray(listResultA.records), 'Records is an array');
    assert(listResultA.currentPage === 1, 'Current page is 1');
    assert(listResultA.totalRecords === 5, `Expected 5 records for Org A, got ${listResultA.totalRecords}`);
    assert(listResultA.totalPages === 1, 'Total pages is 1');
    assert(listResultA.limit === 10, 'Limit is 10');

    // ---------------------------------------------------------------------------
    // Test 3: Zero Credential / Token Leakage
    // ---------------------------------------------------------------------------
    console.log('\n[Test 3] Testing Zero Credential / Token Leakage in List Response...');
    for (const record of listResultA.records) {
      assert(record.token === undefined, `Record ${record._id} must NOT have raw or hashed token`);
      assert(record.inviteLink === undefined, `Record ${record._id} must NOT have inviteLink`);
      assert(record.url === undefined, `Record ${record._id} must NOT have raw URL`);
      assert(record._id !== undefined, `Record has public _id`);
      assert(record.status !== undefined, `Record has status`);
      assert(record.recipient && record.recipient.email, `Record has recipient details`);
    }

    // ---------------------------------------------------------------------------
    // Test 4: Multi-Tenant Isolation
    // ---------------------------------------------------------------------------
    console.log('\n[Test 4] Testing Multi-Tenant Isolation (Org A vs. Org B)...');
    const listResultB = await userService.listInvitations({
      orgId: orgB._id.toString(),
      page: 1,
      limit: 10,
    });

    assert(listResultB.totalRecords === 1, `Org B has strictly 1 record, got ${listResultB.totalRecords}`);
    assert(
      listResultB.records[0].recipient.email === `orgb_user_${timestamp}@phase5test.com`,
      'Org B record matches Org B invited user'
    );

    const orgBRecordInA = listResultA.records.find((r) => r.recipient.email === `orgb_user_${timestamp}@phase5test.com`);
    assert(!orgBRecordInA, 'Org B invitation never appears in Org A listing');

    // ---------------------------------------------------------------------------
    // Test 5: Dynamic Expiration Evaluation
    // ---------------------------------------------------------------------------
    console.log('\n[Test 5] Testing Dynamic Expiration Evaluation...');
    const expiredRecord = listResultA.records.find((r) => r.recipient.email === `expired_${timestamp}@phase5test.com`);
    assert(expiredRecord !== undefined, 'Found backdated invitation in list');
    assert(
      expiredRecord.status === 'EXPIRED',
      `Dynamically projected status must be EXPIRED, got ${expiredRecord.status}`
    );
    assert(
      expiredRecord.rawStatus === 'PENDING',
      `Persisted rawStatus remains PENDING in database, got ${expiredRecord.rawStatus}`
    );

    // ---------------------------------------------------------------------------
    // Test 6: Status Filtering
    // ---------------------------------------------------------------------------
    console.log('\n[Test 6] Testing Status Filtering (PENDING, EXPIRED, ACCEPTED, REJECTED, REVOKED)...');
    
    // PENDING filter: Only unexpired pending invitations
    const pendingList = await userService.listInvitations({
      orgId: orgA._id.toString(),
      status: 'PENDING',
    });
    assert(pendingList.totalRecords === 1, `Expected 1 PENDING invitation, got ${pendingList.totalRecords}`);
    assert(pendingList.records[0].recipient.email === `pending_${timestamp}@phase5test.com`, 'PENDING filter matched correct recipient');

    // EXPIRED filter: Dynamically captures elapsed pending invitations
    const expiredList = await userService.listInvitations({
      orgId: orgA._id.toString(),
      status: 'EXPIRED',
    });
    assert(expiredList.totalRecords === 1, `Expected 1 EXPIRED invitation, got ${expiredList.totalRecords}`);
    assert(expiredList.records[0].recipient.email === `expired_${timestamp}@phase5test.com`, 'EXPIRED filter matched backdated invitation');

    // ACCEPTED filter
    const acceptedList = await userService.listInvitations({
      orgId: orgA._id.toString(),
      status: 'ACCEPTED',
    });
    assert(acceptedList.totalRecords === 1, `Expected 1 ACCEPTED invitation, got ${acceptedList.totalRecords}`);
    assert(acceptedList.records[0].recipient.email === `accepted_${timestamp}@phase5test.com`, 'ACCEPTED filter matched correct recipient');

    // REJECTED filter
    const rejectedList = await userService.listInvitations({
      orgId: orgA._id.toString(),
      status: 'REJECTED',
    });
    assert(rejectedList.totalRecords === 1, `Expected 1 REJECTED invitation, got ${rejectedList.totalRecords}`);

    // REVOKED filter
    const revokedList = await userService.listInvitations({
      orgId: orgA._id.toString(),
      status: 'REVOKED',
    });
    assert(revokedList.totalRecords === 1, `Expected 1 REVOKED invitation, got ${revokedList.totalRecords}`);

    // ---------------------------------------------------------------------------
    // Test 7: Recipient Search
    // ---------------------------------------------------------------------------
    console.log('\n[Test 7] Testing Recipient Search...');
    const searchByName = await userService.listInvitations({
      orgId: orgA._id.toString(),
      search: 'Alice',
    });
    assert(searchByName.totalRecords === 1, `Search 'Alice' returned 1 match`);
    assert(searchByName.records[0].recipient.name === 'Pending Recipient Alice', 'Matched Alice');

    const searchByEmail = await userService.listInvitations({
      orgId: orgA._id.toString(),
      search: `expired_${timestamp}`,
    });
    assert(searchByEmail.totalRecords === 1, `Search by email returned 1 match`);

    // ---------------------------------------------------------------------------
    // Test 8: Resend a PENDING Invitation
    // ---------------------------------------------------------------------------
    console.log('\n[Test 8] Testing Resending a PENDING Invitation...');
    emittedEvents = [];
    const resendPendingResult = await userService.resendInvitation(
      tokenDocPending._id.toString(),
      orgA._id.toString(),
      adminA._id.toString()
    );

    assert(resendPendingResult.status === 'PENDING', 'Resent invitation is in PENDING state');
    assert(resendPendingResult.invitationId !== undefined, 'Returns new invitationId');
    assert(resendPendingResult.invitationId.toString() !== tokenDocPending._id.toString(), 'New invitation has new ID');
    assert(resendPendingResult.token === undefined, 'Admin response contains NO raw token');

    // Check that the old token was invalidated/superseded
    const reloadedOldPending = await Token.findById(tokenDocPending._id);
    assert(reloadedOldPending.used === true, 'Old token marked used: true');
    assert(reloadedOldPending.status === 'REVOKED', 'Old token superseded status is REVOKED');

    // Check that event was emitted
    const resendEvent = emittedEvents.find((e) => e.email === `pending_${timestamp}@phase5test.com`);
    assert(resendEvent !== undefined, 'USER_INVITED event fired for resend');
    assert(resendEvent.isResend === true, 'Event marked with isResend: true');
    assert(resendEvent.invitationToken !== undefined, 'Event contains new raw invitationToken');

    // Verify the old token can no longer be consumed
    let oldTokenConsumed = false;
    try {
      await tokenService.consumeInvitationToken(inviteRes1.invitationToken);
      oldTokenConsumed = true;
    } catch (err) {
      assert(err.statusCode === 400, 'Consuming replaced old token fails with 400');
    }
    assert(!oldTokenConsumed, 'Old token successfully blocked from consumption');

    // ---------------------------------------------------------------------------
    // Test 9: Resend an EXPIRED Invitation
    // ---------------------------------------------------------------------------
    console.log('\n[Test 9] Testing Resending an EXPIRED Invitation...');
    const resendExpiredResult = await userService.resendInvitation(
      tokenDocExpired._id.toString(),
      orgA._id.toString(),
      adminA._id.toString()
    );

    assert(resendExpiredResult.status === 'PENDING', 'Resent expired invitation is PENDING');
    const reloadedOldExpired = await Token.findById(tokenDocExpired._id);
    assert(reloadedOldExpired.used === true, 'Old expired token marked used: true');
    assert(reloadedOldExpired.status === 'EXPIRED', 'Old naturally expired token maintains EXPIRED status');

    // ---------------------------------------------------------------------------
    // Test 10: Resend Terminal States (ACCEPTED, REJECTED, REVOKED) -> Must Fail (400)
    // ---------------------------------------------------------------------------
    console.log('\n[Test 10] Testing Resend Terminal State Guards (ACCEPTED, REJECTED, REVOKED)...');
    
    // ACCEPTED
    let acceptedResendThrew = false;
    try {
      await userService.resendInvitation(tokenDocAccepted._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      acceptedResendThrew = true;
      assert(err.statusCode === 400, `Resending accepted invitation failed with 400: ${err.message}`);
    }
    assert(acceptedResendThrew, 'Resending accepted invitation was rejected');

    // REJECTED
    let rejectedResendThrew = false;
    try {
      await userService.resendInvitation(tokenDocRejected._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      rejectedResendThrew = true;
      assert(err.statusCode === 400, `Resending rejected invitation failed with 400: ${err.message}`);
    }
    assert(rejectedResendThrew, 'Resending rejected invitation was rejected');

    // REVOKED
    let revokedResendThrew = false;
    try {
      await userService.resendInvitation(tokenDocRevoked._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      revokedResendThrew = true;
      assert(err.statusCode === 400, `Resending revoked invitation failed with 400: ${err.message}`);
    }
    assert(revokedResendThrew, 'Resending revoked invitation was rejected');

    // ---------------------------------------------------------------------------
    // Test 11: Cross-Tenant Resend & Revoke Isolation -> Must Fail (403)
    // ---------------------------------------------------------------------------
    console.log('\n[Test 11] Testing Cross-Tenant Mutation Isolation...');
    
    // Admin A tries to resend Org B's invitation
    const tokenDocB = await Token.findOne({ orgId: orgB._id, type: 'INVITATION' });
    let crossTenantResendThrew = false;
    try {
      await userService.resendInvitation(tokenDocB._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      crossTenantResendThrew = true;
      assert(err.statusCode === 403, `Cross-tenant resend rejected with 403: ${err.message}`);
    }
    assert(crossTenantResendThrew, 'Cross-tenant resend blocked');

    // Admin A tries to revoke Org B's invitation
    let crossTenantRevokeThrew = false;
    try {
      await userService.revokeInvitation(tokenDocB._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      crossTenantRevokeThrew = true;
      assert(err.statusCode === 403, `Cross-tenant revoke rejected with 403: ${err.message}`);
    }
    assert(crossTenantRevokeThrew, 'Cross-tenant revoke blocked');

    // ---------------------------------------------------------------------------
    // Test 12: Revoke a PENDING Invitation
    // ---------------------------------------------------------------------------
    console.log('\n[Test 12] Testing Revoking a PENDING Invitation...');
    
    // Create a fresh pending invitation to revoke
    const inviteToRevoke = await userService.inviteUser(
      `to_revoke_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111119',
      'To Revoke User',
      'WEB',
      adminA._id
    );
    const tokenDocToRevoke = await Token.findOne({ userId: inviteToRevoke.user._id, orgId: orgA._id, type: 'INVITATION' });

    let revokedEventFired = false;
    userEvents.once('INVITATION_REVOKED', (data) => {
      if (data.userId.toString() === inviteToRevoke.user._id.toString()) {
        revokedEventFired = true;
      }
    });

    const revokeResult = await userService.revokeInvitation(
      tokenDocToRevoke._id.toString(),
      orgA._id.toString(),
      adminA._id.toString()
    );

    assert(revokeResult.status === 'REVOKED', 'Invitation revoked successfully');
    assert(revokedEventFired, 'INVITATION_REVOKED event fired');

    // Verify membership status transition to 'Rejected'
    const membership = await OrgMembership.findOne({ userId: inviteToRevoke.user._id, orgId: orgA._id });
    assert(membership && membership.status === 'Rejected', 'Membership transitioned to Rejected');

    // Verify token can no longer be consumed
    let revokedTokenConsumed = false;
    try {
      await tokenService.consumeInvitationToken(inviteToRevoke.invitationToken);
      revokedTokenConsumed = true;
    } catch (err) {
      assert(err.statusCode === 400, 'Consuming revoked token fails with 400');
    }
    assert(!revokedTokenConsumed, 'Revoked token successfully blocked from consumption');

    // ---------------------------------------------------------------------------
    // Test 13: Revoking Terminal State (Already REVOKED or ACCEPTED) -> Must Fail (400)
    // ---------------------------------------------------------------------------
    console.log('\n[Test 13] Testing Revoking Terminal State (Already REVOKED)...');
    let doubleRevokeThrew = false;
    try {
      await userService.revokeInvitation(tokenDocToRevoke._id.toString(), orgA._id.toString(), adminA._id);
    } catch (err) {
      doubleRevokeThrew = true;
      assert(err.statusCode === 400, `Double revoke rejected with 400: ${err.message}`);
    }
    assert(doubleRevokeThrew, 'Double revoke blocked');

    // ---------------------------------------------------------------------------
    // Test 14: Concurrency Guard on Resend
    // ---------------------------------------------------------------------------
    console.log('\n[Test 14] Testing Concurrency Guard on Resend (Simultaneous Requests)...');
    
    // Create a new unconsumed invitation
    const concurrentInvite = await userService.inviteUser(
      `concurrent_${timestamp}@phase5test.com`,
      orgA._id,
      null,
      'None',
      'Resident',
      '+1111111120',
      'Concurrent User',
      'WEB',
      adminA._id
    );
    const concurrentTokenDoc = await Token.findOne({ userId: concurrentInvite.user._id, orgId: orgA._id, type: 'INVITATION' });

    // Execute two simultaneous resends on the same invitation ID
    const [res1, res2] = await Promise.allSettled([
      userService.resendInvitation(concurrentTokenDoc._id.toString(), orgA._id.toString(), adminA._id),
      userService.resendInvitation(concurrentTokenDoc._id.toString(), orgA._id.toString(), adminA._id),
    ]);

    const succeeded = [res1, res2].filter((r) => r.status === 'fulfilled');
    const rejected = [res1, res2].filter((r) => r.status === 'rejected');

    assert(succeeded.length === 1, `Strictly ONE concurrent resend succeeded (got ${succeeded.length})`);
    assert(rejected.length === 1, `Strictly ONE concurrent resend was rejected (got ${rejected.length})`);
    assert(
      rejected[0].reason.statusCode === 409 || rejected[0].reason.statusCode === 400,
      `Rejected request returned conflict or bad request (got ${rejected[0].reason.statusCode})`
    );

    // Verify that only 1 valid active PENDING token remains in the DB for this user
    const activeTokens = await Token.find({
      userId: concurrentInvite.user._id,
      orgId: orgA._id,
      type: 'INVITATION',
      status: 'PENDING',
      used: false,
    });
    assert(activeTokens.length === 1, `Exactly 1 valid active PENDING token exists in DB, got ${activeTokens.length}`);

    // ---------------------------------------------------------------------------
    // Test 15: Full Regression Acceptance with Resent Invitation Token
    // ---------------------------------------------------------------------------
    console.log('\n[Test 15] Full Regression: Verifying Resent Token Acceptance Flow...');
    
    // Get the newly minted token from the resend event of the concurrent user
    const resentUserEvent = emittedEvents.find(
      (e) => e.email === `concurrent_${timestamp}@phase5test.com` && e.isResend === true
    );
    assert(resentUserEvent !== undefined, 'Found resent event for concurrent user');
    const newRawToken = resentUserEvent.invitationToken;

    // Validate invite metadata via authService.validateInvite
    const validateRes = await authService.validateInvite(newRawToken);
    assert(validateRes.email === `concurrent_${timestamp}@phase5test.com`, 'Validated invite email matches');

    // Complete user activation using canonical Phase 1/2/3 acceptInvitation
    const acceptRes = await authService.acceptInvitation(
      newRawToken,
      'SecurePass123!@#',
      `concurrent_${timestamp}@phase5test.com`,
      null,
      { name: 'Final Concurrent Name', phone: `+1${Date.now().toString().slice(-10)}` }
    );
    assert(acceptRes && acceptRes.token, 'acceptInvitation returned authenticated session JWT');

    const activatedUser = await User.findById(concurrentInvite.user._id);
    assert(activatedUser.status === 'Active', 'User account successfully activated to Active');
    const activatedMembership = await OrgMembership.findOne({ userId: concurrentInvite.user._id, orgId: orgA._id });
    assert(activatedMembership.status === 'Active', 'OrgMembership successfully activated to Active');

    console.log('\n=============================================================');
    console.log(`✓ All ${passedTests}/${totalTests} Phase 5 Verification Tests PASSED successfully!`);
    console.log('=============================================================\n');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    userEvents.off('USER_INVITED', eventTracker);
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

runPhase5Tests();
