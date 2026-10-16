import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import walletRepository from '../../src/features/wallet/wallet.repository.js';
import { Wallet } from '../../src/features/wallet/wallet.model.js';
import HttpError from '../../src/utils/httpError.utils.js';
import Organization from '../../src/features/organization/organization.model.js';

describe('WalletRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('updateBalance and atomic guards', () => {
    it('should credit a wallet safely and create it if it does not exist', async () => {
      const userId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      // Wallet does not exist yet
      const credited = await walletRepository.atomicCredit(userId, orgId, 1000);
      expect(credited).toBeDefined();
      expect(credited.balance).toBe(1000);
      expect(credited.orgId.toString()).toBe(orgId.toString());

      // Credit again
      const creditedAgain = await walletRepository.atomicCredit(userId, orgId, 500);
      expect(creditedAgain.balance).toBe(1500);
    });

    it('should debit a wallet if funds are sufficient', async () => {
      const userId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      await walletRepository.atomicCredit(userId, orgId, 1000);
      const debited = await walletRepository.atomicDebit(userId, orgId, 400);
      
      expect(debited.balance).toBe(600);
    });

    it('should throw HttpError 400 if trying to debit more than available balance', async () => {
      const userId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      await walletRepository.atomicCredit(userId, orgId, 500);
      
      let error = null;
      try {
        await walletRepository.atomicDebit(userId, orgId, 600);
      } catch (err) {
        error = err;
      }

      expect(error).not.toBeNull();
      expect(error instanceof HttpError || error.statusCode === 400).toBeTruthy();
      expect(error.message).toContain('Insufficient wallet balance');

      // Assert balance remained unchanged
      const wallet = await Wallet.findOne({ userId, orgId });
      expect(wallet.balance).toBe(500);
    });

    it('debitBalanceIfSufficient should return null on overdraft rather than throwing', async () => {
      const userId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      await walletRepository.atomicCredit(userId, orgId, 300);
      
      // Attempt to debit 400
      const result = await walletRepository.debitBalanceIfSufficient(userId, orgId, 400);
      expect(result).toBeNull(); // Guard triggers

      // Assert balance remained unchanged
      const wallet = await Wallet.findOne({ userId, orgId });
      expect(wallet.balance).toBe(300);
    });
  });

  describe('createTransaction', () => {
    it('should properly link transactions to org and user', async () => {
      const userId = new mongoose.Types.ObjectId();
      const orgId = new mongoose.Types.ObjectId();

      const tx = await walletRepository.createTransaction({
        userId,
        orgId,
        amount: 200,
        type: 'Credit',
        referenceType: 'Recharge',
        status: 'SUCCESS'
      });

      expect(tx._id).toBeDefined();
      expect(tx.transactionId).toContain('TXN-');
      expect(tx.orgId.toString()).toBe(orgId.toString());
    });
  });
});
