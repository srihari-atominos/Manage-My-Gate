import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import amenityFacilityRepository from '../../src/features/amenityManagement/facilities/amenityFacility.repository.js';
import AmenityFacility from '../../src/features/amenityManagement/facilities/amenityFacility.model.js';
import Organization from '../../src/features/organization/organization.model.js';

describe('AmenityFacilityRepository Integration', () => {
  let orgAId, orgBId;

  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
    
    // Create mock orgs
    orgAId = new mongoose.Types.ObjectId();
    orgBId = new mongoose.Types.ObjectId();
  });

  describe('Document Creation & Cross-Tenant Retrieval', () => {
    it('should create and isolate facilities between tenants', async () => {
      // 1. Create docs for Org A
      const facA = await amenityFacilityRepository.create({
        name: 'Tennis Court Org A',
        code: 'TENNIS-A',
        archetype: 'EXCLUSIVE_HOURLY',
        orgId: orgAId,
      });

      // 2. Create docs for Org B
      const facB = await amenityFacilityRepository.create({
        name: 'Pool Org B',
        code: 'POOL-B',
        archetype: 'SHARED_CAPACITY',
        orgId: orgBId,
      });

      // 3. Verify Org A can retrieve its own
      const retrievedA = await amenityFacilityRepository.findById(facA._id, orgAId);
      expect(retrievedA).toBeDefined();
      expect(retrievedA.name).toBe('Tennis Court Org A');

      // 4. Verify Org A CANNOT retrieve Org B's facility
      const crossTenantRetrieved = await amenityFacilityRepository.findById(facB._id, orgAId);
      expect(crossTenantRetrieved).toBeNull();
    });

    it('should return null for missing records', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const result = await amenityFacilityRepository.findById(nonExistentId, orgAId);
      expect(result).toBeNull();
    });
  });
});
