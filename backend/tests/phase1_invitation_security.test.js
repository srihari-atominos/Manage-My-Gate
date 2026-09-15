import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import IntegrationHub from '../src/features/integrationHub/integrationHub.model.js';
import Token from '../src/features/token/token.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import tokenService from '../src/features/token/token.services.js';
import authService from '../src/features/auth/auth.services.js';
import { getSmtpTransporter } from '../src/utils/email.utils.js';
import { encrypt } from '../src/features/integrationHub/utils/crypto.util.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

async function runPhase1Tests() {
  console.log('================================================================');
  console.log('=== NAHOM PHASE 1: INVITATION SECURITY & TENANT EMAIL TESTS  ===');
  console.log('================================================================\n');

  await connectToDb();

  const timestamp = Date.now();
  let passedTests = 0;
  let totalTests = 8;
  const testCleanup = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Raw User ObjectId Must Be Rejected
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Verifying that a raw User ObjectId is strictly REJECTED...');
    const originalPassword = 'OriginalSecretPassword123!';
    const hashedOriginal = await bcrypt.hash(originalPassword, 10);
    const victimUser = await User.create({
      name: `Test Victim User ${timestamp}`,
      username: `victim_${timestamp}`,
      email: `victim_${timestamp}@example.com`,
      password: hashedOriginal,
      status: 'Active',
      role: 'Resident',
    });
    testCleanup.push(async () => await User.deleteOne({ _id: victimUser._id }));

    let test1Passed = false;
    try {
      await tokenService.validateInvitationToken(victimUser._id.toString());
      console.error('❌ FAIL: validateInvitationToken accepted raw User ObjectId!');
    } catch (err) {
      if (err.statusCode === 400 || err.message.includes('Invalid or expired invitation token')) {
        test1Passed = true;
      } else {
        console.error('Unexpected error:', err);
      }
    }

    try {
      await authService.acceptInvitation(victimUser._id.toString(), 'AttackerNewPassword123!');
      test1Passed = false;
      console.error('❌ FAIL: authService.acceptInvitation accepted raw User ObjectId!');
    } catch (err) {
      const reloadedUser = await User.findById(victimUser._id);
      const isPasswordSame = await bcrypt.compare(originalPassword, reloadedUser.password);
      if (isPasswordSame && test1Passed) {
        console.log('✅ PASS: Raw User ObjectId rejected and victim password untouched.');
        passedTests++;
      } else {
        console.error('❌ FAIL: User password was compromised or modified!');
      }
    }

    // -------------------------------------------------------------------------
    // TEST 2: Arbitrary Valid MongoDB ObjectId Must Be Rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying that an arbitrary non-invitation ObjectId is strictly REJECTED...');
    const randomObjectId = new mongoose.Types.ObjectId().toString();
    try {
      await tokenService.validateInvitationToken(randomObjectId);
      console.error('❌ FAIL: validateInvitationToken accepted arbitrary random ObjectId!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✅ PASS: Arbitrary random ObjectId rejected as expected.');
        passedTests++;
      } else {
        console.error('❌ FAIL with unexpected error:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Genuine Invitation Token Must Succeed
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Verifying that a genuine invitation token succeeds...');
    const testOrg = await Organization.create({
      name: `Test Org Genuine ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => await Organization.deleteOne({ _id: testOrg._id }));

    const invitedUser = await User.create({
      name: `Genuine Invited User ${timestamp}`,
      username: `invited_${timestamp}`,
      email: `invited_${timestamp}@example.com`,
      status: 'Pending Verification',
      role: 'Resident',
      orgId: testOrg._id,
    });
    testCleanup.push(async () => await User.deleteOne({ _id: invitedUser._id }));

    const genuineResult = await tokenService.generateInvitationToken(invitedUser._id, testOrg._id);
    const genuineToken = genuineResult.invitationToken;

    const validatedToken = await tokenService.validateInvitationToken(genuineToken);
    if (validatedToken && validatedToken.userId.toString() === invitedUser._id.toString()) {
      console.log('✅ PASS: Genuine invitation token validated successfully.');
      passedTests++;
    } else {
      console.error('❌ FAIL: Genuine invitation token validation failed.');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Expired Invitation Token Must Be Rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Verifying that an expired invitation token is REJECTED...');
    const expiredResult = await tokenService.generateInvitationToken(invitedUser._id, testOrg._id);
    const expiredToken = expiredResult.invitationToken;
    const hashedExpiredToken = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await Token.updateOne(
      { token: hashedExpiredToken },
      { $set: { expiresAt: new Date(Date.now() - 3600 * 1000) } }
    );

    try {
      await tokenService.validateInvitationToken(expiredToken);
      console.error('❌ FAIL: Expired invitation token was accepted!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✅ PASS: Expired invitation token was rejected with HTTP 400.');
        passedTests++;
      } else {
        console.error('❌ FAIL with unexpected error:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 5: Used / Consumed Invitation Token Must Be Rejected
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Verifying that an already-used invitation token is REJECTED...');
    const reusableTokenRes = await tokenService.generateInvitationToken(invitedUser._id, testOrg._id);
    const reusableToken = reusableTokenRes.invitationToken;
    await tokenService.consumeInvitationToken(reusableToken);

    try {
      await tokenService.validateInvitationToken(reusableToken);
      console.error('❌ FAIL: Used invitation token was accepted on second attempt!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✅ PASS: Used invitation token was rejected with HTTP 400.');
        passedTests++;
      } else {
        console.error('❌ FAIL with unexpected error:', err.message);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 6: Multi-Tenant Email Isolation (Org B cannot use Org A's SMTP)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Verifying multi-tenant email isolation between Org A and Org B...');
    const orgA = await Organization.create({
      name: `Community A ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    const orgB = await Organization.create({
      name: `Community B ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => {
      await Organization.deleteOne({ _id: orgA._id });
      await Organization.deleteOne({ _id: orgB._id });
      await IntegrationHub.deleteMany({ orgId: { $in: [orgA._id, orgB._id] } });
    });

    const credHost = encrypt('smtp.community-a.com');
    const credPort = encrypt('587');
    const credUser = encrypt('admin@community-a.com');
    const credPass = encrypt('SecretPassA123!');

    await IntegrationHub.create({
      userId: victimUser._id,
      orgId: orgA._id,
      provider: 'smtp',
      accountLabel: 'Community A Mail',
      status: 'connected',
      credentials: [
        { key: 'host', encryptedValue: credHost.encryptedValue, iv: credHost.iv },
        { key: 'port', encryptedValue: credPort.encryptedValue, iv: credPort.iv },
        { key: 'authUsername', encryptedValue: credUser.encryptedValue, iv: credUser.iv },
        { key: 'authPassword', encryptedValue: credPass.encryptedValue, iv: credPass.iv },
      ],
    });

    const orgBTransporter = await getSmtpTransporter(orgB._id);

    if (!orgBTransporter || !orgBTransporter.from.includes('Community A Mail')) {
      console.log('✅ PASS: Org B did NOT resolve Org A\'s SMTP integration or branding.');
      passedTests++;
    } else {
      console.error('❌ FAIL: Cross-tenant leakage detected! Org B received Org A\'s SMTP transporter:', orgBTransporter.from);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Organization With Valid SMTP Connection Resolves Successfully
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Verifying that Org A with valid SMTP resolves its own configuration...');
    const orgATransporter = await getSmtpTransporter(orgA._id);
    if (
      orgATransporter &&
      orgATransporter.from.includes('Community A Mail') &&
      orgATransporter.authUsername === 'admin@community-a.com'
    ) {
      console.log('✅ PASS: Org A resolved its own configured SMTP transporter successfully.');
      passedTests++;
    } else {
      console.error('❌ FAIL: Org A failed to resolve its own SMTP transporter:', orgATransporter);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Safe Decryption Failure Boundary
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Verifying that corrupted/bad-decrypt credentials fail safely without crashing...');
    const orgC = await Organization.create({
      name: `Community C Bad Decrypt ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => {
      await Organization.deleteOne({ _id: orgC._id });
      await IntegrationHub.deleteMany({ orgId: orgC._id });
    });

    await IntegrationHub.create({
      userId: victimUser._id,
      orgId: orgC._id,
      provider: 'smtp',
      accountLabel: 'Corrupted Mail',
      status: 'connected',
      credentials: [
        { key: 'host', encryptedValue: 'deadbeef0123456789abcdef', iv: '0123456789abcdef0123456789abcdef' },
        { key: 'port', encryptedValue: 'deadbeef0123456789abcdef', iv: '0123456789abcdef0123456789abcdef' },
        { key: 'authUsername', encryptedValue: 'deadbeef0123456789abcdef', iv: '0123456789abcdef0123456789abcdef' },
        { key: 'authPassword', encryptedValue: 'deadbeef0123456789abcdef', iv: '0123456789abcdef0123456789abcdef' },
      ],
    });

    let didCrash = false;
    let orgCTransporter = null;
    try {
      orgCTransporter = await getSmtpTransporter(orgC._id);
    } catch (crashErr) {
      didCrash = true;
      console.error('❌ FAIL: getSmtpTransporter threw an unhandled exception:', crashErr);
    }

    if (!didCrash) {
      console.log('✅ PASS: Corrupted credentials handled safely without crashing. Result:', orgCTransporter);
      passedTests++;
    }

  } catch (globalErr) {
    console.error('Unexpected test failure:', globalErr);
  } finally {
    console.log('\nCleaning up test artifacts from database...');
    for (const cleanupFn of testCleanup) {
      await cleanupFn().catch(() => null);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`=== PHASE 1 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase1Tests().catch(console.error);
