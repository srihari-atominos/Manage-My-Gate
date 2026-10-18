import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import platformInvoiceRepository from '../../src/features/platformInvoice/platformInvoice.repository.js';
import PlatformInvoice from '../../src/features/platformInvoice/platformInvoice.model.js';
import InvoiceSequence from '../../src/features/platformInvoice/invoiceSequence.model.js';

describe('PlatformInvoiceRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
    await PlatformInvoice.init(); // Wait for indexes
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generateInvoice = (orderId, orgId, suffix = '01') => ({
    invoiceNumber: `PINV-TEST-${suffix}`,
    orderId,
    organizationId: orgId,
    dueDate: new Date(Date.now() + 15 * 86400000),
    customerSnapshot: {
      customerName: 'Acme Corp',
      contactEmail: 'admin@acmecorp.example.com'
    },
    commercialSnapshot: {
      organizationName: 'Acme Community',
      planName: 'COMMUNITY_PROFESSIONAL',
      villaCount: 150
    },
    subtotal: 5000,
    vatAmount: 250,
    totalAmount: 5250,
    amountOutstanding: 5250,
    invoiceChecksum: 'VALID_CHECKSUM',
    status: 'ISSUED'
  });

  describe('getNextInvoiceNumber', () => {
    it('should generate sequential invoice numbers safely', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const num1 = await platformInvoiceRepository.getNextInvoiceNumber(orgId);
      const num2 = await platformInvoiceRepository.getNextInvoiceNumber(orgId);
      
      const year = new Date().getFullYear();
      expect(num1).toBe(`INV-${year}-000001`);
      expect(num2).toBe(`INV-${year}-000002`);
    });

    it('should fallback to system default if organizationId is null', async () => {
      const num1 = await platformInvoiceRepository.getNextInvoiceNumber(null);
      expect(num1).toContain('INV-');
      
      // Verify it used the fallback org ID
      const year = new Date().getFullYear();
      const sequence = await InvoiceSequence.findOne({ organizationId: '000000000000000000000000', year });
      expect(sequence).not.toBeNull();
      expect(sequence.currentNumber).toBeGreaterThanOrEqual(1);
    });
  });

  describe('create and query', () => {
    it('should create invoice and retrieve by orderId', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();
      
      const payload = generateInvoice(orderId, orgId, '01');
      const created = await platformInvoiceRepository.create(payload);
      
      expect(created._id).toBeDefined();

      const found = await platformInvoiceRepository.findByOrderId(orderId);
      expect(found.length).toBe(1);
      expect(found[0].invoiceNumber).toBe('PINV-TEST-01');
    });

    it('should paginate and filter invoices securely', async () => {
      const orderA = new mongoose.Types.ObjectId();
      const orderB = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      await platformInvoiceRepository.create(generateInvoice(orderA, orgId, '11'));
      await platformInvoiceRepository.create(generateInvoice(orderA, orgId, '12'));
      await platformInvoiceRepository.create(generateInvoice(orderB, orgId, '21'));

      const result = await platformInvoiceRepository.getInvoicesPaginated({ page: 1, limit: 10, organizationId: orgId });
      expect(result.totalRecords).toBe(3);
      expect(result.data.length).toBe(3);

      const orderResult = await platformInvoiceRepository.getInvoicesPaginated({ page: 1, limit: 10, orderId: orderA });
      expect(orderResult.totalRecords).toBe(2);
      expect(orderResult.data.length).toBe(2);
    });
  });
});
