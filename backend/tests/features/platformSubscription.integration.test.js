import Organization from '../../src/features/organization/organization.model.js';
import PlatformOrder from '../../src/features/platformOrder/platformOrder.model.js';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import platformSubscriptionRepository from '../../src/features/platformSubscription/platformSubscription.repository.js';
import PlatformSubscription from '../../src/features/platformSubscription/platformSubscription.model.js';

describe('PlatformSubscriptionRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
    await PlatformSubscription.init(); // Wait for indexes
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generateSubscription = (orgId, orderId, suffix = '01') => ({
    subscriptionNumber: `SUB-TEST-${suffix}`,
    organizationId: orgId,
    orderId: orderId,
    planName: 'COMMUNITY_PROFESSIONAL',
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000), // +30 days
    renewalDate: new Date(Date.now() + 29 * 24 * 3600 * 1000), // +29 days
    status: 'ACTIVE'
  });

  describe('create and find', () => {
    it('should create a platform subscription and retrieve it by organizationId', async () => {
      const orgId = new mongoose.Types.ObjectId();
      await Organization.collection.insertOne({ _id: orgId, name: 'Acme', email: 'a@a.com', code: 'ACME01' });
      const orderId = new mongoose.Types.ObjectId();
      
      const payload = generateSubscription(orgId, orderId, '01');
      const created = await platformSubscriptionRepository.create(payload);
      
      expect(created._id).toBeDefined();
      expect(created.subscriptionNumber).toBe('SUB-TEST-01');
      expect(created.organizationId.toString()).toBe(orgId.toString());

      // Regression Test: Check that the repaired findByOrganisationId method resolves successfully
      const found = await platformSubscriptionRepository.findByOrganisationId(orgId);
      expect(found).not.toBeNull();
      expect(found.subscriptionNumber).toBe('SUB-TEST-01');
      expect(found.organizationId._id.toString()).toBe(orgId.toString());
    });

    it('should catch duplicate subscriptionNumber uniqueness violation', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();
      
      const payload = generateSubscription(orgId, orderId, '02');
      await platformSubscriptionRepository.create(payload);
      
      let error = null;
      try {
        await platformSubscriptionRepository.create(payload);
      } catch (err) {
        error = err;
      }
      
      expect(error).not.toBeNull();
      expect(error.code).toBe(11000);
    });
  });

  describe('findAllPaginated', () => {
    it('should retrieve subscriptions with pagination and organizationId filter', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      
      await platformSubscriptionRepository.create(generateSubscription(orgA, new mongoose.Types.ObjectId(), '10'));
      await platformSubscriptionRepository.create(generateSubscription(orgB, new mongoose.Types.ObjectId(), '11'));
      
      // Test the paginated filter correctly maps organisationId param to organizationId
      const result = await platformSubscriptionRepository.findAllPaginated({ page: 1, limit: 10, organisationId: orgA });
      expect(result.data.length).toBe(1);
      expect(result.pagination.totalRecords).toBe(1);
      expect(result.data[0].subscriptionNumber).toBe('SUB-TEST-10');
    });
  });
});
