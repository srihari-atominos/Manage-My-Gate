import React, { useState, useEffect, useMemo } from 'react';
import { View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Amenity, MaintenanceTask } from '../../store/amenitySlice';
import { MaintenanceFlowHeader } from './MaintenanceFlowHeader';
import { MaintenanceStepIndicator, MaintenanceStepItem } from './MaintenanceStepIndicator';
import { MaintenanceFlowFooter } from './MaintenanceFlowFooter';
import { MaintenanceScopeStep } from './steps/MaintenanceScopeStep';
import { MaintenanceScheduleStep } from './steps/MaintenanceScheduleStep';
import { MaintenanceReviewStep } from './steps/MaintenanceReviewStep';
import { MaintenanceFormData } from '../MaintenanceModal';

export interface MaintenanceWizardProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amenityId: string, formData: MaintenanceFormData) => Promise<void> | void;
  amenities: Amenity[];
  initialData?: MaintenanceTask | null;
  initialAmenityId?: string | null;
  loading?: boolean;
}

const WIZARD_STEPS: MaintenanceStepItem[] = [
  { key: 'scope', title: 'Scope & Type', subtitle: 'Define maintenance purpose & assigned staff' },
  { key: 'schedule', title: 'Date & Time', subtitle: 'Set operating schedule and timing window' },
  { key: 'review', title: 'Review & Confirm', subtitle: 'Review specifications and confirm upkeep' },
];

