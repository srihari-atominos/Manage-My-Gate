import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/src/store/store';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { VisitorPassFlowHeader } from '@/src/features/visitor/components/shared/VisitorPassFlowHeader';
import { VisitorPassStepIndicator } from '@/src/features/visitor/components/shared/VisitorPassStepIndicator';
import { VisitorPassFlowFooter } from '@/src/features/visitor/components/shared/VisitorPassFlowFooter';
import { VisitorInvitationTypeSheet } from '@/src/features/visitor/components/shared/VisitorInvitationTypeSheet';
import { GeneratedPassView, GeneratedPassData } from '@/src/features/visitor/components/shared/GeneratedPassView';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { mapGuestFormToApiPayload } from '@/src/features/visitor/utils/mapGuestFormToApiPayload';
import { mapGroupFormToApiPayload } from '@/src/features/visitor/utils/mapGroupFormToApiPayload';
import { mapCabFormToApiPayload } from '@/src/features/visitor/utils/mapCabFormToApiPayload';
import { mapDeliveryFormToApiPayload } from '@/src/features/visitor/utils/mapDeliveryFormToApiPayload';
import { mapServiceFormToApiPayload, convert12To24Time } from '@/src/features/visitor/utils/mapServiceFormToApiPayload';
import { AlertCircle, X } from 'lucide-react-native';

// Guest Steps
import { GuestDetailsStep, GuestDetailsData } from '@/src/features/visitor/components/guest/GuestDetailsStep';
import { GuestScheduleStep, GuestScheduleData } from '@/src/features/visitor/components/guest/GuestScheduleStep';
import { GuestPassOptionsStep, GuestPassOptionsData } from '@/src/features/visitor/components/guest/GuestPassOptionsStep';
import { GuestPassReviewStep } from '@/src/features/visitor/components/guest/GuestPassReviewStep';

// Group Steps
import { GroupVisitDetailsStep, GroupVisitDetailsData } from '@/src/features/visitor/components/group/GroupVisitDetailsStep';
import { GroupScheduleStep } from '@/src/features/visitor/components/group/GroupScheduleStep';
import { GroupGuestItem } from '@/src/features/visitor/components/group/AddGroupGuestsStep';
import { GroupPassReviewStep } from '@/src/features/visitor/components/group/GroupPassReviewStep';

// Cab Steps
import { CabProviderStep } from '@/src/features/visitor/components/cab/CabProviderStep';
import { CabVehicleStep, CabVehicleData } from '@/src/features/visitor/components/cab/CabVehicleStep';
import { CabScheduleStep, CabScheduleData } from '@/src/features/visitor/components/cab/CabScheduleStep';
import { CabPassReviewStep } from '@/src/features/visitor/components/cab/CabPassReviewStep';

// Delivery Steps
import { DeliveryPartnerStep } from '@/src/features/visitor/components/delivery/DeliveryPartnerStep';
import { DeliveryDetailsStep, DeliveryDetailsData } from '@/src/features/visitor/components/delivery/DeliveryDetailsStep';
import { DeliveryValidityStep, DeliveryValidityData } from '@/src/features/visitor/components/delivery/DeliveryValidityStep';
import { DeliveryPassReviewStep } from '@/src/features/visitor/components/delivery/DeliveryPassReviewStep';

// Service Steps
import { StaffDetailsStep, StaffDetailsData } from '@/src/features/visitor/components/service/StaffDetailsStep';
import { ServiceTypeStep } from '@/src/features/visitor/components/service/ServiceTypeStep';
import { ServiceDateRangeStep, ServiceDateRangeData } from '@/src/features/visitor/components/service/ServiceDateRangeStep';
import { ServiceWeekdayStep } from '@/src/features/visitor/components/service/ServiceWeekdayStep';
import { ServiceTimeWindowStep, ServiceTimeWindowData } from '@/src/features/visitor/components/service/ServiceTimeWindowStep';
import { ServicePassReviewStep } from '@/src/features/visitor/components/service/ServicePassReviewStep';

import { PassTypeKey } from '@/src/features/visitor/mocks/visitorMocks';

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

