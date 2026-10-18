import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import walletService from '../../src/features/wallet/wallet.service.js';
import { addMoney as addMoneyController } from '../../src/features/wallet/wallet.controller.js';
import { Wallet, WalletTransaction } from '../../src/features/wallet/wallet.model.js';
import Organization from '../../src/features/organization/organization.model.js';

describe('WalletService Tenant Isolation Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('WalletService.addMoney()', () => {
    it('1. A valid tenant context credits only that tenant\'s wallet', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      await walletService.addMoney(userId, orgA, 500);

      const walletA = await Wallet.findOne({ userId, orgId: orgA });
      expect(walletA).not.toBeNull();
      expect(walletA.balance).toBe(500);

      const walletB = await Wallet.findOne({ userId, orgId: orgB });
      expect(walletB).toBeNull();
    });

    it('2. Missing or invalid tenant context cannot perform a tenant-scoped mutation', async () => {
      const userId = new mongoose.Types.ObjectId();

      await expect(walletService.addMoney(userId, null, 500))
        .rejects.toThrow('Valid Organization ID is required to process wallet transactions.');

      await expect(walletService.addMoney(userId, undefined, 500))
        .rejects.toThrow('Valid Organization ID is required to process wallet transactions.');

      const count = await Wallet.countDocuments();
      expect(count).toBe(0);
    });

    it('3. Cross-tenant access is rejected or properly scoped', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const userA = new mongoose.Types.ObjectId();

      await walletService.addMoney(userA, orgA, 1000);

      // Verify that Org B cannot query or see userA's wallet under orgA
      const dataB = await walletService.getWalletData(userA, orgB);
      expect(dataB.balance).toBe(0); // Brand new wallet initialized with 0 for orgB

      const transactionsB = await walletService.getWalletTransactions(userA, orgB);
      expect(transactionsB).toHaveLength(0); // No cross-tenant leakage

      // Verify Org A wallet is unaffected
      const dataA = await walletService.getWalletData(userA, orgA);
      expect(dataA.balance).toBe(1000);
      const transactionsA = await walletService.getWalletTransactions(userA, orgA);
      expect(transactionsA).toHaveLength(1);
    });
  });

  describe('WalletService.createTransaction()', () => {
    it('should create transactions scoped strictly to tenant', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      await walletService.createTransaction({
        userId,
        amount: 250,
        type: 'Credit',
        description: 'Test transaction',
        orgId
      });

      const transactions = await walletService.getWalletTransactions(userId, orgId);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].orgId.toString()).toBe(orgId.toString());
      expect(transactions[0].description).toBe('Test transaction');
    });
  });

  describe('WalletController Context Derivation', () => {
    it('4. A supplied organization ID conflicting with trusted tenant context cannot redirect the operation', async () => {
      const trustedOrgId = new mongoose.Types.ObjectId();
      const attackerOrgId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      const req = {
        user: { id: userId, role: 'Admin' },
        tenant: { orgId: trustedOrgId },
        body: { amount: 500, orgId: attackerOrgId } // Attempting to inject a different orgId
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await addMoneyController(req, res, next);

      // Verify it used trustedOrgId
      expect(next).not.toHaveBeenCalled();
      
      const attackerWallet = await Wallet.findOne({ orgId: attackerOrgId });
      expect(attackerWallet).toBeNull(); // Attacker org was ignored

      const trustedWallet = await Wallet.findOne({ orgId: trustedOrgId });
      expect(trustedWallet).toBeDefined();
      expect(trustedWallet.balance).toBe(500); // Trusted context was honored
    });

    it('6. An explicitly authorized platform-admin workflow continues to work, while non-platform admins cannot spoof tenant context', async () => {
      const targetOrgId = new mongoose.Types.ObjectId();
      const spoofOrgId = new mongoose.Types.ObjectId();
      const trustedOrgId = new mongoose.Types.ObjectId();
      const platformUserId = new mongoose.Types.ObjectId();
      const tenantAdminId = new mongoose.Types.ObjectId();

      // Part A: Platform admin with query.orgId is explicitly permitted across tenants
      const reqPlatform = {
        user: { id: platformUserId, isPlatform: true },
        tenant: {}, // Platform admin without tenant binding
        query: { orgId: targetOrgId.toString() },
        body: { amount: 1000 }
      };

      const resPlatform = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const nextPlatform = jest.fn();

      await addMoneyController(reqPlatform, resPlatform, nextPlatform);
      expect(nextPlatform).not.toHaveBeenCalled();

      const targetWallet = await Wallet.findOne({ orgId: targetOrgId });
      expect(targetWallet).toBeDefined();
      expect(targetWallet.balance).toBe(1000);

      // Part B: Tenant admin attempting to supply query.orgId cannot override req.tenant.orgId
      const reqTenantAdmin = {
        user: { id: tenantAdminId, role: 'Community Admin', isPlatform: false },
        tenant: { orgId: trustedOrgId },
        query: { orgId: spoofOrgId.toString() },
        body: { amount: 500 }
      };

      const resTenantAdmin = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const nextTenantAdmin = jest.fn();

      await addMoneyController(reqTenantAdmin, resTenantAdmin, nextTenantAdmin);
      expect(nextTenantAdmin).not.toHaveBeenCalled();

      const spoofWallet = await Wallet.findOne({ orgId: spoofOrgId });
      expect(spoofWallet).toBeNull(); // Spoofed org query parameter was strictly ignored

      const trustedAdminWallet = await Wallet.findOne({ orgId: trustedOrgId });
      expect(trustedAdminWallet).toBeDefined();
      expect(trustedAdminWallet.balance).toBe(500); // Trusted tenant context enforced
    });
  });
});
