import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import issueReportRepository from '../../src/features/issueReport/issueReport.repository.js';
import IssueReportSequence from '../../src/features/issueReport/issueReportSequence.model.js';
import IssueReport from '../../src/features/issueReport/issueReport.model.js';

describe('IssueReportRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextReportNumber', () => {
    it('should retrieve and format the next sequence number correctly', async () => {
      const mockSequence = { currentSequence: 42 };
      jest.spyOn(IssueReportSequence, 'findOneAndUpdate').mockResolvedValue(mockSequence);

      const reportNumber = await issueReportRepository.getNextReportNumber();

      expect(IssueReportSequence.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'REPORT_SEQUENCE' },
        { $inc: { currentSequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      expect(reportNumber).toBe('NAH-000042');
    });

    it('should pass session if provided', async () => {
      const mockSequence = { currentSequence: 100 };
      const session = {}; // Mock session
      jest.spyOn(IssueReportSequence, 'findOneAndUpdate').mockResolvedValue(mockSequence);

      const reportNumber = await issueReportRepository.getNextReportNumber(session);

      expect(IssueReportSequence.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'REPORT_SEQUENCE' },
        { $inc: { currentSequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      );
      expect(reportNumber).toBe('NAH-000100');
    });
  });

  describe('create', () => {
    it('should create a new issue report', async () => {
      const mockReportData = { reportNumber: 'NAH-000001', organisation: { organisationId: new mongoose.Types.ObjectId() } };
      const mockCreatedDocs = [{ _id: 'doc-1', ...mockReportData }];
      
      jest.spyOn(IssueReport, 'create').mockResolvedValue(mockCreatedDocs);

      const result = await issueReportRepository.create(mockReportData);

      expect(IssueReport.create).toHaveBeenCalledWith([mockReportData], {});
      expect(result).toEqual(mockCreatedDocs[0]);
    });

    it('should pass session when creating', async () => {
      const mockReportData = { reportNumber: 'NAH-000002' };
      const mockCreatedDocs = [{ _id: 'doc-2', ...mockReportData }];
      const session = { id: 'session-1' };
      
      jest.spyOn(IssueReport, 'create').mockResolvedValue(mockCreatedDocs);

      const result = await issueReportRepository.create(mockReportData, session);

      expect(IssueReport.create).toHaveBeenCalledWith([mockReportData], { session });
      expect(result).toEqual(mockCreatedDocs[0]);
    });
  });
});
