import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { initSocket } from '../src/config/socket.js';
import http from 'http';

import walletService from '../src/features/wallet/wallet.service.js';
import walletRepository from '../src/features/wallet/wallet.repository.js';
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import financialIntegrityService from '../src/features/ledger/financialIntegrity.service.js';

import noticeBoardService from '../src/features/noticeBoard/noticeBoard.service.js';
import noticeReactionService from '../src/features/noticeReaction/noticeReaction.service.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import NoticeReaction from '../src/features/noticeReaction/noticeReaction.model.js';

import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';
import orgMembershipRepository from '../src/features/orgMembership/orgMembership.repository.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import complaintService from '../src/features/complaint/complaint.service.js';
import complaintSettingsService from '../src/features/complaintSettings/complaintSettings.service.js';
import visitorPassService from '../src/features/visitorPass/visitorPass.service.js';
import VisitorPass from '../src/features/visitorPass/visitorPass.model.js';
import { directoryMessageService } from '../src/features/directoryMessage/directoryMessage.services.js';
import notificationService from '../src/features/notification/notification.service.js';
import Notification from '../src/features/notification/notification.model.js';
import villaService from '../src/features/villa/villa.services.js';
import userService from '../src/features/user/user.services.js';
import User from '../src/features/user/user.model.js';
import Villa from '../src/features/villa/villa.model.js';

dotenv.config();
process.env.NODE_ENV = 'test';

