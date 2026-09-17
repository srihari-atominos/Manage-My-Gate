import React, { useState, useEffect, useMemo } from 'react';
import { View, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmenityArchetype } from '../../types/amenityDomain.types';
import {
  CREATION_STEP_DEFINITIONS,
  CreationStepMeta,
  DEFAULT_ARCHETYPE_CATEGORIES,
} from '../../constants/amenityCatalogPresets';
import {
  AmenityCreationFormState,
  mapAmenityCreationPayloadStrategy,
} from '../../utils/mapAmenityCreationPayloadStrategy';
import { generateFacilityCode } from '../../services/amenityManagementService';

// Flow Controls
import { AmenityCreationFlowHeader } from './AmenityCreationFlowHeader';
import { AmenityCreationStepIndicator } from './AmenityCreationStepIndicator';
import { AmenityCreationFlowFooter } from './AmenityCreationFlowFooter';

// Steps
import {
  BasicFacilityInfoStep,
  OperatingScheduleStep,
  SharedCapacityConfigStep,
  ExclusiveHourlyConfigStep,
  EventSpaceConfigStep,
  RoomResourceConfigStep,
  InventoryToolsConfigStep,
  PricingAndPolicyStep,
  AmenityCreationReviewStep,
} from './steps';

export interface AmenityCreationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<any> | void;
  onSaveDraft?: (payload: any) => Promise<any> | void;
  amenity?: any;
  loading?: boolean;
  savingDraft?: boolean;
  initialArchetype?: AmenityArchetype;
}

