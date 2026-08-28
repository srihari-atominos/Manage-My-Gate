import { mapBackendWalkInToApprovalItem } from '../utils/mapBackendWalkInToApprovalItem';

describe('Visitor Management Utility Functions', () => {
  describe('mapBackendWalkInToApprovalItem', () => {
    it('should map raw backend log to normalized WalkInApprovalItem', () => {
      const rawLog = {
        _id: 'log-123',
        snapshot: {
          visitorName: 'Mohammed Ali',
          phone: '+966500000099',
          vehicleNumber: 'KSA-7788',
          idProofNumber: 'ID-990011',
        },
        guardId: { name: 'Guard Ahmed' },
        purpose: 'Package Delivery',
        passType: 'DELIVERY',
        createdAt: '2026-08-17T10:00:00.000Z',
        logStatus: 'PENDING',
      };

      const result = mapBackendWalkInToApprovalItem(rawLog);

      expect(result.id).toBe('log-123');
      expect(result.visitorName).toBe('Mohammed Ali');
      expect(result.phone).toBe('+966500000099');
      expect(result.vehicleNo).toBe('KSA-7788');
      expect(result.notes).toBe('ID Proof: ID-990011');
      expect(result.gateName).toBe('Gate Guard (Guard Ahmed)');
      expect(result.purpose).toBe('Package Delivery');
      expect(result.passType).toBe('DELIVERY');
      expect(result.status).toBe('PENDING');
      expect(result.rawLog).toEqual(rawLog);
    });

    it('should return empty object if raw log is empty or null', () => {
      const result = mapBackendWalkInToApprovalItem(null);
      expect(result).toEqual({});
    });

    it('should correctly map APPROVED logStatus', () => {
      const rawLog = {
        _id: 'log-456',
        snapshot: { visitorName: 'Sara Smith' },
        logStatus: 'INSIDE',
      };

      const result = mapBackendWalkInToApprovalItem(rawLog);
      expect(result.status).toBe('APPROVED');
    });

    it('should correctly map REJECTED logStatus', () => {
      const rawLog = {
        _id: 'log-789',
        snapshot: { visitorName: 'John Doe' },
        logStatus: 'REJECTED',
      };

      const result = mapBackendWalkInToApprovalItem(rawLog);
      expect(result.status).toBe('REJECTED');
    });
  });
});