export const MaintenanceWizard: React.FC<MaintenanceWizardProps> = ({
  visible,
  onClose,
  onSubmit,
  amenities,
  initialData,
  initialAmenityId,
  loading = false,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepError, setStepError] = useState<string | null>(null);

  // Form State
  const [amenityId, setAmenityId] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState<string>('CLEANING');
  const [title, setTitle] = useState<string>('');
  const [assignedStaff, setAssignedStaff] = useState<string>('Facilities Team');
  const [description, setDescription] = useState<string>('');

  // Schedule State
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [frequency, setFrequency] = useState<string>('WEEKLY');
  const [interval, setInterval] = useState<number>(1);
  const [occurrenceCount, setOccurrenceCount] = useState<number>(8);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [isOngoing, setIsOngoing] = useState<boolean>(true);

  // Review State
  const [autoCancelBookings, setAutoCancelBookings] = useState<boolean>(true);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      setStepError(null);

      const targetId =
        initialAmenityId ||
        initialData?.amenityId ||
        (amenities.length > 0 ? amenities[0]._id : '');
      setAmenityId(targetId);

      const todayStr = new Date().toISOString().slice(0, 10);

      if (initialData) {
        setTitle(initialData.title || initialData.reason || '');
        setMaintenanceType(initialData.maintenanceType || 'CLEANING');
        setAssignedStaff(initialData.assignedStaff || 'Facilities Team');
        setDescription(initialData.description || '');
        setIsRecurring(Boolean(initialData.isRecurring || initialData.recurringSeriesId));
        setStartDate(initialData.startDate || todayStr);
        setEndDate(initialData.endDate || initialData.startDate || todayStr);
        setStartTime(initialData.startTime || '00:00');
        setEndTime(initialData.endTime || '17:00');
        setAutoCancelBookings(initialData.autoCancelBookings !== false);
        const initOccurrences = (initialData as any)?.occurrenceCount;
        if (initOccurrences && initOccurrences < 50) {
          setIsOngoing(false);
          setOccurrenceCount(initOccurrences);
        } else {
          setIsOngoing(true);
          setOccurrenceCount(8);
        }
      } else {
        setTitle('Routine Cleaning & Servicing');
        setMaintenanceType('CLEANING');
        setAssignedStaff('Facilities Team');
        setDescription('');
        setIsRecurring(false);
        setStartDate(todayStr);
        setEndDate(todayStr);
        setStartTime('00:00');
        setEndTime('17:00');
        setFrequency('WEEKLY');
        setInterval(1);
        setOccurrenceCount(8);
        setSelectedDays([1]);
        setIsOngoing(true);
        setAutoCancelBookings(true);
      }
    }
  }, [visible, initialData, initialAmenityId, amenities]);

  const selectedFacility = useMemo(() => {
    return amenities.find((a) => String(a._id) === String(amenityId));
  }, [amenities, amenityId]);

  const handleToggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validateStep = (index: number): boolean => {
    setStepError(null);
    if (index === 0) {
      if (!title.trim()) {
        setStepError('Please enter a maintenance title');
        return false;
      }
      if (!amenityId) {
        setStepError('Please select a target facility');
        return false;
      }
    }
    if (index === 1) {
      if (!startDate) {
        setStepError('Please select a start date');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(currentStepIndex)) return;

    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Final Submit
      const effectiveOccurrences = isOngoing
        ? frequency === 'DAILY'
          ? 30
          : frequency === 'WEEKLY'
          ? 52
          : frequency === 'MONTHLY'
          ? 12
          : 5
        : occurrenceCount;

      const formData: MaintenanceFormData = {
        amenityId,
        title: title.trim(),
        maintenanceType: maintenanceType as any,
        startDate,
        endDate: endDate || startDate,
        startTime,
        endTime,
        description: description.trim(),
        assignedStaff: assignedStaff.trim(),
        isRecurring,
        frequency: frequency as any,
        interval,
        occurrenceCount: effectiveOccurrences,
        selectedDays,
        dayOfMonth: 1,
        isCompleteClosure: true, // Complete facility closure is silently true in background
        autoCancelBookings,
        isOngoing,
        windows: [
          {
            id: '1',
            startDate,
            endDate: endDate || startDate,
            startTime,
            endTime,
          },
        ],
      };

      await onSubmit(amenityId, formData);
    }
  };

  const handleBack = () => {
    setStepError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Step Flow Header */}
        <MaintenanceFlowHeader
          category={selectedFacility?.category || selectedFacility?.type || 'FACILITY'}
          stepTitle={currentStep.title}
          stepSubtitle={currentStep.subtitle}
          onBack={isFirstStep ? undefined : handleBack}
          onCancel={onClose}
          canGoBack={!isFirstStep}
        />

        {/* Step Indicator */}
        <MaintenanceStepIndicator
          steps={WIZARD_STEPS}
          currentStepIndex={currentStepIndex}
        />

        {/* Wizard Step Body */}
        <View className="flex-1 px-4 pt-2">
          {currentStep.key === 'scope' && (
            <MaintenanceScopeStep
              amenities={amenities}
              selectedAmenityId={amenityId}
              onSelectAmenity={setAmenityId}
              maintenanceType={maintenanceType}
              onSelectType={setMaintenanceType}
              title={title}
              onChangeTitle={setTitle}
              assignedStaff={assignedStaff}
              onChangeStaff={setAssignedStaff}
              description={description}
              onChangeDescription={setDescription}
              error={stepError}
              isEditing={Boolean(initialData)}
            />
          )}

          {currentStep.key === 'schedule' && (
            <MaintenanceScheduleStep
              isRecurring={isRecurring}
              onToggleRecurring={setIsRecurring}
              startDate={startDate}
              onChangeStartDate={setStartDate}
              endDate={endDate}
              onChangeEndDate={setEndDate}
              startTime={startTime}
              onChangeStartTime={setStartTime}
              endTime={endTime}
              onChangeEndTime={setEndTime}
              frequency={frequency}
              onChangeFrequency={setFrequency}
              interval={interval}
              onChangeInterval={setInterval}
              occurrenceCount={occurrenceCount}
              onChangeOccurrences={setOccurrenceCount}
              selectedDays={selectedDays}
              onToggleDay={handleToggleDay}
              isOngoing={isOngoing}
              onToggleOngoing={setIsOngoing}
            />
          )}

          {currentStep.key === 'review' && (
            <MaintenanceReviewStep
              facility={selectedFacility}
              title={title}
              maintenanceType={maintenanceType}
              assignedStaff={assignedStaff}
              description={description}
              isRecurring={isRecurring}
              startDate={startDate}
              endDate={endDate}
              startTime={startTime}
              endTime={endTime}
              frequency={frequency}
              occurrenceCount={occurrenceCount}
              selectedDays={selectedDays}
              autoCancelBookings={autoCancelBookings}
              onToggleAutoCancel={setAutoCancelBookings}
              isOngoing={isOngoing}
            />
          )}
        </View>

        {/* Step Footer */}
        <MaintenanceFlowFooter
          onBack={isFirstStep ? undefined : handleBack}
          onNext={handleNext}
          canGoBack={!isFirstStep}
          isLastStep={isLastStep}
          loading={loading}
          nextLabel={
            isLastStep
              ? initialData
                ? 'Save Changes'
                : 'Confirm & Schedule Upkeep'
              : currentStepIndex === 0
              ? 'Continue to Schedule'
              : 'Continue to Review'
          }
        />
      </View>
    </Modal>
  );
};

export default MaintenanceWizard;
