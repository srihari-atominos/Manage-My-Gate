import { useState, useCallback, useRef } from 'react';
import {
  ReportType,
  FeatureModule,
  ISSUE_REPORT_CONSTRAINTS,
} from '../constants/issueReport.constants';
import {
  ScreenshotFile,
  SubmitReportResponseData,
  IssueReportValidationErrors,
} from '../types/issueReport.types';
import { getTechnicalContext } from '../utils/technicalContext';
import issueReportService from '../services/issueReportService';

export interface UseReportIssueReturn {
  // Form fields
  reportType: ReportType | null;
  feature: FeatureModule | null;
  title: string;
  description: string;
  screenshot: ScreenshotFile | null;

  // Setters
  setReportType: (type: ReportType) => void;
  setFeature: (feature: FeatureModule) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setScreenshot: (file: ScreenshotFile | null) => void;
  removeScreenshot: () => void;

  // Validation & status
  validationErrors: IssueReportValidationErrors;
  isSubmitting: boolean;
  error: string | null;
  submittedReport: SubmitReportResponseData | null;

  // Actions
  handleSubmit: () => Promise<boolean>;
  resetForm: () => void;
  clearError: () => void;
}

export const useReportIssue = (): UseReportIssueReturn => {
  const [reportType, setReportTypeState] = useState<ReportType | null>(null);
  const [feature, setFeatureState] = useState<FeatureModule | null>(null);
  const [title, setTitleState] = useState('');
  const [description, setDescriptionState] = useState('');
  const [screenshot, setScreenshotState] = useState<ScreenshotFile | null>(null);

  const [validationErrors, setValidationErrors] = useState<IssueReportValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<SubmitReportResponseData | null>(null);

  // Concurrency guard ref to prevent race conditions from rapid multi-taps
  const isSubmittingRef = useRef(false);

  const setReportType = useCallback((type: ReportType) => {
    setReportTypeState(type);
    setValidationErrors((prev) => ({ ...prev, reportType: undefined }));
    setError(null);
  }, []);

  const setFeature = useCallback((feat: FeatureModule) => {
    setFeatureState(feat);
    setValidationErrors((prev) => ({ ...prev, feature: undefined }));
    setError(null);
  }, []);

  const setTitle = useCallback((val: string) => {
    setTitleState(val);
    if (val.trim().length >= ISSUE_REPORT_CONSTRAINTS.TITLE_MIN_LENGTH) {
      setValidationErrors((prev) => ({ ...prev, title: undefined }));
    }
  }, []);

  const setDescription = useCallback((val: string) => {
    setDescriptionState(val);
    if (val.trim().length >= ISSUE_REPORT_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) {
      setValidationErrors((prev) => ({ ...prev, description: undefined }));
    }
  }, []);

  const setScreenshot = useCallback((file: ScreenshotFile | null) => {
    if (file && file.size && file.size > ISSUE_REPORT_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
      setValidationErrors((prev) => ({
        ...prev,
        screenshot: 'Screenshot size must not exceed 10 MB.',
      }));
      return;
    }
    setScreenshotState(file);
    setValidationErrors((prev) => ({ ...prev, screenshot: undefined }));
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshotState(null);
    setValidationErrors((prev) => ({ ...prev, screenshot: undefined }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: IssueReportValidationErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!reportType) {
      errors.reportType = 'Please select an issue type.';
    }

    if (!feature) {
      errors.feature = 'Please select an affected feature or module.';
    }

    if (!trimmedTitle) {
      errors.title = 'Title is required.';
    } else if (trimmedTitle.length < ISSUE_REPORT_CONSTRAINTS.TITLE_MIN_LENGTH) {
      errors.title = `Title must be at least ${ISSUE_REPORT_CONSTRAINTS.TITLE_MIN_LENGTH} characters.`;
    } else if (trimmedTitle.length > ISSUE_REPORT_CONSTRAINTS.TITLE_MAX_LENGTH) {
      errors.title = `Title cannot exceed ${ISSUE_REPORT_CONSTRAINTS.TITLE_MAX_LENGTH} characters.`;
    }

    if (!trimmedDescription) {
      errors.description = 'Description is required.';
    } else if (trimmedDescription.length < ISSUE_REPORT_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) {
      errors.description = `Description must be at least ${ISSUE_REPORT_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} characters.`;
    } else if (trimmedDescription.length > ISSUE_REPORT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description cannot exceed ${ISSUE_REPORT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters.`;
    }

    if (screenshot?.size && screenshot.size > ISSUE_REPORT_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
      errors.screenshot = 'Screenshot size must not exceed 10 MB.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [reportType, feature, title, description, screenshot]);

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (isSubmittingRef.current || isSubmitting) {
      return false;
    }

    setError(null);

    const isValid = validateForm();
    if (!isValid) {
      return false;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const technicalContext = getTechnicalContext();

      const result = await issueReportService.submitReport({
        reportType: reportType!,
        feature: feature!,
        title: title.trim(),
        description: description.trim(),
        technicalContext,
        screenshot,
      });

      const submittedData: SubmitReportResponseData = {
        reportNumber: result?.reportNumber || 'NAH-RECEIVED',
        createdAt: result?.createdAt || new Date().toISOString(),
      };

      setSubmittedReport(submittedData);
      return true;
    } catch (err: any) {
      console.error('[useReportIssue] Submission error:', err);

      let userFacingMessage =
        'We could not submit your report. Please check your connection and try again.';

      if (err.response?.data?.message) {
        userFacingMessage = err.response.data.message;
      } else if (err.message && !err.message.includes('status code')) {
        userFacingMessage = err.message;
      }

      setError(userFacingMessage);
      return false;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateForm, reportType, feature, title, description, screenshot]);

  const resetForm = useCallback(() => {
    setReportTypeState(null);
    setFeatureState(null);
    setTitleState('');
    setDescriptionState('');
    setScreenshotState(null);
    setValidationErrors({});
    setError(null);
    setSubmittedReport(null);
  }, []);

  return {
    reportType,
    feature,
    title,
    description,
    screenshot,
    setReportType,
    setFeature,
    setTitle,
    setDescription,
    setScreenshot,
    removeScreenshot,
    validationErrors,
    isSubmitting,
    error,
    submittedReport,
    handleSubmit,
    resetForm,
    clearError,
  };
};

export default useReportIssue;