export const AmenityCreationWizard: React.FC<AmenityCreationWizardProps> = ({
  visible,
  onClose,
  onSubmit,
  onSaveDraft,
  amenity,
  loading = false,
  savingDraft = false,
  initialArchetype = 'SHARED_CAPACITY',
}) => {
  const isEditing = Boolean(amenity && (amenity._id || amenity.id));

  // Active Archetype
  const [selectedArchetype, setSelectedArchetype] = useState<AmenityArchetype>(
    amenity?.archetype || initialArchetype
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Unified Form State
  const [form, setForm] = useState<AmenityCreationFormState>({
    name: '',
    code: generateFacilityCode('FACILITY'),
    archetype: initialArchetype,
    category: DEFAULT_ARCHETYPE_CATEGORIES[initialArchetype] || 'General',
    location: '',
    status: 'active',
    imageUrl: '',
    description: '',
    openTime: '06:00',
    closeTime: '22:00',
    openDays: [0, 1, 2, 3, 4, 5, 6],
    maxCapacity: 50,
    maxHeadcountPerReservation: 2,
    slotDurationMinutes: 60,
    bufferTimeMinutes: 0,
    advanceBookingDays: 7,
    advanceNoticeHours: 72,
    requiresApproval: false,
    isMultiResourceFacility: false,
    subRooms: [{ id: 'room-1', name: 'Conference Suite A', capacity: 10 }],
    roomAmenities: ['wifi', 'projector'],
    availableStock: 5,
    maxLoanHours: 24,
    requiresInspection: true,
    pricingType: 'FREE',
    baseRate: 0,
    securityDeposit: 0,
    securityDepositDescription: '',
    isCancellationAllowed: true,
    refundCutoffHours: 24,
    refundPercentage: 100,
  });

  // Hydrate when editing
  useEffect(() => {
    if (amenity) {
      const rawArchetype: AmenityArchetype =
        amenity.archetype ||
        (amenity.type === 'Sports' ? 'EXCLUSIVE_HOURLY' : 'SHARED_CAPACITY');
      setSelectedArchetype(rawArchetype);

      const rawPricingType =
        amenity.pricingConfig?.type ||
        amenity.pricingConfig?.pricingType ||
        amenity.pricing?.pricingType ||
        (amenity.bookingFee ? 'HOURLY' : 'FREE');

      const img =
        amenity.imageUrl ||
        (Array.isArray(amenity.images) && amenity.images.length > 0
          ? amenity.images[0]
          : '');

      setForm({
        name: amenity.name || '',
        code: amenity.code || generateFacilityCode(amenity.name || 'FACILITY'),
        archetype: rawArchetype,
        category: amenity.category || amenity.type || 'General',
        location: amenity.location || '',
        status: (amenity.status || 'active').toLowerCase() as any,
        imageUrl: img,
        description: amenity.description || '',
        openTime:
          amenity.operatingHours?.[0]?.opensAt ||
          amenity.operatingHours?.[0]?.openTime ||
          amenity.openTime ||
          '06:00',
        closeTime:
          amenity.operatingHours?.[0]?.closesAt ||
          amenity.operatingHours?.[0]?.closeTime ||
          amenity.closeTime ||
          '22:00',
        openDays: amenity.openDays || [0, 1, 2, 3, 4, 5, 6],
        maxCapacity: amenity.maxCapacity || amenity.capacity || 50,
        maxHeadcountPerReservation:
          amenity.maxHeadcountPerReservation ||
          amenity.maxBookingsPerUserPerSlot ||
          2,
        slotDurationMinutes:
          amenity.slotDurationMinutes ||
          amenity.bookingRules?.slotDurationMinutes ||
          60,
        bufferTimeMinutes:
          amenity.setupBufferMinutes ||
          amenity.bufferTimeMinutes ||
          amenity.bookingRules?.bufferTimeMinutes ||
          0,
        advanceBookingDays:
          amenity.bookingRules?.maxAdvanceBookingDays ||
          amenity.bookingRules?.advanceBookingDays ||
          7,
        advanceNoticeHours:
          amenity.bookingRules?.minNoticeHours ||
          amenity.minNoticeHours ||
          72,
        requiresApproval:
          amenity.bookingRules?.requiresApproval ??
          amenity.requiresApproval ??
          false,
        isMultiResourceFacility: amenity.isMultiResourceFacility || false,
        subRooms: amenity.subRooms || [
          { id: 'room-1', name: 'Conference Suite A', capacity: 10 },
        ],
        roomAmenities: amenity.roomAmenities || ['wifi', 'projector'],
        availableStock: amenity.availableStock || amenity.maxCapacity || 5,
        maxLoanHours: amenity.maxLoanHours || 24,
        requiresInspection: amenity.requiresInspection ?? true,
        pricingType: (rawPricingType.toUpperCase() as any) || 'FREE',
        baseRate:
          amenity.pricingConfig?.baseRate ??
          amenity.pricing?.baseRate ??
          amenity.bookingFee ??
          0,
        securityDeposit:
          amenity.pricingConfig?.securityDeposit ??
          amenity.pricingConfig?.depositAmount ??
          amenity.pricing?.securityDeposit ??
          0,
        securityDepositDescription:
          amenity.pricing?.securityDepositDescription || '',
        isCancellationAllowed:
          amenity.cancellationPolicy?.isAllowed ??
          amenity.bookingRules?.isCancellationEnabled ??
          true,
        refundCutoffHours:
          amenity.cancellationPolicy?.refundCutoffHours ?? 24,
        refundPercentage:
          amenity.cancellationPolicy?.refundPercentage ?? 100,
      });
    } else {
      let defaultPricing: any = 'FREE';
      if (initialArchetype === 'EXCLUSIVE_HOURLY' || initialArchetype === 'ROOM_RESOURCE') {
        defaultPricing = 'HOURLY';
      } else if (initialArchetype === 'EVENT_SPACE') {
        defaultPricing = 'DAILY';
      }

      setSelectedArchetype(initialArchetype);
      setCurrentStepIndex(0);
      setForm((prev) => ({
        ...prev,
        archetype: initialArchetype,
        pricingType: defaultPricing,
        requiresApproval: initialArchetype === 'EVENT_SPACE',
        code: generateFacilityCode('FACILITY'),
      }));
    }
  }, [amenity, initialArchetype, visible]);

  // Dynamic Step List based on Selected Archetype
  const steps: CreationStepMeta[] = useMemo(() => {
    return (
      CREATION_STEP_DEFINITIONS[selectedArchetype] ||
      CREATION_STEP_DEFINITIONS.SHARED_CAPACITY
    );
  }, [selectedArchetype]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Step Validation Guard
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Basic Info
    if (currentStep.key === 'info') {
      if (!form.name.trim()) errors.name = 'Facility name is required';
      if (!form.code.trim()) errors.code = 'Facility code is required';
      if (!form.location.trim()) errors.location = 'Location / Zone is required to publish';
    }

    // 2. Schedule
    if (currentStep.key === 'schedule') {
      if (!form.openTime.trim()) {
        errors.openTime = 'Open time is required';
      } else if (!/^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.openTime)) {
        errors.openTime = 'Invalid time format (HH:MM)';
      }

      if (!form.closeTime.trim()) {
        errors.closeTime = 'Close time is required';
      } else if (!/^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.closeTime)) {
        errors.closeTime = 'Invalid time format (HH:MM)';
      }

      if (
        form.openTime &&
        form.closeTime &&
        /^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.openTime) &&
        /^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.closeTime)
      ) {
        const [oh, om] = form.openTime.split(':').map(Number);
        const [ch, cm] = form.closeTime.split(':').map(Number);
        if (oh * 60 + om >= ch * 60 + cm) {
          errors.closeTime = 'Closing time must be after opening time';
          Alert.alert('Invalid Schedule', 'Closing time must be strictly after opening time.');
        }
      }

      if (form.openDays.length === 0) {
        errors.openDays = 'Please select at least 1 active day';
        Alert.alert('Validation Error', 'Please select at least one active day of the week.');
      }
    }

    // 3. Adaptive Specs
    if (currentStep.key === 'capacity-rules') {
      if (!form.maxCapacity || Number(form.maxCapacity) < 1) {
        errors.maxCapacity = 'Capacity must be at least 1';
      }
      if (
        form.maxHeadcountPerReservation &&
        Number(form.maxHeadcountPerReservation) > Number(form.maxCapacity || 50)
      ) {
        errors.maxHeadcountPerReservation = 'Quota cannot exceed total capacity';
      }
      if (
        form.maxHeadcountPerReservation &&
        Number(form.maxHeadcountPerReservation) < 1
      ) {
        errors.maxHeadcountPerReservation = 'Quota must be at least 1';
      }
    }
    if (currentStep.key === 'court-slots') {
      if (!form.slotDurationMinutes || Number(form.slotDurationMinutes) < 15) {
        errors.slotDurationMinutes = 'Slot duration must be at least 15 minutes';
      }
      if (!form.advanceBookingDays || Number(form.advanceBookingDays) < 1) {
        errors.advanceBookingDays = 'Advance booking window must be at least 1 day';
      }
    }
    if (currentStep.key === 'event-rules') {
      if (!form.maxCapacity || Number(form.maxCapacity) < 1) {
        errors.maxCapacity = 'Hall capacity must be at least 1';
      }
      if (
        form.advanceNoticeHours !== undefined &&
        form.advanceNoticeHours !== '' &&
        Number(form.advanceNoticeHours) < 0
      ) {
        errors.advanceNoticeHours = 'Advance notice cannot be negative';
      }
    }
    if (currentStep.key === 'room-setup') {
      if (!form.slotDurationMinutes || Number(form.slotDurationMinutes) < 15) {
        errors.slotDurationMinutes = 'Slot duration must be at least 15 minutes';
      }
      if (form.isMultiResourceFacility && (!form.subRooms || form.subRooms.length === 0)) {
        errors.subRooms = 'At least one sub-room must be configured';
      }
    }
    if (currentStep.key === 'inventory-stock') {
      if (!form.availableStock || Number(form.availableStock) < 1) {
        errors.availableStock = 'Stock units must be at least 1';
      }
      if (!form.maxLoanHours || Number(form.maxLoanHours) < 1) {
        errors.maxLoanHours = 'Loan duration must be at least 1 hour';
      }
    }

    // 4. Pricing
    if (currentStep.key === 'pricing') {
      if (form.pricingType !== 'FREE') {
        if (
          form.baseRate === undefined ||
          form.baseRate === '' ||
          isNaN(Number(form.baseRate)) ||
          Number(form.baseRate) < 0
        ) {
          errors.baseRate = 'Please provide a valid non-negative rate';
        }
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Whole-Form Validation Guard (executed before final publish across all steps)
  const validateWholeForm = (): {
    isValid: boolean;
    errorStepIndex: number;
    message: string;
    errors: Record<string, string>;
  } => {
    // 1. Basic Info Check
    if (!form.name.trim()) {
      return {
        isValid: false,
        errorStepIndex: 0,
        message: 'Facility name is required before publishing',
        errors: { name: 'Facility name is required' },
      };
    }
    if (!form.code.trim()) {
      return {
        isValid: false,
        errorStepIndex: 0,
        message: 'Facility code is required before publishing',
        errors: { code: 'Facility code is required' },
      };
    }
    if (!form.location.trim()) {
      return {
        isValid: false,
        errorStepIndex: 0,
        message: 'Location / Zone is required to publish this facility',
        errors: { location: 'Location / Zone is required' },
      };
    }

    // 2. Schedule Check
    const schedIdx = steps.findIndex((s) => s.key === 'schedule');
    if (schedIdx !== -1) {
      if (!form.openTime.trim() || !/^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.openTime)) {
        return {
          isValid: false,
          errorStepIndex: schedIdx,
          message: 'Valid opening time (HH:MM) is required',
          errors: { openTime: 'Invalid open time format' },
        };
      }
      if (!form.closeTime.trim() || !/^([01]\d|2[0-3]):?([0-5]\d)$/.test(form.closeTime)) {
        return {
          isValid: false,
          errorStepIndex: schedIdx,
          message: 'Valid closing time (HH:MM) is required',
          errors: { closeTime: 'Invalid close time format' },
        };
      }
      const [oh, om] = form.openTime.split(':').map(Number);
      const [ch, cm] = form.closeTime.split(':').map(Number);
      if (oh * 60 + om >= ch * 60 + cm) {
        return {
          isValid: false,
          errorStepIndex: schedIdx,
          message: 'Closing time must be after opening time',
          errors: { closeTime: 'Closing time must be after opening time' },
        };
      }
      if (!form.openDays || form.openDays.length === 0) {
        return {
          isValid: false,
          errorStepIndex: schedIdx,
          message: 'Please select at least 1 active operating day',
          errors: { openDays: 'Active day required' },
        };
      }
    }

    // 3. Archetype Specs Check
    const specStep = steps.find((s) =>
      ['capacity-rules', 'court-slots', 'event-rules', 'room-setup', 'inventory-stock'].includes(
        s.key
      )
    );
    if (specStep) {
      const specIdx = steps.indexOf(specStep);
      if (specStep.key === 'capacity-rules') {
        if (!form.maxCapacity || Number(form.maxCapacity) < 1) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Facility capacity must be at least 1',
            errors: { maxCapacity: 'Capacity must be at least 1' },
          };
        }
        if (Number(form.maxHeadcountPerReservation) > Number(form.maxCapacity)) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Guest quota cannot exceed total capacity',
            errors: { maxHeadcountPerReservation: 'Quota cannot exceed capacity' },
          };
        }
      } else if (specStep.key === 'court-slots') {
        if (!form.slotDurationMinutes || Number(form.slotDurationMinutes) < 15) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Slot duration must be at least 15 minutes',
            errors: { slotDurationMinutes: 'Min 15 minutes' },
          };
        }
      } else if (specStep.key === 'event-rules') {
        if (!form.maxCapacity || Number(form.maxCapacity) < 1) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Event hall capacity must be at least 1',
            errors: { maxCapacity: 'Capacity must be at least 1' },
          };
        }
      } else if (specStep.key === 'room-setup') {
        if (!form.slotDurationMinutes || Number(form.slotDurationMinutes) < 15) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Slot duration must be at least 15 minutes',
            errors: { slotDurationMinutes: 'Min 15 minutes' },
          };
        }
        if (form.isMultiResourceFacility && (!form.subRooms || form.subRooms.length === 0)) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'At least one sub-room must be configured',
            errors: { subRooms: 'At least one sub-room required' },
          };
        }
      } else if (specStep.key === 'inventory-stock') {
        if (!form.availableStock || Number(form.availableStock) < 1) {
          return {
            isValid: false,
            errorStepIndex: specIdx,
            message: 'Available stock units must be at least 1',
            errors: { availableStock: 'Stock must be at least 1' },
          };
        }
      }
    }

    // 4. Pricing Check
    const pricingIdx = steps.findIndex((s) => s.key === 'pricing');
    if (pricingIdx !== -1) {
      if (form.pricingType !== 'FREE') {
        if (
          form.baseRate === undefined ||
          form.baseRate === '' ||
          isNaN(Number(form.baseRate)) ||
          Number(form.baseRate) < 0
        ) {
          return {
            isValid: false,
            errorStepIndex: pricingIdx,
            message: 'Please provide a valid non-negative base rate',
            errors: { baseRate: 'Valid rate required' },
          };
        }
      }
    }

    return { isValid: true, errorStepIndex: -1, message: '', errors: {} };
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (isLastStep) {
      const wholeFormCheck = validateWholeForm();
      if (!wholeFormCheck.isValid) {
        setCurrentStepIndex(wholeFormCheck.errorStepIndex);
        setStepErrors(wholeFormCheck.errors);
        Alert.alert('Required Field Missing', wholeFormCheck.message);
        return;
      }
      handleFinalSubmit();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStepErrors({});
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      onClose();
    }
  };

  const handleFinalSubmit = async () => {
    try {
      const payload = mapAmenityCreationPayloadStrategy(form, false);
      await onSubmit(payload);
    } catch (err: any) {
      console.error('Wizard submission failed', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!form.name.trim()) {
      Alert.alert('Facility Name Required', 'Please enter a facility name before saving as draft.');
      return;
    }
    try {
      const payload = mapAmenityCreationPayloadStrategy(form, true);
      if (onSaveDraft) {
        await onSaveDraft(payload);
      } else {
        await onSubmit(payload);
      }
    } catch (err: any) {
      console.error('Wizard draft save failed', err);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        {/* Step Header */}
        <AmenityCreationFlowHeader
          archetype={selectedArchetype}
          stepTitle={currentStep.title}
          stepSubtitle={currentStep.subtitle}
          stepIndex={currentStepIndex}
          totalSteps={steps.length}
          isEditing={isEditing}
          onBack={handleBack}
          onCancel={onClose}
        />

        {/* Step Indicator */}
        <AmenityCreationStepIndicator
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepPress={(idx) => {
            if (idx <= currentStepIndex) setCurrentStepIndex(idx);
          }}
        />

        {/* Dynamic Step Content */}
        <View className="flex-1">
          {currentStep.key === 'info' && (
            <BasicFacilityInfoStep
              data={{
                name: form.name,
                code: form.code,
                category: form.category,
                location: form.location,
                status: form.status,
                imageUrl: form.imageUrl,
                description: form.description,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'schedule' && (
            <OperatingScheduleStep
              data={{
                openTime: form.openTime,
                closeTime: form.closeTime,
                openDays: form.openDays,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'capacity-rules' && (
            <SharedCapacityConfigStep
              data={{
                maxCapacity: form.maxCapacity,
                maxHeadcountPerReservation: form.maxHeadcountPerReservation,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'court-slots' && (
            <ExclusiveHourlyConfigStep
              data={{
                slotDurationMinutes: form.slotDurationMinutes,
                bufferTimeMinutes: form.bufferTimeMinutes,
                advanceBookingDays: form.advanceBookingDays,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'event-rules' && (
            <EventSpaceConfigStep
              data={{
                maxCapacity: form.maxCapacity,
                requiresApproval: form.requiresApproval,
                advanceNoticeHours: form.advanceNoticeHours,
                advanceBookingDays: form.advanceBookingDays,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'room-setup' && (
            <RoomResourceConfigStep
              data={{
                isMultiResourceFacility: form.isMultiResourceFacility,
                slotDurationMinutes: form.slotDurationMinutes,
                subRooms: form.subRooms,
                roomAmenities: form.roomAmenities,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'inventory-stock' && (
            <InventoryToolsConfigStep
              data={{
                availableStock: form.availableStock ?? 5,
                maxLoanHours: form.maxLoanHours ?? 24,
                requiresInspection: form.requiresInspection ?? true,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'pricing' && (
            <PricingAndPolicyStep
              archetype={selectedArchetype}
              data={{
                pricingType: form.pricingType,
                baseRate: form.baseRate,
                securityDeposit: form.securityDeposit,
                isCancellationAllowed: form.isCancellationAllowed,
                refundCutoffHours: form.refundCutoffHours,
                refundPercentage: form.refundPercentage,
              }}
              onChange={(updated) => setForm((prev) => ({ ...prev, ...updated }))}
              errors={stepErrors as any}
            />
          )}

          {currentStep.key === 'review' && (
            <AmenityCreationReviewStep form={form} isEditing={isEditing} />
          )}
        </View>

        {/* Sticky Action Footer */}
        <AmenityCreationFlowFooter
          onBack={handleBack}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          loading={loading}
          savingDraft={savingDraft}
          isEditing={isEditing}
        />
      </SafeAreaView>
    </Modal>
  );
};

export default AmenityCreationWizard;
