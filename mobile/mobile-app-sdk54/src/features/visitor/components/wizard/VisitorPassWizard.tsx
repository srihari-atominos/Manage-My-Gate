import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { VisitorPassFlowHeader } from '../shared/VisitorPassFlowHeader';
import { VisitorPassStepIndicator } from '../shared/VisitorPassStepIndicator';
import { VisitorPassFlowFooter } from '../shared/VisitorPassFlowFooter';
import { VisitorInvitationTypeSheet } from '../shared/VisitorInvitationTypeSheet';
import { GeneratedPassView, GeneratedPassData } from '../shared/GeneratedPassView';
import { PassTypeKey } from '../../mocks/visitorMocks';
import { mapFormToApiPayloadStrategy, PassPayloadContext } from '../../utils/mapFormToApiPayloadStrategy';
import { AlertCircle } from 'lucide-react-native';

// Step components
import { GuestDetailsStep, GuestDetailsData } from '../guest/GuestDetailsStep';
import { GuestScheduleStep, GuestScheduleData } from '../guest/GuestScheduleStep';
import { GuestPassOptionsStep, GuestPassOptionsData } from '../guest/GuestPassOptionsStep';
import { GuestPassReviewStep } from '../guest/GuestPassReviewStep';

import { GroupVisitDetailsStep, GroupVisitDetailsData } from '../group/GroupVisitDetailsStep';
import { GroupScheduleStep } from '../group/GroupScheduleStep';
import { GroupGuestItem } from '../group/AddGroupGuestsStep';
import { GroupPassReviewStep } from '../group/GroupPassReviewStep';

import { CabProviderStep } from '../cab/CabProviderStep';
import { CabVehicleStep, CabVehicleData } from '../cab/CabVehicleStep';
import { CabScheduleStep, CabScheduleData } from '../cab/CabScheduleStep';
import { CabPassReviewStep } from '../cab/CabPassReviewStep';

import { DeliveryPartnerStep } from '../delivery/DeliveryPartnerStep';
import { DeliveryDetailsStep, DeliveryDetailsData } from '../delivery/DeliveryDetailsStep';
import { DeliveryValidityStep, DeliveryValidityData } from '../delivery/DeliveryValidityStep';
import { DeliveryPassReviewStep } from '../delivery/DeliveryPassReviewStep';

import { StaffDetailsStep, StaffDetailsData } from '../service/StaffDetailsStep';
import { ServiceTypeStep } from '../service/ServiceTypeStep';
import { ServiceDateRangeStep, ServiceDateRangeData } from '../service/ServiceDateRangeStep';
import { ServiceWeekdayStep } from '../service/ServiceWeekdayStep';
import { ServiceTimeWindowStep, ServiceTimeWindowData } from '../service/ServiceTimeWindowStep';
import { ServicePassReviewStep } from '../service/ServicePassReviewStep';

const STEP_DEFINITIONS: Record<PassTypeKey, { key: string; title: string }[]> = {
  GUEST: [
    { key: 'details', title: 'Guest Details' },
    { key: 'schedule', title: 'Visit Schedule' },
    { key: 'options', title: 'Pass Options' },
    { key: 'review', title: 'Review Pass' },
  ],
  GROUP: [
    { key: 'event', title: 'Event Details' },
    { key: 'schedule', title: 'Event Schedule' },
    { key: 'review', title: 'Review Group Pass' },
  ],
  CAB: [
    { key: 'provider', title: 'Select Provider' },
    { key: 'vehicle', title: 'Vehicle Plate' },
    { key: 'schedule', title: 'Arrival Window' },
    { key: 'review', title: 'Review Cab Pass' },
  ],
  DELIVERY: [
    { key: 'partner', title: 'Delivery Partner' },
    { key: 'details', title: 'Order Details' },
    { key: 'validity', title: 'Pass Validity' },
    { key: 'review', title: 'Review Delivery Pass' },
  ],
  SERVICE: [
    { key: 'staff', title: 'Staff Details' },
    { key: 'category', title: 'Service Category' },
    { key: 'date-range', title: 'Date Range' },
    { key: 'weekdays', title: 'Allowed Days' },
    { key: 'time-slot', title: 'Daily Slot' },
    { key: 'review', title: 'Review Service Pass' },
  ],
};

interface VisitorPassWizardProps {
  initialType?: PassTypeKey;
  roleContext: PassPayloadContext;
  onSubmitPass: (payload: any) => Promise<any>;
  onClose: () => void;
  renderExtraStepHeader?: () => React.ReactNode;
}

