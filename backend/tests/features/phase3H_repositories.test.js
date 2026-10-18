import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';

// Domain Repositories & Services
import villaRepository from '../../src/features/villa/villa.repository.js';
import complaintRepository from '../../src/features/complaint/complaint.repository.js';
import assessmentRepository from '../../src/features/assessment/assessment.repository.js';
import communityNoteRepository from '../../src/features/communityNote/communityNote.repository.js';
import directoryMessageRepository from '../../src/features/directoryMessage/directoryMessage.repository.js';
import historicalReconciliationService from '../../src/features/ledger/reconciliation/historicalReconciliation.service.js';

// Models
import Villa from '../../src/features/villa/villa.model.js';
import Complaint from '../../src/features/complaint/complaint.model.js';
import Assessment from '../../src/features/assessment/assessment.model.js';
import CommunityNote from '../../src/features/communityNote/communityNote.model.js';
import Conversation from '../../src/features/directoryMessage/conversation.model.js';
import Message from '../../src/features/directoryMessage/message.model.js';
import User from '../../src/features/user/user.model.js';
import ReconciliationException from '../../src/features/ledger/reconciliation/models/reconciliationException.model.js';

describe('Phase 3H: Repository Tenant-Isolation & Fail-Closed Integration Suites', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  // ==========================================
  // Domain 1: Villa Repository
  // ==========================================
  describe('1. Villa Repository (Ownership: orgId)', () => {
    it('should isolate villa access strictly to the owner organization', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();

      const villaA = await villaRepository.create(orgA, {
        unitNumber: 'V-101',
        blockOrBuilding: 'Phase 1',
        type: 'Villa'
      });

      expect(villaA).toBeDefined();
      expect(villaA.orgId.toString()).toBe(orgA.toString());

      // Org A can find its villa
      const foundA = await villaRepository.findById(villaA._id.toString(), orgA);
      expect(foundA).not.toBeNull();
      expect(foundA._id.toString()).toBe(villaA._id.toString());

      // Org B cannot find Org A's villa
      const foundB = await villaRepository.findById(villaA._id.toString(), orgB);
      expect(foundB).toBeNull();

      // Org B cannot update Org A's villa
      const updateResultB = await villaRepository.update(villaA._id.toString(), orgB, { blockOrBuilding: 'Tampered' });
      expect(updateResultB).toBeNull();

      // Ensure DB document is unchanged
      const freshVilla = await Villa.findById(villaA._id);
      expect(freshVilla.blockOrBuilding).toBe('Phase 1');

      // Org A can update its own villa
      const updateResultA = await villaRepository.update(villaA._id.toString(), orgA, { blockOrBuilding: 'Phase 1 Updated' });
      expect(updateResultA).not.toBeNull();
      expect(updateResultA.blockOrBuilding).toBe('Phase 1 Updated');

      // Fail-closed on missing orgId
      await expect(villaRepository.findById(villaA._id.toString(), null)).rejects.toThrow();
    });
  });

  // ==========================================
  // Domain 2: Complaint Repository
  // ==========================================
  describe('2. Complaint Repository (Ownership: orgId)', () => {
    it('should isolate complaint operations and fail closed on invalid tenant context', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const residentId = new mongoose.Types.ObjectId();

      const complaintA = await complaintRepository.create({
        complaintNumber: 'CMP-2026-001',
        title: 'Water Leakage',
        description: 'Pipe leaking in main bathroom',
        category: 'Plumbing',
        status: 'Open',
        orgId: orgA,
        residentId
      });

      expect(complaintA).toBeDefined();

      // Org A can find the complaint
      const foundA = await complaintRepository.findById(complaintA._id, orgA);
      expect(foundA).not.toBeNull();
      expect(foundA.title).toBe('Water Leakage');

      // Org B cannot find Org A's complaint
      const foundB = await complaintRepository.findById(complaintA._id, orgB);
      expect(foundB).toBeNull();

      // Org B list query does not leak Org A's complaint
      const listB = await complaintRepository.findAll(orgB);
      expect(listB.data).toHaveLength(0);

      // Org A list query returns Org A's complaint
      const listA = await complaintRepository.findAll(orgA);
      expect(listA.data).toHaveLength(1);
      expect(listA.data[0]._id.toString()).toBe(complaintA._id.toString());

      // Fail-closed on missing tenant context
      await expect(complaintRepository.findAll(null)).rejects.toThrow('Tenant context (orgId) is required');
    });
  });

  // ==========================================
  // Domain 3: Assessment Repository
  // ==========================================
  describe('3. Assessment Repository (Ownership: communityId)', () => {
    it('should fail closed when communityId is missing and isolate templates per community', async () => {
      const commA = new mongoose.Types.ObjectId();
      const commB = new mongoose.Types.ObjectId();

      const templateA = await assessmentRepository.create({
        name: 'Quarterly Maintenance 2026',
        communityId: commA,
        type: 'RECURRING',
        billingCycle: 'QUARTERLY',
        generationDay: 1,
        dueDateDays: 15,
        isActive: true,
        targetScope: { type: 'ALL_COMMUNITY' },
        calculationMethod: {
          type: 'FLAT_RATE',
          flatAmount: 1500
        }
      });

      expect(templateA).toBeDefined();
      expect(templateA.communityId.toString()).toBe(commA.toString());

      // Comm A can find its assessment template
      const foundA = await assessmentRepository.findById(templateA._id.toString(), commA);
      expect(foundA).not.toBeNull();
      expect(foundA.name).toBe('Quarterly Maintenance 2026');

      // Comm B cannot find Comm A's template
      const foundB = await assessmentRepository.findById(templateA._id.toString(), commB);
      expect(foundB).toBeNull();

      // Comm B cannot update Comm A's template
      const updateB = await assessmentRepository.updateTemplate(templateA._id.toString(), { name: 'Hacked' }, null, commB);
      expect(updateB).toBeNull();

      // Comm B cannot delete Comm A's template
      const deleteB = await assessmentRepository.delete(templateA._id.toString(), null, commB);
      expect(deleteB).toBeNull();

      // Document still exists in database
      const inDb = await Assessment.findById(templateA._id);
      expect(inDb).not.toBeNull();
      expect(inDb.name).toBe('Quarterly Maintenance 2026');

      // Fail closed when communityId is missing or invalid
      await expect(assessmentRepository.findById(templateA._id.toString(), null))
        .rejects.toThrow('Community context (communityId) is required');

      await expect(assessmentRepository.updateTemplate(templateA._id.toString(), { name: 'New Name' }, null, null))
        .rejects.toThrow('Community context (communityId) is required');

      await expect(assessmentRepository.delete(templateA._id.toString(), null, 'invalid-id'))
        .rejects.toThrow('Community context (communityId) is required');
    });
  });

  // ==========================================
  // Domain 4: ReconciliationException
  // ==========================================
  describe('4. ReconciliationException (Ownership: orgId)', () => {
    it('should strictly isolate financial reconciliation exceptions per organization', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const srcId = new mongoose.Types.ObjectId();

      const excA = await ReconciliationException.create({
        orgId: orgA,
        runId: new mongoose.Types.ObjectId().toString(),
        sourceType: 'Payment',
        sourceId: srcId,
        domain: 'INVOICE',
        classification: 'UNMATCHED',
        reason: 'Payment gateway transaction not found',
        status: 'OPEN'
      });

      expect(excA).toBeDefined();

      // Org A can retrieve its exceptions
      const resA = await historicalReconciliationService.getExceptions({ orgId: orgA });
      expect(resA.exceptions).toHaveLength(1);
      expect(resA.exceptions[0]._id.toString()).toBe(excA._id.toString());

      // Org B cannot see Org A's exceptions
      const resB = await historicalReconciliationService.getExceptions({ orgId: orgB });
      expect(resB.exceptions).toHaveLength(0);

      // Org B cannot update Org A's exception
      await expect(
        historicalReconciliationService.updateException(excA._id.toString(), {
          status: 'RESOLVED',
          resolutionNotes: 'Illegal resolution by B',
          orgId: orgB
        })
      ).rejects.toThrow('Reconciliation exception not found');

      // Exception remains OPEN in DB
      const freshExc = await ReconciliationException.findById(excA._id);
      expect(freshExc.status).toBe('OPEN');

      // Org A can resolve its own exception
      const resolvedA = await historicalReconciliationService.updateException(excA._id.toString(), {
        status: 'RESOLVED',
        resolutionNotes: 'Audited and approved',
        orgId: orgA
      });
      expect(resolvedA.status).toBe('RESOLVED');

      // Missing orgId fails closed
      await expect(historicalReconciliationService.getExceptions({ orgId: null }))
        .rejects.toThrow('Organization context is required');
    });
  });

  // ==========================================
  // Domain 5: CommunityNote Repository
  // ==========================================
  describe('5. CommunityNote Repository (Ownership: orgId)', () => {
    it('should scope note deactivation strictly to the authorized tenant and fail closed', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();
      const userA = new mongoose.Types.ObjectId();

      const noteA = await communityNoteRepository.create({
        userId: userA,
        orgId: orgA,
        text: 'Package at reception',
        category: 'GENERAL',
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000)
      });

      expect(noteA).toBeDefined();

      // Org B cannot deactivate Org A's community note
      const deactB = await communityNoteRepository.deactivateById(noteA._id, userA, orgB);
      expect(deactB).toBeNull();

      // Note remains active in DB
      const freshNote = await CommunityNote.findById(noteA._id);
      expect(freshNote.isActive).toBe(true);

      // Missing or invalid orgId fails closed
      await expect(communityNoteRepository.deactivateById(noteA._id, userA, null))
        .rejects.toThrow('Organization context (orgId) is required');

      await expect(communityNoteRepository.deactivateById(noteA._id, userA, 'invalid-org'))
        .rejects.toThrow('Organization context (orgId) is required');

      // Org A can successfully deactivate its note
      const deactA = await communityNoteRepository.deactivateById(noteA._id, userA, orgA);
      expect(deactA).not.toBeNull();
      expect(deactA.isActive).toBe(false);
    });
  });

  // ==========================================
  // Domain 6: DirectoryMessage Repository
  // ==========================================
  describe('6. DirectoryMessage Repository (Ownership: orgId)', () => {
    it('should isolate directory conversations and messages per organization context', async () => {
      const orgA = new mongoose.Types.ObjectId();
      const orgB = new mongoose.Types.ObjectId();

      const user1 = await User.create({
        name: 'Resident Alice',
        username: 'alice',
        email: 'alice@example.com',
        phone: '+919876543210'
      });

      const user2 = await User.create({
        name: 'Resident Bob',
        username: 'bob',
        email: 'bob@example.com',
        phone: '+919876543211'
      });

      const convA = await directoryMessageRepository.createConversation({
        orgId: orgA,
        participants: [user1._id.toString(), user2._id.toString()],
        lastMessage: 'Hello neighbor',
        lastMessageAt: new Date()
      });

      expect(convA).toBeDefined();

      // Org A can find the conversation
      const foundA = await directoryMessageRepository.findConversationById(convA._id, orgA);
      expect(foundA).not.toBeNull();
      expect(foundA._id.toString()).toBe(convA._id.toString());

      // Org B cannot find the conversation when scoped to Org B
      const foundB = await directoryMessageRepository.findConversationById(convA._id, orgB);
      expect(foundB).toBeNull();

      // User conversations are filtered by orgId
      const convsOrgA = await directoryMessageRepository.findUserConversations(orgA, user1._id.toString());
      expect(convsOrgA).toHaveLength(1);

      const convsOrgB = await directoryMessageRepository.findUserConversations(orgB, user1._id.toString());
      expect(convsOrgB).toHaveLength(0);
    });
  });
});