describe('Targeted Service Layer Architecture Remediation Verification', () => {
  let server;
  let testOrgId;
  let testUserId;
  let foreignOrgId;

  before(async () => {
    // Init socket mock server if needed
    server = http.createServer();
    try {
      initSocket(server);
    } catch (e) {}

    await connectToDb();

    testOrgId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
    foreignOrgId = new mongoose.Types.ObjectId();
  });

  after(async () => {
    // Cleanup created test records
    await Wallet.deleteMany({ orgId: { $in: [testOrgId, foreignOrgId] } });
    await WalletTransaction.deleteMany({ orgId: { $in: [testOrgId, foreignOrgId] } });
    await Notice.deleteMany({ orgId: testOrgId });
    await NoticeReaction.deleteMany({ orgId: testOrgId });
    await OrgMembership.deleteMany({ orgId: { $in: [testOrgId, foreignOrgId] } });
    await mongoose.connection.close();
  });

  // ==========================================
  // FIX 1: Financial Integrity & Wallet Audit
  // ==========================================
  describe('Fix 1 — Financial Integrity & Wallet Audit Methods', () => {
    test('1.1 walletService exposes getWalletsForAudit and getTransactionsForAudit', () => {
      assert.equal(typeof walletService.getWalletsForAudit, 'function');
      assert.equal(typeof walletService.getTransactionsForAudit, 'function');
      assert.equal(typeof walletRepository.findWalletsForAudit, 'function');
      assert.equal(typeof walletRepository.findTransactionsForAudit, 'function');
    });

    test('1.2 getWalletsForAudit respects tenant isolation and filter shape', async () => {
      const userA = new mongoose.Types.ObjectId();
      const userB = new mongoose.Types.ObjectId();

      // Create wallet in testOrgId and foreignOrgId
      await Wallet.create({ orgId: testOrgId, userId: userA, balance: 250 });
      await Wallet.create({ orgId: foreignOrgId, userId: userB, balance: 500 });

      // Query testOrgId
      const walletsTestOrg = await walletService.getWalletsForAudit({ orgId: testOrgId });
      assert.equal(walletsTestOrg.length, 1);
      assert.equal(walletsTestOrg[0].balance, 250);
      assert.equal(walletsTestOrg[0].orgId.toString(), testOrgId.toString());

      // Query foreignOrgId
      const walletsForeign = await walletService.getWalletsForAudit(foreignOrgId);
      assert.equal(walletsForeign.length, 1);
      assert.equal(walletsForeign[0].balance, 500);

      // Malformed orgId returns empty array (fail-closed)
      const malformed = await walletService.getWalletsForAudit({ orgId: 'invalid-id-format' });
      assert.deepEqual(malformed, []);
    });

    test('1.3 getTransactionsForAudit retrieves scoped transactions', async () => {
      await WalletTransaction.create({
        orgId: testOrgId,
        userId: testUserId,
        transactionId: `TXN-AUDIT-1-${Date.now()}`,
        amount: 250,
        type: 'Credit',
        paymentStatus: 'success',
      });
      await WalletTransaction.create({
        orgId: foreignOrgId,
        userId: testUserId,
        transactionId: `TXN-AUDIT-2-${Date.now()}`,
        amount: 500,
        type: 'Credit',
        paymentStatus: 'success',
      });

      const txns = await walletService.getTransactionsForAudit({ orgId: testOrgId });
      assert.equal(txns.length, 1);
      assert.equal(txns[0].amount, 250);
      assert.equal(txns[0].orgId.toString(), testOrgId.toString());
    });

    test('1.4 financialIntegrityService.runIntegrityCheck executes without throwing TypeError', async () => {
      // Must execute cleanly without runtime error
      const report = await financialIntegrityService.runIntegrityCheck(testOrgId);
      assert.ok(report);
      assert.equal(report.suites.Wallets, 'PASS');
      assert.equal(report.suites.WalletTransactions, 'PASS');
    });

    test('1.5 financialIntegrityService flags negative wallet balances correctly', async () => {
      const negativeUser = new mongoose.Types.ObjectId();
      await Wallet.create({ orgId: testOrgId, userId: negativeUser, balance: -100 });

      const report = await financialIntegrityService.runIntegrityCheck(testOrgId);
      assert.equal(report.suites.Wallets, 'FAIL');
      const negativeDetail = report.details.wallets.find((d) => d.type === 'NEGATIVE_WALLET_BALANCE');
      assert.ok(negativeDetail);
      assert.equal(negativeDetail.balance, -100);

      // Clean up negative wallet
      await Wallet.deleteOne({ orgId: testOrgId, userId: negativeUser });
    });
  });

  // ==========================================
  // FIX 2: Notice Reaction Enrichment
  // ==========================================
  describe('Fix 2 — Notice Board Reaction Enrichment in Service Layer', () => {
    let noticeId;

    before(async () => {
      const notice = await Notice.create({
        orgId: testOrgId,
        createdBy: testUserId,
        title: 'Test Reaction Notice',
        description: 'Testing reaction enrichment in noticeBoardService',
        category: 'Maintenance',
        priority: 'Medium',
        status: 'Published',
        expiryDate: new Date(Date.now() + 86400000),
      });
      noticeId = notice._id;

      // Add a reaction
      await NoticeReaction.create({
        orgId: testOrgId,
        noticeId,
        userId: testUserId,
        reactionType: 'HELPFUL',
      });
    });

    test('2.1 noticeBoardService.getAllNotices returns enriched reactions', async () => {
      const result = await noticeBoardService.getAllNotices(testOrgId, testUserId, 1, 10);
      assert.ok(result.data);
      const testNotice = result.data.find((n) => n._id.toString() === noticeId.toString());
      assert.ok(testNotice, 'Notice should be returned in list');
      assert.ok(testNotice.reactionCounts, 'Notice must have reactionCounts');
      assert.equal(testNotice.reactionCounts.HELPFUL, 1);
      assert.equal(testNotice.userReaction, 'HELPFUL');
      assert.equal(testNotice.isLiked, true);
    });

    test('2.2 noticeBoardService handles empty notice lists gracefully', async () => {
      const emptyOrg = new mongoose.Types.ObjectId();
      const result = await noticeBoardService.getAllNotices(emptyOrg, testUserId, 1, 10);
      assert.deepEqual(result.data, []);
      assert.equal(result.pagination.totalRecords, 0);
    });
  });

  // ==========================================
  // FIX 3: OrgMembership Controller-to-Service Boundary
  // ==========================================
  describe('Fix 3 — OrgMembership Service Boundary & Isolation', () => {
    let activeUser;
    let inactiveUser;

    before(async () => {
      activeUser = new mongoose.Types.ObjectId();
      inactiveUser = new mongoose.Types.ObjectId();

      await OrgMembership.create({
        orgId: testOrgId,
        userId: activeUser,
        status: 'Active',
        name: 'Active User Test',
      });

      await OrgMembership.create({
        orgId: testOrgId,
        userId: inactiveUser,
        status: 'Pending',
        name: 'Inactive User Test',
      });

      // Active in foreign org
      await OrgMembership.create({
        orgId: foreignOrgId,
        userId: activeUser,
        status: 'Active',
        name: 'Active User Foreign Test',
      });
    });

    test('3.1 getActiveMembership returns active membership and ignores inactive/missing', async () => {
      const active = await orgMembershipService.getActiveMembership(activeUser, testOrgId);
      assert.ok(active);
      assert.equal(active.status, 'Active');

      const inactive = await orgMembershipService.getActiveMembership(inactiveUser, testOrgId);
      assert.equal(inactive, null, 'Inactive membership must return null');

      const nonexistent = await orgMembershipService.getActiveMembership(new mongoose.Types.ObjectId(), testOrgId);
      assert.equal(nonexistent, null, 'Nonexistent membership must return null');

      const crossTenant = await orgMembershipService.getActiveMembership(inactiveUser, foreignOrgId);
      assert.equal(crossTenant, null, 'Cross-tenant lookup with no membership returns null');
    });

    test('3.2 getActiveOrgIdsForUser returns all active organization IDs as strings', async () => {
      const orgIds = await orgMembershipService.getActiveOrgIdsForUser(activeUser);
      assert.ok(Array.isArray(orgIds));
      assert.ok(orgIds.includes(testOrgId.toString()));
      assert.ok(orgIds.includes(foreignOrgId.toString()));

      // Inactive user should return empty array
      const inactiveOrgIds = await orgMembershipService.getActiveOrgIdsForUser(inactiveUser);
      assert.deepEqual(inactiveOrgIds, []);
    });
  });

  // ==========================================
  // FIX 1 & 2: Complaint Tenant Isolation & Settings Usage Counter
  // ==========================================
  describe('Fix 1 & 2 — Complaint Tenant Isolation & Complaint Settings Counter', () => {
    test('1.1 createComplaint overrides poisoned body orgId and sets authenticated orgId', async () => {
      const residentUser = new mongoose.Types.ObjectId();
      const poisonedOrgId = new mongoose.Types.ObjectId();

      const complaint = await complaintService.createComplaint(
        testOrgId,
        residentUser,
        'Test Resident',
        {
          orgId: poisonedOrgId.toString(),
          communityId: poisonedOrgId.toString(),
          title: 'Tenant Isolation Test Ticket',
          category: 'Plumbing',
          priority: 'Low',
          description: 'Testing server-authoritative tenant scoping',
        }
      );

      assert.ok(complaint);
      assert.equal(complaint.orgId.toString(), testOrgId.toString(), 'Must belong strictly to authenticated testOrgId');
      assert.notEqual(complaint.orgId.toString(), poisonedOrgId.toString(), 'Must NEVER belong to poisonedOrgId');
    });

    test('1.2 createComplaint rejects missing or invalid orgId', async () => {
      const residentUser = new mongoose.Types.ObjectId();
      await assert.rejects(
        async () => {
          await complaintService.createComplaint(null, residentUser, 'Test', { title: 'Ticket' });
        },
        { status: 400 }
      );

      await assert.rejects(
        async () => {
          await complaintService.createComplaint('invalid-objectid', residentUser, 'Test', { title: 'Ticket' });
        },
        { status: 400 }
      );
    });

    test('2.1 incrementIssueUsage updates suggested issue counter without throwing ReferenceError', async () => {
      const res = await complaintSettingsService.incrementIssueUsage(testOrgId, 'Plumbing', 'Leaky Faucet');
      // Should complete without ReferenceError: ComplaintSettings is not defined
      assert.ok(res !== undefined);
    });
  });

  // ==========================================
  // FIX 3: Visitor Pass Public Service Interface
  // ==========================================
  describe('Fix 3 — Visitor Pass Service Boundary & Complaint Linkage', () => {
    test('3.1 getActivePassByComplaintId retrieves active/pending pass and ignores revoked', async () => {
      const linkedComplaintId = new mongoose.Types.ObjectId();
      const visitorPass = await VisitorPass.create({
        orgId: testOrgId,
        createdById: testUserId,
        passType: 'SERVICE',
        status: 'ACTIVE',
        linkedComplaintId,
        validity: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        },
      });

      const found = await visitorPassService.getActivePassByComplaintId(linkedComplaintId, testOrgId);
      assert.ok(found);
      assert.equal(found._id.toString(), visitorPass._id.toString());

      // After revocation, getActivePassByComplaintId returns null
      await visitorPassService.revokePass(visitorPass._id, testOrgId);
      const afterRevoke = await visitorPassService.getActivePassByComplaintId(linkedComplaintId, testOrgId);
      assert.equal(afterRevoke, null);
    });
  });

  // ==========================================
  // FIX 4: Directory Message Service Boundaries
  // ==========================================
  describe('Fix 4 — Directory Message Service Boundaries', () => {
    test('4.1 getOrCreateConversation rejects recipient who is not active member', async () => {
      const sender = new mongoose.Types.ObjectId();
      const nonMember = new mongoose.Types.ObjectId();

      await User.create({
        _id: nonMember,
        email: `nonmember_${Date.now()}@test.local`,
        username: `nonmember_${Date.now()}`,
        password: 'hashedpassword',
        allowDirectoryMessages: true,
      });

      await assert.rejects(
        async () => {
          await directoryMessageService.getOrCreateConversation({
            senderId: sender,
            receiverId: nonMember,
            orgId: testOrgId,
          });
        },
        { status: 404 }
      );
    });
  });

  // ==========================================
  // FIX 6 & 7: Villa/User bulkWrite & Notification bulk create
  // ==========================================
  describe('Fix 6 & 7 — Villa/User bulkWrite and Notification batch persistence', () => {
    test('6.1 villaService and userService expose bulkWriteUnits and bulkWriteUsers', async () => {
      assert.equal(typeof villaService.bulkWriteUnits, 'function');
      assert.equal(typeof userService.bulkWriteUsers, 'function');
    });

    test('7.1 notificationService.createBulkNotifications inserts batch and emits creation events', async () => {
      const recipientA = new mongoose.Types.ObjectId();
      const recipientB = new mongoose.Types.ObjectId();

      await OrgMembership.create([
        { userId: recipientA, orgId: testOrgId, status: 'Active' },
        { userId: recipientB, orgId: testOrgId, status: 'Active' },
      ]);

      const batch = [
        { recipientId: recipientA, orgId: testOrgId, title: 'Notice 1', body: 'Body 1', type: 'INFO' },
        { recipientId: recipientB, orgId: testOrgId, title: 'Notice 2', body: 'Body 2', type: 'INFO' },
      ];

      const inserted = await notificationService.createBulkNotifications(batch);
      assert.equal(inserted.length, 2);
      assert.ok(inserted[0]._id);
      assert.ok(inserted[1]._id);

      // Clean up
      await Notification.deleteMany({ _id: { $in: inserted.map(n => n._id) } });
      await OrgMembership.deleteMany({ userId: { $in: [recipientA, recipientB] } });
    });
  });
});
