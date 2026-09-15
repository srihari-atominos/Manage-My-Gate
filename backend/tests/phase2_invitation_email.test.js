import mongoose from 'mongoose';
import dotenv from 'dotenv';
import net from 'net';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

dotenv.config({ path: './.env' });

import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import IntegrationHub from '../src/features/integrationHub/integrationHub.model.js';
import Token from '../src/features/token/token.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import Villa from '../src/features/villa/villa.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import tokenService from '../src/features/token/token.services.js';
import { getSmtpTransporter, sendEmail } from '../src/utils/email.utils.js';
import { encrypt } from '../src/features/integrationHub/utils/crypto.util.js';
import { generateInviteLink } from '../src/features/user/utils/invite.utils.js';

/**
 * Creates a lightweight, local mock SMTP server to verify real TCP packet delivery of emails.
 */
function createLocalSmtpServer() {
  return new Promise((resolve) => {
    let capturedMails = [];
    const server = net.createServer((socket) => {
      let buffer = '';
      socket.write('220 localhost ESMTP MockServer\r\n');
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          const upper = line.toUpperCase();
          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
          } else if (upper.startsWith('AUTH')) {
            socket.write('235 2.7.0 Authentication successful\r\n');
          } else if (upper.startsWith('MAIL FROM:')) {
            socket.write('250 2.1.0 Sender OK\r\n');
          } else if (upper.startsWith('RCPT TO:')) {
            socket.write('250 2.1.5 Recipient OK\r\n');
          } else if (upper.startsWith('DATA')) {
            socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
          } else if (line === '.') {
            capturedMails.push(buffer);
            socket.write('250 2.0.0 OK: message queued\r\n');
          } else if (upper.startsWith('QUIT')) {
            socket.write('221 2.0.0 Bye\r\n');
            socket.end();
          }
        }
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port,
        server,
        getMails: () => capturedMails,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('=== NAHOM PHASE 2: INVITATION EMAIL & INTEGRATION HUB TESTS  ===');
  console.log('================================================================\n');

  await connectToDb();

  const timestamp = Date.now();
  let passedTests = 0;
  const totalTests = 9;
  const testCleanup = [];

  try {
    const adminUser = await User.create({
      name: `Test Org Admin ${timestamp}`,
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@example.com`,
      password: await bcrypt.hash('AdminSecretPass123!', 10),
      status: 'Active',
      role: 'Super Admin',
    });
    testCleanup.push(async () => await User.deleteOne({ _id: adminUser._id }));

    // -------------------------------------------------------------------------
    // TEST A: Organization A with SMTP -> invitation email resolves A
    // -------------------------------------------------------------------------
    console.log('[TEST A] Verifying Organization A with configured SMTP resolves its own credentials & account label...');
    const orgA = await Organization.create({
      name: `Community A ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => await Organization.deleteOne({ _id: orgA._id }));

    const hostEnc = encrypt('smtp.provider-a.net');
    const portEnc = encrypt('587');
    const userEnc = encrypt(`mailer@community-a-${timestamp}.org`);
    const passEnc = encrypt('SecretPassA456!');

    const intHubA = await IntegrationHub.create({
      userId: adminUser._id,
      orgId: orgA._id,
      provider: 'smtp',
      accountLabel: 'Emerald Palms Mailer',
      status: 'connected',
      credentials: [
        { key: 'host', encryptedValue: hostEnc.encryptedValue, iv: hostEnc.iv },
        { key: 'port', encryptedValue: portEnc.encryptedValue, iv: portEnc.iv },
        { key: 'authUsername', encryptedValue: userEnc.encryptedValue, iv: userEnc.iv },
        { key: 'authPassword', encryptedValue: passEnc.encryptedValue, iv: passEnc.iv },
      ],
    });
    testCleanup.push(async () => await IntegrationHub.deleteOne({ _id: intHubA._id }));

    const orgATransporter = await getSmtpTransporter(orgA._id);
    if (
      orgATransporter &&
      orgATransporter.from.includes('Emerald Palms Mailer') &&
      orgATransporter.authUsername === `mailer@community-a-${timestamp}.org`
    ) {
      console.log('✅ PASS (Test A): Organization A successfully resolved its custom SMTP transporter and sender identity.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test A): Transporter resolution for Org A failed:', orgATransporter);
    }

    // -------------------------------------------------------------------------
    // TEST B: Organization B without SMTP -> never resolves A
    // -------------------------------------------------------------------------
    console.log('\n[TEST B] Verifying Organization B without SMTP NEVER resolves Org A credentials or branding...');
    const orgB = await Organization.create({
      name: `Community B ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => await Organization.deleteOne({ _id: orgB._id }));

    const orgBTransporter = await getSmtpTransporter(orgB._id);
    const leakedOrgA = orgBTransporter && (
      orgBTransporter.from.includes('Emerald Palms Mailer') ||
      orgBTransporter.authUsername === `mailer@community-a-${timestamp}.org`
    );

    if (!leakedOrgA) {
      console.log('✅ PASS (Test B): Organization B strictly isolated; zero credential or brand leakage from Org A.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test B): Cross-tenant leakage detected for Org B:', orgBTransporter);
    }

    // -------------------------------------------------------------------------
    // TEST C: Organization C with corrupted credentials -> safe failure / fallback
    // -------------------------------------------------------------------------
    console.log('\n[TEST C] Verifying Organization C with corrupted credentials fails safely without crashing...');
    const orgC = await Organization.create({
      name: `Community C Corrupt ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
    });
    testCleanup.push(async () => await Organization.deleteOne({ _id: orgC._id }));

    const intHubC = await IntegrationHub.create({
      userId: adminUser._id,
      orgId: orgC._id,
      provider: 'smtp',
      accountLabel: 'Corrupted Identity',
      status: 'connected',
      credentials: [
        { key: 'host', encryptedValue: 'deadbeef1122334455667788', iv: '00112233445566778899aabbccddeeff' },
        { key: 'port', encryptedValue: 'deadbeef1122334455667788', iv: '00112233445566778899aabbccddeeff' },
        { key: 'authUsername', encryptedValue: 'deadbeef1122334455667788', iv: '00112233445566778899aabbccddeeff' },
        { key: 'authPassword', encryptedValue: 'deadbeef1122334455667788', iv: '00112233445566778899aabbccddeeff' },
      ],
    });
    testCleanup.push(async () => await IntegrationHub.deleteOne({ _id: intHubC._id }));

    let orgCTransporter = null;
    let crashError = null;
    try {
      orgCTransporter = await getSmtpTransporter(orgC._id);
    } catch (err) {
      crashError = err;
    }

    if (!crashError) {
      console.log('✅ PASS (Test C): Corrupted credentials safely caught by error boundary without crashing.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test C): getSmtpTransporter threw unhandled exception:', crashError);
    }

    // -------------------------------------------------------------------------
    // TEST D: New User E2E Flow (Invite -> Validate -> Accept -> Activate)
    // -------------------------------------------------------------------------
    console.log('\n[TEST D] Verifying New User end-to-end invitation, registration, and membership activation...');
    const newUserEmail = `newuser_${timestamp}@example.com`;
    const newUserName = `New Invited Resident ${timestamp}`;
    const newUserPhone = `+1555${Math.floor(100000 + Math.random() * 900000)}`;

    const inviteResD = await userService.inviteUser(
      newUserEmail,
      orgA._id,
      null,
      'None',
      null,
      newUserPhone,
      newUserName,
      'WEB',
      adminUser._id
    );
    testCleanup.push(async () => {
      await User.deleteOne({ email: newUserEmail });
      await OrgMembership.deleteMany({ userId: inviteResD.user._id });
      await Token.deleteMany({ userId: inviteResD.user._id });
    });

    const rawTokenD = inviteResD.invitationToken;

    // Validate token endpoint
    const validateResD = await authService.validateInvite(rawTokenD);
    if (!validateResD || validateResD.email.toLowerCase() !== newUserEmail.toLowerCase()) {
      throw new Error(`Token validation failed for new user: ${JSON.stringify(validateResD)}`);
    }

    // Accept invitation with password
    const newPasswordD = 'SecureNewPassword123!';
    const acceptResD = await authService.acceptInvitation(
      rawTokenD,
      newPasswordD,
      newUserEmail,
      null,
      { name: newUserName, phone: newUserPhone }
    );

    // Verify persisted state in MongoDB
    const activatedUserD = await User.findById(inviteResD.user._id);
    const membershipD = await OrgMembership.findOne({ userId: activatedUserD._id, orgId: orgA._id });
    const isPassValid = await bcrypt.compare(newPasswordD, activatedUserD.password);

    if (
      activatedUserD.status === 'Active' &&
      isPassValid &&
      membershipD &&
      membershipD.status === 'Active' &&
      acceptResD.token
    ) {
      console.log('✅ PASS (Test D): New user successfully registered, password set, and membership activated.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test D): New user activation state invalid:', {
        userStatus: activatedUserD.status,
        membershipStatus: membershipD?.status,
        isPassValid,
      });
    }

    // -------------------------------------------------------------------------
    // TEST E: Existing User E2E Flow (Invite -> Login -> Accept -> Preserve Password)
    // -------------------------------------------------------------------------
    console.log('\n[TEST E] Verifying Existing User invitation, login, and membership activation with password preservation...');
    const existingEmail = `existing_${timestamp}@example.com`;
    const originalPasswordE = 'ExistingUserSecret999!';
    const hashedOriginalE = await bcrypt.hash(originalPasswordE, 10);

    const existingUser = await User.create({
      name: `Existing Member ${timestamp}`,
      username: `existing_${timestamp}`,
      email: existingEmail,
      password: hashedOriginalE,
      status: 'Active',
      role: 'Resident',
    });
    testCleanup.push(async () => {
      await User.deleteOne({ _id: existingUser._id });
      await OrgMembership.deleteMany({ userId: existingUser._id });
      await Token.deleteMany({ userId: existingUser._id });
    });

    // Invite existing user to Org A
    const inviteResE = await userService.inviteUser(
      existingEmail,
      orgA._id,
      null,
      'None',
      null,
      '',
      '',
      'WEB',
      adminUser._id
    );
    const rawTokenE = inviteResE.invitationToken;

    // Validate invite recognizes existing account
    const validateResE = await authService.validateInvite(rawTokenE);
    if (!validateResE.isExisting) {
      console.error('⚠️ Notice: validateInvite did not flag isExisting as true');
    }

    // Accept invitation without password mutation
    await authService.acceptInvitation(
      rawTokenE,
      null, // No password provided
      existingEmail,
      existingUser._id // Authenticated user ID
    );

    // Verify existing password was NOT modified
    const reloadedUserE = await User.findById(existingUser._id);
    const isOriginalPassPreserved = await bcrypt.compare(originalPasswordE, reloadedUserE.password);
    const membershipE = await OrgMembership.findOne({ userId: existingUser._id, orgId: orgA._id });

    if (isOriginalPassPreserved && membershipE && membershipE.status === 'Active') {
      console.log('✅ PASS (Test E): Existing user membership activated; existing password strictly preserved.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test E): Existing user password mutated or membership not active:', {
        isOriginalPassPreserved,
        membershipStatus: membershipE?.status,
      });
    }

    // -------------------------------------------------------------------------
    // TEST F: Invitation URL Structure and Token Verifiability
    // -------------------------------------------------------------------------
    console.log('\n[TEST F] Verifying Invitation URL canonical structure and cryptographic token binding...');
    const inviteLinkF = generateInviteLink(rawTokenD);
    const expectedPrefix = '/invite/';

    if (
      inviteLinkF.includes(expectedPrefix) &&
      inviteLinkF.endsWith(rawTokenD) &&
      rawTokenD.length === 64
    ) {
      console.log('✅ PASS (Test F): Canonical invitation URL generated correctly with 32-byte (64 hex) crypto token.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test F): Malformed invitation URL:', inviteLinkF);
    }

    // -------------------------------------------------------------------------
    // TEST G: Invitation Token Single-Use (Replay Prevention)
    // -------------------------------------------------------------------------
    console.log('\n[TEST G] Verifying consumed invitation token cannot be reused...');
    let replayPrevented = false;
    try {
      await authService.acceptInvitation(rawTokenD, 'AnotherPassword123!', newUserEmail);
    } catch (err) {
      if (err.statusCode === 400 || err.message.includes('already been accepted')) {
        replayPrevented = true;
      }
    }

    if (replayPrevented) {
      console.log('✅ PASS (Test G): Second acceptance attempt on consumed token strictly rejected with HTTP 400.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test G): Replay of consumed invitation token was allowed!');
    }

    // -------------------------------------------------------------------------
    // TEST H: Role & Villa Context Survival across Invitation & Acceptance
    // -------------------------------------------------------------------------
    console.log('\n[TEST H] Verifying Role and Villa assignment survive the entire invitation flow...');
    const testVilla = await Villa.create({
      orgId: orgA._id,
      unitNumber: `U-${timestamp.toString().slice(-4)}`,
      blockOrBuilding: 'Tower Alpha',
      floor: '3',
      type: 'Apartment',
      status: 'Vacant',
    });
    testCleanup.push(async () => await Villa.deleteOne({ _id: testVilla._id }));

    // Create or find a specific role in Org A
    const residentRole = await Role.findOne({ name: 'Resident', orgId: orgA._id }) ||
      await Role.create({
        name: 'Resident',
        orgId: orgA._id,
        permissions: ['read:notice'],
        isTenantRole: true,
      });
    testCleanup.push(async () => await Role.deleteOne({ _id: residentRole._id }));

    const villaUserEmail = `villa_user_${timestamp}@example.com`;
    const inviteResH = await userService.inviteUser(
      villaUserEmail,
      orgA._id,
      testVilla._id,
      'Resident',
      residentRole.name,
      '',
      '',
      'WEB',
      adminUser._id
    );
    testCleanup.push(async () => {
      await User.deleteOne({ email: villaUserEmail });
      await OrgMembership.deleteMany({ userId: inviteResH.user._id });
      await Token.deleteMany({ userId: inviteResH.user._id });
    });

    const rawTokenH = inviteResH.invitationToken;

    // Accept invitation
    await authService.acceptInvitation(rawTokenH, 'VillaPass123!', villaUserEmail);

    // Verify membership has villa and role
    const finalMembershipH = await OrgMembership.findOne({ userId: inviteResH.user._id, orgId: orgA._id });
    const finalVillaH = await Villa.findById(testVilla._id);

    const hasVillaInUnits = finalMembershipH?.units?.some(
      (u) => u.villaId && u.villaId.toString() === testVilla._id.toString()
    );
    const hasRole = finalMembershipH?.roleIds?.some(
      (r) => r.toString() === residentRole._id.toString()
    ) || (finalMembershipH?.roleId && finalMembershipH.roleId.toString() === residentRole._id.toString());

    if (hasVillaInUnits && hasRole && finalVillaH.status === 'Occupied') {
      console.log('✅ PASS (Test H): Role and Villa assignment survived acceptance; Unit status marked Occupied.');
      passedTests++;
    } else {
      console.error('❌ FAIL (Test H): Context lost:', {
        hasVillaInUnits,
        hasRole,
        villaStatus: finalVillaH?.status,
      });
    }

    // -------------------------------------------------------------------------
    // TEST I: Empirical End-to-End SMTP Socket Delivery Test
    // -------------------------------------------------------------------------
    console.log('\n[TEST I] Verifying empirical SMTP socket delivery through actual TCP transport...');
    const localSmtp = await createLocalSmtpServer();

    try {
      const orgLocal = await Organization.create({
        name: `Local SMTP Community ${timestamp}`,
        status: 'Active',
        organizationType: 'Residential',
      });
      testCleanup.push(async () => await Organization.deleteOne({ _id: orgLocal._id }));

      const localHostEnc = encrypt('127.0.0.1');
      const localPortEnc = encrypt(String(localSmtp.port));
      const localUserEnc = encrypt('test-mailer@localtcp.internal');
      const localPassEnc = encrypt('test-pass');

      const localIntHub = await IntegrationHub.create({
        userId: adminUser._id,
        orgId: orgLocal._id,
        provider: 'smtp',
        accountLabel: 'Live TCP Mailer',
        status: 'connected',
        credentials: [
          { key: 'host', encryptedValue: localHostEnc.encryptedValue, iv: localHostEnc.iv },
          { key: 'port', encryptedValue: localPortEnc.encryptedValue, iv: localPortEnc.iv },
          { key: 'authUsername', encryptedValue: localUserEnc.encryptedValue, iv: localUserEnc.iv },
          { key: 'authPassword', encryptedValue: localPassEnc.encryptedValue, iv: localPassEnc.iv },
        ],
      });
      testCleanup.push(async () => await IntegrationHub.deleteOne({ _id: localIntHub._id }));

      const testSubject = `Test Invitation to Local Community ${timestamp}`;
      const testBody = `<h3>Welcome</h3><p>Join here: <a href="https://managemygate.e3esg.com/invite/dummytoken">Link</a></p>`;

      const deliverySuccess = await sendEmail(
        orgLocal._id,
        `socket_recipient_${timestamp}@example.com`,
        testSubject,
        testBody
      );

      if (deliverySuccess) {
        console.log('✅ PASS (Test I): Actual TCP socket email delivery completed successfully via nodemailer.');
        passedTests++;
      } else {
        console.error('❌ FAIL (Test I): sendEmail returned false for local TCP SMTP delivery.');
      }
    } finally {
      await localSmtp.close();
    }

  } catch (err) {
    console.error('Unhandled error in Phase 2 test suite:', err);
  } finally {
    console.log('\nCleaning up Phase 2 test fixtures from database...');
    for (const fn of testCleanup) {
      await fn().catch(() => null);
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`=== PHASE 2 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase2Tests().catch(console.error);
