import mongoose from 'mongoose';
import { expect } from 'chai';
import walletService from '../src/features/wallet/wallet.service.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';

describe('Wallet Feature Integration Tests', () => {
  let userId, orgId;

  before(async () => {
    // These tests assume a connection to a test database is established
    userId = new mongoose.Types.ObjectId();
    orgId = new mongoose.Types.ObjectId();
  });

  afterEach(async () => {
    await Wallet.deleteMany({});
    await WalletTransaction.deleteMany({});
  });

  describe('Wallet Initialization and Fetching', () => {
    it('should create a new wallet with 0 balance if it does not exist', async () => {
      const walletData = await walletService.getWalletData(userId, orgId);
      
      expect(walletData).to.have.property('balance', 0);
      expect(walletData.transactionHistory).to.be.an('array').that.is.empty;
      
      // Verify it was saved to DB
      const dbWallet = await Wallet.findOne({ userId, orgId });
      expect(dbWallet).to.not.be.null;
      expect(dbWallet.balance).to.equal(0);
    });
  });

  describe('Wallet Transactions', () => {
    it('should successfully add money to the wallet and record the transaction', async () => {
      // Setup initial wallet
      await walletService.getWalletData(userId, orgId);
      
      // Add money
      const amount = 150;
      await walletService.addMoney(userId, orgId, amount, 'online');
      
      // Fetch wallet data again
      const walletData = await walletService.getWalletData(userId, orgId);
      
      expect(walletData.balance).to.equal(150);
      expect(walletData.transactionHistory).to.have.lengthOf(1);
      
      const transaction = walletData.transactionHistory[0];
      expect(transaction.amount).to.equal(150);
      expect(transaction.type).to.equal('Credit');
      expect(transaction.paymentMethod).to.equal('online');
      expect(transaction.referenceType).to.equal('Recharge');
    });

    it('should successfully process a payment from the wallet if sufficient balance exists', async () => {
      // Seed wallet with 200 balance
      const wallet = new Wallet({ userId, orgId, balance: 200, currency: 'INR' });
      await wallet.save();
      
      // Process payment of 75
      const paymentAmount = 75;
      await walletService.processPayment(userId, orgId, paymentAmount, 'Payment for amenity booking');
      
      // Fetch wallet data
      const walletData = await walletService.getWalletData(userId, orgId);
      
      expect(walletData.balance).to.equal(125);
      expect(walletData.transactionHistory).to.have.lengthOf(1);
      
      const transaction = walletData.transactionHistory[0];
      expect(transaction.amount).to.equal(75);
      expect(transaction.type).to.equal('Debit');
      expect(transaction.paymentStatus).to.equal('success');
    });

    it('should fail to process a payment if the balance is insufficient', async () => {
      // Seed wallet with 50 balance
      const wallet = new Wallet({ userId, orgId, balance: 50, currency: 'INR' });
      await wallet.save();
      
      // Try to process payment of 100
      try {
        await walletService.processPayment(userId, orgId, 100, 'Expensive Booking');
        expect.fail('Should have thrown an error due to insufficient balance');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.equal('Insufficient wallet balance');
      }
      
      // Balance should remain unchanged
      const walletData = await walletService.getWalletData(userId, orgId);
      expect(walletData.balance).to.equal(50);
      expect(walletData.transactionHistory).to.be.empty;
    });
  });
});
