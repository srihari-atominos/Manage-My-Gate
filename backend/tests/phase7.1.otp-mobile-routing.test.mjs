import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import authService from '../src/features/auth/auth.services.js';
import organizationService from '../src/features/organization/organization.services.js';
import userService from '../src/features/user/user.services.js';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Role from '../src/features/role/role.model.js';
import User from '../src/features/user/user.model.js';
import Token from '../src/features/token/token.model.js';
import Otp from '../src/features/otp/otp.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';

describe('Phase 7.1 - OTP Mobile Routing & Handoff Integration Tests', () => {
  let platformAdmin;
  let testOrg;
  let residentRole;
  let mockMobileUser;
  let invitationTokenRaw;
  let validOtpCode;

  before(async () => {
    await connectToDb();

    // Setup Platform Admin
    platformAdmin = await User.findOne({ email: 'admin@enterprise.com' });
    if (!platformAdmin) {
      throw new Error('Platform admin not found. Did you run the seed script?');
    }

    // Setup Test Organization with OTP_LOGIN
    testOrg = await organizationService.setupWorkspace({
      name: 'Phase 7.1 Mobile Routing Org',
      domain: 'mobile-routing.phase7.com',
      industry: 'Real Estate',
      authenticationMethod: 'OTP_LOGIN',
      adminUser: {
        firstName: 'Mobile',
        lastName: 'Admin',
        email: 'mobile.admin@phase7.com',
        phone: '+919999999999'
      }
    });

    // Create a mock user
    mockMobileUser = {
      email: 'mobile.otp.user@phase7.com',
      firstName: 'OTP',
      lastName: 'User'
    };

    residentRole = await Role.findOne({ name: 'Resident', isSystem: true });

    // Ensure clean state
    await User.deleteMany({ email: mockMobileUser.email });
    await Otp.deleteMany({ identifier: mockMobileUser.email });
  });

  after(async () => {
    if (testOrg) {
      await organizationService.deleteOrganization(testOrg._id.toString());
    }
    await User.deleteMany({ email: mockMobileUser.email });
    await Otp.deleteMany({ identifier: mockMobileUser.email });
    await mongoose.disconnect();
  });

  it('1. Create OTP Invitation', async () => {
    const inviteRes = await authService.inviteUser({
      email: mockMobileUser.email,
      firstName: mockMobileUser.firstName,
      lastName: mockMobileUser.lastName,
      orgId: testOrg._id.toString(),
      roleId: residentRole._id.toString(),
    }, platformAdmin._id.toString());

    invitationTokenRaw = inviteRes.invitationToken;
    assert.ok(invitationTokenRaw, 'Invitation token should be returned');
    
    // Verify user is pending
    const user = await User.findOne({ email: mockMobileUser.email });
    assert.equal(user.status, 'Pending Verification');
  });

  it('2. Validate Invitation Context (Mobile App Start)', async () => {
    // When the mobile app is opened via deep link, it validates the token
    const validateRes = await authService.validateInvite(invitationTokenRaw, mockMobileUser.email);
    assert.ok(validateRes.isValid);
    assert.equal(validateRes.authenticationMethod, 'OTP_LOGIN');
    assert.equal(validateRes.organization.id.toString(), testOrg._id.toString());
  });

  it('3. Unauthenticated Handoff Creation Fails (401)', async () => {
    // Attempting to create a mobile handoff ticket WITHOUT being authenticated
    // This is the bug that was occurring in the frontend
    let error;
    try {
      await authService.createInviteHandoff(null, testOrg._id.toString());
    } catch (e) {
      error = e;
    }
    assert.ok(error, 'Should throw an error');
    assert.equal(error.statusCode, 401);
    assert.equal(error.message, 'Authentication required to initiate mobile handoff.');
  });

  it('4. Exchanging Invitation Token as Handoff Ticket Fails (400)', async () => {
    // Attempting to exchange the raw invitation token as a handoff ticket
    // This was the secondary failure in the mobile app
    let error;
    try {
      await authService.exchangeInviteHandoff(invitationTokenRaw, { deviceName: 'Test Device' });
    } catch (e) {
      error = e;
    }
    assert.ok(error, 'Should throw an error');
    assert.equal(error.statusCode, 400);
    assert.ok(error.message.includes('Invalid or expired handoff ticket'));
  });

  it('5. Initiate OTP via Invitation Context (Native Flow)', async () => {
    // The mobile app requests OTP using the invitation token directly
    const res = await authService.initiateInvitationOtp(invitationTokenRaw, 'EMAIL');
    assert.equal(res.message, 'OTP sent successfully.');
    
    const otpDoc = await Otp.findOne({ identifier: mockMobileUser.email }).sort({ createdAt: -1 });
    assert.ok(otpDoc);
    validOtpCode = otpDoc.code;
  });

  it('6. Verify OTP and Create Session (Native Flow)', async () => {
    // The mobile app verifies the OTP and completes authentication natively
    const res = await authService.verifyInvitationOtp({
      token: invitationTokenRaw,
      otp: validOtpCode,
      deviceInfo: { deviceName: 'Mobile Unit Test' }
    });

    assert.ok(res.token, 'Should return a JWT session token');
    assert.ok(res.user, 'Should return authenticated user details');
    assert.equal(res.user.email, mockMobileUser.email);
    assert.equal(res.user.status, 'Active');
    assert.equal(res.user.orgId.toString(), testOrg._id.toString());

    // Ensure session is properly created and active
    const user = await User.findOne({ email: mockMobileUser.email });
    assert.equal(user.status, 'Active', 'User should be active in DB');
    
    const membership = await OrgMembership.findOne({ userId: user._id, orgId: testOrg._id });
    assert.equal(membership.status, 'Active', 'Membership should be active');
  });

});
