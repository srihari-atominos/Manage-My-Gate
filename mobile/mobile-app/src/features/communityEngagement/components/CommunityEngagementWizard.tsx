import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { CommunityEngagementFlowHeader } from './CommunityEngagementFlowHeader';
import { CommunityEngagementStepIndicator } from './CommunityEngagementStepIndicator';
import { CommunityEngagementFlowFooter } from './CommunityEngagementFlowFooter';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { AudienceStep } from './steps/AudienceStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { NoticeConfigStep } from './steps/NoticeConfigStep';
import { PollConfigStep } from './steps/PollConfigStep';
import { ReviewPreviewStep } from './steps/ReviewPreviewStep';
import { useCommunityEngagementWizard } from '../hooks/useCommunityEngagementWizard';
import { EngagementContentType } from '../types/communityEngagement.types';

export interface CommunityEngagementWizardProps {
  initialType?: EngagementContentType;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const CommunityEngagementWizard: React.FC<CommunityEngagementWizardProps> = ({
  initialType = 'NOTICE',
  onClose,
  onSuccess,
}) => {
  const {
    contentType,
    formData,
    steps,
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    previewData,
    previewLoading,
    submitting,
    error,
    success,
    createdResult,
    selectType,
    setField,
    goNext,
    goBack,
    goToStepIndex,
    saveDraft,
    publishOrSchedule,
    reset,
    clearError,
  } = useCommunityEngagementWizard();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Initialize with initialType on mount
  useEffect(() => {
    selectType(initialType);
  }, [initialType, selectType]);

  // Handle successful submission
  useEffect(() => {
    if (success && createdResult) {
      if (onSuccess) {
        onSuccess(createdResult);
      }
      reset();
      onClose();
    }
  }, [success, createdResult, onSuccess, onClose, reset]);

  const handleNext = () => {
    setStepError(null);
    clearError();

    if (isLastStep) {
      // Final submit (Publish / Schedule)
      publishOrSchedule().catch((err) => {
        setStepError(err?.message || 'Failed to submit content');
      });
    } else {
      const result = goNext();
      if (!result.isValid && result.errorMessage) {
        setStepError(result.errorMessage);
      }
    }
  };

  const handleSaveDraft = async () => {
    setStepError(null);
    setSavingDraft(true);
    try {
      await saveDraft();
    } catch (err: any) {
      setStepError(err?.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleClose = () => {
    // If user filled in title or description, confirm exit
    if (formData.title.trim() || formData.description.trim()) {
      setCancelModalVisible(true);
    } else {
      reset();
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setCancelModalVisible(false);
    reset();
    onClose();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <View className="flex-1">
        {/* Stage 2 Locked Header (Static read-only type badge) */}
        <CommunityEngagementFlowHeader
          contentType={contentType}
          stepTitle={currentStep?.title || ''}
          stepSubtitle={currentStep?.subtitle}
          stepIndex={currentStepIndex}
          totalSteps={steps.length}
          onBack={goBack}
          onCancel={handleClose}
        />

        {/* Step Indicator Progress Bar */}
        <CommunityEngagementStepIndicator
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepPress={goToStepIndex}
        />

        {/* Active Step Content */}
        <View className="flex-1">
          {currentStepIndex === 0 && (
            <BasicInfoStep
              contentType={contentType}
              title={formData.title}
              description={formData.description}
              category={formData.category}
              priority={formData.priority}
              onChangeField={setField}
              error={stepError || error || undefined}
            />
          )}

          {currentStepIndex === 1 && (
            <AudienceStep
              contentType={contentType}
              targetType={formData.targetType}
              selectedRoleId={formData.selectedRoleId}
              selectedUserId={formData.selectedUserId}
              onChangeField={setField}
              error={stepError || error || undefined}
            />
          )}

          {currentStepIndex === 2 && (
            <ScheduleStep
              contentType={contentType}
              publishNow={formData.publishNow}
              scheduleDate={formData.scheduleDate}
              expiryDate={formData.expiryDate}
              isPinned={formData.isPinned}
              onChangeField={setField}
              error={stepError || error || undefined}
            />
          )}

          {currentStepIndex === 3 && (
            <>
              {contentType === 'NOTICE' ? (
                <NoticeConfigStep
                  allowComments={formData.allowComments}
                  allowReactions={formData.allowReactions}
                  requiresAcknowledgement={formData.requiresAcknowledgement}
                  isCritical={formData.isCritical}
                  images={formData.images}
                  onChangeField={setField}
                  error={stepError || error || undefined}
                />
              ) : (
                <PollConfigStep
                  options={formData.options}
                  choiceType={formData.choiceType}
                  maxChoices={formData.maxChoices}
                  votingMode={formData.votingMode}
                  resultsVisibility={formData.resultsVisibility}
                  isAnonymous={formData.isAnonymous}
                  quorumPercentage={formData.quorumPercentage}
                  onChangeField={setField}
                  error={stepError || error || undefined}
                />
              )}
            </>
          )}

          {currentStepIndex === 4 && (
            <ReviewPreviewStep
              formData={formData}
              previewData={previewData}
              previewLoading={previewLoading}
              error={stepError || error || undefined}
            />
          )}
        </View>

        {/* Wizard Footer Actions */}
        <CommunityEngagementFlowFooter
          onBack={goBack}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          loading={submitting}
          savingDraft={savingDraft}
          publishNow={formData.publishNow}
        />

        {/* Cancel Confirmation Dialog */}
        <ConfirmationModal
          visible={cancelModalVisible}
          title="Discard Content?"
          message="Are you sure you want to discard this content? Any unsaved inputs will be lost."
          variant="danger"
          confirmLabel="Discard"
          cancelLabel="Continue Editing"
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelModalVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default CommunityEngagementWizard;
