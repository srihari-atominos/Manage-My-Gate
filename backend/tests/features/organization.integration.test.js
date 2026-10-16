import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import organizationRepository from '../../src/features/organization/organization.repository.js';
import Organization from '../../src/features/organization/organization.model.js';
import OrgMembership from '../../src/features/orgMembership/orgMembership.model.js';
import User from '../../src/features/user/user.model.js';
import Role from '../../src/features/role/role.model.js';

describe('OrganizationRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('Document Creation and Basic Retrieval', () => {
    it('should create an organization and retrieve it by ID', async () => {
      const orgData = {
        name: 'Test Community',
        address: '123 Test St',
        city: 'Testville',
        state: 'TS',
        country: 'Testland',
        zipCode: '12345',
        timezone: 'UTC',
        currency: 'USD',
        organizationType: 'Residential',
        status: 'Active',
      };
      const created = await organizationRepository.create(orgData);
      expect(created._id).toBeDefined();
      expect(created.name).toBe('Test Community');

      const retrieved = await organizationRepository.findById(created._id);
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Test Community');
    });

    it('should return null for missing organization', async () => {
      const result = await organizationRepository.findById(new mongoose.Types.ObjectId());
      expect(result).toBeNull();
    });
  });

  describe('findOrgUsersPaginated', () => {
    it('should aggregate and paginate users correctly for an organization', async () => {
      // Create Organization
      const org = await Organization.create({
        name: 'Agg Org',
        address: '123', city: 'C', state: 'S', country: 'C', zipCode: '1', timezone: 'UTC', currency: 'USD', organizationType: 'Residential'
      });

      // Create Users
      const user1 = await User.create({ name: 'Alice', username: 'alice1', email: 'alice@test.com', role: 'Platform Admin', credentialStatus: 'INITIALIZED' });
      const user2 = await User.create({ name: 'Bob', username: 'bob1', email: 'bob@test.com', role: 'Platform Admin', credentialStatus: 'INITIALIZED' });

      // Create Roles
      const role1 = await Role.create({ name: 'Manager', orgId: org._id });

      // Create Memberships
      await OrgMembership.create([
        { orgId: org._id, userId: user1._id, roleIds: [role1._id], status: 'Active' },
        { orgId: org._id, userId: user2._id, roleIds: [role1._id], status: 'Pending' }
      ]);

      // Add dummy org and user to ensure isolation
      const org2 = await Organization.create({ name: 'Other Org', address: '1', city: '1', state: '1', country: '1', zipCode: '1', timezone: 'UTC', currency: 'USD', organizationType: 'Residential' });
      const user3 = await User.create({ name: 'Charlie', username: 'charlie1', email: 'charlie@test.com', role: 'Platform Admin', credentialStatus: 'INITIALIZED' });
      await OrgMembership.create({ orgId: org2._id, userId: user3._id, roleIds: [role1._id], status: 'Active' });

      // Test Aggregation
      const result = await organizationRepository.findOrgUsersPaginated(org._id, { page: 1, limit: 10 });
      
      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
      // Ensure Alice and Bob are present, but Charlie is isolated out
      const names = result.data.map(d => d.name).sort();
      expect(names).toEqual(['Alice', 'Bob']);
      expect(result.data[0].roles).toBeDefined();
    });
  });
});
