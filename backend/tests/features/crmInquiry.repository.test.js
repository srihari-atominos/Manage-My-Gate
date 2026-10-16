import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import crmInquiryRepository from '../../src/features/crmInquiry/crmInquiry.repository.js';
import CrmInquiry from '../../src/features/crmInquiry/crmInquiry.model.js';

describe('CrmInquiryRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an inquiry with optional session', async () => {
      const mockData = { title: 'Pricing Inquiry' };
      const mockCreated = [{ _id: 'inq-1', ...mockData }];
      const session = { id: 'mock-session' };
      
      jest.spyOn(CrmInquiry, 'create').mockResolvedValue(mockCreated);

      const result = await crmInquiryRepository.create(mockData, session);

      expect(CrmInquiry.create).toHaveBeenCalledWith([mockData], { session });
      expect(result).toEqual(mockCreated[0]);
    });
  });

  describe('findById', () => {
    it('should find inquiry and populate assignedAgentId', async () => {
      const mockId = new mongoose.Types.ObjectId().toString();
      const mockDoc = { _id: mockId, title: 'Inquiry' };
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockDoc)
      };
      
      jest.spyOn(CrmInquiry, 'findById').mockReturnValue(mockQuery);

      const result = await crmInquiryRepository.findById(mockId);

      expect(CrmInquiry.findById).toHaveBeenCalledWith(mockId);
      expect(mockQuery.populate).toHaveBeenCalledWith('assignedAgentId', 'name email role status');
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(mockDoc);
    });
  });

  describe('updateById', () => {
    it('should update inquiry globally by ID with optional session', async () => {
      const mockId = new mongoose.Types.ObjectId().toString();
      const session = { id: 'mock-session' };
      const updateData = { status: 'qualified' };
      const mockDoc = { _id: mockId, ...updateData };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockDoc)
      };

      jest.spyOn(CrmInquiry, 'findByIdAndUpdate').mockReturnValue(mockQuery);

      const result = await crmInquiryRepository.updateById(mockId, updateData, session);

      expect(CrmInquiry.findByIdAndUpdate).toHaveBeenCalledWith(
        mockId,
        updateData,
        { returnDocument: 'after', runValidators: true, session }
      );
      expect(mockQuery.populate).toHaveBeenCalledWith('assignedAgentId', 'name email role status');
      expect(result).toEqual(mockDoc);
    });
  });

  describe('deleteById', () => {
    it('should delete inquiry globally by ID', async () => {
      const mockId = new mongoose.Types.ObjectId().toString();
      const mockDoc = { _id: mockId, title: 'Inquiry' };
      
      jest.spyOn(CrmInquiry, 'findByIdAndDelete').mockResolvedValue(mockDoc);

      const result = await crmInquiryRepository.deleteById(mockId);

      expect(CrmInquiry.findByIdAndDelete).toHaveBeenCalledWith(mockId, {});
      expect(result).toEqual(mockDoc);
    });

    it('should support session when deleting inquiry globally by ID', async () => {
      const mockId = new mongoose.Types.ObjectId().toString();
      const session = { id: 'mock-session' };
      const mockDoc = { _id: mockId, title: 'Scoped Inquiry' };

      jest.spyOn(CrmInquiry, 'findByIdAndDelete').mockResolvedValue(mockDoc);

      const result = await crmInquiryRepository.deleteById(mockId, session);

      expect(CrmInquiry.findByIdAndDelete).toHaveBeenCalledWith(
        mockId,
        { session }
      );
      expect(result).toEqual(mockDoc);
    });
  });
});
