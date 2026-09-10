import mongoose from 'mongoose';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import Notification from '../src/features/notification/notification.model.js';
import Token from '../src/features/token/token.model.js';
import Role from '../src/features/role/role.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import { generateInviteLink, generateLegacyInviteLink } from '../src/features/user/utils/invite.utils.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import '../src/features/user/user.listeners.js';

async function runPhase2Verification() {
  console.log('=== Starting Phase 2: Dual-Audience Notification & Universal Invitation URL Verification ===\n');
  await connectToDb();

  const timestamp = Date.now();
  let testOrg, adminUser, existingUser;

  try {
    // -------------------------------------------------------------
    // Test 1: Canonical Universal URL and Legacy URL Generation
    // -------------------------------------------------------------
    console.log('[Test 1] Verifying Universal Invitation URL and Legacy Generation...');
    const sampleToken = 'abc123def456sampletoken789';
    const universalUrl = generateInviteLink(sampleToken);
    console.log(`- Generated Universal URL: ${universalUrl}`);

    if (!universalUrl.endsWith(`/invite/${sampleToken}`) || universalUrl.includes('/invite/web/') || universalUrl.includes('/invite/app/')) {
      throw new Error(`URL GENERATION FAILURE: Expected universal URL ending in /invite/${sampleToken}, got: ${universalUrl}`);
    }

    const legacyWebUrl = generateLegacyInviteLink(sampleToken, 'WEB');
    const legacyAppUrl = generateLegacyInviteLink(sampleToken, 'APP');
    console.log(`- Legacy WEB URL: ${legacyWebUrl}`);
    console.log(`- Legacy APP URL: ${legacyAppUrl}`);

    if (!legacyWebUrl.endsWith(`/invite/web/${sampleToken}`) || !legacyAppUrl.endsWith(`/invite/app/${sampleToken}`)) {
      throw new Error('LEGACY URL FAILURE: Legacy URLs not matching backward-compatibility patterns');
    }
    console.log('✓ Universal URL & Legacy URL utilities verified!\n');

    // -------------------------------------------------------------
    // Setup Test Organization and Admin
    // -------------------------------------------------------------
    console.log('[Setup] Creating test organization and admin...');
    testOrg = await Organization.create({
      name: `Phase 2 Community ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });

    await Role.create({
      name: 'Resident',
      orgId: testOrg._id,
      isTenantRole: true,
    });

    const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
    adminUser = await User.create({
      name: 'Community Admin P2',
      username: `admin_p2_${timestamp}`,
      email: `admin_p2_${timestamp}@example.com`,
      password: hashedPassword,
      status: 'Active',
      role: 'Admin',
      orgId: testOrg._id,
      organizations: [{ orgId: testOrg._id, role: 'Admin', status: 'Active' }],
    });
    console.log(`✓ Test organization and admin created: Org ID: ${testOrg._id}, Admin ID: ${adminUser._id}\n`);

    // -------------------------------------------------------------
    // Test 2: Existing User Invitation & In-App Notification Delivery
    // -------------------------------------------------------------
    console.log('[Test 2] Testing EXISTING USER Invitation & Dual-Audience Notification...');
    const existingUserEmail = `existing_user_${timestamp}@example.com`;
    existingUser = await User.create({
      name: 'Existing Member P2',
      username: `existing_p2_${timestamp}`,
      email: existingUserEmail,
      password: hashedPassword,
      status: 'Active',
      role: 'Resident',
    });

    console.log(`- Inviting existing user (${existingUserEmail})...`);
    const existingInvite = await userService.inviteUser(
      existingUserEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'Existing Member P2',
      'WEB',
      adminUser._id.toString()
    );

    const existingToken = existingInvite.invitationToken;
    console.log(`- Generated invite link in response: ${existingInvite.inviteLink}`);
    if (!existingInvite.inviteLink.endsWith(`/invite/${existingToken}`)) {
      throw new Error(`INVITE LINK FAILURE: inviteLink must use canonical /invite/:token. Got: ${existingInvite.inviteLink}`);
    }

    // Allow event listener to persist notification
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify In-App Notification was created for Existing User
    const existingUserNotif = await Notification.findOne({
      recipientId: existingUser._id,
      type: 'INVITATION',
    });

    if (!existingUserNotif) {
      throw new Error('NOTIFICATION FAILURE: Existing user DID NOT receive in-app invitation notification!');
    }
    console.log(`- Existing User In-App Notification Action URL: ${existingUserNotif.actionUrl}`);
    console.log(`- Existing User In-App Notification Sender ID: ${existingUserNotif.senderId}`);

    if (!existingUserNotif.actionUrl.endsWith(`/invite/${existingToken}`)) {
      throw new Error(`NOTIFICATION FAILURE: Notification actionUrl must point to canonical /invite/:token! Got: ${existingUserNotif.actionUrl}`);
    }
    if (!existingUserNotif.senderId || existingUserNotif.senderId.toString() !== adminUser._id.toString()) {
      throw new Error(`NOTIFICATION FAILURE: Notification senderId does not match inviterId!`);
    }
    console.log('✓ Existing user successfully received in-app notification with canonical /invite/:token actionUrl!\n');

    // -------------------------------------------------------------
    // Test 3: New User Invitation — NO In-App Notification
    // -------------------------------------------------------------
    console.log('[Test 3] Testing NEW USER Invitation (Must NOT receive in-app notification)...');
    const newUserEmail = `new_unregistered_${timestamp}@example.com`;

    const newInvite = await userService.inviteUser(
      newUserEmail,
      testOrg._id.toString(),
      null,
      'Resident',
      'Resident',
      '',
      'New Unregistered Resident',
      'WEB',
      adminUser._id.toString()
    );

    const newToken = newInvite.invitationToken;
    console.log(`- Generated invite link in response: ${newInvite.inviteLink}`);
    if (!newInvite.inviteLink.endsWith(`/invite/${newToken}`)) {
      throw new Error(`INVITE LINK FAILURE: inviteLink must use canonical /invite/:token. Got: ${newInvite.inviteLink}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Look up the newly created Pending Verification user doc
    const newUserDoc = await User.findOne({ email: newUserEmail });
    if (!newUserDoc) {
      throw new Error('USER CREATION FAILURE: Pending user doc was not created for new invitee!');
    }
    console.log(`- New User Status: ${newUserDoc.status}, Has Password: ${!!newUserDoc.password}`);

    // Verify that NO in-app notification was sent to the new user
    const newUserNotif = await Notification.findOne({
      recipientId: newUserDoc._id,
      type: 'INVITATION',
    });

    if (newUserNotif) {
      throw new Error('NOTIFICATION FAILURE: New unregistered user received in-app notification! New users must NOT receive in-app notifications.');
    }
    console.log('✓ New user did NOT receive in-app notification (email only) as required!\n');

    // -------------------------------------------------------------
    // Test 4: validateInvite Contract & Context Enrichment
    // -------------------------------------------------------------
    console.log('[Test 4] Testing validateInvite Contract & Data Context Enrichment...');
    const validatedData = await authService.validateInvite(existingToken);
    console.log('- validateInvite response:', JSON.stringify(validatedData, null, 2));

    if (!validatedData.valid || validatedData.invitationStatus !== 'PENDING') {
      throw new Error('VALIDATE_INVITE FAILURE: valid is not true or status is not PENDING');
    }
    if (validatedData.isExisting !== true) {
      throw new Error(`VALIDATE_INVITE FAILURE: Expected isExisting: true, got: ${validatedData.isExisting}`);
    }
    if (!validatedData.inviterName || !validatedData.inviterId) {
      throw new Error(`VALIDATE_INVITE FAILURE: Missing inviterName (${validatedData.inviterName}) or inviterId (${validatedData.inviterId})`);
    }
    if (validatedData.orgName !== `Phase 2 Community ${timestamp}`) {
      throw new Error(`VALIDATE_INVITE FAILURE: Expected orgName: "Phase 2 Community ${timestamp}", got: ${validatedData.orgName}`);
    }

    // Check New User Validation
    const validatedNewData = await authService.validateInvite(newToken);
    if (validatedNewData.isExisting !== false) {
      throw new Error(`VALIDATE_INVITE FAILURE: Expected new user isExisting: false, got: ${validatedNewData.isExisting}`);
    }
    console.log('✓ validateInvite contract successfully enriches inviterName, isExisting, orgName, and lifecycle state!\n');

    // -------------------------------------------------------------
    // Test 5: Security Verification (No secrets exposed)
    // -------------------------------------------------------------
    console.log('[Test 5] Testing Security Isolation & Credential Protection...');
    if (validatedData.password || validatedData.passwordHash || validatedData.tokenHash || validatedData.accessToken || validatedData.refreshToken) {
      throw new Error('SECURITY FAILURE: Sensitive credentials or hashes exposed in validateInvite response!');
    }
    if (existingInvite.inviteLink.includes('tokenHash') || existingInvite.inviteLink.includes('password') || existingInvite.inviteLink.includes('bearer')) {
      throw new Error('SECURITY FAILURE: Sensitive credentials exposed in universal invitation link!');
    }
    console.log('✓ Security verified: Zero credentials, tokens, or hashes exposed in URLs or responses!\n');

    console.log('================================================================');
    console.log('🎉 ALL PHASE 2 DUAL-AUDIENCE & UNIVERSAL URL TESTS PASSED (100%)!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ PHASE 2 VERIFICATION FAILED:', err);
    process.exit(1);
  } finally {
    console.log('Cleaning up test data...');
    if (testOrg) await Organization.findByIdAndDelete(testOrg._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (existingUser) await User.findByIdAndDelete(existingUser._id);
    await User.deleteMany({ email: { $regex: `_${timestamp}@example.com` } });
    await Notification.deleteMany({ 'meta.orgId': testOrg?._id });
    await Token.deleteMany({ orgId: testOrg?._id });
    await mongoose.disconnect();
    console.log('Cleanup complete.');
    process.exit(0);
  }
}

runPhase2Verification();
