import dotenv from 'dotenv';
dotenv.config();

import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import authService from '../src/features/auth/auth.services.js';
import organizationService from '../src/features/organization/organization.services.js';
import userService from '../src/features/user/user.services.js';
import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';

describe('Multi-Organisation Registration & Login Flow Integration Tests', () => {
  let userId;
  const testEmail = `multiorg_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const firstOrgName = `First Community ${Date.now()}`;
  const secondOrgName = `Second Community ${Date.now()}`;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Intercept mongoose.startSession to return a real ClientSession with no-op transaction controls
    const originalStartSession = mongoose.startSession.bind(mongoose);
    jest.spyOn(mongoose, 'startSession').mockImplementation(async (...args) => {
      const realSession = await originalStartSession(...args);
      realSession.startTransaction = () => {};
      realSession.commitTransaction = async () => {};
      realSession.abortTransaction = async () => {};
      return realSession;
    });
  }, 15000);

  afterAll(async () => {
    try {
      if (userId) {
        await mongoose.model('User').deleteOne({ _id: userId }).catch(() => null);
        await mongoose.model('OrgMembership').deleteMany({ userId }).catch(() => null);
      }
      await mongoose.model('Organization').deleteMany({ name: { $in: [firstOrgName, secondOrgName] } }).catch(() => null);
    } catch (e) {}

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }, 15000);

  it('Step 1: New User Registration creates user in Pending Verification state', async () => {
    const regResult = await authService.register({
      name: 'MultiOrg Test User',
      email: testEmail,
      password: testPassword,
    });

    expect(regResult).toBeDefined();
    expect(regResult.email).toBe(testEmail);
    expect(regResult.status).toBe('Pending Verification');

    const createdUser = await userService.getUserByEmail(testEmail);
    expect(createdUser).toBeDefined();
    expect(createdUser.status).toBe('Pending Verification');
    userId = createdUser._id.toString();
  });

  it('Step 2: Re-registering with existing active email throws appropriate error', async () => {
    // Activate user to simulate completed registration & verification
    await userService.updateUser(userId, { status: 'Active', emailVerified: true });

    await expect(
      authService.register({
        name: 'MultiOrg Duplicate User',
        email: testEmail,
        password: testPassword,
      })
    ).rejects.toThrow(`User with email '${testEmail}' already exists.`);
  });

  it('Step 3: User can log in with existing credentials', async () => {
    const loginResult = await authService.login({
      login: testEmail,
      password: testPassword,
    });

    expect(loginResult).toBeDefined();
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.email).toBe(testEmail);
    expect(loginResult.availableWorkspaces).toBeDefined();
  });

  it('Step 4: User creates First Organisation under their account', async () => {
    const setup1 = await organizationService.setupWorkspace({
      name: firstOrgName,
      organizationType: 'Residential',
      contactEmail: testEmail,
      userId: userId,
    });

    expect(setup1).toBeDefined();
    expect(setup1.token).toBeDefined();
    expect(setup1.availableWorkspaces).toHaveLength(1);
    expect(setup1.availableWorkspaces[0].name).toBe(firstOrgName);
  });

  it('Step 5: Existing User creates Second Organisation under SAME account without duplicate User record', async () => {
    // Count total users with this email before creating second org
    const usersBefore = await mongoose.model('User').countDocuments({ email: testEmail });
    expect(usersBefore).toBe(1);

    const setup2 = await organizationService.setupWorkspace({
      name: secondOrgName,
      organizationType: 'Residential',
      contactEmail: testEmail,
      userId: userId,
    });

    // Count total users with this email after creating second org
    const usersAfter = await mongoose.model('User').countDocuments({ email: testEmail });
    expect(usersAfter).toBe(1); // Must still be 1! No duplicate account created!

    // Check availableWorkspaces contains BOTH organisations
    expect(setup2).toBeDefined();
    expect(setup2.availableWorkspaces).toHaveLength(2);
    const orgNames = setup2.availableWorkspaces.map(w => w.name);
    expect(orgNames).toContain(firstOrgName);
    expect(orgNames).toContain(secondOrgName);

    // Verify OrgMembership records in DB for this user
    const memberships = await orgMembershipService.getUserMemberships(userId);
    expect(memberships.length).toBeGreaterThanOrEqual(2);
  });

  it('Step 6: Name availability check correctly detects taken organisation names', async () => {
    const isFirstOrgAvailable = await organizationService.checkNameAvailability(firstOrgName);
    expect(isFirstOrgAvailable).toBe(false);

    const isNewOrgAvailable = await organizationService.checkNameAvailability(`Unique Org Name ${Date.now()}`);
    expect(isNewOrgAvailable).toBe(true);

    await expect(
      organizationService.setupWorkspace({
        name: firstOrgName, // duplicate name
        userId: userId,
      })
    ).rejects.toThrow('Conflict. Organization name already exists.');
  });
});
