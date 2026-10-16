import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import financialLedgerRepository from '../../src/features/ledger/financialLedger.repository.js';

describe('FinancialLedgerRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  const generateEntry = (orgId, idempotencyKey) => ({
    orgId,
    domain: 'INVOICE',
    transactionId: `TXN-${Math.random()}`,
    idempotencyKey,
    referenceId: new mongoose.Types.ObjectId(),
    referenceType: 'Invoice',
    debitAccount: 'CASH_CLEARING',
    creditAccount: 'INVOICE_RECEIVABLE',
    entries: [
      { account: 'CASH_CLEARING', entryType: 'DEBIT', amount: 500 },
      { account: 'INVOICE_RECEIVABLE', entryType: 'CREDIT', amount: 500 }
    ],
    status: 'POSTED',
    amount: 500
  });

  describe('createEntry and Idempotency', () => {
    it('should create an entry and gracefully return it if idempotency key is reused', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const idempotencyKey = 'IDEMP-TEST-123';
      const payload = generateEntry(orgId, idempotencyKey);

      // First insertion
      const result1 = await financialLedgerRepository.createEntry(payload);
      expect(result1.alreadyExists).toBe(false);
      expect(result1.entry.idempotencyKey).toBe(idempotencyKey);

      // Second insertion using fast-path or 11000 fallback
      const result2 = await financialLedgerRepository.createEntry(payload);
      expect(result2.alreadyExists).toBe(true);
      expect(result2.entry._id.toString()).toBe(result1.entry._id.toString());
    });
  });

  describe('getFinancialHistory and getAccountBalances', () => {
    it('should calculate trial balances per organization correctly', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();

      await financialLedgerRepository.createEntry(generateEntry(orgA, 'A1')); // +500 CASH DEBIT
      await financialLedgerRepository.createEntry(generateEntry(orgA, 'A2')); // +500 CASH DEBIT
      await financialLedgerRepository.createEntry(generateEntry(orgB, 'B1')); // +500 CASH DEBIT

      const balancesA = await financialLedgerRepository.getAccountBalances(orgA);
      // Expected: CASH_CLEARING debits = 1000, credits = 0, net = 1000
      expect(balancesA['CASH_CLEARING'].debits).toBe(1000);
      expect(balancesA['CASH_CLEARING'].net).toBe(1000);
      expect(balancesA['INVOICE_RECEIVABLE'].credits).toBe(1000);
      expect(balancesA['INVOICE_RECEIVABLE'].net).toBe(-1000);

      const balancesB = await financialLedgerRepository.getAccountBalances(orgB);
      expect(balancesB['CASH_CLEARING'].debits).toBe(500);
    });

    it('should paginate and filter correctly', async () => {
      const orgId = new mongoose.Types.ObjectId();
      await financialLedgerRepository.createEntry(generateEntry(orgId, 'F1'));
      await financialLedgerRepository.createEntry(generateEntry(orgId, 'F2'));

      const history = await financialLedgerRepository.getFinancialHistory(orgId, { domain: 'INVOICE' }, { page: 1, limit: 1 });
      expect(history.pagination.totalRecords).toBe(2);
      expect(history.entries.length).toBe(1);
    });
  });
});
