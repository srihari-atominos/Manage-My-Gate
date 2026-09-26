import apiClient from '../../../services/apiClient';
import {
  SubmitReportPayload,
  SubmitReportResponseData,
  FetchCommunityReportsParams,
  CommunityReportsResponseData,
  IssueReportItem,
} from '../types/issueReport.types';

export class IssueReportService {
  /**
   * Submits an issue report to the backend.
   * Constructs a multipart/form-data payload with required fields,
   * stringified technicalContext, and optional single screenshot.
   *
   * @param payload - Validated user report data and technical context
   * @returns Promise resolving to backend response data containing reportNumber and createdAt
   */
  async submitReport(payload: SubmitReportPayload): Promise<SubmitReportResponseData> {
    const formData = new FormData();

    formData.append('reportType', payload.reportType);
    formData.append('feature', payload.feature);
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description.trim());
    formData.append('technicalContext', JSON.stringify(payload.technicalContext));

    if (payload.screenshot && payload.screenshot.uri) {
      if (payload.screenshot.file) {
        // Web browser environment: append native File object directly
        formData.append('screenshot', payload.screenshot.file);
      } else {
        // React Native mobile environment: append file descriptor object
        const rawFileName = payload.screenshot.name || `screenshot_${Date.now()}.png`;
        const rawMimeType = payload.screenshot.type || 'image/png';

        formData.append('screenshot', {
          uri: payload.screenshot.uri,
          name: rawFileName,
          type: rawMimeType,
        } as any);
      }
    }

    const response: any = await apiClient.post('/support/reports', formData);

    const reportData: SubmitReportResponseData =
      response?.data?.reportNumber
        ? response.data
        : response?.reportNumber
        ? response
        : response?.data?.data || response?.data || response;

    return reportData;
  }

  /**
   * Fetches tenant-scoped community issue reports for Community Admins.
   * (GET /api/v1/support/reports/community)
   */
  async fetchCommunityReports(
    params: FetchCommunityReportsParams = {}
  ): Promise<CommunityReportsResponseData> {
    const cleanParams: Record<string, any> = {};
    if (params.page !== undefined && params.page !== null && (params.page as any) !== '') {
      cleanParams.page = Number(params.page);
    }
    if (params.limit !== undefined && params.limit !== null && (params.limit as any) !== '') {
      cleanParams.limit = Number(params.limit);
    }
    if (params.search && typeof params.search === 'string' && params.search.trim()) {
      cleanParams.search = params.search.trim();
    }
    if (params.reportType && typeof params.reportType === 'string' && params.reportType.trim()) {
      cleanParams.reportType = params.reportType.trim();
    }
    if (params.feature && typeof params.feature === 'string' && params.feature.trim()) {
      cleanParams.feature = params.feature.trim();
    }
    if (params.startDate && typeof params.startDate === 'string' && params.startDate.trim()) {
      cleanParams.startDate = params.startDate.trim();
    }
    if (params.endDate && typeof params.endDate === 'string' && params.endDate.trim()) {
      cleanParams.endDate = params.endDate.trim();
    }

    const response: any = await apiClient.get('/support/reports/community', { params: cleanParams });
    const data = response?.data || response;
    return {
      reports: data.reports || data.items || [],
      total: data.total || 0,
      page: data.page || 1,
      limit: data.limit || 10,
      totalPages: data.totalPages || 1,
    };
  }

  /**
   * Fetches single tenant-scoped community issue report by ID for Community Admins.
   * (GET /api/v1/support/reports/community/:id)
   */
  async fetchCommunityReportById(id: string): Promise<IssueReportItem> {
    const response: any = await apiClient.get(`/support/reports/community/${id}`);
    const report: IssueReportItem = response?.data?.report || response?.data || response?.report || response;
    return report;
  }
}

export const issueReportService = new IssueReportService();
export default issueReportService;

