import { issueReportService } from '../services/issueReportService';
import { resolveNotificationRoute } from '../../notification/utils/notificationNavigation';
import apiClient from '../../../services/apiClient';

jest.mock('../../../services/apiClient');

describe('Community Admin Mobile Issue Reports Test Suite (Phase 4)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. API Layer — Community Admin Tenant-Scoped Endpoints', () => {
    test('1.1 fetchCommunityReports calls /support/reports/community endpoint with query params', async () => {
      const mockResponse = {
        data: {
          reports: [
            {
              _id: 'rep_101',
              reportNumber: 'NAH-000012',
              reportType: 'BUG',
              feature: 'PAYMENTS',
              title: 'Payment Gateway Error',
              description: 'Transaction failed on checkout step.',
              createdAt: '2026-09-25T10:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await issueReportService.fetchCommunityReports({ page: 1, search: 'Payment' });

      expect(apiClient.get).toHaveBeenCalledWith('/support/reports/community', {
        params: { page: 1, search: 'Payment' },
      });
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].reportNumber).toBe('NAH-000012');
    });

    test('1.2 fetchCommunityReportById calls /support/reports/community/:id endpoint', async () => {
      const mockReport = {
        _id: 'rep_101',
        reportNumber: 'NAH-000012',
        reportType: 'BUG',
        feature: 'PAYMENTS',
        title: 'Payment Gateway Error',
        description: 'Transaction failed on checkout step.',
        reporter: { name: 'Alice Resident', email: 'alice@example.com' },
        createdAt: '2026-09-25T10:00:00.000Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { report: mockReport } });

      const result = await issueReportService.fetchCommunityReportById('rep_101');

      expect(apiClient.get).toHaveBeenCalledWith('/support/reports/community/rep_101');
      expect(result.title).toBe('Payment Gateway Error');
      expect(result.reporter?.name).toBe('Alice Resident');
    });
  });

  describe('2. Notification Deep-Link Route Mapper', () => {
    test('2.1 maps Web actionUrl /admin/complaints/issue-reports?reportId=rep_101 to mobile Expo Router path', () => {
      const route = resolveNotificationRoute({
        actionUrl: '/admin/complaints/issue-reports?reportId=rep_101',
      });

      expect(route).toBe('/(resident)/complaints/issue-reports?reportId=rep_101');
    });

    test('2.2 maps semantic ISSUE_REPORT push notification to mobile Expo Router path with reportId', () => {
      const route = resolveNotificationRoute({
        type: 'ISSUE_REPORT',
        entityId: 'rep_101',
      });

      expect(route).toBe('/(resident)/complaints/issue-reports?reportId=rep_101');
    });

    test('2.3 maps base issue-reports actionUrl without query params to list view', () => {
      const route = resolveNotificationRoute({
        actionUrl: '/admin/complaints/issue-reports',
      });

      expect(route).toBe('/(resident)/complaints/issue-reports');
    });
  });

  describe('3. Security & Read-Only Boundaries', () => {
    test('3.1 ensures Community Admin endpoints never invoke platform super-admin endpoints', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { reports: [], total: 0 } });

      await issueReportService.fetchCommunityReports();

      expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/platform/reports'));
      expect(apiClient.get).toHaveBeenCalledWith('/support/reports/community', expect.anything());
    });
  });
});
