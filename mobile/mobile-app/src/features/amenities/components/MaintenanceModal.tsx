import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect, DropdownOption } from '@/components/forms/DropdownSelect';
import { DayOfMonthPicker } from '@/components/forms/DayOfMonthPicker';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { formatDateString } from '@/components/common/DatePickerModal';
import { Amenity, MaintenanceTask } from '../store/amenitySlice';
import { Clock, Calendar, Repeat, CheckCircle2, Minus, Plus } from 'lucide-react-native';

const TIME_PRESETS = [
  { label: 'Day (08:00 - 18:00)', start: '08:00', end: '18:00' },
  { label: 'Full Day (24h)', start: '00:00', end: '23:59' },
  { label: 'Morning (06:00 - 12:00)', start: '06:00', end: '12:00' },
  { label: 'Night (20:00 - 06:00)', start: '20:00', end: '06:00' },
];

const MAINTENANCE_TYPES: Array<{
  value: 'CLEANING' | 'REPAIR' | 'INSPECTION' | 'PREVENTIVE' | 'UPGRADE' | 'OTHER';
  label: string;
}> = [
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'UPGRADE', label: 'Upgrade' },
  { value: 'OTHER', label: 'Other' },
];

const CYCLE_OPTIONS: DropdownOption[] = [
  { label: 'Weekly Maintenance', value: 'WEEKLY' },
  { label: 'Monthly Maintenance', value: 'MONTHLY' },
  { label: 'Daily Maintenance', value: 'DAILY' },
  { label: 'Yearly Maintenance', value: 'YEARLY' },
];

export const FREQUENCY_OPTIONS: Array<{
  label: string;
  value: 'WEEKLY' | 'MONTHLY' | 'DAILY' | 'YEARLY';
}> = [
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Daily', value: 'DAILY' },
  { label: 'Yearly', value: 'YEARLY' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
];

const getOrdinalSuffix = (n: number) => {
  if (n === 1 || n === 21 || n === 31) return 'st';
  if (n === 2 || n === 22) return 'nd';
  if (n === 3 || n === 23) return 'rd';
  return 'th';
};

const getFormattedAnniversary = (dateStr?: string) => {
  if (!dateStr) return 'First Occurrence Date';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const day = d.getDate();
  return `${day}${getOrdinalSuffix(day)} of ${monthNames[d.getMonth()]}`;
};

const getOccurrencePresets = (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') => {
  switch (frequency) {
    case 'DAILY':
      return [
        { count: 3, label: '3 Days' },
        { count: 7, label: '7 Days (1 Wk)' },
        { count: 14, label: '14 Days (2 Wks)' },
        { count: 30, label: '30 Days (1 Mo)' },
      ];
    case 'MONTHLY':
      return [
        { count: 3, label: '3 Months' },
        { count: 6, label: '6 Months' },
        { count: 12, label: '12 Mos (1 Yr)' },
        { count: 24, label: '24 Mos (2 Yrs)' },
      ];
    case 'YEARLY':
      return [
        { count: 2, label: '2 Years' },
        { count: 3, label: '3 Years' },
        { count: 5, label: '5 Years' },
        { count: 10, label: '10 Years' },
      ];
    case 'WEEKLY':
    default:
      return [
        { count: 4, label: '4 Wks (1 Mo)' },
        { count: 8, label: '8 Wks (2 Mos)' },
        { count: 12, label: '12 Wks (3 Mos)' },
        { count: 24, label: '24 Wks (6 Mos)' },
      ];
  }
};

export interface MaintenanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amenityId: string, data: MaintenanceFormData) => void;
  amenities: Amenity[];
  initialData?: MaintenanceTask | null;
  initialAmenityId?: string | null;
  loading?: boolean;
}

