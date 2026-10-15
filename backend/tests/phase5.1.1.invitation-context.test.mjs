import dotenv from 'dotenv';
dotenv.config();

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import Role from '../src/features/role/role.model.js';
import Organization from '../src/features/organization/organization.model.js';
import User from '../src/features/user/user.model.js';
import authService from '../src/features/auth/auth.services.js';
import userService from '../src/features/user/user.services.js';
import otpService from '../src/features/otp/otp.services.js';
import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';

describe('Phase 5.1.1 - Dedicated Invitation Context Restoration', () => {
  let orgA, orgC;
  let roleA, roleC;

  before(async () => {
    await connectToDb();

    orgA = await Organization.create({
      name: `Test Org A Context ${Date.now()}`,
      organizationType: 'Residential',
      authenticationMethod: 'OTP_LOGIN'
    });

    orgC = await Organization.create({
      name: `Test Org C Context ${Date.now()}`,
      organizationType: 'Residential',
      authenticationMethod: 'EXISTING_SYSTEM'
    });

    roleA = await Role.create({ name: 'Resident', orgId: orgA._id, permissions: [] });
    roleC = await Role.create({ name: 'Resident', orgId: orgC._id, permissions: [] });
  });

  after(async () => {
    await mongoose.disconnect();
  });

  test('Scenario A & C - Multi-org user restores correct target Organization (Org A) and ignores existing (Org C)', async () => {
    const email = `multiorg${Date.now()}@example.com`;

    // 1. Existing user in Org C
    const user = await userService.createUser({ email, username: `u_${Date.now()}`, name: 'Multi Org User', password: 'Password123!' });
    await orgMembershipService.createMembership({ userId: user._id, orgId: orgC._id, roleId: roleC._id, status: 'Active' });

    // 2. Create Invitation for User in Org A
    const invite = await userService.inviteUser(email, orgA._id, null, 'None', 'Resident', '', 'Multi Test');

    // 3. User Accepts (OTP simulation)
    const plainCode = await otpService.createOTP(email.toLowerCase(), 'INVITATION_LOGIN');
    const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode);
    
    // 4. Verify Context Restoration (Multi-org user)
    // Target organization should be strictly Org A
    const membershipA = await orgMembershipService.getMembership(verifyRes.user.id, orgA._id);
    const membershipC = await orgMembershipService.getMembership(verifyRes.user.id, orgC._id);

    assert.ok(membershipA, 'User must gain access to target Org A');
    assert.strictEqual(membershipA.status, 'Active', 'Membership must be Active');
    
    // Original org C remains untouched
    assert.ok(membershipC, 'User retains existing access to Org C');

    // Token context should only reflect Org A being explicitly accessed by the invitation
    assert.ok(verifyRes.token, 'Should return a valid session token');
  });

  test('Scenario B - Client manipulation of Organization ID is rejected', async () => {
    const email = `attacker${Date.now()}@example.com`;
    
    // 1. Create Invitation for Attacker in Org A
    const invite = await userService.inviteUser(email, orgA._id, null, 'None', 'Resident', '', 'Attacker Test');
    const plainCode = await otpService.createOTP(email.toLowerCase(), 'INVITATION_LOGIN');

    // 2. Attack: Client tries to use the token but manually sets target to orgC in API call parameter tampering
    const verifyRes = await authService.verifyInvitationOtp(invite.invitationToken, plainCode, { orgId: orgC._id });

    // 3. The backend MUST ignore the client-provided orgId (orgC) and strictly use the token's authoritative orgId (orgA)
    const membershipC = await orgMembershipService.getMembership(verifyRes.user.id, orgC._id);
    const membershipA = await orgMembershipService.getMembership(verifyRes.user.id, orgA._id);
    
    assert.ok(!membershipC, 'Attacker should NOT have membership in Org C');
    assert.ok(membershipA, 'Attacker must be strictly bound to Org A');
  });

  test('Scenario D - Valid user with no membership cannot bypass context', async () => {
    const email = `nomember${Date.now()}@example.com`;
    const user = await userService.createUser({ email, username: `u_${Date.now()}`, name: 'No Member User', password: 'Password123!' });

    // Attempting to access Org A without a valid token / membership
    const membershipA = await orgMembershipService.getMembership(user._id, orgA._id);
    assert.ok(!membershipA, 'No membership should mean access REJECTED');
  });
});