export const VisitorPassWizard: React.FC<VisitorPassWizardProps> = ({
  initialType = 'GUEST',
  roleContext,
  onSubmitPass,
  onClose,
  renderExtraStepHeader,
}) => {
  const [selectedPassType, setSelectedPassType] = useState<PassTypeKey>(initialType);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedPass, setGeneratedPass] = useState<GeneratedPassData | null>(null);

  // Form states
  const [guestDetails, setGuestDetails] = useState<GuestDetailsData>({ visitorName: '', phone: '', purpose: '' });
  const [guestSchedule, setGuestSchedule] = useState<GuestScheduleData>({
    visitDate: new Date().toISOString().split('T')[0],
    timeSlot: 'NOW',
    customStartTime: '02:00 PM',
    customEndTime: '06:00 PM',
  });
  const [guestOptions, setGuestOptions] = useState<GuestPassOptionsData>({ entryMode: 'SINGLE', vehicleNo: '', gateInstructions: '' });

  const [groupDetails, setGroupDetails] = useState<GroupVisitDetailsData>({
    eventTitle: '',
    purpose: '',
    visitDate: new Date().toISOString().split('T')[0],
    timePreset: 'FULL_DAY',
    startTime: '07:00 AM',
    endTime: '11:59 PM',
    numberOfPasses: '10',
  });
  const [groupGuests, setGroupGuests] = useState<GroupGuestItem[]>([]);

  const [cabProvider, setCabProvider] = useState<string>('uber');
  const [customCabProvider, setCustomCabProvider] = useState<string>('');
  const [cabVehicle, setCabVehicle] = useState<CabVehicleData>({ vehicleNo: '', vehicleType: 'CAB', driverPhone: '' });
  const [cabSchedule, setCabSchedule] = useState<CabScheduleData>({
    usageType: 'ONE_TIME',
    arrivalWindow: 'IMMEDIATE',
    customVisitDate: new Date().toISOString().split('T')[0],
    customStartTime: '02:00 PM',
    customEndTime: '06:00 PM',
    selectedWeekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    timeSlots: [{ startTime: '07:30 AM', endTime: '09:00 AM' }],
  });

  const [deliveryPartner, setDeliveryPartner] = useState<string>('swiggy');
  const [customDeliveryPartner, setCustomDeliveryPartner] = useState<string>('');
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetailsData>({ orderId: '', packageCount: '1', deliveryAction: 'DOORSTEP', instructions: '' });
  const [deliveryValidity, setDeliveryValidity] = useState<DeliveryValidityData>({
    usageType: 'ONE_TIME',
    validityDuration: 'ONE_HOUR',
    customVisitDate: new Date().toISOString().split('T')[0],
    customStartTime: '02:00 PM',
    customEndTime: '06:00 PM',
    selectedWeekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    timeSlots: [{ startTime: '06:00 AM', endTime: '09:00 AM' }],
  });

  const [staffDetails, setStaffDetails] = useState<StaffDetailsData>({ staffName: '', phone: '', notes: '' });
  const [serviceCategory, setServiceCategory] = useState<string>('maid');
  const [serviceDateRange, setServiceDateRange] = useState<ServiceDateRangeData>({ startDate: new Date().toISOString().split('T')[0], endDate: '' });
  const [serviceWeekdays, setServiceWeekdays] = useState<string[]>([]);
  const [serviceTimeWindow, setServiceTimeWindow] = useState<ServiceTimeWindowData>({ preset: 'MORNING', startTime: '08:00 AM', endTime: '01:00 PM' });

  const steps = STEP_DEFINITIONS[selectedPassType];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    setSubmitError(null);
    if (selectedPassType === 'GUEST' && currentStepIndex === 0 && !guestDetails.visitorName.trim()) {
      setSubmitError('Please enter visitor name');
      return;
    }
    if (selectedPassType === 'GROUP' && currentStepIndex === 0 && !groupDetails.eventTitle.trim()) {
      setSubmitError('Please enter event title');
      return;
    }
    if (selectedPassType === 'SERVICE' && currentStepIndex === 0 && !staffDetails.staffName.trim()) {
      setSubmitError('Please enter staff name');
      return;
    }

    if (isLastStep) {
      handleFinalSubmit();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      onClose();
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const formData = {
        guestDetails, guestSchedule, guestOptions,
        groupDetails, groupGuests,
        cabProvider, customCabProvider, cabVehicle, cabSchedule,
        deliveryPartner, customDeliveryPartner, deliveryDetails, deliveryValidity,
        staffDetails, serviceCategory, serviceDateRange, serviceWeekdays, serviceTimeWindow,
      };

      const payload = mapFormToApiPayloadStrategy(selectedPassType, formData, roleContext);
      const res = await onSubmitPass(payload);
      const createdPass = res?.payload?.data || res?.payload || res;

      const code = createdPass?.code || 'PASS-' + Math.floor(100000 + Math.random() * 900000);
      setGeneratedPass({
        id: createdPass?._id || 'pass-' + Date.now(),
        code,
        visitorName: createdPass?.visitorDetails?.name || guestDetails.visitorName || 'Visitor',
        passType: selectedPassType,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to create pass. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (generatedPass) {
    return (
      <View className="flex-1 bg-background">
        <GeneratedPassView
          passData={generatedPass}
          onDone={onClose}
          onShare={() => {}}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <VisitorPassFlowHeader
        passType={selectedPassType}
        stepTitle={steps[currentStepIndex]?.title || ''}
        onBack={handleBack}
        onCancel={onClose}
      />

      <VisitorPassStepIndicator steps={steps} currentStepIndex={currentStepIndex} />

      {renderExtraStepHeader ? renderExtraStepHeader() : null}

      {submitError && (
        <View className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
          <AlertCircle size={16} className="text-destructive shrink-0" />
          <Text className="text-xs text-destructive flex-1">{submitError}</Text>
        </View>
      )}

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4 pb-8">
        {selectedPassType === 'GUEST' && (
          <>
            {currentStepIndex === 0 && <GuestDetailsStep data={guestDetails} onChange={setGuestDetails} />}
            {currentStepIndex === 1 && <GuestScheduleStep data={guestSchedule} onChange={setGuestSchedule} />}
            {currentStepIndex === 2 && <GuestPassOptionsStep data={guestOptions} onChange={setGuestOptions} />}
            {currentStepIndex === 3 && (
              <GuestPassReviewStep
                details={guestDetails}
                schedule={guestSchedule}
                options={guestOptions}
              />
            )}
          </>
        )}

        {selectedPassType === 'GROUP' && (
          <>
            {currentStepIndex === 0 && <GroupVisitDetailsStep data={groupDetails} onChange={setGroupDetails} />}
            {currentStepIndex === 1 && <GroupScheduleStep data={groupDetails} onChange={setGroupDetails} />}
            {currentStepIndex === 2 && (
              <GroupPassReviewStep
                details={groupDetails}
                guests={groupGuests}
              />
            )}
          </>
        )}

        {selectedPassType === 'CAB' && (
          <>
            {currentStepIndex === 0 && (
              <CabProviderStep
                selectedProvider={cabProvider}
                onSelectProvider={setCabProvider}
                customProviderName={customCabProvider}
                onCustomProviderChange={setCustomCabProvider}
              />
            )}
            {currentStepIndex === 1 && <CabVehicleStep data={cabVehicle} onChange={setCabVehicle} />}
            {currentStepIndex === 2 && <CabScheduleStep data={cabSchedule} onChange={setCabSchedule} />}
            {currentStepIndex === 3 && (
              <CabPassReviewStep
                provider={cabProvider}
                vehicle={cabVehicle}
                schedule={cabSchedule}
              />
            )}
          </>
        )}

        {selectedPassType === 'DELIVERY' && (
          <>
            {currentStepIndex === 0 && (
              <DeliveryPartnerStep
                selectedPartner={deliveryPartner}
                onSelectPartner={setDeliveryPartner}
                customPartnerName={customDeliveryPartner}
                onCustomPartnerChange={setCustomDeliveryPartner}
              />
            )}
            {currentStepIndex === 1 && <DeliveryDetailsStep data={deliveryDetails} onChange={setDeliveryDetails} />}
            {currentStepIndex === 2 && <DeliveryValidityStep data={deliveryValidity} onChange={setDeliveryValidity} />}
            {currentStepIndex === 3 && (
              <DeliveryPassReviewStep
                partner={deliveryPartner}
                details={deliveryDetails}
                validity={deliveryValidity}
                customPartnerName={customDeliveryPartner}
              />
            )}
          </>
        )}

        {selectedPassType === 'SERVICE' && (
          <>
            {currentStepIndex === 0 && <StaffDetailsStep data={staffDetails} onChange={setStaffDetails} />}
            {currentStepIndex === 1 && <ServiceTypeStep selectedService={serviceCategory} onSelectService={setServiceCategory} />}
            {currentStepIndex === 2 && <ServiceDateRangeStep data={serviceDateRange} onChange={setServiceDateRange} />}
            {currentStepIndex === 3 && (
              <ServiceWeekdayStep
                selectedWeekdays={serviceWeekdays}
                onToggleWeekday={(dayId: string) =>
                  setServiceWeekdays((prev) =>
                    prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]
                  )
                }
              />
            )}
            {currentStepIndex === 4 && <ServiceTimeWindowStep data={serviceTimeWindow} onChange={setServiceTimeWindow} />}
            {currentStepIndex === 5 && (
              <ServicePassReviewStep
                staff={staffDetails}
                serviceCategory={serviceCategory}
                dateRange={serviceDateRange}
                weekdays={serviceWeekdays}
                timeWindow={serviceTimeWindow}
              />
            )}
          </>
        )}
      </ScrollView>

      <VisitorPassFlowFooter
        onBack={handleBack}
        onNext={handleNext}
        isLastStep={isLastStep}
        loading={loading}
      />

      <VisitorInvitationTypeSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onSelectType={(type) => {
          setSelectedPassType(type);
          setCurrentStepIndex(0);
          setTypeSheetOpen(false);
        }}
      />
    </View>
  );
};

export default VisitorPassWizard;
