import React from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ScreenShell, TextInput, Button, ActionBar } from '@/components';
import { Text } from '@/components/ui/text';
import { usePolls } from '../hooks/usePolls';

const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  description: yup.string(),
  options: yup
    .array()
    .of(
      yup.object().shape({
        text: yup.string().required('Option text is required'),
      })
    )
    .min(2, 'At least 2 options are required'),
});

export default function CreatePollScreen() {
  const router = useRouter();
  const { submitNewPoll } = usePolls();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      options: [{ text: '' }, { text: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  });

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        question: data.title,
        description: data.description,
        options: data.options,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        visibility: 'Everyone',
      };
      await submitNewPoll(payload);
      router.back();
    } catch (error: any) {
      console.error('Failed to create poll', error);
      Alert.alert('Error', error?.message || 'Failed to create poll. Check if your question is at least 5 characters long.');
    }
  };

  return (
    <ScreenShell
      title="Create New Poll"
      subtitle="Gather feedback from the community"
      iconName="BarChart2"
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Poll Title"
              placeholder="E.g., Which amenities should we upgrade?"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.title?.message}
            />
          )}
        />

        <View className="mt-4">
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Description (Optional)"
                placeholder="Provide more context..."
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                error={errors.description?.message}
              />
            )}
          />
        </View>

        <View className="mt-6 mb-2 flex-row justify-between items-center">
          <View>
            <Button
              variant="outline"
              size="sm"
              onPress={() => append({ text: '' })}
            >
              <Text>Add Option</Text>
            </Button>
          </View>
        </View>

        {fields.map((field, index) => (
          <View key={field.id} className="mt-2 flex-row items-center">
            <View className="flex-1">
              <Controller
                control={control}
                name={`options.${index}.text` as const}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={`Option ${index + 1}`}
                    placeholder={`Option ${index + 1}`}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.options?.[index]?.text?.message}
                  />
                )}
              />
            </View>
            {fields.length > 2 && (
              <Button
                variant="destructive"
                size="icon"
                className="ml-2 mt-4"
                onPress={() => remove(index)}
              >
                <Text>X</Text>
              </Button>
            )}
          </View>
        ))}
        {errors.options?.root && (
          <TextInput error={errors.options.root.message} label="" value="" />
        )}
      </ScrollView>

      <ActionBar
        primaryAction={{ label: 'Create Poll', onPress: handleSubmit(onSubmit), loading: isSubmitting }}
        secondaryAction={{ label: 'Cancel', onPress: () => router.back() }}
      />
    </ScreenShell>
  );
}
