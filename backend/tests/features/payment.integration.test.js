import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import paymentRepository from '../../src/features/payment/payment.repository.js';
import Payment from '../../src/features/payment/payment.model.js';

describe('PaymentRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generatePayment = (orgId) => ({
    orgId,
    userId: new mongoose.Types.ObjectId(),
    invoiceId: new mongoose.Types.ObjectId(),
    referenceId: new mongoose.Types.ObjectId(),
    referenceType: 'Invoice',
    amount: 1000,
    currency: 'INR',
    status: 'success',
    gatewayTransactionId: `TXN-${Math.random()}`,
    paymentMethod: 'UPI'
  });

  describe('createPayment and findByGatewayTransactionId', () => {
    it('should securely create a payment and retrieve it', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const payload = generatePayment(orgId);
      
      const created = await paymentRepository.createPayment(payload);
      expect(created._id).toBeDefined();

      const retrieved = await paymentRepository.findByGatewayTransactionId(payload.gatewayTransactionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved.amount).toBe(1000);
      expect(retrieved.orgId.toString()).toBe(orgId.toString());
    });
  });

  describe('getPaymentStats and getRevenueTrend', () => {
    it('should aggregate revenue strictly bound to the requested orgId', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();

      await paymentRepository.createPayment(generatePayment(orgA)); // 1000 success
      await paymentRepository.createPayment(generatePayment(orgA)); // 1000 success
      await paymentRepository.createPayment({ ...generatePayment(orgA), status: 'pending', amount: 500 });
      await paymentRepository.createPayment(generatePayment(orgB)); // 1000 success

      const statsA = await paymentRepository.getPaymentStats(orgA);
      expect(statsA.success).toBe(2);
      expect(statsA.pending).toBe(1);
      expect(statsA.todayRevenue).toBe(2000);

      const statsB = await paymentRepository.getPaymentStats(orgB);
      expect(statsB.success).toBe(1);
      expect(statsB.todayRevenue).toBe(1000);
    });
  });
});
