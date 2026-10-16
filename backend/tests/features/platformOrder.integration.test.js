import PlatformQuote from '../../src/features/platformQuote/platformQuote.model.js';
import Organization from '../../src/features/organization/organization.model.js';
import User from '../../src/features/user/user.model.js';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import platformOrderRepository from '../../src/features/platformOrder/platformOrder.repository.js';
import PlatformOrder from '../../src/features/platformOrder/platformOrder.model.js';

describe('PlatformOrderRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
    await PlatformOrder.init(); // Wait for indexes
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generateOrder = (quoteId, orgId, suffix = '01') => ({
    orderNumber: `ORD-TEST-${suffix}`,
    conversionId: `CONV-TEST-${suffix}`,
    quoteId,
    organizationId: orgId,
    customerSnapshot: {
      customerName: 'Acme Corp',
      contactEmail: 'admin@acmecorp.example.com'
    },
    communitySnapshot: {
      organizationName: 'Acme Community',
      villaCount: 150
    },
    pricingSnapshot: {
      planName: 'COMMUNITY_PROFESSIONAL',
      basePrice: 5000
    },
    pricingChecksum: 'VALID_CHECKSUM',
    unitCount: 150,
    subtotal: 5000,
    totalAmount: 5250,
    status: 'CONFIRMED'
  });

  describe('create and query', () => {
    it('should create an order and retrieve it by conversionId', async () => {
      const quoteId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();
      
      const payload = generateOrder(quoteId, orgId, '01');
      const created = await platformOrderRepository.create(payload);
      
      expect(created._id).toBeDefined();

      const foundByConversion = await platformOrderRepository.findByConversionId(payload.conversionId);
      expect(foundByConversion).not.toBeNull();
      expect(foundByConversion.orderNumber).toBe('ORD-TEST-01');
    });

    it('should retrieve order safely by quoteId without ReferenceError', async () => {
      const quoteId = new mongoose.Types.ObjectId();
      await PlatformQuote.collection.insertOne({ _id: quoteId, quoteNumber: 'Q-123' });
      const orgId = new mongoose.Types.ObjectId();
      
      await platformOrderRepository.create(generateOrder(quoteId, orgId, '03'));
      
      // Defect 1 regression: No longer throws ReferenceError for mongoose
      const found = await platformOrderRepository.findByQuoteId(quoteId);
      
      expect(found).not.toBeNull();
      expect(found.orderNumber).toBe('ORD-TEST-03');
      expect(found.quoteId._id.toString()).toBe(quoteId.toString());

      // Test with missing
      const notFound = await platformOrderRepository.findByQuoteId(new mongoose.Types.ObjectId());
      expect(notFound).toBeNull();
    });

    it('should reject duplicate quoteId due to uniqueness constraints', async () => {
      const quoteId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();
      
      const payload1 = generateOrder(quoteId, orgId, '01');
      await platformOrderRepository.create(payload1);
      
      let error = null;
      try {
        const payload2 = generateOrder(quoteId, orgId, '02');
        payload2.conversionId = 'CONV-TEST-02'; // Change conversion ID to isolate the quoteId conflict
        await platformOrderRepository.create(payload2);
      } catch (err) {
        error = err;
      }
      
      expect(error).not.toBeNull();
      expect(error.code).toBe(11000);
    });
  });

  describe('getOrdersPaginated', () => {
    it('should paginate and scope orders securely', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();

      await platformOrderRepository.create(generateOrder(new mongoose.Types.ObjectId(), orgA, '11'));
      await platformOrderRepository.create(generateOrder(new mongoose.Types.ObjectId(), orgA, '12'));
      await platformOrderRepository.create(generateOrder(new mongoose.Types.ObjectId(), orgB, '21'));

      const resultA = await platformOrderRepository.getOrdersPaginated({ page: 1, limit: 10, organizationId: orgA });
      expect(resultA.totalRecords).toBe(2);
      expect(resultA.data.length).toBe(2);

      const resultB = await platformOrderRepository.getOrdersPaginated({ page: 1, limit: 10, organizationId: orgB });
      expect(resultB.totalRecords).toBe(1);
    });
  });
});
