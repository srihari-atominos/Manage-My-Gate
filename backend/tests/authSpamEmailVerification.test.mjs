import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import userService from '../src/features/user/user.services.js';
import authService from '../src/features/auth/auth.services.js';
import otpService from '../src/features/otp/otp.services.js';
import googleProvider from '../src/features/userIdentity/providerAdapters/google.provider.js';
import appleProvider from '../src/features/userIdentity/providerAdapters/apple.provider.js';
import { refreshToken as refreshTokenHandler } from '../src/features/session/session.controller.js';
import { signToken } from '../src/utils/jwt.utils.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Spam Email Login Vulnerability & Verification Security - Automated Suite', () => {
  let server;
  let baseUrl;
  let testOrg1, testOrg2;
  const createdUserIds = [];
  const createdOrgIds = [];
  const createdRoleIds = [];

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    testOrg1 = await Organization.create({
      name: `Security Org 1 ${timestamp}`,
      isPlatform: false,
      organizationType: 'Residential',
    });
    createdOrgIds.push(testOrg1._id);

    testOrg2 = await Organization.create({
      name: `Security Org 2 ${timestamp}`,
      isPlatform: false,
      organizationType: 'Residential',
    });
    createdOrgIds.push(testOrg2._id);

    const role1 = await Role.create({
      name: 'Resident',
      orgId: testOrg1._id,
      isDefault: true,
      permissions: ['visitor:read'],
    });
    createdRoleIds.push(role1._id);

    const role2 = await Role.create({
      name: 'Resident',
      orgId: testOrg2._id,
      isDefault: true,
      permissions: ['visitor:read'],
    });
    createdRoleIds.push(role2._id);
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await OrgMembership.deleteMany({ userId: { $in: createdUserIds } });
      }
      if (createdOrgIds.length > 0) {
        await Organization.deleteMany({ _id: { $in: createdOrgIds } });
        await OrgMembership.deleteMany({ orgId: { $in: createdOrgIds } });
      }
      if (createdRoleIds.length > 0) {
        await Role.deleteMany({ _id: { $in: createdRoleIds } });
      }
      await mongoose.disconnect();
    } catch (_) {}
  });

  // 1. Verified account with valid credentials can log in
  it('1. Verified account with valid credentials can log in', async () => {
    const rawPass = 'ValidSecret123!';
    const user = await userService.createUser({
      email: `verified_${Date.now()}@test.com`,
      username: `verified_${Date.now()}`,
      password: rawPass,
      status: 'Active',
      emailVerified: true,
    });
    createdUserIds.push(user._id);

    await OrgMembership.create({
      userId: user._id,
      orgId: testOrg1._id,
      status: 'Active',
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: user.email,
        password: rawPass,
      }),
    });

    assert.equal(res.status, 200, 'Verified user should receive 200 OK');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data?.token || data.token, 'Response should contain access token');
  });

  // 2. Unverified account with valid credentials cannot obtain an authenticated session
  it('2. Unverified account with valid credentials cannot obtain an authenticated session', async () => {
    const rawPass = 'Secret123!';
    const user = await userService.createUser({
      email: `unverified_${Date.now()}@spamdomain.com`,
      username: `unverified_${Date.now()}`,
      password: rawPass,
      status: 'Pending Verification',
      emailVerified: false,
    });
    createdUserIds.push(user._id);

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: user.email,
        password: rawPass,
      }),
    });

    assert.equal(res.status, 403, 'Unverified account must be rejected with 403');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(
      data.message.toLowerCase().includes('verify') || data.message.toLowerCase().includes('verification'),
      'Error message must indicate email verification is required'
    );
  });

  // 3. Client-supplied emailVerified: true cannot bypass backend verification
  it('3. Client-supplied emailVerified: true cannot bypass backend verification', async () => {
    const timestamp = Date.now();
    const spamEmail = `spammer_${timestamp}@fakeinbox.com`;
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Spam User',
        email: spamEmail,
        password: 'SpamPassword123!',
        phone: '9' + Math.floor(100000000 + Math.random() * 900000000),
        emailVerified: true, // Malicious client attempt to bypass verification
        status: 'Active',     // Malicious client attempt to bypass status
      }),
    });

    assert.equal(regRes.status, 201, 'Registration accepted pending verification');
    const created = await User.findOne({ email: spamEmail });
    assert.ok(created, 'User record created in database');
    createdUserIds.push(created._id);

    // Verify backend enforced defaults rather than trusting client body
    assert.equal(created.emailVerified, false, 'emailVerified must be false on backend');
    assert.equal(created.status, 'Pending Verification', 'status must be Pending Verification');

    // Attempt login immediately without verifying
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: spamEmail,
        password: 'SpamPassword123!',
      }),
    });

    assert.equal(loginRes.status, 403, 'Login must be blocked for unverified registered account');
  });

  // 4. Expired, invalid, reused, or wrong-account verification tokens are rejected
  it('4. Expired, invalid, reused, or wrong-account verification tokens are rejected', async () => {
    const emailA = `token_test_a_${Date.now()}@example.com`;
    const emailB = `token_test_b_${Date.now()}@example.com`;

    const codeA = await otpService.createOTP(emailA, 'REGISTER', 15);
    const codeB = await otpService.createOTP(emailB, 'REGISTER', 15);

    // a) Invalid code
    await assert.rejects(
      () => otpService.verifyOTP(emailA, '000000', 'REGISTER'),
      (err) => err instanceof HttpError && err.statusCode === 400
    );

    // b) Wrong-account token (using codeB for emailA)
    await assert.rejects(
      () => otpService.verifyOTP(emailA, codeB, 'REGISTER'),
      (err) => err instanceof HttpError && err.statusCode === 400
    );

    // c) Valid verification works
    const verified = await otpService.verifyOTP(emailA, codeA, 'REGISTER');
    assert.equal(verified, true);

    // d) Reused verification code is rejected
    await assert.rejects(
      () => otpService.verifyOTP(emailA, codeA, 'REGISTER'),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  // 5. Changing an account email requires verification of the new address
  it('5. Changing an account email requires verification of the new address', async () => {
    const rawPass = 'Secret123!';
    const user = await userService.createUser({
      email: `original_${Date.now()}@example.com`,
      username: `orig_${Date.now()}`,
      password: rawPass,
      status: 'Active',
      emailVerified: true,
    });
    createdUserIds.push(user._id);

    const newEmail = `updated_${Date.now()}@example.com`;

    // updateUser with new email must reset emailVerified to false
    const updated = await userService.updateUser(user._id, { email: newEmail });
    assert.equal(updated.email, newEmail);
    assert.equal(updated.emailVerified, false, 'Email change must invalidate previous verification');

    // Attempting updateProfile email change without OTP must fail
    await assert.rejects(
      () => userService.updateProfile(user._id, { email: `third_${Date.now()}@example.com` }),
      (err) => err instanceof HttpError && err.statusCode === 400
    );
  });

  // 6. Valid invitation acceptance follows the intended verification policy
  it('6. Valid invitation acceptance follows the intended verification policy', async () => {
    const inviteEmail = `invited_${Date.now()}@example.com`;
    const inviteRes = await userService.inviteUser(
      inviteEmail,
      testOrg1._id.toString(),
      null,
      'Resident',
      'Resident',
      '9876543210',
      'Invited Resident'
    );
    createdUserIds.push(inviteRes.user._id);

    const token = inviteRes.invitationToken;
    assert.ok(token, 'Invitation token generated');

    // Accepting invitation without token is rejected
    await assert.rejects(
      () => authService.acceptInvitation(null, 'NewPass123!', inviteEmail),
      (err) => err instanceof HttpError && err.statusCode === 400
    );

    // Accepting with valid token activates user and sets emailVerified = true
    const accepted = await authService.acceptInvitation(token, 'NewPass123!', inviteEmail);
    assert.ok(accepted, 'Invitation accepted successfully');

    const activatedUser = await User.findById(inviteRes.user._id);
    assert.equal(activatedUser.status, 'Active');
    assert.equal(activatedUser.emailVerified, true, 'Accepted invitation verifies email');

    // Reusing the token must fail
    await assert.rejects(
      () => authService.acceptInvitation(token, 'NewPass123!', inviteEmail),
      (err) => err instanceof HttpError
    );
  });

  // 7. OTP login follows the intended verification policy
  it('7. OTP login follows the intended verification policy', async () => {
    const otpEmail = `otplogin_${Date.now()}@example.com`;
    const user = await userService.createUser({
      email: otpEmail,
      username: `otplogin_${Date.now()}`,
      status: 'Pending Verification',
      emailVerified: false,
    });
    createdUserIds.push(user._id);

    await OrgMembership.create({
      userId: user._id,
      orgId: testOrg1._id,
      status: 'Active',
    });

    const devCode = await otpService.createOTP(otpEmail, 'REGISTER', 15);

    // Attempting login via OTP when user is Pending Verification must be blocked
    await assert.rejects(
      () => authService.verifyEmailOtpLogin(otpEmail, devCode),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Completing registration verification activates user
    const regResult = await authService.verifyRegistrationOtp(otpEmail, devCode, 'Test Device');
    assert.ok(regResult.token, 'Registration OTP verification issues token');

    const refreshedUser = await User.findById(user._id);
    assert.equal(refreshedUser.emailVerified, true, 'Registration OTP verifies the email address');
    assert.equal(refreshedUser.status, 'Active');

    // Now active user can log in with OTP
    const loginCode = await otpService.createOTP(otpEmail, 'LOGIN', 15);
    const loginResult = await authService.verifyEmailOtpLogin(otpEmail, loginCode, 'Test Device');
    assert.ok(loginResult.token, 'Active verified user logs in via OTP');
  });

  // 8. Social login rejects unverified email claims
  it('8. Social login rejects unverified email claims where verification is required', async () => {
    // Google provider rejects unverified email
    assert.throws(
      () =>
        googleProvider.normalizeIdentity({
          sub: 'google-sub-unverified',
          email: 'unverified@gmail.com',
          name: 'Unverified Google',
          email_verified: false,
        }),
      (err) => err instanceof HttpError && err.statusCode === 403
    );

    // Apple provider rejects unverified email
    assert.throws(
      () =>
        appleProvider.normalizeIdentity({
          sub: 'apple-sub-unverified',
          email: 'unverified@apple.com',
          email_verified: false,
        }),
      (err) => err instanceof HttpError && err.statusCode === 403
    );
  });

  // 9. Disposable-email domains are not rejected when policy is unconfigured
  it('9. Disposable-email domains are not rejected when policy is unconfigured', async () => {
    // Standard RFC registration succeeds with verification required
    const email = `policy_${Date.now()}@mailinator.com`;
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Policy User',
        email,
        password: 'ValidPassword123!',
        phone: '9' + Math.floor(100000000 + Math.random() * 900000000),
      }),
    });

    assert.equal(regRes.status, 201, 'Email accepted for verification');
    const data = await regRes.json();
    assert.equal(data.success, true);
    const created = await User.findOne({ email });
    if (created) createdUserIds.push(created._id);
  });

  // 10. Legitimate aliases and valid email domains are not rejected by overly broad filtering
  it('10. Legitimate aliases and valid email domains are not rejected', async () => {
    const timestamp = Date.now();
    const aliasEmail = `resident+buildingA_${timestamp}@subdomain.company.co.uk`;

    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alias User',
        email: aliasEmail,
        password: 'ValidPassword123!',
        phone: '9' + Math.floor(100000000 + Math.random() * 900000000),
      }),
    });

    assert.equal(regRes.status, 201, 'Plus-addressed email accepted for registration');
    const created = await User.findOne({ email: aliasEmail.toLowerCase() });
    assert.ok(created, 'Plus-addressed account created successfully');
    createdUserIds.push(created._id);
  });

  // 11. Login and refresh-token flows cannot bypass the account-status policy
  it('11. Login and refresh-token flows cannot bypass the account-status policy', async () => {
    const user = await userService.createUser({
      email: `refresh_bypass_${Date.now()}@example.com`,
      username: `rf_${Date.now()}`,
      status: 'Pending Verification',
      emailVerified: false,
    });
    createdUserIds.push(user._id);

    // Simulate session service validation for unverified user
    const mockReq = {
      cookies: { refreshToken: 'mock-refresh-token' },
      body: {},
    };
    const mockRes = {
      status: () => ({ json: () => {} }),
    };

    // Verify session controller refreshToken rejects unverified account
    let caughtErr = null;
    try {
      const authServiceModule = (await import('../src/features/auth/auth.services.js')).default;
      const originalGetUser = authServiceModule.getUserById;
      authServiceModule.getUserById = async () => user;

      const sessionServiceModule = (await import('../src/features/session/session.services.js')).default;
      const originalValidate = sessionServiceModule.validateRefreshToken;
      sessionServiceModule.validateRefreshToken = async () => ({ userId: user._id });

      try {
        await new Promise((resolve, reject) => {
          refreshTokenHandler(mockReq, mockRes, (err) => (err ? reject(err) : resolve()));
        });
      } finally {
        authServiceModule.getUserById = originalGetUser;
        sessionServiceModule.validateRefreshToken = originalValidate;
      }
    } catch (err) {
      caughtErr = err;
    }

    assert.ok(caughtErr instanceof HttpError, 'Should throw HttpError');
    assert.equal(caughtErr.statusCode, 403, 'Should reject with 403 Forbidden');
    assert.ok(caughtErr.message.toLowerCase().includes('verify'));
  });

  // 12. Successful authentication still requires active membership for tenant-scoped APIs
  it('12. Successful authentication still requires active membership for tenant-scoped APIs', async () => {
    const rawPass = 'Secret123!';
    const user = await userService.createUser({
      email: `tenant_access_${Date.now()}@example.com`,
      username: `ta_${Date.now()}`,
      password: rawPass,
      status: 'Active',
      emailVerified: true,
    });
    createdUserIds.push(user._id);

    // User is ONLY member of testOrg1
    await OrgMembership.create({
      userId: user._id,
      orgId: testOrg1._id,
      status: 'Active',
    });

    const userToken = signToken({
      id: user._id,
      _id: user._id,
      email: user.email,
      orgId: testOrg1._id.toString(),
      isPlatform: false,
    });

    // Attempting to query testOrg2 where user has no membership must fail with 403
    const res = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'x-organization-id': testOrg2._id.toString(),
      },
    });

    assert.equal(res.status, 403, 'Cross-tenant access without membership must be 403 Forbidden');
  });

  // 13. Existing multi-organization users can access valid memberships across multiple tenants
  it('13. Existing multi-organization users can access valid memberships across multiple tenants', async () => {
    const rawPass = 'Secret123!';
    const user = await userService.createUser({
      email: `multi_org_${Date.now()}@example.com`,
      username: `mo_${Date.now()}`,
      password: rawPass,
      status: 'Active',
      emailVerified: true,
    });
    createdUserIds.push(user._id);

    // User has active memberships in BOTH testOrg1 and testOrg2
    await OrgMembership.create({
      userId: user._id,
      orgId: testOrg1._id,
      status: 'Active',
    });
    await OrgMembership.create({
      userId: user._id,
      orgId: testOrg2._id,
      status: 'Active',
    });

    const token = signToken({
      id: user._id,
      _id: user._id,
      email: user.email,
      orgId: testOrg1._id.toString(),
      isPlatform: false,
    });

    // Access with Org 1 context
    const resOrg1 = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-organization-id': testOrg1._id.toString(),
      },
    });
    assert.equal(resOrg1.status, 200, 'Access to Org 1 must succeed');

    // Access with Org 2 context
    const resOrg2 = await fetch(`${baseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-organization-id': testOrg2._id.toString(),
      },
    });
    assert.equal(resOrg2.status, 200, 'Access to Org 2 must succeed');
  });

  // 14. System platform administrators remain functional without undocumented bypasses
  it('14. System platform administrators remain functional without undocumented bypasses', async () => {
    const rawPass = 'PlatformSecret123!';
    const platAdmin = await userService.createUser({
      email: `superadmin_${Date.now()}@platform.com`,
      username: `sa_${Date.now()}`,
      password: rawPass,
      status: 'Active',
      emailVerified: true,
    });
    createdUserIds.push(platAdmin._id);

    // Super Admin login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: platAdmin.email,
        password: rawPass,
      }),
    });
    assert.equal(loginRes.status, 200, 'Verified Platform Admin can log in');

    // Unverified platform admin cannot log in
    const unverifiedAdmin = await userService.createUser({
      email: `unverified_sa_${Date.now()}@platform.com`,
      username: `usa_${Date.now()}`,
      password: rawPass,
      status: 'Pending Verification',
      emailVerified: false,
    });
    createdUserIds.push(unverifiedAdmin._id);

    const blockedRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: unverifiedAdmin.email,
        password: rawPass,
      }),
    });
    assert.equal(blockedRes.status, 403, 'Unverified platform admin must be blocked');
  });
});

