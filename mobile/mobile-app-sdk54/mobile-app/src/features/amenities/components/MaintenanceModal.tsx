import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { DatePickerModal, formatDateString } from '@/components/common/DatePickerModal';
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
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  description: string;
  assignedStaff: string;
  autoCancelBookings: boolean;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  visible,
  onClose,
  onSubmit,
  amenities,
  initialData = null,
  loading = false,
}) => {
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  const amenityOptions = amenities.map((a) => ({
    label: `${a.name} (${a.category || a.type || 'General'})`,
    value: a._id,
  }));

  const todayStr = formatDateString(new Date());
  const tomorrowStr = formatDateString(new Date(Date.now() + 86400000));

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    defaultValues: {
      amenityId: amenities[0]?._id || '',
      title: 'Routine Cleaning & Servicing',
      startDate: todayStr,
      endDate: tomorrowStr,
      startTime: '08:00',
      endTime: '18:00',
      description: '',
      assignedStaff: 'Facilities Team',
      autoCancelBookings: true,
    },
  });

  const startDateVal = watch('startDate');
  const endDateVal = watch('endDate');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        reset({
          amenityId: initialData.amenityId || amenities[0]?._id || '',
          title: initialData.title || 'Routine Servicing',
          startDate: initialData.startDate || todayStr,
          endDate: initialData.endDate || tomorrowStr,
          startTime: initialData.startTime || '08:00',
          endTime: initialData.endTime || '18:00',
          description: initialData.description || '',
          assignedStaff: initialData.assignedStaff || 'Facilities Team',
          autoCancelBookings: true,
        });
      } else {
        reset({
          amenityId: amenities[0]?._id || '',
          title: 'Routine Cleaning & Servicing',
          startDate: todayStr,
          endDate: tomorrowStr,
          startTime: '08:00',
          endTime: '18:00',
          description: '',
          assignedStaff: 'Facilities Team',
          autoCancelBookings: true,
        });
      }
    }
  }, [visible, initialData, amenities, reset, todayStr, tomorrowStr]);

  const handleFormSubmit = (data: MaintenanceFormData) => {
    onSubmit(data.amenityId, data);
  };

  const handleDatePicked = (d: Date) => {
    const formatted = formatDateString(d);
    if (datePickerTarget === 'start') {
      setValue('startDate', formatted, { shouldDirty: true });
    } else if (datePickerTarget === 'end') {
      setValue('endDate', formatted, { shouldDirty: true });
    }
    setDatePickerTarget(null);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={initialData ? 'Edit Maintenance Task' : 'Schedule Maintenance Task'}
    >
      <ScrollView className="max-h-[80vh] pt-1" showsVerticalScrollIndicator={false}>
        <View className="gap-3.5 pb-8 px-0.5">
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

          {/* Dates Selection via DatePickerModal */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Pressable onPress={() => setDatePickerTarget('start')}>
                <TextInput
                  label="Start Date *"
                  placeholder="YYYY-MM-DD"
                  value={startDateVal}
                  editable={false}
                  pointerEvents="none"
                  error={errors.startDate?.message}
                />
              </Pressable>
            </View>
            <View className="flex-1">
              <Pressable onPress={() => setDatePickerTarget('end')}>
                <TextInput
                  label="End Date *"
                  placeholder="YYYY-MM-DD"
                  value={endDateVal}
                  editable={false}
                  pointerEvents="none"
                  error={errors.endDate?.message}
                />
              </Pressable>
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

          {/* Assigned Staff & Vendor */}
          <Controller
            control={control}
            name="assignedStaff"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Assigned Staff / Vendor"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. John (Facilities Manager), AquaTech Inc."
              />
            )}
          />

          {/* Task Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Maintenance Details & Notes"
                multiline
                numberOfLines={2}
                value={value}
                onChangeText={onChange}
                placeholder="Specify work details, equipment needed..."
              />
            )}
          />

          {/* Auto-Cancel Toggle */}
          <View className="flex-row items-center justify-between p-3.5 bg-muted/20 border border-border rounded-2xl mt-1">
            <View className="flex-1 me-3">
              <Text className="font-semibold text-sm text-foreground">Auto-Cancel Active Bookings</Text>
              <Text variant="muted" className="text-xs text-muted-foreground mt-0.5">
                Automatically cancel and refund resident reservations during this window.
              </Text>
            </View>
            <Controller
              control={control}
              name="autoCancelBookings"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch label="" value={value} onValueChange={onChange} />
              )}
            />
          </View>

          <Button
            variant="default"
            disabled={loading}
            onPress={handleSubmit(handleFormSubmit)}
            className="mt-2 bg-amber-600 py-3.5"
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Schedule Maintenance Window'}
            </Text>
          </Button>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={!!datePickerTarget}
        selectedDate={new Date()}
        onClose={() => setDatePickerTarget(null)}
        onSelectDate={handleDatePicked}
      />
    </BottomSheet>
  );
};

export default MaintenanceModal;
