import { ReportType, FeatureModule } from '../constants/issueReport.constants';

export interface TechnicalContext {
  appVersion?: string;
  platform?: 'android' | 'ios' | 'web';
  deviceModel?: string;
  osVersion?: string;
}

export interface ScreenshotFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
  file?: any; // Raw File object for web environment
}

export interface SubmitReportPayload {
  reportType: ReportType;
  feature: FeatureModule;
  title: string;
  description: string;
  technicalContext: TechnicalContext;
  screenshot?: ScreenshotFile | null;
}

export interface SubmitReportResponseData {
  reportNumber: string;
  createdAt: string;
}

export interface IssueReportFormState {
  reportType: ReportType | null;
  feature: FeatureModule | null;
  title: string;
  description: string;
  screenshot: ScreenshotFile | null;
}

export interface IssueReportValidationErrors {
  reportType?: string;
  feature?: string;
  title?: string;
  description?: string;
  screenshot?: string;
}

export interface ReportAttachment {
  url: string;
  fileName?: string;
  fileType?: string;
  sizeBytes?: number;
}

export interface IssueReportReporter {
  name?: string;
  email?: string;
  phone?: string;
  userRef?: string;
}

export interface IssueReportOrganisation {
  name?: string;
  orgId?: string;
}

export interface IssueReportItem {
  _id: string;
  id?: string;
  reportNumber: string;
  reportType: ReportType;
  feature: FeatureModule;
  title: string;
  description: string;
  technicalContext?: TechnicalContext;
  reporter?: IssueReportReporter;
  organisation?: IssueReportOrganisation;
  attachments?: ReportAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface FetchCommunityReportsParams {
  page?: number;
  limit?: number;
  search?: string;
  reportType?: string;
  feature?: string;
  startDate?: string;
  endDate?: string;
}

export interface CommunityReportsResponseData {
  reports: IssueReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

