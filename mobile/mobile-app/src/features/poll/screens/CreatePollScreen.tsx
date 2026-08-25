import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActionBar } from '@/components/ui/ActionBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Plus, Trash2 } from 'lucide-react-native';

import { usePolls } from '../hooks/usePolls';

const VISIBILITY_OPTIONS = [
  { label: 'Everyone (All Residents & Staff)', value: 'Everyone' },
  { label: 'Residents Only', value: 'Residents Only' },
  { label: 'Community Admin Only', value: 'Community Admin Only' },
];

const schema = yup.object().shape({
  question: yup
    .string()
    .trim()
    .required('Poll question is required')
    .min(5, 'Question must be at least 5 characters long')
    .max(200, 'Question cannot exceed 200 characters'),
  description: yup.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional(),
  visibility: yup.string().required('Visibility is required'),
  endDate: yup.date().required('End date is required').min(new Date(), 'End date must be in the future'),
  options: yup
    .array()
    .of(
      yup.object().shape({
        text: yup.string().trim().required('Option text cannot be empty'),
      })
    )
    .min(2, 'At least 2 options are required')
    .max(5, 'Maximum of 5 options allowed')
    .test('unique-options', 'All options must be unique', (options) => {
      if (!options) return true;
      const texts = options.map((opt) => opt.text.trim().toLowerCase()).filter(Boolean);
      const unique = new Set(texts);
      return unique.size === texts.length;
    }),
});

interface PollFormData {
  question: string;
  description?: string;
  visibility: string;
  endDate: Date;
  options: { text: string }[];
}

export function CreatePollScreen() {
  const router = useRouter();
  const { submitNewPoll } = usePolls();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PollFormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      question: '',
      description: '',
      visibility: 'Everyone',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      options: [{ text: '' }, { text: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  const onSubmit = async (data: PollFormData) => {
    setSubmitError(null);

    try {
      const payload = {
        question: data.question.trim(),
        description: data.description?.trim() || '',
        options: data.options.map((opt) => ({ text: opt.text.trim() })),
        endDate: data.endDate.toISOString(),
        visibility: data.visibility,
      };

      await submitNewPoll(payload);
      router.back();
    } catch (err: any) {
      setSubmitError(
        err?.message || err || 'Failed to create poll. Please check if all options are filled and unique.'
      );
    }
  };

  return (
    <ScreenShell
      title="Create New Poll"
      subtitle="Gather feedback & vote on community matters"
      iconName="BarChart2"
    >
      <ScrollContainer contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {/* Error Banner */}
        {submitError ? (
          <View className="mb-4">
            <ErrorBanner
              message={submitError}
              onDismiss={() => setSubmitError(null)}
            />
          </View>
        ) : null}

        {/* Section 1: Question & Details */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-foreground">Poll Question</Text>

          {/* Question Input */}
          <Controller
            control={control}
            name="question"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Question *"
                placeholder="E.g., Should we install solar lighting along walking paths?"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.question?.message}
              />
            )}
          />

          {/* Description Input */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Description & Context (Optional)"
                placeholder="Provide background context or rationale for this survey..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                className="min-h-[80px] text-start"
                error={errors.description?.message}
              />
            )}
          />
        </View>

        {/* Section 2: Voting Options */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold text-foreground">Voting Choices</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Provide between 2 to 5 distinct options for residents to vote.
              </Text>
            </View>
            {fields.length < 5 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 flex-row items-center"
                onPress={() => append({ text: '' })}
              >
                <Plus size={14} className="text-primary me-1" />
                <Text className="text-xs font-bold text-primary">Add</Text>
              </Button>
            ) : null}
          </View>

          {errors.options?.message ? (
            <Text className="text-xs text-destructive">{errors.options.message}</Text>
          ) : null}

          {fields.map((field, index) => (
            <View key={field.id} className="flex-row items-center gap-2 mt-1">
              <View className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
                <Text className="text-xs font-bold text-primary">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`options.${index}.text` as const}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label=""
                      placeholder={`Option ${index + 1}`}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.options?.[index]?.text?.message}
                    />
                  )}
                />
              </View>
              {fields.length > 2 ? (
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-10 h-10 rounded-xl"
                  onPress={() => remove(index)}
                  accessibilityLabel={`Remove Option ${index + 1}`}
                >
                  <Trash2 size={16} className="text-destructive-foreground" />
                </Button>
              ) : null}
            </View>
          ))}
        </View>

        {/* Section 3: Target Audience & Expiry Deadline */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
          <Text className="text-sm font-bold text-foreground">Audience & Deadline</Text>

          {/* Visibility Selector */}
          <Controller
            control={control}
            name="visibility"
            render={({ field: { onChange, value } }) => (
              <DropdownSelect
                label="Target Audience *"
                options={VISIBILITY_OPTIONS}
                value={value}
                onValueChange={onChange}
                error={errors.visibility?.message}
              />
            )}
          />

          {/* End Date Picker */}
          <Controller
            control={control}
            name="endDate"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Poll Closing Date *"
                value={value}
                onChange={onChange}
                error={errors.endDate?.message}
              />
            )}
          />
        </View>
      </ScrollContainer>

      {/* Sticky Action Bar */}
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
          Publish Poll
        </Button>
      </ActionBar>
    </ScreenShell>
  );
}

export default CreatePollScreen;
