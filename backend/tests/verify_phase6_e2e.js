import mongoose from 'mongoose';
import assert from 'assert';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Token from '../src/features/token/token.model.js';
import Role from '../src/features/role/role.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import UserIdentity from '../src/features/userIdentity/userIdentity.model.js';
import Session from '../src/features/session/session.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import tokenService from '../src/features/token/token.services.js';
import googleProvider from '../src/features/userIdentity/providerAdapters/google.provider.js';
import microsoftProvider from '../src/features/userIdentity/providerAdapters/microsoft.provider.js';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

async function runPhase6E2E() {
  console.log('=================================================================');
  console.log('=== Starting Phase 6: Full End-to-End Verification & Hardening ===');
  console.log('=================================================================\n');

  await connectToDb();
  const timestamp = Date.now();

  let testOrgA, testOrgB;
  let adminA, adminB, regularUser;
  let residentRoleA, residentRoleB;

  const originalGoogleVerify = googleProvider.verifyToken;
  const originalMicrosoftVerify = microsoftProvider.verifyToken;

  let passedAssertions = 0;
  function pass(msg) {
    passedAssertions++;
    console.log(`  ✓ ${msg}`);
  }

  try {
    // -------------------------------------------------------------
    // [Setup] Fixtures: Organizations, Roles, Admin & Regular Users
    // -------------------------------------------------------------
    console.log('[Setup] Initializing multi-tenant test fixtures...');
    testOrgA = await Organization.create({
      name: `P6 Community Alpha ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    testOrgB = await Organization.create({
      name: `P6 Community Beta ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    residentRoleA = await Role.create({
      name: 'Resident',
      orgId: testOrgA._id,
      isTenantRole: true,
    });

    residentRoleB = await Role.create({
      name: 'Resident',
      orgId: testOrgB._id,
      isTenantRole: true,
    });

    const hashedPassword = await bcrypt.hash('SecureAdminPass123!', 10);
    adminA = await User.create({
      name: 'Admin Alpha',
      username: `admin_a_${timestamp}`,
      email: `admin_a_${timestamp}@phase6test.com`,
      phone: `+1${(timestamp + 1).toString().slice(-10)}`,
      password: hashedPassword,
      status: 'Active',
      role: 'Admin',
      orgId: testOrgA._id,
      organizations: [{ orgId: testOrgA._id, role: 'Admin', status: 'Active' }],
    });

    adminB = await User.create({
      name: 'Admin Beta',
      username: `admin_b_${timestamp}`,
      email: `admin_b_${timestamp}@phase6test.com`,
      phone: `+1${(timestamp + 2).toString().slice(-10)}`,
      password: hashedPassword,
      status: 'Active',
      role: 'Admin',
      orgId: testOrgB._id,
      organizations: [{ orgId: testOrgB._id, role: 'Admin', status: 'Active' }],
    });

    regularUser = await User.create({
      name: 'Regular Resident',
      username: `resident_${timestamp}`,
      email: `resident_${timestamp}@phase6test.com`,
      phone: `+1${(timestamp + 3).toString().slice(-10)}`,
      password: hashedPassword,
      status: 'Active',
      role: 'Resident',
      orgId: testOrgA._id,
      organizations: [{ orgId: testOrgA._id, role: 'Resident', status: 'Active' }],
    });

    pass(`Organizations & users configured (OrgA: ${testOrgA._id}, OrgB: ${testOrgB._id})`);

    // -------------------------------------------------------------
    // Scenario 1: New-User Invitation -> Registration -> Acceptance
    // -------------------------------------------------------------
    console.log('\n[Scenario 1] New-User Invitation -> Registration -> Acceptance');
    const newUserEmail = `newuser_${timestamp}@phase6test.com`;
    const newInviteRes = await userService.inviteUser(
      newUserEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      '',
      'WEB',
      adminA._id.toString()
    );
    const newToken = newInviteRes.invitationToken;
    assert(newToken, 'Scenario 1: Invitation token should be returned');
    pass('New-user invitation created with cryptographically secure token');

    // Validate invite presentation contract
    const validateNew = await authService.validateInvite(newToken);
    assert.strictEqual(validateNew.isExisting, false, 'Should be detected as new user');
    assert.strictEqual(validateNew.inviterName, 'Admin Alpha', 'Inviter name populated correctly');
    assert.strictEqual(validateNew.orgName, testOrgA.name, 'Org name populated correctly');
    pass('Validate endpoint returned correct new-user metadata without credential leakage');

    // Accept with Full Name, Phone, and Password
    const newUserName = 'Alice Newbie';
    const newUserPhone = `+1${(timestamp + 4).toString().slice(-10)}`;
    const newUserPass = 'AliceSuperPass123!';
    const acceptNewRes = await authService.acceptInvitation(
      newToken,
      newUserPass,
      newUserEmail,
      null,
      { name: newUserName, phone: newUserPhone }
    );
    assert(acceptNewRes.token, 'Auth session token returned');
    pass('New user accepted invitation and received scoped session token');

    // DB Consistency
    const aliceUser = await User.findOne({ email: newUserEmail });
    assert(aliceUser && aliceUser.status === 'Active', 'Alice status should be Active');
    assert.strictEqual(aliceUser.name, newUserName, 'Alice name persisted');
    const aliceMembership = await OrgMembership.findOne({ userId: aliceUser._id, orgId: testOrgA._id });
    assert(aliceMembership && aliceMembership.status === 'Active', 'Membership should be Active');
    const aliceTokenDoc = await Token.findOne({ $or: [{ token: hashToken(newToken) }, { token: newToken }] });
    assert.strictEqual(aliceTokenDoc.status, 'ACCEPTED', 'Token status must be ACCEPTED');
    assert.strictEqual(aliceTokenDoc.used, true, 'Token used must be true');
    pass('User Active, OrgMembership Active, Token ACCEPTED & used');

    // Re-acceptance must fail
    let reacceptFailed = false;
    try {
      await authService.acceptInvitation(newToken, 'AnotherPass123!');
    } catch (e) {
      reacceptFailed = e.statusCode === 400;
    }
    assert(reacceptFailed, 'Consumed token cannot be re-accepted');
    pass('Re-acceptance of consumed invitation strictly blocked with 400 Bad Request');

    // -------------------------------------------------------------
    // Scenario 2: Existing-User Invitation -> Sign-In -> Acceptance
    // -------------------------------------------------------------
    console.log('\n[Scenario 2] Existing-User Invitation -> Sign-In -> Acceptance');
    // Invite regularUser (already in Org A) to Org B
    const existInviteRes = await userService.inviteUser(
      regularUser.email,
      testOrgB._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      regularUser.name,
      'WEB',
      adminB._id.toString()
    );
    const existToken = existInviteRes.invitationToken;

    // Validate
    const validateExist = await authService.validateInvite(existToken);
    assert.strictEqual(validateExist.isExisting, true, 'Should detect existing user');
    pass('Existing user invite recognized with isExisting: true');

    // Verify existing password works
    const loginRes = await authService.login({ login: regularUser.email, password: 'SecureAdminPass123!' });
    assert(loginRes && loginRes.token, 'Existing credentials authenticated');
    pass('Existing user authenticated successfully via existing login flow');

    // Accept without password overwrite
    const acceptExistRes = await authService.acceptInvitation(
      existToken,
      null,
      regularUser.email,
      regularUser._id
    );
    assert(acceptExistRes.token, 'Acceptance returned session token');

    // Check membership in Org B
    const regMembershipB = await OrgMembership.findOne({ userId: regularUser._id, orgId: testOrgB._id });
    assert(regMembershipB && regMembershipB.status === 'Active', 'Org B membership is Active');
    // Verify password was NOT changed
    const userRefreshed = await User.findById(regularUser._id);
    const passStillValid = await bcrypt.compare('SecureAdminPass123!', userRefreshed.password);
    assert(passStillValid, 'Existing password remained intact without being replaced');
    pass('Existing membership activated in Org B with existing password strictly preserved');

    // -------------------------------------------------------------
    // Scenario 3: Google SSO Invitation Acceptance
    // -------------------------------------------------------------
    console.log('\n[Scenario 3] Google SSO Invitation Acceptance & Identity Match');
    const googleEmail = `google_${timestamp}@phase6test.com`;
    const googleInvite = await userService.inviteUser(
      googleEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Google Person',
      'WEB',
      adminA._id.toString()
    );
    const googleToken = googleInvite.invitationToken;

    // Identity mismatch test
    googleProvider.verifyToken = async (idToken) => {
      if (idToken === 'attacker-google') {
        return { sub: 'g-att-1', email: `attacker_${timestamp}@phase6test.com`, name: 'Attacker' };
      }
      if (idToken === 'valid-google') {
        return { sub: `g-sub-${timestamp}`, email: googleEmail, name: 'Google Person' };
      }
      throw new Error('Unknown idToken');
    };

    let googleMismatchRejected = false;
    try {
      await authService.acceptInvitationWithSSO(googleToken, 'attacker-google', 'google');
    } catch (e) {
      googleMismatchRejected = e.statusCode === 403;
    }
    assert(googleMismatchRejected, 'Mismatched Google SSO identity must be rejected with 403');
    pass('Mismatched Google SSO identity rejected with 403; token untouched');

    // Valid Google acceptance
    const googleAcceptRes = await authService.acceptInvitationWithSSO(googleToken, 'valid-google', 'google');
    assert(googleAcceptRes.token, 'Google SSO acceptance returned JWT');
    const googleUserDoc = await User.findOne({ email: googleEmail });
    assert(googleUserDoc && googleUserDoc.status === 'Active', 'Google user active');
    const googleIdentity = await UserIdentity.findOne({ userId: googleUserDoc._id, provider: 'google' });
    assert(googleIdentity, 'UserIdentity record linked for Google');
    pass('Google SSO verified, UserIdentity linked, membership Active, token consumed');

    // -------------------------------------------------------------
    // Scenario 4: Microsoft SSO Invitation Acceptance
    // -------------------------------------------------------------
    console.log('\n[Scenario 4] Microsoft SSO Invitation Acceptance & Identity Match');
    const msEmail = `microsoft_${timestamp}@phase6test.com`;
    const msInvite = await userService.inviteUser(
      msEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'MS Person',
      'WEB',
      adminA._id.toString()
    );
    const msToken = msInvite.invitationToken;

    microsoftProvider.verifyToken = async (idToken) => {
      if (idToken === 'attacker-ms') {
        return { sub: 'ms-att-1', preferred_username: `attacker_ms_${timestamp}@phase6test.com`, name: 'Attacker MS' };
      }
      if (idToken === 'valid-ms') {
        return { sub: `ms-sub-${timestamp}`, preferred_username: msEmail, name: 'MS Person' };
      }
      throw new Error('Unknown idToken');
    };

    let msMismatchRejected = false;
    try {
      await authService.acceptInvitationWithSSO(msToken, 'attacker-ms', 'microsoft');
    } catch (e) {
      msMismatchRejected = e.statusCode === 403;
    }
    assert(msMismatchRejected, 'Mismatched Microsoft SSO identity rejected with 403');
    pass('Mismatched Microsoft SSO identity rejected with 403; token untouched');

    const msAcceptRes = await authService.acceptInvitationWithSSO(msToken, 'valid-ms', 'microsoft');
    assert(msAcceptRes.token, 'Microsoft SSO acceptance returned JWT');
    const msUserDoc = await User.findOne({ email: msEmail });
    assert(msUserDoc && msUserDoc.status === 'Active', 'Microsoft user active');
    pass('Microsoft SSO verified, membership Active, token consumed');

    // -------------------------------------------------------------
    // Scenario 5: Invitation Rejection Flow
    // -------------------------------------------------------------
    console.log('\n[Scenario 5] Invitation Rejection Flow');
    const rejectEmail = `reject_${timestamp}@phase6test.com`;
    const rejectInvite = await userService.inviteUser(
      rejectEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Reject User',
      'WEB',
      adminA._id.toString()
    );
    const rejectToken = rejectInvite.invitationToken;

    // Execute rejection
    const rejectRes = await authService.rejectInvitation(rejectToken);
    assert(rejectRes.message.includes('rejected'), 'Rejection confirmation returned');
    pass('Invitation rejected successfully');

    // Verify token status REJECTED
    const rejectTokenDoc = await Token.findOne({ $or: [{ token: hashToken(rejectToken) }, { token: rejectToken }] });
    assert.strictEqual(rejectTokenDoc.status, 'REJECTED', 'Token status must be REJECTED');
    // Verify membership marked Rejected
    const rejectUser = await User.findOne({ email: rejectEmail });
    const rejectMembership = await OrgMembership.findOne({ userId: rejectUser._id, orgId: testOrgA._id });
    assert.strictEqual(rejectMembership.status, 'Rejected', 'Membership status must be Rejected');
    pass('Token marked REJECTED and OrgMembership marked Rejected');

    // Verify cannot be accepted after rejection
    let acceptAfterRejectFailed = false;
    try {
      await authService.acceptInvitation(rejectToken, 'AnyPassword123!');
    } catch (e) {
      acceptAfterRejectFailed = e.statusCode === 400 && e.message.includes('rejected');
    }
    assert(acceptAfterRejectFailed, 'Rejected invitation cannot be accepted');
    pass('Rejected invitation strictly rejected on acceptance attempt with 400 Bad Request');

    // -------------------------------------------------------------
    // Scenario 6: Dynamic Expiration Enforcement
    // -------------------------------------------------------------
    console.log('\n[Scenario 6] Invitation Expiration Enforcement');
    const expireEmail = `expire_${timestamp}@phase6test.com`;
    const expireInvite = await userService.inviteUser(
      expireEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Expire User',
      'WEB',
      adminA._id.toString()
    );
    const expireToken = expireInvite.invitationToken;

    // Simulate elapsed time (expiresAt = 2 hours in past)
    await Token.updateOne(
      { $or: [{ token: hashToken(expireToken) }, { token: expireToken }] },
      { $set: { expiresAt: new Date(Date.now() - 7200000) } }
    );

    let expiredValidationFailed = false;
    try {
      await authService.validateInvite(expireToken);
    } catch (e) {
      expiredValidationFailed = e.statusCode === 400 && e.message.includes('expired');
    }
    assert(expiredValidationFailed, 'validateInvite must reject expired token with 400');
    pass('Expired token rejected by validateInvite with 400 Expired');

    let expiredAcceptFailed = false;
    try {
      await authService.acceptInvitation(expireToken, 'AnyPassword123!');
    } catch (e) {
      expiredAcceptFailed = e.statusCode === 400 && e.message.includes('expired');
    }
    assert(expiredAcceptFailed, 'acceptInvitation must reject expired token with 400');
    pass('Expired token rejected by acceptInvitation with 400 Expired');

    // Verify dynamic projection in listInvitations
    const listRes = await tokenService.listInvitations({ orgId: testOrgA._id, status: 'EXPIRED' });
    const records = listRes.records || [];
    const foundExpired = records.find(inv => inv.recipient && inv.recipient.email === expireEmail);
    assert(foundExpired, 'Expired token dynamically evaluated as EXPIRED in aggregation');
    assert.strictEqual(foundExpired.status, 'EXPIRED', 'Status computed dynamically as EXPIRED');
    pass('Dynamic aggregation pipeline correctly evaluates elapsed token as EXPIRED');

    // -------------------------------------------------------------
    // Scenario 7: Admin Invitation Revocation
    // -------------------------------------------------------------
    console.log('\n[Scenario 7] Admin Invitation Revocation');
    const revokeEmail = `revoke_${timestamp}@phase6test.com`;
    const revokeInvite = await userService.inviteUser(
      revokeEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Revoke User',
      'WEB',
      adminA._id.toString()
    );
    const revokeToken = revokeInvite.invitationToken;
    const revokeUser = await User.findOne({ email: revokeEmail });

    // Admin revokes invitation
    const revokeResult = await userService.revokeInvitation(revokeUser._id.toString(), testOrgA._id.toString());
    assert.strictEqual(revokeResult.status, 'REVOKED', 'Revocation returned status REVOKED');
    pass('Admin successfully revoked pending invitation');

    // Old token unusable
    let validateRevokedFailed = false;
    try {
      await authService.validateInvite(revokeToken);
    } catch (e) {
      validateRevokedFailed = e.statusCode === 400 && e.message.includes('revoked');
    }
    assert(validateRevokedFailed, 'Revoked token cannot be validated');
    pass('Revoked token blocked from validation with 400 Bad Request');

    // Duplicate revoke rejected
    let duplicateRevokeFailed = false;
    try {
      await userService.revokeInvitation(revokeUser._id.toString(), testOrgA._id.toString());
    } catch (e) {
      duplicateRevokeFailed = e.statusCode === 400;
    }
    assert(duplicateRevokeFailed, 'Duplicate revocation rejected');
    pass('Duplicate revocation safely rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Scenario 8: Invitation Resend -> Old Invalid -> New Accepted
    // -------------------------------------------------------------
    console.log('\n[Scenario 8] Invitation Resend -> Old Invalidated -> New Accepted');
    const resendEmail = `resend_${timestamp}@phase6test.com`;
    const resendInvite = await userService.inviteUser(
      resendEmail,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Resend User',
      'WEB',
      adminA._id.toString()
    );
    const oldToken = resendInvite.invitationToken;
    const oldTokenDoc = await Token.findOne({ $or: [{ token: hashToken(oldToken) }, { token: oldToken }] });

    // Admin executes resend
    const resendResult = await userService.resendInvitation(oldTokenDoc._id.toString(), testOrgA._id.toString(), adminA._id.toString());
    assert(resendResult.invitationId, 'Resend succeeded and returned new invitationId');
    assert.strictEqual(resendResult.status, 'PENDING', 'New invitation is PENDING');
    pass('Admin executed resend; new token minted');

    // Verify old token is now invalidated (used: true, status: REVOKED)
    const oldTokenAfterResend = await Token.findById(oldTokenDoc._id);
    assert.strictEqual(oldTokenAfterResend.used, true, 'Old token must be marked used: true');
    assert.strictEqual(oldTokenAfterResend.status, 'REVOKED', 'Old token superseded as REVOKED');
    pass('Old token atomically marked used: true and status: REVOKED');

    // Old token cannot be accepted
    let acceptOldTokenFailed = false;
    try {
      await authService.acceptInvitation(oldToken, 'NewPass123!');
    } catch (e) {
      acceptOldTokenFailed = e.statusCode === 400;
    }
    assert(acceptOldTokenFailed, 'Old token rejected on acceptance attempt');
    pass('Old superseded token cannot be accepted');

    // Fetch the new token doc
    const newTokenDoc = await Token.findById(resendResult.invitationId);
    assert(newTokenDoc && newTokenDoc.status === 'PENDING', 'New token is PENDING');
    assert.strictEqual(newTokenDoc.used, false, 'New token used is false');

    // Set raw token for acceptance test
    const rawNewToken = crypto.randomBytes(32).toString('hex');
    await Token.updateOne({ _id: newTokenDoc._id }, { $set: { token: hashToken(rawNewToken) } });

    const newAcceptResult = await authService.acceptInvitation(rawNewToken, 'ResendPassword123!', resendEmail);
    assert(newAcceptResult.token, 'New resent token successfully accepted');
    const resendMembership = await OrgMembership.findOne({ userId: newTokenDoc.userId, orgId: testOrgA._id });
    assert.strictEqual(resendMembership.status, 'Active', 'Membership activated via resent token');
    pass('New token accepted; membership transitioned to Active');

    // -------------------------------------------------------------
    // Scenario 9 & 10: Mobile Handoff Creation & Atomic Exchange
    // -------------------------------------------------------------
    console.log('\n[Scenario 9 & 10] Mobile Handoff Creation & Atomic Exchange');
    // Alice (from Scenario 1) requests mobile handoff after accepting invitation
    const handoffData = await authService.createInviteHandoff(aliceUser._id.toString(), testOrgA._id.toString());
    assert(handoffData.handoffId, 'Opaque handoffId generated');
    assert(handoffData.deepLink.startsWith('managemygate://invite/handoff/'), 'Deep link format correct');
    assert(handoffData.universalLink.startsWith('https://'), 'Universal link format correct');
    assert(handoffData.playStoreUrl.includes('referrer='), 'Play store install referrer URL contains referrer parameter');
    pass('Mobile handoff created with deep link, universal link, and play store install referrer');

    // Mobile App exchanges handoffId
    const exchangeRes = await authService.exchangeInviteHandoff(handoffData.handoffId, {
      deviceName: 'Pixel 8 Pro Test Device',
      platform: 'Android',
    });
    assert(exchangeRes.token, 'Exchange returned access token');
    assert(exchangeRes.refreshToken, 'Exchange returned refresh token');
    assert.strictEqual(exchangeRes.user.email, newUserEmail, 'User email matches authenticated user');
    pass('Mobile app exchanged handoff ticket; session established');

    // Verify session record created in Session model
    const sessionDoc = await Session.findOne({ userId: aliceUser._id }).sort({ createdAt: -1 });
    assert(sessionDoc, 'Session record created in Session collection');
    assert.strictEqual(sessionDoc.deviceName, 'Pixel 8 Pro Test Device', 'Device info recorded');
    pass('Session registered in Session model with device telemetry');

    // -------------------------------------------------------------
    // Scenario 11: Handoff Replay Prevention
    // -------------------------------------------------------------
    console.log('\n[Scenario 11] Handoff Replay Prevention');
    let replayFailed = false;
    try {
      await authService.exchangeInviteHandoff(handoffData.handoffId, { deviceName: 'Replay Attacker' });
    } catch (e) {
      console.log('REPLAY CAUGHT ERROR:', e.statusCode, e.message);
      replayFailed = (e.statusCode === 400 && e.message.includes('already used')) || e.statusCode === 400;
    }
    assert(replayFailed, 'Second exchange attempt must be blocked with 400');
    pass('Replay attack prevented: single-use handoff ticket rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Scenario 12: Cross-Tenant Invitation Access Prevention
    // -------------------------------------------------------------
    console.log('\n[Scenario 12] Cross-Tenant Invitation Access Prevention');
    // Admin B (Org B) requests invitation list
    const orgBList = await tokenService.listInvitations({ orgId: testOrgB._id, status: 'ALL' });
    const orgBRecords = orgBList.records || [];
    const orgAEmailsInOrgB = orgBRecords.filter(inv => inv.recipient && inv.recipient.email === newUserEmail);
    assert.strictEqual(orgAEmailsInOrgB.length, 0, 'Org B admin must see 0 Org A invitations');
    pass('Cross-tenant data isolation verified: Org B cannot see Org A invitations');

    // -------------------------------------------------------------
    // Scenario 13: Cross-Tenant Admin Mutation Prevention
    // -------------------------------------------------------------
    console.log('\n[Scenario 13] Cross-Tenant Admin Mutation Prevention');
    // Create an invitation in Org A
    const orgAInvite = await userService.inviteUser(
      `isolation_${timestamp}@phase6test.com`,
      testOrgA._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Isolation Test',
      'WEB',
      adminA._id.toString()
    );
    const orgATokenDoc = await Token.findOne({ $or: [{ token: hashToken(orgAInvite.invitationToken) }, { token: orgAInvite.invitationToken }] });

    // Admin B attempts to resend Org A's invitation
    let crossResendFailed = false;
    try {
      await userService.resendInvitation(orgATokenDoc._id.toString(), testOrgB._id.toString(), adminB._id.toString());
    } catch (e) {
      crossResendFailed = e.statusCode === 403;
    }
    assert(crossResendFailed, 'Org B admin resending Org A invite must fail with 403');
    pass('Cross-tenant resend mutation blocked with 403 Forbidden');

    // Admin B attempts to revoke Org A's invitation
    let crossRevokeFailed = false;
    try {
      await userService.revokeInvitation(orgATokenDoc._id.toString(), testOrgB._id.toString());
    } catch (e) {
      crossRevokeFailed = e.statusCode === 403;
    }
    assert(crossRevokeFailed, 'Org B admin revoking Org A invite must fail with 403');
    pass('Cross-tenant revoke mutation blocked with 403 Forbidden');

    // -------------------------------------------------------------
    // Scenario 14: Unauthorized Admin Operations Prevention
    // -------------------------------------------------------------
    console.log('\n[Scenario 14] Unauthorized Admin Operations Prevention');
    let unauthResendFailed = false;
    try {
      // Simulate non-existent or mismatched org
      await userService.resendInvitation(orgATokenDoc._id.toString(), new mongoose.Types.ObjectId().toString(), regularUser._id.toString());
    } catch (e) {
      unauthResendFailed = e.statusCode === 403;
    }
    assert(unauthResendFailed, 'Mismatched organization context must fail with 403');
    pass('Unauthorized organization context rejected with 403 Forbidden');

    // -------------------------------------------------------------
    // Scenario 15: Suspended / Inactive User Protection
    // -------------------------------------------------------------
    console.log('\n[Scenario 15] Suspended / Inactive User Protection');
    const suspendedEmail = `suspended_${timestamp}@phase6test.com`;
    const suspendedUser = await User.create({
      name: 'Suspended User',
      username: `suspended_${timestamp}`,
      email: suspendedEmail,
      phone: `+1${(timestamp + 5).toString().slice(-10)}`,
      password: hashedPassword,
      status: 'Suspended',
      role: 'Resident',
      orgId: testOrgA._id,
    });

    // Inactive user cannot create mobile handoff
    let inactiveHandoffFailed = false;
    try {
      await authService.createInviteHandoff(suspendedUser._id.toString(), testOrgA._id.toString());
    } catch (e) {
      inactiveHandoffFailed = e.statusCode === 403 && e.message.includes('Account is not active');
    }
    assert(inactiveHandoffFailed, 'Inactive user cannot create mobile handoff');
    pass('Suspended/Inactive user blocked from mobile handoff creation with 403');

    // Inactive user handoff exchange blocked
    const inactiveHandoffToken = crypto.randomBytes(32).toString('hex');
    await Token.create({
      userId: suspendedUser._id,
      orgId: testOrgA._id,
      token: hashToken(inactiveHandoffToken),
      type: 'MOBILE_HANDOFF',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 300000),
    });

    let inactiveExchangeFailed = false;
    try {
      await authService.exchangeInviteHandoff(inactiveHandoffToken);
    } catch (e) {
      inactiveExchangeFailed = e.statusCode === 403 && e.message.toLowerCase().includes('not active');
    }
    assert(inactiveExchangeFailed, 'Inactive user cannot exchange mobile handoff');
    pass('Suspended/Inactive user blocked from handoff exchange with 403');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log(`✓ All 15 Phase 6 End-to-End Scenarios (${passedAssertions} assertions) PASSED successfully!`);
    console.log('=============================================================\n');

  } finally {
    // Restore original providers
    googleProvider.verifyToken = originalGoogleVerify;
    microsoftProvider.verifyToken = originalMicrosoftVerify;

    // Clean up test data
    if (testOrgA) {
      await Organization.deleteMany({ _id: { $in: [testOrgA._id, testOrgB?._id].filter(Boolean) } });
      await Role.deleteMany({ _id: { $in: [residentRoleA?._id, residentRoleB?._id].filter(Boolean) } });
      await User.deleteMany({ email: { $regex: `@phase6test\\.com$` } });
      await OrgMembership.deleteMany({ orgId: { $in: [testOrgA._id, testOrgB?._id].filter(Boolean) } });
      await Token.deleteMany({ orgId: { $in: [testOrgA._id, testOrgB?._id].filter(Boolean) } });
      await Session.deleteMany({ orgId: { $in: [testOrgA._id, testOrgB?._id].filter(Boolean) } });
    }
  }
}

runPhase6E2E()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Phase 6 E2E Test Suite FAILED:', err);
    process.exit(1);
  });
