import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import crmInquiryRepository from '../../src/features/crmInquiry/crmInquiry.repository.js';
import CrmInquiry from '../../src/features/crmInquiry/crmInquiry.model.js';
import User from '../../src/features/user/user.model.js';

describe('CrmInquiryRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('create and findById with population', () => {
    it('should create an inquiry, assign an agent, and retrieve with populated agent details', async () => {
      // Create mock agent user
      const agent = await User.create({
        name: 'Agent Smith',
        username: 'agent_smith',
        email: 'smith@matrix.com',
        role: 'Platform Admin',
        phone: '1234567890',
        credentialStatus: 'INITIALIZED'
      });

      // Create inquiry assigned to agent
      const inquiryData = {
        inquiryId: 'INQ-1001',
        title: 'Enterprise Plan Pricing',
        status: 'NEW_INQUIRY',
        assignedAgentId: agent._id,
        customerName: 'Neo',
        contactEmail: 'neo@zion.com',
        organizationName: 'Zion Corp',
        unitCount: 10
      };

      const created = await crmInquiryRepository.create(inquiryData);
      expect(created._id).toBeDefined();

      // Retrieve via repo (which should populate assignedAgentId)
      const retrieved = await crmInquiryRepository.findById(created._id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.customerName).toBe('Neo');
      
      // Check population
      expect(retrieved.assignedAgentId).toBeDefined();
      expect(retrieved.assignedAgentId.name).toBe('Agent Smith');
      expect(retrieved.assignedAgentId.email).toBe('smith@matrix.com');
      // Ensure phone is NOT populated (per the strict 'name email role status' projection in repo)
      expect(retrieved.assignedAgentId.phone).toBeUndefined();
    });
  });

  describe('deleteById', () => {
    it('should successfully remove an inquiry from the database', async () => {
      const inquiryData = {
        inquiryId: 'INQ-1002',
        title: 'Temporary Inquiry',
        customerName: 'Test',
        contactEmail: 'test@test.com',
        organizationName: 'Test Corp',
        unitCount: 1
      };

      const created = await crmInquiryRepository.create(inquiryData);
      
      // Verify existence
      const exists = await CrmInquiry.findById(created._id);
      expect(exists).not.toBeNull();

      // Delete via repo
      await crmInquiryRepository.deleteById(created._id);

      // Verify removal
      const deleted = await CrmInquiry.findById(created._id);
      expect(deleted).toBeNull();
    });
  });
});
