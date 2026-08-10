import React from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { User, Phone, Car, Tag } from 'lucide-react-native';

const passSchema = yup.object({
  visitorName: yup.string().required('Visitor Name is required').min(2, 'Name is too short'),
  phone: yup.string().defined().default(''),
  passType: yup.string().required('Pass type is required').default('GUEST'),
  purpose: yup.string().defined().default(''),
});

export type CreatePassFormData = yup.InferType<typeof passSchema>;

interface CreateVisitorPassSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePassFormData) => Promise<void>;
  loading?: boolean;
}

const PASS_TYPES = [
  { id: 'GUEST', label: 'Guest' },
  { id: 'DELIVERY', label: 'Delivery' },
  { id: 'CAB', label: 'Cab / Taxi' },
  { id: 'SERVICE', label: 'Service' },
];

export const CreateVisitorPassSheet: React.FC<CreateVisitorPassSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreatePassFormData>({
    resolver: yupResolver(passSchema),
    defaultValues: {
      visitorName: '',
      phone: '',
      passType: 'GUEST',
      purpose: '',
    },
  });

  const handleFormSubmit = async (data: CreatePassFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Create Visitor Pass">
      <ScrollView className="max-h-[500px] p-2">
        <View className="gap-4">
          {/* Pass Type Selector Chips */}
          <View className="gap-1.5">
            <Text className="text-foreground font-semibold text-sm">Pass Type</Text>
            <Controller
              control={control}
              name="passType"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2 flex-wrap">
                  {PASS_TYPES.map((type) => {
                    const isSelected = value === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        onPress={() => onChange(type.id)}
                        activeOpacity={0.8}
                        className={`px-3 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'bg-card border-border'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* Visitor Name Field */}
          <Controller
            control={control}
            name="visitorName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Visitor Full Name"
                placeholder="e.g. Rahul Sharma"
                leftIcon={<User size={18} className="text-muted-foreground" />}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.visitorName?.message}
              />
            )}
          />

          {/* Phone Field */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Visitor Phone Number (Optional)"
                placeholder="+919876543210"
                keyboardType="phone-pad"
                leftIcon={<Phone size={18} className="text-muted-foreground" />}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phone?.message}
              />
            )}
          />

          {/* Purpose / Vehicle Note */}
          <Controller
            control={control}
            name="purpose"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Note / Vehicle Info (Optional)"
                placeholder="e.g. Amazon Delivery / KA-01-AB-1234"
                leftIcon={<Tag size={18} className="text-muted-foreground" />}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.purpose?.message}
              />
            )}
          />

          {/* Submit Action */}
          <Button
            onPress={handleSubmit(handleFormSubmit)}
            disabled={loading}
            className="mt-2 h-12 rounded-xl bg-primary"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-primary-foreground text-base">
                Generate Visitor Pass
              </Text>
            )}
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default CreateVisitorPassSheet;
