import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import invoiceRepository from '../../src/features/invoice/invoice.repository.js';
import Invoice from '../../src/features/invoice/invoice.model.js';
import HttpError from '../../src/utils/httpError.utils.js';

describe('InvoiceRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
    await Invoice.init(); // Wait for indexes to build
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generateValidInvoice = (orgId, userId, suffix = '01', assessmentId = null) => ({
    invoiceNumber: `INV-TEST-${suffix}`,
    assessmentId: assessmentId || new mongoose.Types.ObjectId(),
    targetUserId: userId,
    communityId: orgId,
    orgId: orgId,
    unitId: new mongoose.Types.ObjectId(),
    billingPeriodString: `2026-${suffix.padStart(2, '0')}`,
    currency: 'INR',
    subtotal: 1000,
    taxAmount: 180,
    currentCharge: 1180,
    previousOutstanding: 0,
    totalAmount: 1180,
    outstandingAmount: 1180,
    paidAmount: 0,
    dueDate: new Date(Date.now() + 86400000), // tomorrow
    status: 'UNPAID',
    snapshot: {
      residentDetails: { name: 'Test User' },
      unitDetails: { unitNumber: '101' },
      assessmentName: 'Maintenance'
    },
    auditHistory: [
      { action: 'CREATED', details: 'System creation' }
    ]
  });

  describe('createBatch and unique constraints', () => {
    it('should successfully create a batch of invoices', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      
      const invoices = [
        generateValidInvoice(orgId, userId, '01'),
        generateValidInvoice(orgId, userId, '02')
      ];

      const created = await invoiceRepository.createBatch(invoices);
      expect(created.length).toBe(2);
      expect(created[0].invoiceNumber).toBe('INV-TEST-01');
    });

    it('should create a batch of invoices and gracefully reject duplicates via 11000', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const sharedAssessmentId = new mongoose.Types.ObjectId();
      
      const invoice1 = generateValidInvoice(orgId, userId, '01', sharedAssessmentId);
      
      await invoiceRepository.createBatch([invoice1]);

      let error = null;
      try {
        // Same assessmentId, targetUserId, billingPeriodString will throw 11000
        const duplicateInvoice = generateValidInvoice(orgId, userId, '01', sharedAssessmentId);
        await invoiceRepository.createBatch([duplicateInvoice]);
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      if (error instanceof HttpError || error.statusCode === 409) {
        expect(error.statusCode).toBe(409);
        expect(error.message).toContain('Duplicate billing spam prevented');
      } else {
        expect(error.code).toBe(11000); 
      }
    });
  });

  describe('getInvoices', () => {
    it('should fetch invoices scoped strictly to the requested organization', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      await invoiceRepository.createBatch([
        generateValidInvoice(orgA, userId, '11'),
        generateValidInvoice(orgA, userId, '12'),
        generateValidInvoice(orgB, userId, '10'),
      ]);

      const resultA = await invoiceRepository.getInvoices(orgA, { groupBy: 'none', page: 1, take: 10 });
      expect(resultA.data.length).toBe(2);
      expect(resultA.data[0].invoiceNumber).toContain('INV-TEST');
      
      const resultB = await invoiceRepository.getInvoices(orgB, { groupBy: 'none', page: 1, take: 10 });
      expect(resultB.data.length).toBe(1);
    });
  });
});
