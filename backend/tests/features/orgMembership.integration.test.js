import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import orgMembershipRepository from '../../src/features/orgMembership/orgMembership.repository.js';
import OrgMembership from '../../src/features/orgMembership/orgMembership.model.js';
import Organization from '../../src/features/organization/organization.model.js';
import User from '../../src/features/user/user.model.js';
import Role from '../../src/features/role/role.model.js';

describe('OrgMembershipRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('Membership Creation and Lookup', () => {
    it('should find active memberships properly isolated to the target organization', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const userA = new mongoose.Types.ObjectId();
      const userB = new mongoose.Types.ObjectId();

      await OrgMembership.create([
        { orgId: orgA, userId: userA, status: 'Active' },
        { orgId: orgB, userId: userB, status: 'Active' },
        { orgId: orgA, userId: new mongoose.Types.ObjectId(), status: 'Pending' } // Inactive/Pending
      ]);

      const activeMemberships = await orgMembershipRepository.findActiveMemberships(orgA);
      
      expect(activeMemberships.length).toBe(1);
      expect(activeMemberships[0].userId.toString()).toBe(userA.toString());
      expect(activeMemberships[0].orgId.toString()).toBe(orgA.toString());
    });

    it('should update roles for a specific user and organization', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const role1Id = new mongoose.Types.ObjectId();
      const role2Id = new mongoose.Types.ObjectId();

      const membership = await OrgMembership.create({ orgId, userId, roleIds: [role1Id], status: 'Active' });

      const updated = await orgMembershipRepository.updateRoles(userId, orgId, [role2Id]);
      
      expect(updated).toBeDefined();
      expect(updated.roleIds.length).toBe(1);
      expect(updated.roleIds[0].toString()).toBe(role2Id.toString());
      expect(updated.roleId.toString()).toBe(role2Id.toString()); // Falls back to first item
    });

    it('should clear role from memberships', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const roleToKeep = new mongoose.Types.ObjectId();
      const roleToRemove = new mongoose.Types.ObjectId();

      await OrgMembership.create({ orgId, userId, roleIds: [roleToKeep, roleToRemove], roleId: roleToRemove, status: 'Active' });

      await orgMembershipRepository.clearRoleFromMemberships(roleToRemove);

      const modified = await OrgMembership.findOne({ orgId, userId });
      expect(modified.roleIds.length).toBe(1);
      expect(modified.roleIds[0].toString()).toBe(roleToKeep.toString());
      expect(modified.roleId).toBeUndefined(); // It pulls the roleId if matching
    });
  });
});
