import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import roleRepository from '../../src/features/role/role.repository.js';
import Role from '../../src/features/role/role.model.js';

describe('RoleRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('findByName and findByOrgAndName', () => {
    it('should find exact matches ignoring case', async () => {
      const orgId = new mongoose.Types.ObjectId();
      
      await roleRepository.create({
        name: 'Community Manager',
        orgId: orgId
      });

      // Find by org and name
      const found = await roleRepository.findByOrgAndName(' community manager ', orgId);
      expect(found).not.toBeNull();
      expect(found.name).toBe('Community Manager');

      // Ensure it is isolated
      const notFound = await roleRepository.findByOrgAndName('Community Manager', new mongoose.Types.ObjectId());
      expect(notFound).toBeNull();
    });

    it('findByName should fall back to global roles if not found in org', async () => {
      const orgId = new mongoose.Types.ObjectId();
      
      await roleRepository.create({
        name: 'Global Admin',
        orgId: null
        // Note: The schema does not define 'isSystem', but the repository queries it. 
        // We supply orgId: null to satisfy the $or: [{ orgId: null }, { isSystem: true }] clause.
      });

      const found = await roleRepository.findByName('Global Admin', orgId);
      expect(found).not.toBeNull();
      expect(found.orgId).toBeNull();
      // isSystem is undefined because it is strictly stripped by Mongoose since it's missing in the schema
      expect(found.isSystem).toBeUndefined(); 
    });
  });

  describe('isConnectionInUse', () => {
    it('should return true if a connection ID is used in integration mappings', async () => {
      const connId = new mongoose.Types.ObjectId();
      
      await roleRepository.create({
        name: 'Integration Role',
        orgId: new mongoose.Types.ObjectId(),
        integrationMappings: {
          'someProvider': connId
        }
      });

      const inUse = await roleRepository.isConnectionInUse(connId);
      expect(inUse).toBe(true);

      const notInUse = await roleRepository.isConnectionInUse(new mongoose.Types.ObjectId());
      expect(notInUse).toBe(false);
    });
  });
});
