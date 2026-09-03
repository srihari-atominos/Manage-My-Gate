import mongoose from 'mongoose';
import invoiceRepository from '../src/features/invoice/invoice.repository.js';
import Invoice from '../src/features/invoice/invoice.model.js';

describe('Invoice Repository Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardKPIs', () => {
    it('should correctly sum totalDueFallback and include orgId matched invoices', async () => {
      // Create a mock community ID
      const mockCommunityId = new mongoose.Types.ObjectId().toString();

      // Mock the result of Invoice.aggregate
      const mockAggregateResult = [{
        grossDemand: [{ total: 11909, count: 3 }],
        totalCollected: [{ total: 11909 }],
        inTransitGateway: [],
        pendingOffline: [],
        totalUnpaidArrears: []
      }];

      jest.spyOn(Invoice, 'aggregate').mockResolvedValue(mockAggregateResult);

      const result = await invoiceRepository.getDashboardKPIs(mockCommunityId);

      // Verify that aggregate was called
      expect(Invoice.aggregate).toHaveBeenCalledTimes(1);
      
      const pipeline = Invoice.aggregate.mock.calls[0][0];

      // 1. Verify that orgId is included in the match steps
      const firstMatchStep = pipeline[0].$match;
      expect(firstMatchStep.$or).toEqual(
        expect.arrayContaining([
          { orgId: expect.any(mongoose.Types.ObjectId) }
        ])
      );

      const secondMatchStep = pipeline.find(step => step.$match && step.$match.$or && step.$match.$or.length === 3).$match;
      expect(secondMatchStep.$or).toEqual(
        expect.arrayContaining([
          { orgId: expect.any(mongoose.Types.ObjectId) }
        ])
      );

      // 2. Verify that totalDueFallback is added via $addFields
      const addFieldsStep = pipeline.find(step => step.$addFields);
      expect(addFieldsStep).toBeDefined();
      expect(addFieldsStep.$addFields.totalDueFallback).toBeDefined();

      // 3. Verify that the $facet uses totalDueFallback for summation
      const facetStep = pipeline.find(step => step.$facet);
      const grossDemandGroup = facetStep.$facet.grossDemand.find(step => step.$group);
      expect(grossDemandGroup.$group.total.$sum).toBe('$totalDueFallback');

      // 4. Verify the returned KPIs
      expect(result).toEqual({
        grossDemand: 11909,
        grossDemandCount: 3,
        totalCollected: 11909,
        inTransitGateway: 0,
        totalUnpaidArrears: 0
      });
    });
  });
});