export default function InviteVisitorScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ type?: string }>();
  const authUser = useSelector((state: RootState) => state.auth?.user);
  const { createNewPass, fetchPasses } = useVisitorPass();

  const initialType: PassTypeKey =
    routeParams.type && ['GUEST', 'GROUP', 'CAB', 'DELIVERY', 'SERVICE'].includes(routeParams.type.toUpperCase())
      ? (routeParams.type.toUpperCase() as PassTypeKey)
      : 'GUEST';

  const [selectedPassType, setSelectedPassType] = useState<PassTypeKey | null>(initialType);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedPass, setGeneratedPass] = useState<GeneratedPassData | null>(null);

  // Form States (Cleaned for user input)
  const [guestDetails, setGuestDetails] = useState<GuestDetailsData>({
    visitorName: '',
    phone: '',
    purpose: '',
  });
  const [guestSchedule, setGuestSchedule] = useState<GuestScheduleData>({
    visitDate: new Date().toISOString().split('T')[0],
    timeSlot: 'NOW',
  });
  const [guestOptions, setGuestOptions] = useState<GuestPassOptionsData>({
    entryMode: 'SINGLE',
    vehicleNo: '',
    gateInstructions: '',
  });

  // Group Form State
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

  // Cab Form State
  const [cabProvider, setCabProvider] = useState<string>('uber');
  const [customCabProvider, setCustomCabProvider] = useState<string>('');
  const [cabVehicle, setCabVehicle] = useState<CabVehicleData>({
    vehicleNo: '',
    vehicleType: 'CAB',
    driverPhone: '',
  });
  const [cabSchedule, setCabSchedule] = useState<CabScheduleData>({
    usageType: 'ONE_TIME',
    arrivalWindow: 'IMMEDIATE',
    selectedWeekdays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    timeSlots: [{ startTime: '07:30 AM', endTime: '09:00 AM' }],
  });

  // Delivery Form State
  const [deliveryPartner, setDeliveryPartner] = useState<string>('swiggy');
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetailsData>({
    orderId: '',
    packageCount: '1',
    deliveryAction: 'DOORSTEP',
    instructions: '',
  });
  const [deliveryValidity, setDeliveryValidity] = useState<DeliveryValidityData>({
    validityDuration: 'ONE_HOUR',
  });

  // Service Form State
  const [staffDetails, setStaffDetails] = useState<StaffDetailsData>({
    staffName: '',
    phone: '',
    notes: '',
  });
  const [serviceCategory, setServiceCategory] = useState<string>('maid');
  const [serviceDateRange, setServiceDateRange] = useState<ServiceDateRangeData>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [serviceWeekdays, setServiceWeekdays] = useState<string[]>([]);
  const [serviceTimeWindow, setServiceTimeWindow] = useState<ServiceTimeWindowData>({
    preset: 'MORNING',
    startTime: '08:00 AM',
    endTime: '01:00 PM',
  });

  const activePassType = selectedPassType || 'GUEST';
  const steps = STEP_DEFINITIONS[activePassType];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    setSubmitError(null);

    // Validate group pass event title & pass count on Step 0
    if (activePassType === 'GROUP') {
      if (currentStepIndex === 0) {
        if (!groupDetails.eventTitle || !groupDetails.eventTitle.trim()) {
          setSubmitError('Event title is required.');
          return;
        }
        const passesNum = parseInt(groupDetails.numberOfPasses, 10);
        if (isNaN(passesNum) || passesNum <= 0) {
          setSubmitError('Total Expected Passes must be a positive number.');
          return;
        }
      } else if (currentStepIndex === 1) {
        if (!groupDetails.visitDate || !groupDetails.visitDate.trim()) {
          setSubmitError('Event visit date is required.');
          return;
        }
      }
    }

    // Validate cab pass steps
    if (activePassType === 'CAB') {
      if (currentStepIndex === 0 && cabProvider === 'other' && (!customCabProvider || !customCabProvider.trim())) {
        setSubmitError('Please specify the cab or taxi company name.');
        return;
      }
      if (currentStepIndex === 1 && (!cabVehicle.vehicleNo || !cabVehicle.vehicleNo.trim())) {
        setSubmitError('License plate number is required.');
        return;
      }
      if (
        currentStepIndex === 2 &&
        cabSchedule.usageType === 'MULTI_USE' &&
        (!cabSchedule.selectedWeekdays || cabSchedule.selectedWeekdays.length === 0)
      ) {
        setSubmitError('Please select at least one active weekday for recurring cab entry.');
        return;
      }
    }

    // Validate service pass steps
    if (activePassType === 'SERVICE') {
      if (currentStepIndex === 0 && (!staffDetails.staffName || !staffDetails.staffName.trim())) {
        setSubmitError('Staff member name is required.');
        return;
      }
      if (currentStepIndex === 2) {
        const start = new Date(serviceDateRange.startDate);
        const end = new Date(serviceDateRange.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
          setSubmitError('Pass start date cannot be after end date.');
          return;
        }
      }
      if (currentStepIndex === 3 && serviceWeekdays.length === 0) {
        setSubmitError('Select at least one allowed weekday.');
        return;
      }
      if (currentStepIndex === 4) {
        const parseMinutes = (tStr: string) => {
          const t24 = convert12To24Time(tStr);
          const [h, m] = t24.split(':').map(Number);
          return h * 60 + m;
        };
        if (parseMinutes(serviceTimeWindow.startTime) >= parseMinutes(serviceTimeWindow.endTime)) {
          setSubmitError('Daily start time must be before end time.');
          return;
        }
      }
    }

    if (isLastStep) {
      handleGeneratePass();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    } else {
      setTypeSheetOpen(true);
    }
  };

  const handleGeneratePass = async () => {
    if (loading) return;
    setLoading(true);
    setSubmitError(null);

    const userId = authUser?.id || (authUser as any)?._id;
    if (!userId) {
      setSubmitError('User authentication context is missing. Please re-login.');
      setLoading(false);
      return;
    }

    if (activePassType === 'GUEST') {
      try {
        const payload = mapGuestFormToApiPayload(
          guestDetails,
          guestSchedule,
          guestOptions,
          {
            orgId: authUser?.orgId,
            createdById: userId,
          }
        );

        const actionResult = await createNewPass(payload);
        const createdPass = (actionResult as any)?.payload || (actionResult as any);

        if (createdPass && (createdPass._id || createdPass.shortKey)) {
          const passCode = createdPass.shortKey || createdPass.code || (createdPass._id ? createdPass._id.slice(-6) : '849201');

          setGeneratedPass({
            id: createdPass._id || `pass-${Date.now()}`,
            passType: 'GUEST',
            visitorName: createdPass.visitorDetails?.name || guestDetails.visitorName,
            phone: createdPass.visitorDetails?.phone || guestDetails.phone,
            code: passCode,
            validFrom: createdPass.validity?.startDate || new Date().toISOString(),
            validUntil: createdPass.validity?.endDate || new Date(Date.now() + 86400000).toISOString(),
            purpose: createdPass.purpose || guestDetails.purpose,
            vehicleNo: createdPass.vehicleDetails?.number || guestOptions.vehicleNo,
          });

          // Refresh passes list
          fetchPasses();
        } else {
          setSubmitError('Unable to verify created pass response. Please try again.');
        }
      } catch (err: any) {
        console.error('Failed to create guest visitor pass:', err);
        const message = typeof err === 'string' ? err : err?.message || 'Failed to create visitor pass. Please verify your connection and try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    } else if (activePassType === 'GROUP') {
      if (!groupDetails.eventTitle || !groupDetails.eventTitle.trim()) {
        setSubmitError('Event Title is required.');
        setLoading(false);
        return;
      }

      try {
        const payload = mapGroupFormToApiPayload(groupDetails, groupGuests, {
          orgId: authUser?.orgId,
          createdById: userId,
        });

        const actionResult = await createNewPass(payload);
        const createdPass = (actionResult as any)?.payload || (actionResult as any);

        if (createdPass && (createdPass._id || createdPass.shortKey)) {
          const passCode = createdPass.shortKey || createdPass.code || (createdPass._id ? createdPass._id.slice(-6) : '849201');

          setGeneratedPass({
            id: createdPass._id || `pass-${Date.now()}`,
            passType: 'GROUP',
            visitorName: createdPass.visitorDetails?.name || groupDetails.eventTitle,
            code: passCode,
            validFrom: createdPass.validity?.startDate || new Date().toISOString(),
            validUntil: createdPass.validity?.endDate || new Date(Date.now() + 86400000).toISOString(),
            purpose: createdPass.purpose || groupDetails.purpose,
            guestCount: createdPass.usageLimit?.maxUses || parseInt(groupDetails.numberOfPasses, 10) || 10,
            timeWindow: groupDetails.startTime && groupDetails.endTime ? { startTime: groupDetails.startTime, endTime: groupDetails.endTime } : undefined,
          });

          // Refresh passes list
          fetchPasses();
        } else {
          setSubmitError('Unable to verify created group pass response. Please try again.');
        }
      } catch (err: any) {
        console.error('Failed to create group visitor pass:', err);
        const message = typeof err === 'string' ? err : err?.message || 'Failed to create group visitor pass. Please verify your connection and try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    } else if (activePassType === 'CAB') {
      if (!cabVehicle.vehicleNo || !cabVehicle.vehicleNo.trim()) {
        setSubmitError('License plate number is required.');
        setLoading(false);
        return;
      }

      try {
        const payload = mapCabFormToApiPayload(
          cabProvider,
          cabVehicle,
          cabSchedule,
          {
            orgId: authUser?.orgId,
            createdById: userId,
          },
          customCabProvider
        );

        const actionResult = await createNewPass(payload);
        const createdPass = (actionResult as any)?.payload || (actionResult as any);

        if (createdPass && (createdPass._id || createdPass.shortKey)) {
          const passCode = createdPass.shortKey || createdPass.code || (createdPass._id ? createdPass._id.slice(-6) : '849201');

          const allowedWeekdays = Array.isArray(createdPass.validity?.allowedDays)
            ? createdPass.validity.allowedDays.map((n: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][n])
            : cabSchedule.usageType === 'MULTI_USE'
            ? (cabSchedule.selectedWeekdays || []).map((id) => id.charAt(0) + id.slice(1).toLowerCase())
            : undefined;

          setGeneratedPass({
            id: createdPass._id || `pass-${Date.now()}`,
            passType: 'CAB',
            visitorName: createdPass.visitorDetails?.name || `${cabProvider.toUpperCase()} Driver`,
            phone: createdPass.visitorDetails?.phone || cabVehicle.driverPhone,
            code: passCode,
            validFrom: createdPass.validity?.startDate || new Date().toISOString(),
            validUntil: createdPass.validity?.endDate || new Date(Date.now() + 86400000).toISOString(),
            purpose: createdPass.purpose,
            provider: createdPass.vehicleDetails?.vendor || cabProvider.toUpperCase(),
            vehicleNo: createdPass.vehicleDetails?.number || cabVehicle.vehicleNo,
            allowedWeekdays,
          });

          // Refresh passes list
          fetchPasses();
        } else {
          setSubmitError('Unable to verify created cab pass response. Please try again.');
        }
      } catch (err: any) {
        console.error('Failed to create cab visitor pass:', err);
        const message = typeof err === 'string' ? err : err?.message || 'Failed to create cab visitor pass. Please verify your connection and try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    } else if (activePassType === 'DELIVERY') {
      try {
        const payload = mapDeliveryFormToApiPayload(
          deliveryPartner,
          deliveryDetails,
          deliveryValidity,
          {
            orgId: authUser?.orgId,
            createdById: userId,
          }
        );

        const actionResult = await createNewPass(payload);
        const createdPass = (actionResult as any)?.payload || (actionResult as any);

        if (createdPass && (createdPass._id || createdPass.shortKey)) {
          const passCode = createdPass.shortKey || createdPass.code || (createdPass._id ? createdPass._id.slice(-6) : '849201');

          setGeneratedPass({
            id: createdPass._id || `pass-${Date.now()}`,
            passType: 'DELIVERY',
            visitorName: createdPass.visitorDetails?.name || `${deliveryPartner.toUpperCase()} Delivery Agent`,
            code: passCode,
            validFrom: createdPass.validity?.startDate || new Date().toISOString(),
            validUntil: createdPass.validity?.endDate || new Date(Date.now() + 86400000).toISOString(),
            purpose: createdPass.purpose,
            provider: createdPass.deliveryDetails?.partner || deliveryPartner.toUpperCase(),
            deliveryInstructions: createdPass.deliveryDetails?.instructions || deliveryDetails.instructions,
          });

          // Refresh passes list
          fetchPasses();
        } else {
          setSubmitError('Unable to verify created delivery pass response. Please try again.');
        }
      } catch (err: any) {
        console.error('Failed to create delivery visitor pass:', err);
        const message = typeof err === 'string' ? err : err?.message || 'Failed to create delivery visitor pass. Please verify your connection and try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    } else if (activePassType === 'SERVICE') {
      if (!staffDetails.staffName || !staffDetails.staffName.trim()) {
        setSubmitError('Staff member name is required.');
        setLoading(false);
        return;
      }
      if (serviceWeekdays.length === 0) {
        setSubmitError('Select at least one allowed weekday.');
        setLoading(false);
        return;
      }

      try {
        const payload = mapServiceFormToApiPayload(
          staffDetails,
          serviceCategory,
          serviceDateRange,
          serviceWeekdays,
          serviceTimeWindow,
          {
            orgId: authUser?.orgId,
            createdById: userId,
          }
        );

        const actionResult = await createNewPass(payload);
        const createdPass = (actionResult as any)?.payload || (actionResult as any);

        if (createdPass && (createdPass._id || createdPass.shortKey)) {
          const passCode = createdPass.shortKey || createdPass.code || (createdPass._id ? createdPass._id.slice(-6) : '849201');

          setGeneratedPass({
            id: createdPass._id || `pass-${Date.now()}`,
            passType: 'SERVICE',
            visitorName: createdPass.visitorDetails?.name || staffDetails.staffName,
            phone: createdPass.visitorDetails?.phone || staffDetails.phone,
            code: passCode,
            validFrom: createdPass.validity?.startDate || new Date(serviceDateRange.startDate).toISOString(),
            validUntil: createdPass.validity?.endDate || new Date(serviceDateRange.endDate).toISOString(),
            purpose: createdPass.purpose,
            provider: createdPass.serviceDetails?.category || serviceCategory.toUpperCase(),
            allowedWeekdays: serviceWeekdays,
            timeWindow: { startTime: serviceTimeWindow.startTime, endTime: serviceTimeWindow.endTime },
          });

          // Refresh passes list
          fetchPasses();
        } else {
          setSubmitError('Unable to verify created service pass response. Please try again.');
        }
      } catch (err: any) {
        console.error('Failed to create service visitor pass:', err);
        const message = typeof err === 'string' ? err : err?.message || 'Failed to create service visitor pass. Please verify your connection and try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderCurrentStepComponent = () => {
    switch (activePassType) {
      case 'GUEST':
        if (currentStepIndex === 0) {
          return <GuestDetailsStep data={guestDetails} onChange={setGuestDetails} />;
        } else if (currentStepIndex === 1) {
          return <GuestScheduleStep data={guestSchedule} onChange={setGuestSchedule} />;
        } else if (currentStepIndex === 2) {
          return <GuestPassOptionsStep data={guestOptions} onChange={setGuestOptions} />;
        } else {
          return <GuestPassReviewStep details={guestDetails} schedule={guestSchedule} options={guestOptions} />;
        }

      case 'GROUP':
        if (currentStepIndex === 0) {
          return <GroupVisitDetailsStep data={groupDetails} onChange={setGroupDetails} />;
        } else if (currentStepIndex === 1) {
          return <GroupScheduleStep data={groupDetails} onChange={setGroupDetails} />;
        } else {
          return <GroupPassReviewStep details={groupDetails} guests={groupGuests} />;
        }

      case 'CAB':
        if (currentStepIndex === 0) {
          return (
            <CabProviderStep
              selectedProvider={cabProvider}
              onSelectProvider={setCabProvider}
              customProviderName={customCabProvider}
              onCustomProviderChange={setCustomCabProvider}
            />
          );
        } else if (currentStepIndex === 1) {
          return <CabVehicleStep data={cabVehicle} onChange={setCabVehicle} />;
        } else if (currentStepIndex === 2) {
          return <CabScheduleStep data={cabSchedule} onChange={setCabSchedule} />;
        } else {
          const displayProvider =
            cabProvider === 'other' && customCabProvider.trim() ? customCabProvider.trim() : cabProvider;
          return <CabPassReviewStep provider={displayProvider} vehicle={cabVehicle} schedule={cabSchedule} />;
        }

      case 'DELIVERY':
        if (currentStepIndex === 0) {
          return <DeliveryPartnerStep selectedPartner={deliveryPartner} onSelectPartner={setDeliveryPartner} />;
        } else if (currentStepIndex === 1) {
          return <DeliveryDetailsStep data={deliveryDetails} onChange={setDeliveryDetails} />;
        } else if (currentStepIndex === 2) {
          return <DeliveryValidityStep data={deliveryValidity} onChange={setDeliveryValidity} />;
        } else {
          return <DeliveryPassReviewStep partner={deliveryPartner} details={deliveryDetails} validity={deliveryValidity} />;
        }

      case 'SERVICE':
        if (currentStepIndex === 0) {
          return <StaffDetailsStep data={staffDetails} onChange={setStaffDetails} />;
        } else if (currentStepIndex === 1) {
          return <ServiceTypeStep selectedService={serviceCategory} onSelectService={setServiceCategory} />;
        } else if (currentStepIndex === 2) {
          return <ServiceDateRangeStep data={serviceDateRange} onChange={setServiceDateRange} />;
        } else if (currentStepIndex === 3) {
          return (
            <ServiceWeekdayStep
              selectedWeekdays={serviceWeekdays}
              onToggleWeekday={(day) => {
                if (serviceWeekdays.includes(day)) {
                  setServiceWeekdays(serviceWeekdays.filter((d) => d !== day));
                } else {
                  setServiceWeekdays([...serviceWeekdays, day]);
                }
              }}
            />
          );
        } else if (currentStepIndex === 4) {
          return <ServiceTimeWindowStep data={serviceTimeWindow} onChange={setServiceTimeWindow} />;
        } else {
          return (
            <ServicePassReviewStep
              staff={staffDetails}
              serviceCategory={serviceCategory}
              dateRange={serviceDateRange}
              weekdays={serviceWeekdays}
              timeWindow={serviceTimeWindow}
            />
          );
        }

      default:
        return null;
    }
  };

  return (
    <ScreenShell title="Invite a Visitor" subtitle="Multi-step entry pass creation">
      {generatedPass ? (
        <GeneratedPassView
          passData={generatedPass}
          onDone={() => {
            setGeneratedPass(null);
            router.replace('/(resident)/visitor' as any);
          }}
        />
      ) : (
        <View className="flex-1 bg-background">
          {/* Header */}
          <VisitorPassFlowHeader
            passType={activePassType}
            stepTitle={steps[currentStepIndex]?.title || 'Pass Setup'}
            stepSubtitle={`Step ${currentStepIndex + 1} of ${steps.length}`}
            canGoBack={true}
            onBack={handleBack}
            onCancel={() => router.replace('/(resident)/visitor' as any)}
          />

          {/* Progress Bar Indicator */}
          <VisitorPassStepIndicator
            steps={steps}
            currentStepIndex={currentStepIndex}
          />

          {/* Error Alert Banner */}
          {submitError ? (
            <View className="bg-destructive/10 border border-destructive/30 p-3 mx-4 mt-3 rounded-xl flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <AlertCircle size={18} className="text-destructive shrink-0" />
                <Text className="text-xs font-semibold text-destructive flex-1">
                  {submitError}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubmitError(null)}>
                <X size={16} className="text-destructive" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Active Step Content */}
          <View className="flex-1">
            {renderCurrentStepComponent()}
          </View>

          {/* Footer Controls */}
          <VisitorPassFlowFooter
            onBack={handleBack}
            onNext={handleNext}
            canGoBack={true}
            isLastStep={isLastStep}
            loading={loading}
          />
        </View>
      )}

      {/* Invitation Type Picker Sheet */}
      <VisitorInvitationTypeSheet
        visible={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        onSelectType={(type) => {
          setSelectedPassType(type);
          setCurrentStepIndex(0);
          setSubmitError(null);
        }}
      />
    </ScreenShell>
  );
}
