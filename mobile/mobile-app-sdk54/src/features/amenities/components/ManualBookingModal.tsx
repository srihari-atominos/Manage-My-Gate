import React from 'react';
import { View, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { formatDateString } from '@/components/common/DatePickerModal';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Amenity } from '../store/amenitySlice';

export interface ManualBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ManualBookingFormData) => void;
  amenities: Amenity[];
  loading?: boolean;
}

export interface ManualBookingFormData {
  amenityId: string;
  villaNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  amenities,
  loading = false,
}) => {
  const amenityOptions = amenities.map((a) => ({
    label: a.name,
    value: a._id,
  }));

  const todayStr = formatDateString(new Date());

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManualBookingFormData>({
    defaultValues: {
      amenityId: amenities.length > 0 ? amenities[0]._id : '',
      villaNumber: '',
      date: todayStr,
      startTime: '09:00',
      endTime: '10:00',
      notes: 'Admin Manual Override Reservation',
    },
  });

  React.useEffect(() => {
    if (amenities.length > 0 && !watch('amenityId')) {
      setValue('amenityId', amenities[0]._id, { shouldDirty: false });
    }
  }, [amenities, setValue, watch]);

  const selectedDateVal = watch('date');

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Manual Resident Reservation">
      <View className="gap-3 pb-2 pt-2">
          <Controller
            control={control}
            name="amenityId"
            rules={{ required: 'Please select an amenity' }}
            render={({ field: { onChange, value } }) => (
              <DropdownSelect
                label="Facility Name"
                options={amenityOptions}
                value={value}
                onValueChange={onChange}
                error={errors.amenityId?.message}
                accordion={true}
              />
            )}
          />

          <Controller
            control={control}
            name="villaNumber"
            rules={{ required: 'Villa Number is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Villa / Resident Reference"
                placeholder="e.g. Villa 104, Resident John"
                value={value}
                onChangeText={onChange}
                error={errors.villaNumber?.message}
              />
            )}
          />

          {/* Integrated DatePicker Component */}
          <DatePicker
            label="Reservation Date"
            value={selectedDateVal ? new Date(`${selectedDateVal}T00:00:00`) : new Date()}
            onChange={(d) => setValue('date', formatDateString(d), { shouldDirty: true })}
            error={errors.date?.message}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="startTime"
                rules={{ required: 'Start time required' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Start Time"
                    placeholder="09:00"
                    value={value}
                    onChangeText={onChange}
                    error={errors.startTime?.message}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="endTime"
                rules={{ required: 'End time required' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="End Time"
                    placeholder="10:00"
                    value={value}
                    onChangeText={onChange}
                    error={errors.endTime?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Admin Notes"
                multiline
                numberOfLines={2}
                value={value}
                onChangeText={onChange}
                placeholder="Specify purpose or special instructions..."
              />
            )}
          />

          <Button
            variant="default"
            disabled={loading}
            onPress={handleSubmit(onSubmit)}
            className="mt-3 bg-primary py-3.5"
            accessibilityLabel="Create Admin Reservation"
          >
            <Text className="text-primary-foreground font-bold text-base">
              {loading ? 'Creating Reservation...' : 'Create Admin Reservation'}
            </Text>
          </Button>
        </View>
    </BottomSheet>
  );
};

export default ManualBookingModal;
