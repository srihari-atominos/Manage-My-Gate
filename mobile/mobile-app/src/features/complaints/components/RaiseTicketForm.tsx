import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { AttachmentPicker, Attachment } from '@/components/ui/AttachmentPicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActionBar } from '@/components/ui/ActionBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

import { useComplaints } from '../hooks/useComplaints';
import complaintService from '../services/complaintService';

const CATEGORY_OPTIONS = [
  { label: 'Plumbing (Leaks, Pipes, Taps)', value: 'Plumbing' },
  { label: 'Electrical (Wiring, Lighting, Power)', value: 'Electrical' },
  { label: 'Carpentry & Civil (Doors, Walls, Tiles)', value: 'Civil' },
  { label: 'HVAC & Appliances (AC, Heater, Lift)', value: 'HVAC' },
  { label: 'Noise & Disturbance', value: 'Noise' },
  { label: 'Security & Common Area Gate', value: 'Security' },
  { label: 'Other Maintenance Request', value: 'Other' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low', color: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { label: 'Medium', value: 'Medium', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { label: 'High', value: 'High', color: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { label: 'Critical', value: 'Critical', color: 'border-destructive/40 bg-destructive/10 text-destructive' },
];

const schema = yup.object({
  title: yup
    .string()
    .trim()
    .required('Incident title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  category: yup.string().required('Please select a category'),
  priority: yup.string().required('Please select a priority level'),
  location: yup.string().trim().default(''),
  description: yup
    .string()
    .trim()
    .required('Please describe the issue')
    .min(10, 'Description must be at least 10 characters'),
});

type FormData = yup.InferType<typeof schema>;

export function RaiseTicketForm() {
  const router = useRouter();
  const { createComplaint, error, clearErrors } = useComplaints();

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      title: '',
      category: 'Plumbing',
      priority: 'Medium',
      location: '',
      description: '',
    },
  });

  const selectedPriority = watch('priority');

  const handleAddAttachments = useCallback((newFiles: Attachment[]) => {
    setAttachments((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 5); // Enforce max 5 attachments
    });
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    clearErrors();
    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];
      if (attachments.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < attachments.length; i++) {
          const item = attachments[i];
          if (item.uri) {
            if (Platform.OS === 'web' && item.file) {
              formData.append('attachments', item.file);
            } else {
              formData.append('attachments', {
                uri: item.uri,
                name: item.name || `photo_${Date.now()}_${i}.jpg`,
                type: item.type || 'image/jpeg',
              } as any);
            }
          }
        }
        try {
          const uploadRes: any = await complaintService.uploadAttachments(formData);
          const resData = uploadRes?.data || uploadRes || [];
          photoUrls = Array.isArray(resData) ? resData : [];
        } catch (uploadErr) {
          console.warn('[RaiseTicketForm] Attachment upload fallback to raw URIs:', uploadErr);
          photoUrls = attachments.map((a) => a.uri).filter(Boolean) as string[];
        }
      }

      const payload: any = {
        title: data.title.trim(),
        category: data.category,
        priority: data.priority,
        description: data.description.trim(),
        location: data.location?.trim() ? { unit: data.location.trim() } : undefined,
        attachments: photoUrls,
      };

      const result = await createComplaint(payload);
      const ticketId = (result as any)?._id || (result as any)?.id || 'NEW';
      setCreatedTicketId(ticketId);
      setIsSubmitting(false);
      setSuccessModalOpen(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message || err || 'Failed to submit maintenance ticket. Please try again.');
    }
  };

  const handleSuccessClose = () => {
    setSuccessModalOpen(false);
    router.replace('/(resident)/complaints/my-tickets' as any);
  };

  return (
    <ScreenShell
      title="Raise Ticket"
      subtitle="Report a maintenance issue or community incident"
      iconName="PlusCircle"
    >
      <ScrollContainer contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {/* Error Banner */}
        {submitError || error ? (
          <View className="mb-4">
            <ErrorBanner
              message={submitError || error || 'An error occurred'}
              onDismiss={() => {
                setSubmitError(null);
                clearErrors();
              }}
            />
          </View>
        ) : null}

        {/* Section 1: Issue Classification */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-foreground">Issue Classification</Text>

          {/* Category Dropdown */}
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <DropdownSelect
                label="Maintenance Category *"
                options={CATEGORY_OPTIONS}
                value={value}
                onValueChange={onChange}
                error={errors.category?.message}
              />
            )}
          />

          {/* Priority Level Selector */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-foreground">Priority Level *</Text>
            <View className="flex-row gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const isSelected = selectedPriority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    activeOpacity={0.7}
                    onPress={() => setValue('priority', p.value, { shouldValidate: true })}
                    className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                      isSelected
                        ? p.color + ' border-2 font-bold'
                        : 'border-border bg-background'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel={`Set priority to ${p.label}`}
                  >
                    <Text
                      className={`text-xs ${
                        isSelected ? 'font-extrabold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.priority ? (
              <Text className="text-xs text-destructive mt-0.5">{errors.priority.message}</Text>
            ) : null}
          </View>
        </View>

        {/* Section 2: Issue Details */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-foreground">Incident Details</Text>

          {/* Title Input */}
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Issue Title *"
                placeholder="E.g., Water leakage under bathroom sink"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.title?.message}
              />
            )}
          />

          {/* Location Input */}
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Specific Location (Optional)"
                placeholder="E.g., Master Bathroom / Villa 104 Kitchen"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.location?.message}
              />
            )}
          />

          {/* Description Input */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Detailed Description *"
                placeholder="Describe the issue, when it started, and any immediate hazards..."
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                className="min-h-[100px] text-start"
                error={errors.description?.message}
              />
            )}
          />
        </View>

        {/* Section 3: Photo Attachments */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-3">
          <View>
            <Text className="text-sm font-bold text-foreground">Photo Attachments</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Attach up to 5 photos to help technicians diagnose the issue faster.
            </Text>
          </View>

          <AttachmentPicker
            attachments={attachments}
            onAdd={handleAddAttachments}
            onRemove={handleRemoveAttachment}
            maxFiles={5}
            accept="images"
          />
        </View>
      </ScrollContainer>

      {/* Sticky Bottom Action Bar */}
      <ActionBar>
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          className="flex-1 ms-2"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Submit Ticket
        </Button>
      </ActionBar>

      {/* Success Modal */}
      <ConfirmationModal
        visible={successModalOpen}
        title="Ticket Submitted Successfully!"
        message="Your maintenance request has been logged and queued for facility assignment. You can track progress in My Tickets."
        confirmLabel="View My Tickets"
        cancelLabel="Done"
        variant="info"
        onConfirm={handleSuccessClose}
        onCancel={handleSuccessClose}
      />
    </ScreenShell>
  );
}

export default RaiseTicketForm;
