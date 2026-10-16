import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDb, closeDb, clearDb } from './db.setup.js';
import issueReportRepository from '../../src/features/issueReport/issueReport.repository.js';
import IssueReportSequence from '../../src/features/issueReport/issueReportSequence.model.js';
import IssueReport from '../../src/features/issueReport/issueReport.model.js';

describe('IssueReportRepository Integration', () => {
  beforeAll(async () => {
    await connectDb();
  }, 30000);

  afterAll(async () => {
    await closeDb();
  }, 30000);

  beforeEach(async () => {
    await clearDb();
  });

  describe('getNextReportNumber Sequence Generator', () => {
    it('should generate sequential report numbers correctly', async () => {
      const num1 = await issueReportRepository.getNextReportNumber();
      const num2 = await issueReportRepository.getNextReportNumber();
      
      expect(num1).toBe('NAH-000001');
      expect(num2).toBe('NAH-000002');
      
      const seqDoc = await IssueReportSequence.findOne({ key: 'REPORT_SEQUENCE' });
      expect(seqDoc.currentSequence).toBe(2);
    });
  });

  describe('Document Creation', () => {
    it('should create an issue report and enforce required fields', async () => {
      const mockReporter = {
        userId: new mongoose.Types.ObjectId(),
        name: 'John Doe',
        role: 'Resident'
      };
      
      const mockOrgId = new mongoose.Types.ObjectId();
      const reportData = {
        reportNumber: 'NAH-000003',
        reporter: mockReporter,
        organisation: {
          organisationId: mockOrgId,
          name: 'Org A'
        },
        title: 'Broken Gate',
        description: 'The main gate is not opening for cabs.',
        reportType: 'BUG',
        feature: 'VISITORS_GATE_ACCESS'
      };

      const result = await issueReportRepository.create(reportData);
      expect(result._id).toBeDefined();
      expect(result.reportNumber).toBe('NAH-000003');
      expect(result.organisation.organisationId.toString()).toBe(mockOrgId.toString());

      // Read it back
      const readBack = await IssueReport.findById(result._id);
      expect(readBack.reporter.name).toBe('John Doe');
      expect(readBack.title).toBe('Broken Gate');
    });
  });
});