export interface MaintenanceWindowItem {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface MaintenanceFormData {
  amenityId: string;
  customAmenityName?: string;
  title: string;
  isRecurring: boolean;
  maintenanceType: 'CLEANING' | 'REPAIR' | 'INSPECTION' | 'PREVENTIVE' | 'UPGRADE' | 'OTHER';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  windows?: MaintenanceWindowItem[];
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  selectedDays: number[];
  dayOfMonth: number;
  genDayOption?: 'FIRST' | 'LAST' | 'CUSTOM';
  occurrenceCount: number;
  description: string;
  assignedStaff: string;
  autoCancelBookings: boolean;
  isCompleteClosure?: boolean;
  degradedCapacity?: number;
  isOngoing?: boolean;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  visible,
  onClose,
  onSubmit,
  amenities,
  initialData = null,
  initialAmenityId = null,
  loading = false,
}) => {
  const [customDayMode, setCustomDayMode] = useState<boolean>(false);
  const [windows, setWindows] = useState<MaintenanceWindowItem[]>([]);

  const amenityOptions = [
    ...amenities.map((a) => ({
      label: `${a.name} (${a.category || a.type || 'General'})`,
      value: a._id,
    })),
    { label: 'Others (Type Custom Name)', value: 'OTHER' },
  ];

  const todayStr = formatDateString(new Date());
  const tomorrowStr = formatDateString(new Date(Date.now() + 86400000));

  const defaultAmenity = initialAmenityId || (amenities.length > 0 ? (amenities[0]?._id || '') : 'OTHER');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    defaultValues: {
      amenityId: defaultAmenity,
      customAmenityName: '',
      title: 'Routine Cleaning & Servicing',
      isRecurring: false,
      maintenanceType: 'CLEANING',
      startDate: todayStr,
      endDate: tomorrowStr,
      startTime: '08:00',
      endTime: '18:00',
      frequency: 'WEEKLY',
      interval: 1,
      selectedDays: [1],
      dayOfMonth: 1,
      occurrenceCount: 8,
      description: '',
      assignedStaff: 'Facilities Team',
      autoCancelBookings: true,
      isCompleteClosure: true,
      degradedCapacity: 0,
    },
  });

  const startDateVal = watch('startDate');
  const endDateVal = watch('endDate');

  const handleAddWindow = () => {
    const lastWindow = windows[windows.length - 1];
    let nextStartDate = todayStr;
    let nextEndDate = todayStr;
    let sTime = '00:00';
    let eTime = '17:00';

    if (lastWindow) {
      sTime = lastWindow.startTime || '00:00';
      eTime = lastWindow.endTime || '17:00';
      try {
        const prev = new Date(`${lastWindow.startDate}T00:00:00`);
        const next = new Date(prev.getTime() + 86400000);
        nextStartDate = formatDateString(next);
        nextEndDate = nextStartDate;
      } catch {
        nextStartDate = tomorrowStr;
        nextEndDate = tomorrowStr;
      }
    }

    setWindows((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        startDate: nextStartDate,
        endDate: nextEndDate,
        startTime: sTime,
        endTime: eTime,
      },
    ]);
  };

  const handleRemoveWindow = (id: string) => {
    if (windows.length <= 1) return;
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const handleUpdateWindow = (id: string, updates: Partial<MaintenanceWindowItem>) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  useEffect(() => {
    if (visible) {
      const parseDateAndTime = (isoString?: string, fallbackDate?: string, fallbackTime?: string) => {
        if (!isoString) return { date: fallbackDate || '', time: fallbackTime || '' };
        try {
          const d = new Date(isoString);
          const pad = (n: number) => String(n).padStart(2, '0');
          return {
            date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          };
        } catch {
          return { date: fallbackDate || '', time: fallbackTime || '' };
        }
      };

      if (initialData) {
        const start = parseDateAndTime(initialData.startDateTime, (initialData as any).startDate, (initialData as any).startTime);
        const end = parseDateAndTime(initialData.endDateTime, (initialData as any).endDate, (initialData as any).endTime);

        const initDayOfMonth = initialData.recurrence?.dayOfMonth || 1;
        setCustomDayMode(![1, 15, 28].includes(initDayOfMonth));

        setWindows([
          {
            id: '1',
            startDate: start.date || initialData.startDate || todayStr,
            endDate: end.date || initialData.endDate || todayStr,
            startTime: start.time || initialData.startTime || '00:00',
            endTime: end.time || initialData.endTime || '17:00',
          },
        ]);

        reset({
          amenityId: initialData.facilityId || initialData.amenityId || defaultAmenity,
          customAmenityName: '',
          title: initialData.title || initialData.reason || 'Routine Servicing',
          isRecurring: Boolean(initialData.isRecurring || initialData.recurringSeriesId),
          maintenanceType: (initialData.maintenanceType as any) || 'CLEANING',
          startDate: start.date || initialData.startDate || todayStr,
          endDate: end.date || initialData.endDate || tomorrowStr,
          startTime: start.time || initialData.startTime || '08:00',
          endTime: end.time || initialData.endTime || '18:00',
          frequency: (initialData.recurrence?.frequency as any) || 'WEEKLY',
          interval: initialData.recurrence?.interval || 1,
          selectedDays: initialData.recurrence?.daysOfWeek?.length ? initialData.recurrence.daysOfWeek : [1],
          dayOfMonth: initDayOfMonth,
          occurrenceCount: initialData.recurrence?.occurrenceCount || 8,
          description: initialData.description || (initialData as any).internalNotes || '',
          assignedStaff: initialData.assignedStaff || 'Facilities Team',
          autoCancelBookings: initialData.autoCancelBookings !== false,
          isCompleteClosure: initialData.isCompleteClosure !== false,
          degradedCapacity: initialData.degradedCapacity || 0,
        });
      } else {
        setCustomDayMode(false);
        setWindows([
          {
            id: '1',
            startDate: todayStr,
            endDate: todayStr,
            startTime: '00:00',
            endTime: '17:00',
          },
        ]);
        reset({
          amenityId: defaultAmenity,
          customAmenityName: '',
          title: 'Routine Cleaning & Servicing',
          isRecurring: false,
          maintenanceType: 'CLEANING',
          startDate: todayStr,
          endDate: tomorrowStr,
          startTime: '08:00',
          endTime: '18:00',
          frequency: 'WEEKLY',
          interval: 1,
          selectedDays: [1],
          dayOfMonth: 1,
          occurrenceCount: 8,
          description: '',
          assignedStaff: 'Facilities Team',
          autoCancelBookings: true,
          isCompleteClosure: true,
          degradedCapacity: 0,
        });
      }
    }
  }, [visible, initialData, initialAmenityId, amenities, reset, todayStr, tomorrowStr, defaultAmenity]);

  const handleFormSubmit = (data: MaintenanceFormData) => {
    if (data.amenityId === 'OTHER' && !data.customAmenityName?.trim()) {
      setError('customAmenityName', { type: 'manual', message: 'Please enter a custom amenity name' });
      return;
    }
    if (!data.isRecurring && windows.length > 0) {
      data.windows = windows;
      data.startDate = windows[0].startDate;
      data.endDate = windows[0].endDate;
      data.startTime = windows[0].startTime;
      data.endTime = windows[0].endTime;
    }
    onSubmit(data.amenityId, data);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initialData ? 'Edit Maintenance Task' : 'Schedule Maintenance'}
    >
      <View className="gap-3.5 pb-4 px-0.5 pt-2 shrink-0">
        {/* Schedule Mode Selector (One-Off Window vs Recurring Series) */}
        <View className="flex-row p-1 bg-secondary/80 rounded-2xl border border-border/60 mb-0.5">
          <TouchableOpacity
            onPress={() => setValue('isRecurring', false, { shouldDirty: true })}
            activeOpacity={0.7}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5 ${
              !watch('isRecurring') ? 'bg-primary shadow-xs' : 'bg-transparent'
            }`}
          >
            <Calendar size={15} color={!watch('isRecurring') ? '#FFFFFF' : '#888888'} />
            <Text
              className={`text-xs font-bold ${
                !watch('isRecurring') ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              One-Off Window
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setValue('isRecurring', true, { shouldDirty: true })}
            activeOpacity={0.7}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl gap-1.5 ${
              watch('isRecurring') ? 'bg-primary shadow-xs' : 'bg-transparent'
            }`}
          >
            <Repeat size={15} color={watch('isRecurring') ? '#FFFFFF' : '#888888'} />
            <Text
              className={`text-xs font-bold ${
                watch('isRecurring') ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Recurring Series
            </Text>
          </TouchableOpacity>
        </View>

        {/* Target Amenity Selection */}
        <Controller
          control={control}
          name="amenityId"
          rules={{ required: 'Please select an amenity' }}
          render={({ field: { onChange, value } }) => (
            <DropdownSelect
              label="Target Amenity *"
              options={amenityOptions}
              value={value}
              onValueChange={onChange}
              error={errors.amenityId?.message}
            />
          )}
        />

        {watch('amenityId') === 'OTHER' && (
          <Controller
            control={control}
            name="customAmenityName"
            rules={{ required: 'Custom amenity name is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Custom Amenity Name *"
                placeholder="Type new amenity name..."
                value={value}
                onChangeText={onChange}
                error={errors.customAmenityName?.message}
              />
            )}
          />
        )}

        {/* Maintenance Type Selector Chips */}
        <View className="gap-1.5">
          <Text className="text-xs font-semibold text-foreground">Maintenance Type</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {MAINTENANCE_TYPES.map((t) => {
              const isSelected = watch('maintenanceType') === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setValue('maintenanceType', t.value, { shouldDirty: true })}
                  activeOpacity={0.7}
                  className={`px-3 py-1.5 rounded-xl border ${
                    isSelected ? 'bg-primary border-primary' : 'bg-muted/40 border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isSelected ? 'text-primary-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Maintenance Task Title */}
        <Controller
          control={control}
          name="title"
          rules={{ required: 'Maintenance title is required' }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Maintenance Title *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Deep Pool Cleaning, Flooring Polish"
              error={errors.title?.message}
            />
          )}
        />

        {/* ===================== RECURRING CONTROLS (AMENITY UPKEEP SCHEDULE) ===================== */}
        {watch('isRecurring') ? (
          <View className="bg-card border border-border rounded-2xl p-4 gap-3.5">
            <View className="flex-row items-center justify-between border-b border-border/60 pb-2.5">
              <View className="flex-row items-center gap-1.5">
                <Repeat size={15} className="text-primary" />
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Recurring Upkeep Schedule
                </Text>
              </View>
              <Text className="text-xs font-extrabold text-primary">
                {watch('frequency') || 'WEEKLY'}
              </Text>
            </View>

            {/* Frequency Selector: Weekly / Monthly / Daily / Yearly */}
            <View className="flex-row gap-1.5">
              {FREQUENCY_OPTIONS.map((f) => {
                const isSelected = watch('frequency') === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => {
                      setValue('frequency', f.value as any, { shouldDirty: true });
                      setValue('interval', 1, { shouldDirty: true });
                      if (f.value === 'DAILY') {
                        setValue('occurrenceCount', 14, { shouldDirty: true });
                      } else if (f.value === 'MONTHLY') {
                        setValue('occurrenceCount', 6, { shouldDirty: true });
                      } else if (f.value === 'YEARLY') {
                        setValue('occurrenceCount', 5, { shouldDirty: true });
                      } else {
                        setValue('occurrenceCount', 8, { shouldDirty: true });
                      }
                    }}
                    activeOpacity={0.7}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'bg-secondary/60 border-border/80'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* If Weekly: Days of Week */}
            {watch('frequency') === 'WEEKLY' && (
              <View className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold text-muted-foreground">
                    Repeat on Days:
                  </Text>
                  <Text className="text-[11px] font-semibold text-primary">
                    {(watch('selectedDays') || []).length} selected
                  </Text>
                </View>
                <View className="flex-row gap-1">
                  {DAYS_OF_WEEK.map((d) => {
                    const selectedDays = watch('selectedDays') || [];
                    const isSelected = selectedDays.includes(d.value);
                    return (
                      <TouchableOpacity
                        key={d.value}
                        onPress={() => {
                          const nextDays = isSelected
                            ? selectedDays.filter((val) => val !== d.value)
                            : [...selectedDays, d.value].sort();
                          setValue('selectedDays', nextDays.length ? nextDays : [d.value], {
                            shouldDirty: true,
                          });
                        }}
                        activeOpacity={0.7}
                        className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'bg-background border-border'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* If Monthly: Day of Month */}
            {watch('frequency') === 'MONTHLY' && (
              <View className="gap-2">
                <Text className="text-[11px] font-bold text-muted-foreground">
                  Repeat on Day of Month:
                </Text>
                <View className="flex-row gap-1.5">
                  {[
                    { day: 1, label: '1st of Mo' },
                    { day: 15, label: '15th of Mo' },
                    { day: 28, label: 'Last Day (28th)' },
                  ].map((item) => {
                    const isSelected = !customDayMode && Number(watch('dayOfMonth')) === item.day;
                    return (
                      <TouchableOpacity
                        key={item.day}
                        onPress={() => {
                          setCustomDayMode(false);
                          setValue('dayOfMonth', item.day, { shouldDirty: true });
                        }}
                        activeOpacity={0.7}
                        className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'bg-background border-border'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => setCustomDayMode(true)}
                    activeOpacity={0.7}
                    className={`px-3 py-2 rounded-xl border items-center justify-center ${
                      customDayMode || ![1, 15, 28].includes(Number(watch('dayOfMonth')))
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        customDayMode || ![1, 15, 28].includes(Number(watch('dayOfMonth')))
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {(customDayMode || ![1, 15, 28].includes(Number(watch('dayOfMonth')))) && (
                  <View className="flex-row items-center justify-between bg-muted/40 border border-border rounded-xl p-2.5">
                    <Text className="text-xs font-semibold text-foreground">Specific Day of Month:</Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => setValue('dayOfMonth', Math.max(1, (Number(watch('dayOfMonth')) || 1) - 1), { shouldDirty: true })}
                        disabled={(Number(watch('dayOfMonth')) || 1) <= 1}
                        activeOpacity={0.7}
                        className={`w-7 h-7 rounded-lg border items-center justify-center ${
                          (Number(watch('dayOfMonth')) || 1) <= 1
                            ? 'bg-muted border-border/50 opacity-40'
                            : 'bg-card border-border active:bg-muted'
                        }`}
                      >
                        <Minus size={13} className="text-foreground" />
                      </TouchableOpacity>
                      <View className="min-w-[55px] items-center justify-center px-2 py-1 bg-background rounded-lg border border-border">
                        <Text className="text-xs font-bold text-foreground">
                          {watch('dayOfMonth') || 1}{getOrdinalSuffix(Number(watch('dayOfMonth') || 1))}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setValue('dayOfMonth', Math.min(31, (Number(watch('dayOfMonth')) || 1) + 1), { shouldDirty: true })}
                        disabled={(Number(watch('dayOfMonth')) || 1) >= 31}
                        activeOpacity={0.7}
                        className="w-7 h-7 rounded-lg border border-border bg-card items-center justify-center active:bg-muted"
                      >
                        <Plus size={13} className="text-foreground" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* If Yearly: Anniversary Notice */}
            {watch('frequency') === 'YEARLY' && (
              <View className="p-2.5 bg-secondary/50 rounded-xl border border-border/70 flex-row items-center gap-2">
                <Calendar size={14} className="text-primary shrink-0" />
                <Text className="text-[11px] text-muted-foreground flex-1">
                  Anniversary recurrence scheduled on <Text className="font-bold text-foreground">{getFormattedAnniversary(startDateVal)}</Text> each year.
                </Text>
              </View>
            )}

            {/* First Occurrence Start Date */}
            <DatePicker
              label="First Occurrence Date *"
              value={startDateVal ? new Date(`${startDateVal}T00:00:00`) : new Date()}
              onChange={(d) => {
                const dateStr = formatDateString(d);
                setValue('startDate', dateStr, { shouldDirty: true });
                if (watch('frequency') === 'MONTHLY' && customDayMode) {
                  setValue('dayOfMonth', d.getDate(), { shouldDirty: true });
                }
              }}
              error={errors.startDate?.message}
            />

            {/* Live Recurrence Plain-English Summary */}
            <View className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex-row items-center gap-2">
              <CheckCircle2 size={15} className="text-primary shrink-0" />
              <Text className="text-xs text-primary font-semibold flex-1 leading-relaxed">
                {(() => {
                  const freq = watch('frequency');
                  const startDate = startDateVal || todayStr;

                  if (freq === 'DAILY') {
                    return `Scheduled daily starting ${startDate}.`;
                  }
                  if (freq === 'WEEKLY') {
                    const days = (watch('selectedDays') || [1])
                      .map((d: number) => DAYS_OF_WEEK.find((item) => item.value === d)?.label)
                      .filter(Boolean)
                      .join(', ');
                    return `Scheduled weekly on ${days || 'selected days'} starting ${startDate}.`;
                  }
                  if (freq === 'MONTHLY') {
                    const dom = Number(watch('dayOfMonth')) || 1;
                    return `Scheduled monthly on the ${dom}${getOrdinalSuffix(dom)} of each month starting ${startDate}.`;
                  }
                  if (freq === 'YEARLY') {
                    return `Scheduled annually on ${getFormattedAnniversary(startDate)} starting ${startDate}.`;
                  }
                  return `Scheduled upkeep starting ${startDate}.`;
                })()}
              </Text>
            </View>
          </View>
        ) : (
          /* ===================== MULTI-WINDOW MAINTENANCE DATES ===================== */
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={15} className="text-primary" />
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Maintenance Windows ({windows.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddWindow}
                activeOpacity={0.7}
                className="flex-row items-center gap-1 px-2.5 py-1.5 bg-primary/10 rounded-xl border border-primary/20"
              >
                <Plus size={13} className="text-primary" />
                <Text className="text-xs font-bold text-primary">+ Add Date Window</Text>
              </TouchableOpacity>
            </View>

            {windows.map((w, idx) => (
              <View
                key={w.id}
                className="bg-card border border-border rounded-2xl p-3 gap-2.5"
              >
                <View className="flex-row items-center justify-between pb-1 border-b border-border/50">
                  <Text className="text-xs font-bold text-foreground">
                    Window #{idx + 1}
                  </Text>
                  {windows.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveWindow(w.id)}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-1"
                    >
                      <Text className="text-xs font-semibold text-destructive">Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row gap-2.5">
                  <View className="flex-1">
                    <DatePicker
                      label="Start Date *"
                      value={w.startDate ? new Date(`${w.startDate}T00:00:00`) : new Date()}
                      onChange={(d) =>
                        handleUpdateWindow(w.id, {
                          startDate: formatDateString(d),
                          endDate: w.endDate || formatDateString(d),
                        })
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <DatePicker
                      label="End Date *"
                      value={w.endDate ? new Date(`${w.endDate}T00:00:00`) : new Date()}
                      onChange={(d) =>
                        handleUpdateWindow(w.id, { endDate: formatDateString(d) })
                      }
                    />
                  </View>
                </View>

                <View className="flex-row gap-2.5">
                  <View className="flex-1">
                    <TextInput
                      label="Start Time"
                      placeholder="00:00"
                      value={w.startTime}
                      onChangeText={(val) => handleUpdateWindow(w.id, { startTime: val })}
                      leftIcon={<Clock size={15} className="text-muted-foreground" />}
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      label="End Time"
                      placeholder="17:00"
                      value={w.endTime}
                      onChangeText={(val) => handleUpdateWindow(w.id, { endTime: val })}
                      leftIcon={<Clock size={15} className="text-muted-foreground" />}
                    />
                  </View>
                </View>

                {/* Quick Presets for this window */}
                <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                  {TIME_PRESETS.map((preset) => {
                    const isActive = w.startTime === preset.start && w.endTime === preset.end;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        onPress={() =>
                          handleUpdateWindow(w.id, {
                            startTime: preset.start,
                            endTime: preset.end,
                          })
                        }
                        activeOpacity={0.7}
                        className={`px-2 py-0.5 rounded-lg border ${
                          isActive ? 'bg-primary/15 border-primary' : 'bg-muted/40 border-border'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium ${
                            isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

          </View>
        )}

        {/* Operating Times Section (Only for Recurring Series) */}
        {watch('isRecurring') && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="startTime"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Window Start Time"
                    placeholder="08:00"
                    value={value}
                    onChangeText={onChange}
                    leftIcon={<Clock size={16} className="text-muted-foreground" />}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="endTime"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Window End Time"
                    placeholder="18:00"
                    value={value}
                    onChangeText={onChange}
                    leftIcon={<Clock size={16} className="text-muted-foreground" />}
                  />
                )}
              />
            </View>
          </View>
        )}

        {watch('isRecurring') && (
          <View className="flex-row flex-wrap gap-1.5 -mt-1">
            {TIME_PRESETS.map((preset) => {
              const isActive = watch('startTime') === preset.start && watch('endTime') === preset.end;
              return (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => {
                    setValue('startTime', preset.start, { shouldDirty: true });
                    setValue('endTime', preset.end, { shouldDirty: true });
                  }}
                  activeOpacity={0.7}
                  className={`px-2.5 py-1 rounded-lg border ${
                    isActive ? 'bg-primary/15 border-primary' : 'bg-muted/40 border-border'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-medium ${
                      isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Task Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Maintenance Details & Notes"
              multiline
              numberOfLines={2}
              style={{ minHeight: 64 }}
              value={value}
              onChangeText={onChange}
              placeholder="Specify work details, equipment needed..."
            />
          )}
        />

        {/* Complete Facility Closure Toggle */}
        <Controller
          control={control}
          name="isCompleteClosure"
          render={({ field: { onChange, value } }) => (
            <ToggleSwitch
              label="Complete Facility Closure"
              description="When enabled, entirely closes the amenity. Disable to allow degraded capacity."
              value={value !== false}
              onValueChange={onChange}
              className="p-3 bg-card border border-border rounded-2xl mt-1"
            />
          )}
        />

        {watch('isCompleteClosure') === false && (
          <Controller
            control={control}
            name="degradedCapacity"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Degraded Capacity (Available Capacity)"
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={value !== undefined ? String(value) : ''}
                onChangeText={(val) => onChange(parseInt(val, 10) || 0)}
              />
            )}
          />
        )}

        {/* Auto-Cancel Toggle */}
        <Controller
          control={control}
          name="autoCancelBookings"
          render={({ field: { onChange, value } }) => (
            <ToggleSwitch
              label="Auto-Cancel Active Bookings"
              description="Automatically cancel and refund resident reservations during this window."
              value={value}
              onValueChange={onChange}
              className="p-3 bg-card border border-border rounded-2xl mt-1"
            />
          )}
        />

        <Button
          variant="default"
          disabled={loading}
          onPress={handleSubmit(handleFormSubmit)}
          className="mt-3 mb-2 bg-primary h-12 rounded-xl justify-center items-center"
          accessibilityLabel={
            initialData
              ? watch('isRecurring')
                ? `Save & Reschedule Series (${watch('occurrenceCount')} Occurrences)`
                : 'Save Maintenance Changes'
              : watch('isRecurring')
              ? `Schedule Recurring Series (${watch('occurrenceCount')} Occurrences)`
              : windows.length > 1
              ? `Schedule ${windows.length} Maintenance Windows`
              : 'Schedule Maintenance Window'
          }
        >
          <Text className="text-primary-foreground font-bold text-base text-center">
            {loading
              ? 'Saving...'
              : initialData
              ? watch('isRecurring')
                ? `Save & Reschedule Series (${watch('occurrenceCount')} Occurrences)`
                : 'Save Changes'
              : watch('isRecurring')
              ? `Schedule Recurring Series (${watch('occurrenceCount')} Occurrences)`
              : windows.length > 1
              ? `Schedule ${windows.length} Maintenance Windows`
              : 'Schedule Maintenance Window'}
          </Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default MaintenanceModal;
