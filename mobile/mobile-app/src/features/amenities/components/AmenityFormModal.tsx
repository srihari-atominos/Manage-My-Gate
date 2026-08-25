import React, { useEffect } from 'react';
import { View, ScrollView, Pressable, Image, Alert } from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as ImagePicker from 'expo-image-picker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { Chip } from '@/components/common/Chip';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Plus, Trash2, UploadCloud, X } from 'lucide-react-native';
import { Amenity } from '../store/amenitySlice';

export interface CancellationRule {
  cancelBeforeHours: number | string;
  refundPercentage: number | string;
}

export interface AmenityFormData {
  name: string;
  category: string;
  type: string;
  location: string;
  capacity: number | string;
  openTime: string;
  closeTime: string;
  bookingFee: number | string;
  pricingType: 'hourly' | 'daily';
  securityDeposit: number | string;
  securityDepositDescription: string;
  slotDurationMinutes: number | string;
  bufferTimeMinutes: number | string;
  advanceBookingDays: number | string;
  maxBookingsPerUserPerSlot: number | string;
  openDays: number[];
  isCancellationEnabled: boolean;
  cancellationRefundRules: CancellationRule[];
  description: string;
  status: 'active' | 'maintenance' | 'inactive';
  imageUrl?: string;
}

export interface AmenityFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AmenityFormData) => void;
  amenity?: Amenity | null;
  loading?: boolean;
}

