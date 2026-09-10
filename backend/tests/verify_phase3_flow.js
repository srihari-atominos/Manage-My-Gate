import mongoose from 'mongoose';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Token from '../src/features/token/token.model.js';
import Role from '../src/features/role/role.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import UserIdentity from '../src/features/userIdentity/userIdentity.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import tokenService from '../src/features/token/token.services.js';
import googleProvider from '../src/features/userIdentity/providerAdapters/google.provider.js';
import microsoftProvider from '../src/features/userIdentity/providerAdapters/microsoft.provider.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

async function runPhase3Verification() {
  console.log('=== Starting Phase 3: Comprehensive Final Verification Pass ===\n');
  await connectToDb();

  const timestamp = Date.now();
  let testOrg, testOrg2, adminUser, existingUser;

  // Stored original provider verification methods for safe restoration
  const originalGoogleVerify = googleProvider.verifyToken;
  const originalMicrosoftVerify = microsoftProvider.verifyToken;

  try {
    // -------------------------------------------------------------
    // Setup: Test Organizations and Admin User
    // -------------------------------------------------------------
    console.log('[Setup] Creating test organizations and admin...');
    testOrg = await Organization.create({
      name: `Phase 3 Community A ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    testOrg2 = await Organization.create({
      name: `Phase 3 Community B ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    await Role.create({
      name: 'Resident',
      orgId: testOrg._id,
      isTenantRole: true,
    });

    await Role.create({
      name: 'Resident',
      orgId: testOrg2._id,
      isTenantRole: true,
    });

    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    adminUser = await User.create({
      name: 'Community Admin P3',
      username: `admin_p3_${timestamp}`,
      email: `admin_p3_${timestamp}@example.com`,
      password: hashedPassword,
      status: 'Active',
      role: 'Admin',
      orgId: testOrg._id,
      organizations: [{ orgId: testOrg._id, role: 'Admin', status: 'Active' }],
    });
    console.log(`✓ Setup complete: Org A (${testOrg._id}), Org B (${testOrg2._id}), Admin (${adminUser._id})\n`);

    // -------------------------------------------------------------
    // Test 1: NEW USER Registration + Profile Data Setup
    // -------------------------------------------------------------
    console.log('[Test 1] Testing NEW USER registration with Full Name, Phone, and Password...');
    const newUserEmail = `new_invitee_${timestamp}@example.com`;

    const newInvite = await userService.inviteUser(
      newUserEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      '', // inviter initially left name blank
      'WEB',
      adminUser._id.toString()
    );

    const newToken = newInvite.invitationToken;

    // Validate invite metadata
    const newValidateRes = await authService.validateInvite(newToken);
    if (newValidateRes.isExisting !== false) {
      throw new Error(`TEST 1 FAILURE: Expected isExisting: false for new user, got ${newValidateRes.isExisting}`);
    }
    if (newValidateRes.inviterName !== 'Community Admin P3') {
      throw new Error(`TEST 1 FAILURE: Expected inviterName 'Community Admin P3', got '${newValidateRes.inviterName}'`);
    }

    // New user accepts invitation, sets full name, phone number, and password
    const userFullName = 'Jane Newbie Doe';
    const userPhone = `+1${timestamp.toString().slice(-10)}`;
    const userPassword = 'NewbieSecurePass123!';

    const newAcceptRes = await authService.acceptInvitation(
      newToken,
      userPassword,
      newUserEmail,
      null,
      { name: userFullName, phone: userPhone }
    );

    if (!newAcceptRes || !newAcceptRes.token) {
      throw new Error('TEST 1 FAILURE: acceptInvitation did not return authentication token');
    }

    // Verify user database record
    const updatedNewUser = await User.findOne({ email: newUserEmail });
    if (!updatedNewUser || updatedNewUser.status !== 'Active') {
      throw new Error(`TEST 1 FAILURE: User status expected 'Active', got '${updatedNewUser?.status}'`);
    }
    if (updatedNewUser.name !== userFullName) {
      throw new Error(`TEST 1 FAILURE: User name expected '${userFullName}', got '${updatedNewUser.name}'`);
    }
    if (updatedNewUser.phone !== userPhone) {
      throw new Error(`TEST 1 FAILURE: User phone expected '${userPhone}', got '${updatedNewUser.phone}'`);
    }

    const passwordMatch = await bcrypt.compare(userPassword, updatedNewUser.password);
    if (!passwordMatch) {
      throw new Error('TEST 1 FAILURE: User password was not correctly hashed and persisted');
    }

    // Verify Token is marked ACCEPTED
    const consumedTokenDoc = await Token.findOne({
      $or: [{ token: hashToken(newToken) }, { token: newToken }],
    });
    if (consumedTokenDoc && consumedTokenDoc.status !== 'ACCEPTED') {
      throw new Error(`TEST 1 FAILURE: Token doc should be consumed/ACCEPTED, got: ${consumedTokenDoc?.status}`);
    }

    console.log('✓ Test 1 Passed: New user activated with profile data (name, phone) and password successfully!\n');

    // -------------------------------------------------------------
    // Test 2: EXISTING USER Authentication + Invitation Acceptance
    // -------------------------------------------------------------
    console.log('[Test 2] Testing EXISTING USER authentication (via existing login) & invitation acceptance...');
    const existingEmail = `existing_member_${timestamp}@example.com`;
    const existingPasswordPlain = 'ExistingPass123!';
    const existingHashedPassword = await bcrypt.hash(existingPasswordPlain, 10);

    existingUser = await User.create({
      name: 'Existing Member P3',
      username: `existing_p3_${timestamp}`,
      email: existingEmail,
      password: existingHashedPassword,
      status: 'Active',
      role: 'Resident',
      orgId: testOrg._id,
      organizations: [{ orgId: testOrg._id, role: 'Resident', status: 'Active' }],
    });

    // Step 2a: Test existing authentication mechanism with wrong password
    let invalidLoginBlocked = false;
    try {
      await authService.login({ login: existingEmail, password: 'WrongPassword999!' });
    } catch (loginErr) {
      if (loginErr.statusCode === 401 || loginErr.message.includes('Incorrect password') || loginErr.message.includes('Invalid credentials')) {
        invalidLoginBlocked = true;
      }
    }
    if (!invalidLoginBlocked) {
      throw new Error('TEST 2 FAILURE: Existing authentication allowed invalid password!');
    }

    // Step 2b: Authenticate correctly via existing authService.login
    const loginResult = await authService.login({ login: existingEmail, password: existingPasswordPlain });
    if (!loginResult || !loginResult.token || !loginResult.user) {
      throw new Error('TEST 2 FAILURE: Existing authentication failed with correct credentials!');
    }
    const authenticatedSessionUser = loginResult.user;
    console.log(`- Authenticated existing user successfully via existing auth flow: ${authenticatedSessionUser.email}`);

    // Step 2c: Invite existing user to second organization (testOrg2)
    const existingInvite = await userService.inviteUser(
      existingEmail,
      testOrg2._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Existing Member P3',
      'WEB',
      adminUser._id.toString()
    );
    const existingToken = existingInvite.invitationToken;

    // Validate invite metadata
    const existingValidateRes = await authService.validateInvite(existingToken);
    if (existingValidateRes.isExisting !== true) {
      throw new Error(`TEST 2 FAILURE: Expected isExisting: true for existing user, got ${existingValidateRes.isExisting}`);
    }

    // Step 2d: Existing user accepts invite using the authenticated session (no password overwrite)
    const existingAcceptRes = await authService.acceptInvitation(
      existingToken,
      null, // Password must NOT be reset or modified
      existingEmail,
      authenticatedSessionUser.id || authenticatedSessionUser._id
    );

    if (!existingAcceptRes || !existingAcceptRes.token) {
      throw new Error('TEST 2 FAILURE: Existing user acceptance did not return session token');
    }

    // Verify membership in Org B is now Active
    const newMembership = await OrgMembership.findOne({
      userId: existingUser._id,
      orgId: testOrg2._id,
    });

    if (!newMembership || newMembership.status !== 'Active') {
      throw new Error(`TEST 2 FAILURE: Expected active membership in org2, got ${newMembership?.status}`);
    }

    // Confirm that the user's existing password was NOT modified
    const userAfterAccept = await User.findById(existingUser._id);
    const passwordStillValid = await bcrypt.compare(existingPasswordPlain, userAfterAccept.password);
    if (!passwordStillValid) {
      throw new Error('TEST 2 FAILURE: Existing user password was altered or corrupted during invitation acceptance!');
    }

    console.log('✓ Test 2 Passed: Existing user authenticated via existing login, joined workspace without password reset!\n');

    // -------------------------------------------------------------
    // Test 3: Authenticated Identity Mismatch -> Strict 403 & No Consumption
    // -------------------------------------------------------------
    console.log('[Test 3] Testing Authenticated Identity Mismatch (403 enforcement & zero token consumption)...');
    const victimEmail = `victim_${timestamp}@example.com`;

    const victimInvite = await userService.inviteUser(
      victimEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Victim User',
      'WEB',
      adminUser._id.toString()
    );

    const victimToken = victimInvite.invitationToken;

    // Impostor account attempts to consume victim's invitation
    const attackerUser = await User.create({
      name: 'Attacker Impostor',
      username: `attacker_${timestamp}`,
      email: `attacker_${timestamp}@example.com`,
      password: hashedPassword,
      status: 'Active',
      role: 'Resident',
    });

    // 3a. Mismatched authenticatedUserId attempt
    let mismatchUserIdBlocked = false;
    try {
      await authService.acceptInvitation(
        victimToken,
        null,
        null,
        attackerUser._id.toString() // Impostor user session
      );
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('identity')) {
        mismatchUserIdBlocked = true;
      }
    }

    if (!mismatchUserIdBlocked) {
      throw new Error('TEST 3 FAILURE: Impostor was able to consume invitation with mismatched user ID!');
    }

    // Verify token was NOT consumed by the failed attempt
    const tokenAfterMismatchAttempt = await Token.findOne({
      $or: [{ token: hashToken(victimToken) }, { token: victimToken }],
    });
    if (tokenAfterMismatchAttempt.status !== 'PENDING' || tokenAfterMismatchAttempt.used === true) {
      throw new Error('SECURITY VIOLATION: Invitation was consumed before successful identity verification!');
    }

    // 3b. Mismatched email payload manipulation attempt
    let mismatchEmailBlocked = false;
    try {
      await authService.acceptInvitation(
        victimToken,
        'MaliciousPass123!',
        attackerUser.email // Spoofed email in request body
      );
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('identity')) {
        mismatchEmailBlocked = true;
      }
    }

    if (!mismatchEmailBlocked) {
      throw new Error('TEST 3 FAILURE: Payload with mismatched email was not rejected with 403!');
    }

    // Verify token is STILL not consumed and remains PENDING
    const tokenAfterEmailMismatch = await Token.findOne({
      $or: [{ token: hashToken(victimToken) }, { token: victimToken }],
    });
    if (tokenAfterEmailMismatch.status !== 'PENDING' || tokenAfterEmailMismatch.used === true) {
      throw new Error('SECURITY VIOLATION: Invitation was consumed despite email mismatch!');
    }

    console.log('✓ Test 3 Passed: Server-side identity verification strictly rejected impostors with 403; token was NOT consumed!\n');

    // -------------------------------------------------------------
    // Test 4: Lifecycle State Rejection (Expired, Revoked, Re-acceptance)
    // -------------------------------------------------------------
    console.log('[Test 4] Testing Lifecycle States (Expired, Revoked, Re-acceptance rejection)...');

    // 4a. Expired Token
    const expiredEmail = `expired_${timestamp}@example.com`;
    const expiredInvite = await userService.inviteUser(
      expiredEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Expired User',
      'WEB',
      adminUser._id.toString()
    );
    const expiredToken = expiredInvite.invitationToken;
    const expiredHash = hashToken(expiredToken);

    await Token.updateOne(
      { $or: [{ token: expiredHash }, { token: expiredToken }] },
      { expiresAt: new Date(Date.now() - 3600000) } // 1 hour ago
    );

    let expiredBlocked = false;
    try {
      await authService.validateInvite(expiredToken);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('expired')) {
        expiredBlocked = true;
      }
    }
    if (!expiredBlocked) {
      throw new Error('TEST 4 FAILURE: Expired token was not rejected by validateInvite');
    }

    // 4b. Revoked Token
    const revokedEmail = `revoked_${timestamp}@example.com`;
    const revokedInvite = await userService.inviteUser(
      revokedEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Revoked User',
      'WEB',
      adminUser._id.toString()
    );
    const revokedToken = revokedInvite.invitationToken;
    const revokedHash = hashToken(revokedToken);

    await Token.updateOne(
      { $or: [{ token: revokedHash }, { token: revokedToken }] },
      { status: 'REVOKED' }
    );

    let revokedBlocked = false;
    try {
      await authService.validateInvite(revokedToken);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('revoked')) {
        revokedBlocked = true;
      }
    }
    if (!revokedBlocked) {
      throw new Error('TEST 4 FAILURE: Revoked token was not rejected by validateInvite');
    }

    // 4c. Re-acceptance rejection
    let reacceptBlocked = false;
    try {
      await authService.acceptInvitation(newToken, 'AnotherPassword123!');
    } catch (err) {
      reacceptBlocked = true;
    }
    if (!reacceptBlocked) {
      throw new Error('TEST 4 FAILURE: Re-acceptance of consumed token was allowed');
    }

    console.log('✓ Test 4 Passed: All terminal lifecycle states (Expired, Revoked, Already Consumed) correctly enforced!\n');

    // -------------------------------------------------------------
    // Test 5: Google SSO Invitation Acceptance & Verification
    // -------------------------------------------------------------
    console.log('[Test 5] Testing GOOGLE SSO invitation acceptance, identity verification, and mismatch rejection...');
    const googleUserEmail = `google_user_${timestamp}@example.com`;
    const googleInvite = await userService.inviteUser(
      googleUserEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Google Invitee',
      'WEB',
      adminUser._id.toString()
    );
    const googleToken = googleInvite.invitationToken;

    // 5a. Mismatched Google Identity
    googleProvider.verifyToken = async (idToken) => {
      if (idToken === 'mock-google-token-attacker') {
        return {
          sub: 'google-attacker-uid-111',
          email: `attacker_google_${timestamp}@example.com`,
          name: 'Attacker Google Identity',
          picture: 'https://example.com/avatar.jpg',
        };
      }
      throw new Error('Unexpected token in mock');
    };

    let googleMismatchBlocked = false;
    try {
      await authService.acceptInvitationWithSSO(googleToken, 'mock-google-token-attacker', 'google');
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('Email in SSO token does not match')) {
        googleMismatchBlocked = true;
      }
    }

    if (!googleMismatchBlocked) {
      throw new Error('TEST 5 FAILURE: Mismatched Google account was not rejected with 403!');
    }

    // Verify invitation is NOT consumed on mismatched Google attempt
    const googleTokenDocAfterFail = await Token.findOne({
      $or: [{ token: hashToken(googleToken) }, { token: googleToken }],
    });
    if (googleTokenDocAfterFail.status !== 'PENDING' || googleTokenDocAfterFail.used === true) {
      throw new Error('SECURITY VIOLATION: Invitation was consumed on mismatched Google identity!');
    }
    console.log('- Mismatched Google identity correctly rejected with 403; token remains PENDING');

    // 5b. Correct Google Identity
    googleProvider.verifyToken = async (idToken) => {
      if (idToken === 'mock-google-token-valid') {
        return {
          sub: `google-uid-${timestamp}`,
          email: googleUserEmail,
          name: 'Verified Google User',
          picture: 'https://example.com/avatar.jpg',
        };
      }
      throw new Error('Unexpected token in mock');
    };

    const googleAcceptRes = await authService.acceptInvitationWithSSO(googleToken, 'mock-google-token-valid', 'google');
    if (!googleAcceptRes || !googleAcceptRes.token || !googleAcceptRes.user) {
      throw new Error('TEST 5 FAILURE: Google SSO acceptance did not return auth session');
    }

    // Verify user is Active
    const googleUserDoc = await User.findOne({ email: googleUserEmail });
    if (!googleUserDoc || googleUserDoc.status !== 'Active') {
      throw new Error(`TEST 5 FAILURE: User status expected Active, got ${googleUserDoc?.status}`);
    }

    // Verify OrgMembership is Active
    const googleMembership = await OrgMembership.findOne({ userId: googleUserDoc._id, orgId: testOrg._id });
    if (!googleMembership || googleMembership.status !== 'Active') {
      throw new Error(`TEST 5 FAILURE: Membership expected Active, got ${googleMembership?.status}`);
    }

    // Verify UserIdentity was linked
    const googleIdentityDoc = await UserIdentity.findOne({
      userId: googleUserDoc._id,
      provider: 'google',
      providerId: `google-uid-${timestamp}`,
    });
    if (!googleIdentityDoc) {
      throw new Error('TEST 5 FAILURE: UserIdentity record was not created for Google SSO user');
    }

    // Verify invitation token is now consumed
    const googleTokenDocAfterSuccess = await Token.findOne({
      $or: [{ token: hashToken(googleToken) }, { token: googleToken }],
    });
    if (googleTokenDocAfterSuccess.status !== 'ACCEPTED' || googleTokenDocAfterSuccess.used !== true) {
      throw new Error('TEST 5 FAILURE: Invitation token was not marked ACCEPTED after Google SSO acceptance');
    }

    console.log('✓ Test 5 Passed: Google SSO verified via existing provider adapter, matched identity accepted, and token consumed!\n');

    // -------------------------------------------------------------
    // Test 6: Microsoft SSO Invitation Acceptance & Verification
    // -------------------------------------------------------------
    console.log('[Test 6] Testing MICROSOFT SSO invitation acceptance, identity verification, and mismatch rejection...');
    const msUserEmail = `ms_user_${timestamp}@example.com`;
    const msInvite = await userService.inviteUser(
      msUserEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Microsoft Invitee',
      'WEB',
      adminUser._id.toString()
    );
    const msToken = msInvite.invitationToken;

    // 6a. Mismatched Microsoft Identity
    microsoftProvider.verifyToken = async (idToken) => {
      if (idToken === 'mock-ms-token-attacker') {
        return {
          sub: 'ms-attacker-uid-222',
          preferred_username: `attacker_ms_${timestamp}@example.com`,
          name: 'Attacker Microsoft Identity',
        };
      }
      throw new Error('Unexpected token in mock');
    };

    let msMismatchBlocked = false;
    try {
      await authService.acceptInvitationWithSSO(msToken, 'mock-ms-token-attacker', 'microsoft');
    } catch (err) {
      if (err.statusCode === 403 && err.message.includes('Email in SSO token does not match')) {
        msMismatchBlocked = true;
      }
    }

    if (!msMismatchBlocked) {
      throw new Error('TEST 6 FAILURE: Mismatched Microsoft account was not rejected with 403!');
    }

    // Verify invitation is NOT consumed on mismatched Microsoft attempt
    const msTokenDocAfterFail = await Token.findOne({
      $or: [{ token: hashToken(msToken) }, { token: msToken }],
    });
    if (msTokenDocAfterFail.status !== 'PENDING' || msTokenDocAfterFail.used === true) {
      throw new Error('SECURITY VIOLATION: Invitation was consumed on mismatched Microsoft identity!');
    }
    console.log('- Mismatched Microsoft identity correctly rejected with 403; token remains PENDING');

    // 6b. Correct Microsoft Identity
    microsoftProvider.verifyToken = async (idToken) => {
      if (idToken === 'mock-ms-token-valid') {
        return {
          sub: `ms-uid-${timestamp}`,
          email: msUserEmail,
          name: 'Verified Microsoft User',
        };
      }
      throw new Error('Unexpected token in mock');
    };

    const msAcceptRes = await authService.acceptInvitationWithSSO(msToken, 'mock-ms-token-valid', 'microsoft');
    if (!msAcceptRes || !msAcceptRes.token || !msAcceptRes.user) {
      throw new Error('TEST 6 FAILURE: Microsoft SSO acceptance did not return auth session');
    }

    // Verify user is Active
    const msUserDoc = await User.findOne({ email: msUserEmail });
    if (!msUserDoc || msUserDoc.status !== 'Active') {
      throw new Error(`TEST 6 FAILURE: User status expected Active, got ${msUserDoc?.status}`);
    }

    // Verify OrgMembership is Active
    const msMembership = await OrgMembership.findOne({ userId: msUserDoc._id, orgId: testOrg._id });
    if (!msMembership || msMembership.status !== 'Active') {
      throw new Error(`TEST 6 FAILURE: Membership expected Active, got ${msMembership?.status}`);
    }

    // Verify UserIdentity was linked
    const msIdentityDoc = await UserIdentity.findOne({
      userId: msUserDoc._id,
      provider: 'microsoft',
      providerId: `ms-uid-${timestamp}`,
    });
    if (!msIdentityDoc) {
      throw new Error('TEST 6 FAILURE: UserIdentity record was not created for Microsoft SSO user');
    }

    // Verify invitation token is now consumed
    const msTokenDocAfterSuccess = await Token.findOne({
      $or: [{ token: hashToken(msToken) }, { token: msToken }],
    });
    if (msTokenDocAfterSuccess.status !== 'ACCEPTED' || msTokenDocAfterSuccess.used !== true) {
      throw new Error('TEST 6 FAILURE: Invitation token was not marked ACCEPTED after Microsoft SSO acceptance');
    }

    console.log('✓ Test 6 Passed: Microsoft SSO verified via existing provider adapter, matched identity accepted, and token consumed!\n');

    console.log('================================================================');
    console.log('🎉 ALL 6 PHASE 3 VERIFICATION SUITE TESTS PASSED (100%)!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ PHASE 3 VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    // Restore original provider implementations
    googleProvider.verifyToken = originalGoogleVerify;
    microsoftProvider.verifyToken = originalMicrosoftVerify;

    console.log('Cleaning up test data...');
    if (testOrg) await Organization.findByIdAndDelete(testOrg._id);
    if (testOrg2) await Organization.findByIdAndDelete(testOrg2._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (existingUser) await User.findByIdAndDelete(existingUser._id);
    await User.deleteMany({ email: { $regex: `_${timestamp}@example.com` } });
    await OrgMembership.deleteMany({ orgId: { $in: [testOrg?._id, testOrg2?._id].filter(Boolean) } });
    await Token.deleteMany({ orgId: { $in: [testOrg?._id, testOrg2?._id].filter(Boolean) } });
    await UserIdentity.deleteMany({ providerEmail: { $regex: `_${timestamp}@example.com` } });
    await mongoose.disconnect();
    console.log('Cleanup complete.');
    process.exit(0);
  }
}

runPhase3Verification();
