import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import amenityFacilityRepository from '../../src/features/amenityManagement/facilities/amenityFacility.repository.js';
import AmenityFacility from '../../src/features/amenityManagement/facilities/amenityFacility.model.js';

describe('AmenityFacilityRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new amenity facility successfully', async () => {
      const mockFacilityData = { name: 'Tennis Court', orgId: new mongoose.Types.ObjectId() };
      const mockCreatedDocs = [{ _id: 'fac-1', ...mockFacilityData }];
      
      jest.spyOn(AmenityFacility, 'create').mockResolvedValue(mockCreatedDocs);

      const result = await amenityFacilityRepository.create(mockFacilityData);

      expect(AmenityFacility.create).toHaveBeenCalledWith([mockFacilityData], {});
      expect(result).toEqual(mockCreatedDocs[0]);
    });
  });

  describe('findById', () => {
    it('should query facility by id and optional orgId', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const mockOrgId = new mongoose.Types.ObjectId();
      const mockDoc = { _id: mockId, name: 'Pool', orgId: mockOrgId };
      
      // Since repo returns the query directly without .exec(), 
      // the returned object must act as a Promise for await to unwrap it.
      const mockQuery = Promise.resolve(mockDoc);
      mockQuery.session = jest.fn().mockReturnValue(mockQuery);
      
      jest.spyOn(AmenityFacility, 'findOne').mockReturnValue(mockQuery);

      const result = await amenityFacilityRepository.findById(mockId, mockOrgId);

      expect(AmenityFacility.findOne).toHaveBeenCalledWith({ _id: mockId, orgId: mockOrgId, isDeleted: false });
      expect(result).toEqual(mockDoc);
    });

    it('should handle empty orgId query gracefully', async () => {
      const mockId = new mongoose.Types.ObjectId();
      const mockQuery = Promise.resolve(null);
      mockQuery.session = jest.fn().mockReturnValue(mockQuery);
      
      jest.spyOn(AmenityFacility, 'findOne').mockReturnValue(mockQuery);

      const result = await amenityFacilityRepository.findById(mockId);

      expect(AmenityFacility.findOne).toHaveBeenCalledWith({ _id: mockId, isDeleted: false });
      expect(result).toBeNull();
    });
  });
});