const CATEGORY_OPTIONS = [
  { label: 'Event Space', value: 'Event Space' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Fitness', value: 'Fitness' },
  { label: 'Workspace', value: 'Workspace' },
  { label: 'Wellness', value: 'Wellness' },
  { label: 'Clubhouse', value: 'Clubhouse' },
  { label: 'Pool & Spa', value: 'Pool & Spa' },
  { label: 'General', value: 'General' },
];

const PRICING_TYPE_OPTIONS = [
  { label: 'Hourly Rate', value: 'hourly' },
  { label: 'Daily Rate', value: 'daily' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Under Maintenance', value: 'maintenance' },
  { label: 'Inactive', value: 'inactive' },
];

const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AmenityFormModal: React.FC<AmenityFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  amenity,
  loading = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AmenityFormData>({
    defaultValues: {
      name: '',
      category: 'Event Space',
      type: 'Event Space',
      location: '',
      capacity: 50,
      openTime: '08:00',
      closeTime: '21:00',
      bookingFee: 50,
      pricingType: 'hourly',
      securityDeposit: 0,
      securityDepositDescription: '',
      slotDurationMinutes: 60,
      bufferTimeMinutes: 0,
      advanceBookingDays: 7,
      maxBookingsPerUserPerSlot: 2,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      isCancellationEnabled: false,
      cancellationRefundRules: [],
      description: '',
      status: 'active',
      imageUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cancellationRefundRules',
  });

  const isCancellationEnabled = watch('isCancellationEnabled');
  const pricingType = watch('pricingType');
  const openDays = watch('openDays') || [];
  const imageUrlValue = watch('imageUrl');

  useEffect(() => {
    if (amenity) {
      const rawRules = amenity.bookingRules?.cancellationRefundRules || [];
      const img = amenity.imageUrl || (Array.isArray(amenity.images) && amenity.images.length > 0 ? amenity.images[0] : '');
      const normalizedStatus = (amenity.status || 'active').toLowerCase() as any;
      reset({
        name: amenity.name || '',
        category: amenity.category || amenity.type || 'Event Space',
        type: amenity.type || amenity.category || 'Event Space',
        location: amenity.location || '',
        capacity: (amenity.capacity || 50).toString(),
        openTime: amenity.bookingRules?.openTime || amenity.openTime || '08:00',
        closeTime: amenity.bookingRules?.closeTime || amenity.closeTime || '21:00',
        bookingFee: (amenity.pricing?.baseRate ?? amenity.bookingFee ?? 0).toString(),
        pricingType: amenity.pricing?.pricingType || 'hourly',
        securityDeposit: (amenity.pricing?.securityDeposit || 0).toString(),
        securityDepositDescription: amenity.pricing?.securityDepositDescription || '',
        slotDurationMinutes: (amenity.bookingRules?.slotDurationMinutes ?? 60).toString(),
        bufferTimeMinutes: (amenity.bookingRules?.bufferTimeMinutes ?? 0).toString(),
        advanceBookingDays: (amenity.bookingRules?.advanceBookingDays ?? 7).toString(),
        maxBookingsPerUserPerSlot: ((amenity as any).maxBookingsPerUserPerSlot ?? 2).toString(),
        openDays: (amenity as any).openDays || [0, 1, 2, 3, 4, 5, 6],
        isCancellationEnabled: amenity.bookingRules?.isCancellationEnabled || false,
        cancellationRefundRules: rawRules.map((rule: any) => ({
          cancelBeforeHours: rule.cancelBeforeHours?.toString() || '0',
          refundPercentage: rule.refundPercentage?.toString() || '0'
        })),
        description: amenity.description || '',
        status: normalizedStatus,
        imageUrl: img,
      });
    } else {
      reset({
        name: '',
        category: 'Event Space',
        type: 'Event Space',
        location: '',
        capacity: '50',
        openTime: '08:00',
        closeTime: '21:00',
        bookingFee: '50',
        pricingType: 'hourly',
        securityDeposit: '0',
        securityDepositDescription: '',
        slotDurationMinutes: '60',
        bufferTimeMinutes: '0',
        advanceBookingDays: '7',
        maxBookingsPerUserPerSlot: '2',
        openDays: [0, 1, 2, 3, 4, 5, 6],
        isCancellationEnabled: false,
        cancellationRefundRules: [],
        description: '',
        status: 'active',
        imageUrl: '',
      });
    }
  }, [amenity, visible, reset]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access media library is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imageUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setValue('imageUrl', imageUri, { shouldDirty: true });
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err?.message || 'Failed to select image.');
    }
  };

  const toggleDay = (dayIndex: number) => {
    const current = [...openDays];
    const existsIndex = current.indexOf(dayIndex);
    if (existsIndex > -1) {
      current.splice(existsIndex, 1);
    } else {
      current.push(dayIndex);
      current.sort();
    }
    setValue('openDays', current, { shouldDirty: true });
  };

  const handleFormSubmit = (data: AmenityFormData) => {
    data.type = data.category;
    onSubmit(data);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={amenity ? 'Edit Master Amenity' : 'Create Amenity Master'}
    >
      <View className="gap-3.5 pb-2 px-0.5">
          {/* Amenity Cover Image - Drag & Drop / Browse Drop Zone */}
          <View className="bg-card p-3 rounded-2xl border border-border gap-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Amenity Cover Image
            </Text>

            <Pressable
              onPress={handlePickImage}
              className="h-36 w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 items-center justify-center p-3 overflow-hidden active:bg-primary/10"
            >
              {imageUrlValue ? (
                <View className="w-full h-full relative items-center justify-center">
                  <Image
                    source={{ uri: imageUrlValue }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                  <View className="absolute bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                    <Icon as={UploadCloud} size={14} className="text-white" />
                    <Text className="text-white text-xs font-bold">Change Image</Text>
                  </View>
                  <Button
                    variant="destructive"
                    size="icon"
                    onPress={(e) => {
                      e.stopPropagation();
                      setValue('imageUrl', '', { shouldDirty: true });
                    }}
                    className="absolute top-2 end-2 h-7 w-7 rounded-full"
                  >
                    <Icon as={X} size={14} className="text-destructive-foreground" />
                  </Button>
                </View>
              ) : (
                <View className="items-center justify-center">
                  <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mb-1.5">
                    <Icon as={UploadCloud} size={22} className="text-primary" />
                  </View>
                  <Text className="text-sm font-semibold text-foreground text-center">
                    Drag & drop an image here or{' '}
                    <Text className="text-primary font-bold">browse files</Text>
                  </Text>
                  <Text className="text-[11px] text-muted-foreground mt-0.5">
                    Tap to select from device gallery or files
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Direct Image URL input fallback */}
            <Controller
              control={control}
              name="imageUrl"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Or enter Image URL"
                  value={value}
                  onChangeText={onChange}
                  placeholder="https://images.unsplash.com/..."
                />
              )}
            />
          </View>

          {/* Amenity Name & Status */}
          <Controller
            control={control}
            name="name"
            rules={{ required: 'Amenity name is required' }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Amenity Name *"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Clubhouse Lounge, Tennis Court #1"
                error={errors.name?.message}
              />
            )}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <DropdownSelect
                    label="Category *"
                    options={CATEGORY_OPTIONS}
                    value={value}
                    onValueChange={onChange}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <DropdownSelect
                    label="Status *"
                    options={STATUS_OPTIONS}
                    value={value}
                    onValueChange={onChange}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Location / Zone *"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Clubhouse West Wing, Block B Ground"
              />
            )}
          />

          {/* Pricing Model Section */}
          <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 gap-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pricing Model & Security Deposit
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="pricingType"
                  render={({ field: { onChange, value } }) => (
                    <DropdownSelect
                      label="Pricing Type"
                      options={PRICING_TYPE_OPTIONS}
                      value={value}
                      onValueChange={onChange}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="bookingFee"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label={`Base Rate (₹/${pricingType === 'daily' ? 'day' : 'slot'})`}
                      keyboardType="numeric"
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="securityDeposit"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Security Deposit (₹)"
                      keyboardType="numeric"
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="capacity"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Max Capacity"
                      keyboardType="numeric"
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="securityDepositDescription"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Deposit Refund Policy Notes"
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Refundable upon post-event inspection"
                />
              )}
            />
          </View>

          {/* Operating Rules Section */}
          <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 gap-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Operating Hours & Slot Rules
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="openTime"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Opening Time"
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
                  name="closeTime"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Closing Time"
                      placeholder="21:00"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="slotDurationMinutes"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Slot Duration (Mins)"
                      keyboardType="numeric"
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                      editable={pricingType !== 'daily'}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="advanceBookingDays"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Advance Days Limit"
                      keyboardType="numeric"
                      value={value?.toString() ?? ''}
                      onChangeText={onChange}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="maxBookingsPerUserPerSlot"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Max Bookings Per Resident / Slot"
                  keyboardType="numeric"
                  value={value?.toString() ?? ''}
                  onChangeText={onChange}
                  editable={pricingType !== 'daily'}
                />
              )}
            />

            {/* Operating Days Chip Selector */}
            <View className="mt-1">
              <Text className="text-xs font-semibold text-foreground mb-2">Operating Days</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {DAYS_NAMES.map((dayName, idx) => {
                  const isActive = openDays.includes(idx);
                  return (
                    <Chip
                      key={dayName}
                      label={dayName}
                      selected={isActive}
                      onPress={() => toggleDay(idx)}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Cancellation & Refund Rules Section */}
          <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/60 gap-3">
            <Controller
              control={control}
              name="isCancellationEnabled"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Cancellation & Refund Policy"
                  description="Allow residents to cancel confirmed reservations"
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />

            {isCancellationEnabled ? (
              <View className="gap-2.5 mt-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-foreground">Refund Rules Tiers</Text>
                  <Button
                    variant="outline"
                    onPress={() => append({ cancelBeforeHours: 24, refundPercentage: 100 })}
                    className="py-1 px-2.5 h-auto flex-row items-center gap-1 bg-primary/10 border-primary/20"
                  >
                    <Icon as={Plus} size={14} className="text-primary" />
                    <Text className="text-xs font-bold text-primary">+ Add Rule</Text>
                  </Button>
                </View>

                {fields.length === 0 ? (
                  <Text className="text-xs text-muted-foreground italic py-2">
                    No cancellation rules configured. 100% loss on cancellation.
                  </Text>
                ) : (
                  fields.map((fieldItem, idx) => (
                    <View key={fieldItem.id} className="flex-row items-center gap-2 bg-card p-2 rounded-xl border border-border">
                      <View className="flex-1">
                        <Controller
                          control={control}
                          name={`cancellationRefundRules.${idx}.cancelBeforeHours`}
                          render={({ field: { onChange, value } }) => (
                            <TextInput
                              label="Hours Before"
                              keyboardType="numeric"
                              value={value?.toString() ?? ''}
                              onChangeText={onChange}
                            />
                          )}
                        />
                      </View>
                      <View className="flex-1">
                        <Controller
                          control={control}
                          name={`cancellationRefundRules.${idx}.refundPercentage`}
                          render={({ field: { onChange, value } }) => (
                            <TextInput
                              label="Refund %"
                              keyboardType="numeric"
                              value={value?.toString() ?? ''}
                              onChangeText={onChange}
                            />
                          )}
                        />
                      </View>
                      <Button
                        variant="destructive"
                        size="icon"
                        onPress={() => remove(idx)}
                        className="h-10 w-10 mt-4 rounded-xl"
                      >
                        <Icon as={Trash2} size={16} className="text-destructive-foreground" />
                      </Button>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {/* Description & Rules */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Amenity Description & House Rules"
                multiline
                numberOfLines={3}
                value={value}
                onChangeText={onChange}
                placeholder="Specify rules, attire requirements, booking restrictions..."
              />
            )}
          />

          <Button
            variant="default"
            disabled={loading}
            onPress={handleSubmit(handleFormSubmit)}
            className="mt-2 h-12 rounded-xl"
          >
            <Text className="text-primary-foreground font-bold text-base">
              {loading ? 'Saving Amenity...' : amenity ? 'Update Amenity Record' : 'Create Amenity Master'}
            </Text>
          </Button>
        </View>
    </BottomSheet>
  );
};

export default AmenityFormModal;
