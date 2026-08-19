import React, { useEffect, useState, useCallback } from 'react';
import { View, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AttachmentPicker } from '@/components/ui/AttachmentPicker';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { ErrorBoundary } from '../components';

const CATEGORY_OPTIONS = [
  { label: 'General', value: 'General' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Events', value: 'Events' },
  { label: 'Emergency', value: 'Emergency' },
  { label: 'Meetings', value: 'Meetings' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
  { label: 'Critical', value: 'Critical' },
];

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Published', value: 'Published' },
  { label: 'Scheduled', value: 'Scheduled' },
  { label: 'Archived', value: 'Archived' },
];

// Validation Schema using Yup
const schema = yup.object().shape({
  title: yup.string().trim().required('Title is required').max(100, 'Title is too long'),
  description: yup.string().trim().required('Announcement details are required'),
  category: yup.string().required('Category is required'),
  priority: yup.string().required('Priority level is required'),
  status: yup.string().required('Publish status is required'),
  isPinned: yup.boolean(),
  expiryDate: yup.date().required('Expiry date is required'),
  scheduleDate: yup.date().when('status', {
    is: 'Scheduled',
    then: (s) => s.required('Schedule date is required').min(new Date(Date.now() - 60000), 'Schedule date must be in the future'),
    otherwise: (s) => s.notRequired(),
  }),
});

export default function CreateEditNoticeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEditMode = !!id;

  const {
    selectedNotice,
    loading,
    error,
    success,
    loadNoticeById,
    submitNotice,
    modifyNotice,
    clearNoticeSuccess,
    clearNoticeErrors,
  } = useNoticeBoard();

  const [images, setImages] = useState([]);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'General',
      priority: 'Medium',
      status: 'Draft',
      isPinned: false,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      scheduleDate: new Date(),
    },
  });

  const selectedStatus = watch('status');

  // Load notice details on mount if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadNoticeById(id);
    }
    return () => {
      clearNoticeErrors();
    };
  }, [id, isEditMode]);

  // Sync notice details to react-hook-form on load
  useEffect(() => {
    if (isEditMode && selectedNotice && selectedNotice._id === id) {
      reset({
        title: selectedNotice.title || '',
        description: selectedNotice.description || '',
        category: selectedNotice.category || 'General',
        priority: selectedNotice.priority || 'Medium',
        status: selectedNotice.status || 'Draft',
        isPinned: selectedNotice.isPinned || false,
        expiryDate: selectedNotice.expiryDate ? new Date(selectedNotice.expiryDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        scheduleDate: selectedNotice.scheduleDate ? new Date(selectedNotice.scheduleDate) : new Date(),
      });

      if (selectedNotice.images && Array.isArray(selectedNotice.images)) {
        setImages(
          selectedNotice.images.map((img) => ({
            id: img._id || img.url,
            uri: img.url,
            name: img.url.split('/').pop() || 'Remote_Image.jpg',
            type: 'image/jpeg',
            isRemote: true,
          }))
        );
      }
    }
  }, [selectedNotice, isEditMode, id, reset]);

  // Navigate back on successful save
  useEffect(() => {
    if (success === 'createSuccess' || success === 'updateSuccess') {
      clearNoticeSuccess();
      router.push('/(resident)/notices/manage');
    }
  }, [success, clearNoticeSuccess]);

  // AttachmentPicker Handlers
  const handleAddAttachments = useCallback((newFiles) => {
    const formatted = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      uri: file.uri,
      name: file.name || `photo_${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
      isRemote: false,
      file: file.file, // Keep the raw File object for web uploading
    }));
    setImages((prev) => {
      const combined = [...prev, ...formatted];
      return combined.slice(0, 5); // Enforce max 5 attachments
    });
  }, []);

  const handleRemoveAttachment = useCallback((index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('title', data.title.trim());
    formData.append('description', data.description.trim());
    formData.append('category', data.category);
    formData.append('priority', data.priority);
    formData.append('status', data.status);
    formData.append('expiryDate', data.expiryDate.toISOString());
    formData.append('isPinned', String(data.isPinned));

    if (data.status === 'Scheduled' && data.scheduleDate) {
      formData.append('scheduleDate', data.scheduleDate.toISOString());
    }

    // Append local files to FormData
    const localImages = images.filter((img) => !img.isRemote);
    console.log('[NoticeBoard Client] localImages to upload:', localImages);
    localImages.forEach((img, idx) => {
      if (img.file) {
        console.log(`[NoticeBoard Client] Appending web file [${idx}]:`, img.file.name, img.file.size, img.file.type);
        formData.append('images', img.file);
      } else {
        console.log(`[NoticeBoard Client] Appending mobile file [${idx}]:`, img.uri);
        formData.append('images', {
          uri: img.uri,
          name: img.name,
          type: img.type,
        });
      }
    });

    // Retain remote files to prevent deletion on PUT
    const remoteImages = images.filter((img) => img.isRemote).map((img) => {
      let relativeUrl = img.uri;
      if (relativeUrl.includes('/public/uploads/notices/')) {
        relativeUrl = '/public/uploads/notices/' + relativeUrl.split('/public/uploads/notices/').pop();
      }
      return {
        url: relativeUrl,
        filename: img.name,
      };
    });
    console.log('[NoticeBoard Client] remoteImages to retain:', remoteImages);
    formData.append('existingImages', JSON.stringify(remoteImages));

    if (isEditMode) {
      console.log('[NoticeBoard Client] Modifying notice ID:', id);
      await modifyNotice(id, formData);
    } else {
      console.log('[NoticeBoard Client] Creating notice');
      await submitNotice(formData);
    }
  };

  return (
    <ErrorBoundary>
      <ScreenShell
        title={isEditMode ? 'Edit Notice' : 'Create Notice'}
      >
        <ScrollContainer contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* API Save Errors */}
      {error && (
        <View className="bg-destructive/15 border border-destructive/30 p-3 rounded-lg mb-4">
          <Text className="text-destructive font-medium text-start">{error}</Text>
        </View>
      )}

      {/* Title Input */}
      <View className="mb-4">
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Notice Title *"
              value={value}
              onChangeText={onChange}
              placeholder="Enter notice title"
              error={errors.title?.message}
            />
          )}
        />
      </View>

      {/* Description Input */}
      <View className="mb-4">
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Announcement Details *"
              value={value}
              onChangeText={onChange}
              placeholder="Type announcements details here..."
              multiline
              numberOfLines={6}
              error={errors.description?.message}
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
          )}
        />
      </View>

      {/* Category Selector */}
      <View className="mb-4">
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <DropdownSelect
              label="Category *"
              options={CATEGORY_OPTIONS}
              value={value}
              onValueChange={onChange}
              error={errors.category?.message}
            />
          )}
        />
      </View>

      {/* Priority Selector */}
      <View className="mb-4">
        <Controller
          control={control}
          name="priority"
          render={({ field: { onChange, value } }) => (
            <DropdownSelect
              label="Priority Level *"
              options={PRIORITY_OPTIONS}
              value={value}
              onValueChange={onChange}
              error={errors.priority?.message}
            />
          )}
        />
      </View>

      {/* Status Selector */}
      <View className="mb-4">
        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <DropdownSelect
              label="Publish Status *"
              options={STATUS_OPTIONS}
              value={value}
              onValueChange={onChange}
              error={errors.status?.message}
            />
          )}
        />
      </View>

      {/* Scheduled Start Date Picker */}
      {selectedStatus === 'Scheduled' && (
        <View className="mb-4">
          <Controller
            control={control}
            name="scheduleDate"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                label="Scheduled Publish Date & Time *"
                value={value}
                onChange={onChange}
                error={errors.scheduleDate?.message}
              />
            )}
          />
        </View>
      )}

      {/* Expiry Date Picker */}
      <View className="mb-4">
        <Controller
          control={control}
          name="expiryDate"
          render={({ field: { onChange, value } }) => (
            <DatePicker
              label="Announcement Expiry *"
              value={value}
              onChange={onChange}
              error={errors.expiryDate?.message}
            />
          )}
        />
      </View>

      {/* Pinned Switch */}
      <View className="mb-6">
        <Controller
          control={control}
          name="isPinned"
          render={({ field: { onChange, value } }) => (
            <ToggleSwitch
              label="Pin Notice to Top"
              description="Highlight this announcement at the top of the board. Only one notice can be pinned at any time."
              value={value}
              onValueChange={onChange}
              className="bg-muted/20 border border-border px-4 py-2 rounded-lg"
            />
          )}
        />
      </View>

      {/* Attachments Section */}
      <View className="mb-6">
        <Text className="text-foreground text-sm font-semibold mb-2 text-start">Attachments (Images - Max 5)</Text>
        <AttachmentPicker
          attachments={images}
          onAdd={handleAddAttachments}
          onRemove={handleRemoveAttachment}
          maxFiles={5}
          accept="images"
        />
      </View>

      {/* Action Triggers */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button variant="outline" onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={handleSubmit(onSubmit)}>
            {isEditMode ? 'Update Notice' : 'Publish Notice'}
          </Button>
        </View>
      </View>
      </ScrollContainer>
      </ScreenShell>
    </ErrorBoundary>
  );
}
