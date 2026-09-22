import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import {
  initializeWizard,
  setContentType,
  updateFormData,
  setStepIndex,
  nextStep,
  previousStep,
  resetWizard,
  clearEngagementError,
  clearEngagementSuccess,
  fetchEngagementPreview,
  submitEngagementContent,
} from '../store/communityEngagementSlice';
import {
  EngagementContentType,
  CommunityEngagementFormData,
  WizardStepMeta,
} from '../types/communityEngagement.types';

export const WIZARD_STEPS: Record<EngagementContentType, WizardStepMeta[]> = {
  NOTICE: [
    {
      key: 'basic-info',
      title: 'Basic Info',
      subtitle: 'Headline, details & priority',
    },
    {
      key: 'audience',
      title: 'Target Audience',
      subtitle: 'Select recipient criteria',
    },
    {
      key: 'schedule',
      title: 'Schedule & Expiry',
      subtitle: 'Timing & pin duration',
    },
    {
      key: 'type-config',
      title: 'Attachments & Engagement',
      subtitle: 'Photos, comments & sign-offs',
    },
    {
      key: 'review',
      title: 'Review & Publish',
      subtitle: 'Live feed preview & submission',
    },
  ],
  POLL: [
    {
      key: 'basic-info',
      title: 'Poll Question',
      subtitle: 'Question & background context',
    },
    {
      key: 'audience',
      title: 'Eligible Voters',
      subtitle: 'Select voter eligibility',
    },
    {
      key: 'schedule',
      title: 'Poll Duration',
      subtitle: 'Start date & closing deadline',
    },
    {
      key: 'type-config',
      title: 'Ballot & Governance',
      subtitle: 'Options, quorum & privacy rules',
    },
    {
      key: 'review',
      title: 'Review & Publish',
      subtitle: 'Live ballot preview & submission',
    },
  ],
};

export const useCommunityEngagementWizard = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    contentType,
    formData,
    currentStepIndex,
    previewData,
    loading,
    previewLoading,
    submitting,
    error,
    success,
    createdResult,
  } = useSelector((state: RootState) => state.communityEngagement);

  const steps = useMemo(() => WIZARD_STEPS[contentType], [contentType]);
  const currentStep = useMemo(() => steps[currentStepIndex] || steps[0], [steps, currentStepIndex]);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Change archetype / type
  const selectType = useCallback(
    (type: EngagementContentType) => {
      dispatch(initializeWizard(type));
    },
    [dispatch]
  );

  // Field updates
  const setField = useCallback(
    <K extends keyof CommunityEngagementFormData>(key: K, value: CommunityEngagementFormData[K]) => {
      dispatch(updateFormData({ [key]: value }));
    },
    [dispatch]
  );

  const setFields = useCallback(
    (updates: Partial<CommunityEngagementFormData>) => {
      dispatch(updateFormData(updates));
    },
    [dispatch]
  );

  // Validation logic per step
  const validateCurrentStep = useCallback((): { isValid: boolean; errorMessage?: string } => {
    if (currentStepIndex === 0) {
      // Basic Info Step
      if (!formData.title || formData.title.trim().length < (contentType === 'POLL' ? 5 : 3)) {
        return {
          isValid: false,
          errorMessage:
            contentType === 'POLL'
              ? 'Poll question must be at least 5 characters.'
              : 'Announcement headline must be at least 3 characters.',
        };
      }
      if (contentType === 'NOTICE' && (!formData.description || formData.description.trim().length < 5)) {
        return {
          isValid: false,
          errorMessage: 'Announcement details must be at least 5 characters.',
        };
      }
      return { isValid: true };
    }

    if (currentStepIndex === 1) {
      // Audience Step
      if (formData.targetType === 'SPECIFIC_ROLE' && !formData.selectedRoleId) {
        return { isValid: false, errorMessage: 'Please select a specific role.' };
      }
      if (formData.targetType === 'SPECIFIC_RESIDENT' && !formData.selectedUserId) {
        return { isValid: false, errorMessage: 'Please select a specific resident.' };
      }
      return { isValid: true };
    }

    if (currentStepIndex === 2) {
      // Schedule Step
      if (!formData.publishNow && formData.scheduleDate) {
        const scheduleTime = new Date(formData.scheduleDate).getTime();
        if (isNaN(scheduleTime)) {
          return { isValid: false, errorMessage: 'Invalid schedule date.' };
        }
        if (formData.expiryDate) {
          const expiryTime = new Date(formData.expiryDate).getTime();
          if (expiryTime <= scheduleTime) {
            return {
              isValid: false,
              errorMessage:
                contentType === 'POLL'
                  ? 'Poll closing date must be after scheduled start date.'
                  : 'Expiry date must be after schedule date.',
            };
          }
        }
      }
      return { isValid: true };
    }

    if (currentStepIndex === 3) {
      // Type-Specific Configuration
      if (contentType === 'POLL') {
        const validOptions = formData.options
          .map((o) => o.trim())
          .filter((o) => o.length > 0);

        if (validOptions.length < 2) {
          return { isValid: false, errorMessage: 'Please provide at least 2 non-empty options.' };
        }
        const uniqueSet = new Set(validOptions.map((o) => o.toLowerCase()));
        if (uniqueSet.size !== validOptions.length) {
          return { isValid: false, errorMessage: 'All poll options must be unique.' };
        }
      }
      return { isValid: true };
    }

    return { isValid: true };
  }, [currentStepIndex, contentType, formData]);

  // Step advancement
  const goNext = useCallback(() => {
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      return validation;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      dispatch(setStepIndex(nextIndex));
      // If advancing into the Review step (step 4), fetch preview from backend
      if (nextIndex === steps.length - 1) {
        dispatch(fetchEngagementPreview());
      }
    }
    return { isValid: true };
  }, [validateCurrentStep, currentStepIndex, steps.length, dispatch]);

  const goBack = useCallback(() => {
    dispatch(previousStep());
  }, [dispatch]);

  const goToStepIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        dispatch(setStepIndex(index));
        if (index === steps.length - 1) {
          dispatch(fetchEngagementPreview());
        }
      }
    },
    [steps.length, dispatch]
  );

  // Submissions
  const saveDraft = useCallback(async () => {
    return dispatch(submitEngagementContent('Draft')).unwrap();
  }, [dispatch]);

  const publishOrSchedule = useCallback(async () => {
    const override = formData.publishNow ? 'Published' : 'Scheduled';
    return dispatch(submitEngagementContent(override)).unwrap();
  }, [dispatch, formData.publishNow]);

  const refreshPreview = useCallback(() => {
    dispatch(fetchEngagementPreview());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetWizard());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearEngagementError());
  }, [dispatch]);

  const clearSuccess = useCallback(() => {
    dispatch(clearEngagementSuccess());
  }, [dispatch]);

  return {
    contentType,
    formData,
    steps,
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    previewData,
    loading,
    previewLoading,
    submitting,
    error,
    success,
    createdResult,

    // Actions
    selectType,
    setField,
    setFields,
    validateCurrentStep,
    goNext,
    goBack,
    goToStepIndex,
    saveDraft,
    publishOrSchedule,
    refreshPreview,
    reset,
    clearError,
    clearSuccess,
  };
};

export default useCommunityEngagementWizard;
