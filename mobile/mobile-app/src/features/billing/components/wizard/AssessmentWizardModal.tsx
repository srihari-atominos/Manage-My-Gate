import React, { useState, useCallback } from 'react';
import { View, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { AssessmentFlowHeader } from './AssessmentFlowHeader';
import { AssessmentStepIndicator, AssessmentStepDef } from './AssessmentStepIndicator';
import { AssessmentFlowFooter } from './AssessmentFlowFooter';

// Steps
import { AssessmentTypeStep } from './steps/AssessmentTypeStep';
import { AssessmentScheduleStep } from './steps/AssessmentScheduleStep';
import { AssessmentCalculationStep } from './steps/AssessmentCalculationStep';
import { AssessmentTargetScopeStep } from './steps/AssessmentTargetScopeStep';
import { AssessmentReviewStep } from './steps/AssessmentReviewStep';

import { useAssessmentForm } from '../../hooks/useAssessmentForm';

interface AssessmentWizardModalProps {
  visible: boolean;
  communityId?: string;
  assessment?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const WIZARD_STEPS: AssessmentStepDef[] = [
  { key: 'type', title: 'Rule Identity' },
  { key: 'schedule', title: 'Schedule & Cycle' },
  { key: 'calculation', title: 'Calculation Formula' },
  { key: 'scope', title: 'Target Scope & Roles' },
  { key: 'review', title: 'Review & Activate' },
];

export const AssessmentWizardModal: React.FC<AssessmentWizardModalProps> = ({
  visible,
  communityId,
  assessment,
  onClose,
  onSuccess,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const {
    name,
    setName,
    type,
    setType,
    billingCycle,
    setBillingCycle,
    selectedDays,
    handleToggleDay,
    genDayOption,
    setGenDayOption,
    customDay,
    setCustomDay,
    triggerMode,
    setTriggerMode,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    collectionMethod,
    setCollectionMethod,
    totalInstallments,
    setTotalInstallments,
    calcMethod,
    setCalcMethod,
    flatAmount,
    setFlatAmount,
    ratePerSqFt,
    setRatePerSqFt,
    tieredRates,
    handleTieredRate,
    scopeType,
    setScopeType,
    checkedRoles,
    handleToggleRole,
    roles,
    roleNamesMap,
    selectedIds,
    handleToggleId,
    handleSelectAll,
    handleDeselectAll,
    selectedUnitTypes,
    handleToggleUnitType,
    scopeRows,
    searchQuery,
    setSearchQuery,
    rawVillas,
    units,
    filteredUnits,
    availableBlocks,
    availableUnitTypes,
    handleToggleBlockPreset,
    handleToggleTypePreset,
    isBlockFullySelected,
    isTypeFullySelected,
    formError,
    setFormError,
    isSubmitting,
    resetForm,
    submitAssessmentRule,
  } = useAssessmentForm({ communityId, assessment });

  const handleModalClose = useCallback(() => {
    resetForm();
    setCurrentStepIndex(0);
    onClose();
  }, [resetForm, onClose]);

  const handleNextStep = useCallback(async () => {
    if (isSubmitting) return;
    setFormError(null);

    // Step 1 Validation
    if (currentStepIndex === 0) {
      if (!name.trim()) {
        setFormError('Please enter an assessment rule title.');
        return;
      }
    }

    // Step 2 Validation
    if (currentStepIndex === 1) {
      const isCapitalRepair = type === 'CAPITAL_REPAIR';
      const isRecurring = type === 'RECURRING' || (isCapitalRepair && collectionMethod === 'INSTALLMENT');

      if (isRecurring && billingCycle === 'WEEKLY' && selectedDays.length === 0) {
        setFormError('Please select at least one day of the week for weekly billing.');
        return;
      }
      if (isRecurring && billingCycle !== 'WEEKLY' && genDayOption === 'CUSTOM') {
        const num = Number(customDay);
        if (isNaN(num) || num < 1 || num > 28) {
          setFormError('Generation day must be a number between 1 and 28.');
          return;
        }
      }
      if (isCapitalRepair && collectionMethod === 'INSTALLMENT') {
        const num = Number(totalInstallments);
        if (isNaN(num) || num < 2) {
          setFormError('Minimum 2 installments required for installment plan.');
          return;
        }
      }
      if (type === 'ONE_TIME' && triggerMode === 'SCHEDULED') {
        if (!scheduledDate) {
          setFormError('Please select a scheduled date.');
          return;
        }
      }
    }

    // Step 3 Validation
    if (currentStepIndex === 2) {
      if (calcMethod === 'FLAT_RATE') {
        const num = Number(flatAmount);
        if (isNaN(num) || num <= 0) {
          setFormError('Please enter a valid flat amount greater than 0.');
          return;
        }
      }
      if (calcMethod === 'PER_SQ_FT') {
        const num = Number(ratePerSqFt);
        if (isNaN(num) || num <= 0) {
          setFormError('Please enter a valid rate per square foot greater than 0.');
          return;
        }
      }
    }

    // Step 4 Validation
    if (currentStepIndex === 3) {
      if (checkedRoles.length === 0) {
        setFormError('Please select at least one resident role to receive invoices.');
        return;
      }
      if (['VILLA_BLOCK', 'SPECIFIC_UNITS', 'SPECIFIC_USERS'].includes(scopeType) && selectedIds.length === 0) {
        setFormError('Please select at least one item from the target scope checklist.');
        return;
      }
    }

    // Final Step 5 Submission
    if (currentStepIndex === 4) {
      const success = await submitAssessmentRule();
      if (success) {
        handleModalClose();
        onSuccess();
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Assessment Rule Created!',
            `Successfully created maintenance assessment rule '${name.trim()}'.`
          );
        }
      }
      return;
    }

    // Advance to next step
    setCurrentStepIndex((prev) => prev + 1);
  }, [
    currentStepIndex,
    name,
    type,
    billingCycle,
    selectedDays,
    genDayOption,
    customDay,
    collectionMethod,
    totalInstallments,
    triggerMode,
    scheduledDate,
    calcMethod,
    flatAmount,
    ratePerSqFt,
    checkedRoles,
    scopeType,
    selectedIds,
    setFormError,
    submitAssessmentRule,
    name,
    isSubmitting,
    handleModalClose,
    onSuccess,
  ]);

  const handleBackStep = useCallback(() => {
    setFormError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      handleModalClose();
    }
  }, [currentStepIndex, handleModalClose, setFormError]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
  const currentStepTitle = WIZARD_STEPS[currentStepIndex]?.title || '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleModalClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-card border-t border-border rounded-t-3xl max-h-[94%] shadow-2xl overflow-hidden flex-col">
          {/* Header */}
          <AssessmentFlowHeader
            stepTitle={currentStepTitle}
            currentStep={currentStepIndex}
            totalSteps={WIZARD_STEPS.length}
            onBack={handleBackStep}
            onCancel={handleModalClose}
          />

          {/* Progress Bar Indicator */}
          <AssessmentStepIndicator steps={WIZARD_STEPS} currentStepIndex={currentStepIndex} />

          {/* Form Content Area */}
          <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
            {formError ? (
              <View className="mb-4">
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
              </View>
            ) : null}

            {currentStepIndex === 0 && (
              <AssessmentTypeStep
                name={name}
                onChangeName={setName}
                type={type}
                onChangeType={setType}
              />
            )}

            {currentStepIndex === 1 && (
              <AssessmentScheduleStep
                type={type}
                billingCycle={billingCycle}
                onChangeBillingCycle={setBillingCycle}
                genDayOption={genDayOption}
                onChangeGenDayOption={setGenDayOption}
                customDay={customDay}
                onChangeCustomDay={setCustomDay}
                selectedDays={selectedDays}
                onToggleDay={handleToggleDay}
                triggerMode={triggerMode}
                onChangeTriggerMode={setTriggerMode}
                scheduledDate={scheduledDate}
                onChangeScheduledDate={setScheduledDate}
                scheduledTime={scheduledTime}
                onChangeScheduledTime={setScheduledTime}
                collectionMethod={collectionMethod}
                onChangeCollectionMethod={setCollectionMethod}
                totalInstallments={totalInstallments}
                onChangeTotalInstallments={setTotalInstallments}
              />
            )}

            {currentStepIndex === 2 && (
              <AssessmentCalculationStep
                calcMethod={calcMethod}
                onChangeCalcMethod={setCalcMethod}
                flatAmount={flatAmount}
                onChangeFlatAmount={setFlatAmount}
                ratePerSqFt={ratePerSqFt}
                onChangeRatePerSqFt={setRatePerSqFt}
                tieredRates={tieredRates}
                onChangeTieredRate={handleTieredRate}
              />
            )}

            {currentStepIndex === 3 && (
              <AssessmentTargetScopeStep
                scopeType={scopeType}
                onChangeScopeType={setScopeType}
                roles={roles}
                checkedRoles={checkedRoles}
                onToggleRole={handleToggleRole}
                scopeRows={scopeType === 'SPECIFIC_UNITS' ? filteredUnits : scopeRows}
                selectedIds={selectedIds}
                onToggleId={handleToggleId}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                availableBlocks={availableBlocks}
                availableUnitTypes={availableUnitTypes}
                onToggleBlockPreset={handleToggleBlockPreset}
                onToggleTypePreset={handleToggleTypePreset}
                isBlockFullySelected={isBlockFullySelected}
                isTypeFullySelected={isTypeFullySelected}
                totalUnitsCount={units.length}
              />
            )}

            {currentStepIndex === 4 && (
              <AssessmentReviewStep
                name={name}
                type={type}
                billingCycle={billingCycle}
                genDayOption={genDayOption}
                customDay={customDay}
                selectedDays={selectedDays}
                triggerMode={triggerMode}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                collectionMethod={collectionMethod}
                totalInstallments={totalInstallments}
                calcMethod={calcMethod}
                flatAmount={flatAmount}
                ratePerSqFt={ratePerSqFt}
                tieredRates={tieredRates}
                scopeType={scopeType}
                checkedRoles={checkedRoles}
                roleNamesMap={roleNamesMap}
                selectedIds={selectedIds}
                selectedUnitTypes={selectedUnitTypes}
              />
            )}

            <View className="h-8" />
          </ScrollView>

          {/* Sticky Footer */}
          <AssessmentFlowFooter
            onBack={handleBackStep}
            onNext={handleNextStep}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            loading={isSubmitting}
          />
        </View>
      </View>
    </Modal>
  );
};

export default AssessmentWizardModal;
