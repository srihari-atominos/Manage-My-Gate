import issueReportService from '../services/issueReportService';
import apiClient from '../../../services/apiClient';
import { SubmitReportPayload } from '../types/issueReport.types';

// Mock apiClient
jest.mock('../../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('IssueReportService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const basePayload: SubmitReportPayload = {
    reportType: 'BUG',
    feature: 'AMENITIES_BOOKING',
    title: 'Swimming pool slot booking fails on submit',
    description: 'When tapping confirm booking for 6:00 PM, the screen displays a timeout error.',
    technicalContext: {
      appVersion: '1.2.0',
      platform: 'android',
      deviceModel: 'Pixel 7',
      osVersion: '14',
    },
    screenshot: null,
  };

  it('constructs correct FormData and calls POST /support/reports for plain submission', async () => {
    const mockApiResponse = {
      data: {
        success: true,
        statusCode: 201,
        message: 'Report submitted successfully.',
        data: {
          reportNumber: 'NAH-000001',
          createdAt: '2026-09-24T06:30:00.000Z',
        },
      },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const result = await issueReportService.submitReport(basePayload);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [endpoint, formDataArg] = (apiClient.post as jest.Mock).mock.calls[0];

    expect(endpoint).toBe('/support/reports');
    expect(formDataArg).toBeInstanceOf(FormData);

    expect(result).toEqual({
      reportNumber: 'NAH-000001',
      createdAt: '2026-09-24T06:30:00.000Z',
    });
  });

  it('handles response unwrapped by apiClient response interceptor', async () => {
    // When apiClient interceptor returns response.data directly:
    const interceptorUnwrappedResponse = {
      success: true,
      statusCode: 201,
      message: 'Report submitted successfully.',
      data: {
        reportNumber: 'NAH-000099',
        createdAt: '2026-09-24T07:00:00.000Z',
      },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce(interceptorUnwrappedResponse);

    const result = await issueReportService.submitReport(basePayload);
    expect(result).toEqual({
      reportNumber: 'NAH-000099',
      createdAt: '2026-09-24T07:00:00.000Z',
    });
  });

  it('correctly appends React Native screenshot file object to FormData', async () => {
    const payloadWithScreenshot: SubmitReportPayload = {
      ...basePayload,
      screenshot: {
        uri: 'file:///path/to/screenshot.png',
        name: 'error_screenshot.png',
        type: 'image/png',
        size: 204800,
      },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          reportNumber: 'NAH-000002',
          createdAt: '2026-09-24T06:35:00.000Z',
        },
      },
    });

    const result = await issueReportService.submitReport(payloadWithScreenshot);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result.reportNumber).toBe('NAH-000002');
  });

  it('correctly appends Web File instance when running in web browser', async () => {
    const mockWebFile = { name: 'web_screen.jpg', size: 1024, type: 'image/jpeg' };
    const payloadWithWebFile: SubmitReportPayload = {
      ...basePayload,
      screenshot: {
        uri: 'blob:http://localhost:3000/12345',
        name: 'web_screen.jpg',
        type: 'image/jpeg',
        size: 1024,
        file: mockWebFile,
      },
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          reportNumber: 'NAH-000003',
          createdAt: '2026-09-24T06:40:00.000Z',
        },
      },
    });

    const result = await issueReportService.submitReport(payloadWithWebFile);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result.reportNumber).toBe('NAH-000003');
  });
});
