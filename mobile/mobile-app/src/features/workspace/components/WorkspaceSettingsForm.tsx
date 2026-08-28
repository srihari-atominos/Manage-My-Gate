import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { Text } from '@/components/ui/text';
import { useWorkspace } from '../hooks/useWorkspace';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { Mail, Phone, Clock, Globe, Building2 } from 'lucide-react-native';

const workspaceSchema = z.object({
  workspaceName: z.string().min(2, 'Workspace name is required'),
  contactEmail: z.string().email('Invalid email address').or(z.literal('')),
  contactPhone: z.string().optional(),
  timeZone: z.string().optional(),
  language: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export const WorkspaceSettingsForm = () => {
  const { loadWorkspaceDetails, saveWorkspaceDetails, settings, loading, saving } = useWorkspace();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      workspaceName: '',
      contactEmail: '',
      contactPhone: '',
      timeZone: '',
      language: '',
    },
  });

  useEffect(() => {
    loadWorkspaceDetails('current');
  }, [loadWorkspaceDetails]);

  useEffect(() => {
    if (settings) {
      reset({
        workspaceName: settings.workspaceName || settings.name || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        timeZone: settings.timeZone || '',
        language: settings.language || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: WorkspaceFormValues) => {
    try {
      await saveWorkspaceDetails('current', data).unwrap();
      Alert.alert('Success', 'Workspace settings updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to save settings');
    }
  };

  if (loading && !settings) {
    return (
      <View className="p-4 items-center justify-center min-h-[200px]">
        <Text className="text-muted-foreground">Loading workspace settings...</Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="mb-2">
        <Text className="text-lg font-bold text-foreground mb-1">General Information</Text>
        <Text className="text-sm text-muted-foreground">Update your community's primary details and branding.</Text>
      </View>

      <Controller
        control={control}
        name="workspaceName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Workspace Name"
            placeholder="e.g. Green Valley Estates"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.workspaceName?.message}
            leftIcon={Building2}
            required
          />
        )}
      />

      <Controller
        control={control}
        name="contactEmail"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Contact Email"
            placeholder="admin@community.com"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.contactEmail?.message}
            leftIcon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />

      <Controller
        control={control}
        name="contactPhone"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Contact Phone"
            placeholder="+1 234 567 8900"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.contactPhone?.message}
            leftIcon={Phone}
            keyboardType="phone-pad"
          />
        )}
      />

      <Controller
        control={control}
        name="timeZone"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Timezone"
            placeholder="e.g. UTC"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.timeZone?.message}
            leftIcon={Clock}
          />
        )}
      />

      <Controller
        control={control}
        name="language"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Primary Language"
            placeholder="e.g. en-US"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.language?.message}
            leftIcon={Globe}
          />
        )}
      />

      <View className="mt-4">
        <Button
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          disabled={loading || saving}
        >
          Save Changes
        </Button>
      </View>
    </View>
  );
};
