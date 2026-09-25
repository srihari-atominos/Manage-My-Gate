import apiClient from '../../../services/apiClient';
import { SubmitReportPayload, SubmitReportResponseData } from '../types/issueReport.types';

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

    // apiClient.interceptors.response unwraps Axios response and returns the backend envelope { success, data: { reportNumber, createdAt } }.
    // Handle both direct interceptor envelope and raw Axios response.
    const reportData: SubmitReportResponseData =
      response?.data?.reportNumber
        ? response.data
        : response?.reportNumber
        ? response
        : response?.data?.data || response?.data || response;

    return reportData;
  }
}

export const issueReportService = new IssueReportService();
export default issueReportService;
