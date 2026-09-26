import { renderHook, act } from '@testing-library/react-native';
import { useReportIssue } from '../hooks/useReportIssue';
import issueReportService from '../services/issueReportService';

// Mock issueReportService
jest.mock('../services/issueReportService', () => ({
  __esModule: true,
  default: {
    submitReport: jest.fn(),
  },
}));

// Mock technical context
jest.mock('../utils/technicalContext', () => ({
  getTechnicalContext: jest.fn(() => ({
    appVersion: '1.0.0',
    platform: 'android',
    deviceModel: 'Test Device',
    osVersion: '14',
  })),
}));

describe('useReportIssue Hook Unit & Validation Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Form Validation Invariants', () => {
    it('fails validation when reportType is missing', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setFeature('PAYMENTS');
        result.current.setTitle('Payment failed');
        result.current.setDescription('Transaction was deducted but receipt not shown');
      });

      let success = false;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(false);
      expect(result.current.validationErrors.reportType).toBe('Please select an issue type.');
      expect(issueReportService.submitReport).not.toHaveBeenCalled();
    });

    it('fails validation when feature module is missing', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('BUG');
        result.current.setTitle('Valid Title Here');
        result.current.setDescription('Valid description with more than ten chars');
      });

      let success = false;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(false);
      expect(result.current.validationErrors.feature).toBe('Please select an affected feature or module.');
      expect(issueReportService.submitReport).not.toHaveBeenCalled();
    });

    it('fails validation when title is shorter than 3 characters', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('BUG');
        result.current.setFeature('AMENITIES_BOOKING');
        result.current.setTitle('No');
        result.current.setDescription('Valid description with more than ten chars');
      });

      let success = false;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(false);
      expect(result.current.validationErrors.title).toContain('at least 3 characters');
      expect(issueReportService.submitReport).not.toHaveBeenCalled();
    });

    it('fails validation when description is shorter than 10 characters', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('FEATURE_REQUEST');
        result.current.setFeature('NOTIFICATIONS');
        result.current.setTitle('Dark mode push');
        result.current.setDescription('Short');
      });

      let success = false;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(false);
      expect(result.current.validationErrors.description).toContain('at least 10 characters');
      expect(issueReportService.submitReport).not.toHaveBeenCalled();
    });

    it('rejects screenshots exceeding the 10 MB limit', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setScreenshot({
          uri: 'file:///oversized.png',
          name: 'huge.png',
          type: 'image/png',
          size: 15 * 1024 * 1024, // 15MB
        });
      });

      expect(result.current.validationErrors.screenshot).toContain('must not exceed 10 MB');
      expect(result.current.screenshot).toBeNull();
    });
  });

  describe('2. Submission & Success Flow', () => {
    it('submits valid data, captures NAH-XXXXXX report number, and updates submittedReport state', async () => {
      (issueReportService.submitReport as jest.Mock).mockResolvedValueOnce({
        reportNumber: 'NAH-000001',
        createdAt: '2026-09-24T06:30:00.000Z',
      });

      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('BUG');
        result.current.setFeature('VISITORS_GATE_ACCESS');
        result.current.setTitle('Gate QR scanner delay');
        result.current.setDescription('Camera scanner takes over 10 seconds to detect valid resident pass.');
      });

      let success = false;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(true);
      expect(issueReportService.submitReport).toHaveBeenCalledTimes(1);
      expect(result.current.submittedReport).toEqual({
        reportNumber: 'NAH-000001',
        createdAt: '2026-09-24T06:30:00.000Z',
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('3. Error Handling & Field Preservation', () => {
    it('preserves form field values when API call fails and sets error message', async () => {
      (issueReportService.submitReport as jest.Mock).mockRejectedValueOnce({
        response: {
          data: {
            message: 'Network gateway timeout. Please retry.',
          },
        },
      });

      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('OTHER');
        result.current.setFeature('COMMUNITY_DIRECTORY');
        result.current.setTitle('Directory search slow');
        result.current.setDescription('Searching by unit number takes too long.');
      });

      let success = true;
      await act(async () => {
        success = await result.current.handleSubmit();
      });

      expect(success).toBe(false);
      // Form fields must be preserved
      expect(result.current.reportType).toBe('OTHER');
      expect(result.current.feature).toBe('COMMUNITY_DIRECTORY');
      expect(result.current.title).toBe('Directory search slow');
      expect(result.current.description).toBe('Searching by unit number takes too long.');
      expect(result.current.error).toBe('Network gateway timeout. Please retry.');
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submittedReport).toBeNull();
    });
  });

  describe('4. Duplicate Submission Protection', () => {
    it('prevents duplicate API dispatches when submit is triggered while already submitting', async () => {
      let resolveApi: (val: any) => void;
      const deferredPromise = new Promise((resolve) => {
        resolveApi = resolve;
      });

      (issueReportService.submitReport as jest.Mock).mockReturnValue(deferredPromise);

      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('BUG');
        result.current.setFeature('PAYMENTS');
        result.current.setTitle('Duplicate check title');
        result.current.setDescription('Testing concurrency lock on rapid multi-taps.');
      });

      // Fire first submit
      let p1: Promise<boolean>;
      await act(async () => {
        p1 = result.current.handleSubmit();
      });

      expect(result.current.isSubmitting).toBe(true);

      // Fire second submit concurrently
      let p2Result: boolean = true;
      await act(async () => {
        p2Result = await result.current.handleSubmit();
      });

      // Second submit must be rejected immediately by concurrency guard
      expect(p2Result).toBe(false);
      expect(issueReportService.submitReport).toHaveBeenCalledTimes(1);

      // Resolve first submit
      await act(async () => {
        resolveApi!({
          reportNumber: 'NAH-000005',
          createdAt: '2026-09-24T06:50:00.000Z',
        });
        await p1;
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submittedReport?.reportNumber).toBe('NAH-000005');
    });
  });

  describe('5. Form Reset', () => {
    it('resets all form fields and submission state upon resetForm', async () => {
      const { result } = await renderHook(() => useReportIssue());

      await act(async () => {
        result.current.setReportType('BUG');
        result.current.setFeature('AUTHENTICATION');
        result.current.setTitle('Login error');
        result.current.setDescription('Cannot log in with phone OTP');
      });

      await act(async () => {
        result.current.resetForm();
      });

      expect(result.current.reportType).toBeNull();
      expect(result.current.feature).toBeNull();
      expect(result.current.title).toBe('');
      expect(result.current.description).toBe('');
      expect(result.current.screenshot).toBeNull();
      expect(result.current.validationErrors).toEqual({});
      expect(result.current.submittedReport).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
