import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatDateString } from '@/components/common/DatePickerModal';
import { Amenity, MaintenanceTask } from '../store/amenitySlice';

export interface MaintenanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amenityId: string, data: MaintenanceFormData) => void;
  amenities: Amenity[];
  initialData?: MaintenanceTask | null;
  loading?: boolean;
}

export interface MaintenanceFormData {
  amenityId: string;
  customAmenityName?: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  description: string;
  assignedStaff: string;
  autoCancelBookings: boolean;
  isCompleteClosure?: boolean;
  degradedCapacity?: number;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  visible,
  onClose,
  onSubmit,
  amenities,
  initialData = null,
  loading = false,
}) => {
  const amenityOptions = [
    ...amenities.map((a) => ({
      label: `${a.name} (${a.category || a.type || 'General'})`,
      value: a._id,
    })),
    { label: 'Others (Type Custom Name)', value: 'OTHER' },
  ];

  const todayStr = formatDateString(new Date());
  const tomorrowStr = formatDateString(new Date(Date.now() + 86400000));

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
      amenityId: amenities.length > 0 ? (amenities[0]?._id || '') : 'OTHER',
      customAmenityName: '',
      title: 'Routine Cleaning & Servicing',
      startDate: todayStr,
      endDate: tomorrowStr,
      startTime: '08:00',
      endTime: '18:00',
      description: '',
      assignedStaff: '',
      autoCancelBookings: false,
      isCompleteClosure: true,
      degradedCapacity: 0,
    },
  });

  const startDateVal = watch('startDate');
  const endDateVal = watch('endDate');

  useEffect(() => {
    if (visible) {
      if (initialData) {
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

        const start = parseDateAndTime(initialData.startDateTime, (initialData as any).startDate, (initialData as any).startTime);
        const end = parseDateAndTime(initialData.endDateTime, (initialData as any).endDate, (initialData as any).endTime);

        reset({
          amenityId: initialData.facilityId || initialData.amenityId || (amenities.length > 0 ? (amenities[0]?._id || '') : 'OTHER'),
          customAmenityName: '',
          title: initialData.reason || (initialData as any).title || 'Routine Servicing',
          startDate: start.date || todayStr,
          endDate: end.date || tomorrowStr,
          startTime: start.time || '08:00',
          endTime: end.time || '18:00',
          description: '',
          assignedStaff: '',
          autoCancelBookings: false,
          isCompleteClosure: initialData.isCompleteClosure !== false,
          degradedCapacity: initialData.degradedCapacity || 0,
        });
      } else {
        reset({
          amenityId: amenities.length > 0 ? (amenities[0]?._id || '') : 'OTHER',
          customAmenityName: '',
          title: 'Routine Cleaning & Servicing',
          startDate: todayStr,
          endDate: tomorrowStr,
          startTime: '08:00',
          endTime: '18:00',
          description: '',
          assignedStaff: 'Facilities Team',
          autoCancelBookings: true,
          isCompleteClosure: true,
          degradedCapacity: 0,
        });
      }
    }
  }, [visible, initialData, amenities, reset, todayStr, tomorrowStr]);

  const handleFormSubmit = (data: MaintenanceFormData) => {
    if (data.amenityId === 'OTHER' && !data.customAmenityName?.trim()) {
      setError('customAmenityName', { type: 'manual', message: 'Please enter a custom amenity name' });
      return;
    }
    onSubmit(data.amenityId, data);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initialData ? 'Edit Maintenance Task' : 'Schedule Maintenance Task'}
    >
      <View className="gap-3.5 pb-2 px-0.5 pt-1 shrink-0">
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

          {/* Dates Selection via DatePicker */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DatePicker
                label="Start Date *"
                value={startDateVal ? new Date(`${startDateVal}T00:00:00`) : new Date()}
                onChange={(d) => setValue('startDate', formatDateString(d), { shouldDirty: true })}
                error={errors.startDate?.message}
              />
            </View>
            <View className="flex-1">
              <DatePicker
                label="End Date *"
                value={endDateVal ? new Date(`${endDateVal}T00:00:00`) : new Date()}
                onChange={(d) => setValue('endDate', formatDateString(d), { shouldDirty: true })}
                error={errors.endDate?.message}
              />
            </View>
          </View>

          {/* Operating Times Section */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="startTime"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Start Time"
                    placeholder="08:00"
                    value={value}
                    onChangeText={onChange}
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
                    label="End Time"
                    placeholder="18:00"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
          </View>



          {/* Task Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Maintenance Details & Notes"
                multiline
                numberOfLines={2}
                inputClassName="min-h-[64px]"
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
            accessibilityLabel={initialData ? 'Save Maintenance Changes' : 'Schedule Maintenance Window'}
          >
            <Text className="text-primary-foreground font-bold text-base text-center">
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Schedule Maintenance Window'}
            </Text>
          </Button>
        </View>
    </BottomSheet>
  );
};

export default MaintenanceModal;
