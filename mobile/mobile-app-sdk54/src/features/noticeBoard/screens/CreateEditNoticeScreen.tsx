import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
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
import { AttachmentPicker, AttachmentFile } from '@/components/ui/AttachmentPicker';
import { ActionBar } from '@/components/ui/ActionBar';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';

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
  isPinned: yup.boolean().default(false),
  expiryDate: yup.date().required('Expiry date is required'),
  scheduleDate: yup.date().when('status', {
    is: 'Scheduled',
    then: (s) => s.required('Schedule date is required').min(new Date(Date.now() - 60000), 'Schedule date must be in the future'),
    otherwise: (s) => s.notRequired(),
  }),
});

interface NoticeFormData {
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  isPinned?: boolean;
  expiryDate: Date;
  scheduleDate?: Date;
}

export function CreateEditNoticeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
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

  const [images, setImages] = useState<any[]>([]);

  const { control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<NoticeFormData>({
    resolver: yupResolver(schema) as any,
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
  }, [id, isEditMode, loadNoticeById, clearNoticeErrors]);

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
          selectedNotice.images.map((img: any) => ({
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
      router.push('/(resident)/notices/manage' as any);
    }
  }, [success, clearNoticeSuccess, router]);

  // AttachmentPicker Handlers
  const handleAddAttachments = useCallback((newFiles: AttachmentFile[]) => {
    const formatted = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      uri: file.uri,
      name: file.name || `photo_${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
      isRemote: false,
      file: (file as any).file, // Keep the raw File object for web uploading
    }));
    setImages((prev) => {
      const combined = [...prev, ...formatted];
      return combined.slice(0, 5); // Enforce max 5 attachments
    });
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = async (data: NoticeFormData) => {
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
    localImages.forEach((img) => {
      if (img.file) {
        formData.append('images', img.file);
      } else {
        formData.append('images', {
          uri: img.uri,
          name: img.name,
          type: img.type,
        } as any);
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
    formData.append('existingImages', JSON.stringify(remoteImages));

    if (isEditMode && id) {
      await modifyNotice(id, formData);
    } else {
      await submitNotice(formData);
    }
  };

  return (
    <ErrorBoundary>
      <ScreenShell
        title={isEditMode ? 'Edit Notice' : 'Create Notice'}
        subtitle="Broadcast community circulars & announcements"
        iconName="Bell"
      >
        <ScrollContainer contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {/* API Save Errors */}
          {error ? (
            <View className="mb-4">
              <ErrorBanner message={error} onDismiss={clearNoticeErrors} />
            </View>
          ) : null}

          {/* Section 1: Basic Information */}
          <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
            <Text className="text-sm font-bold text-foreground">Announcement Details</Text>

            {/* Title Input */}
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

            {/* Description Input */}
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
                  numberOfLines={5}
                  className="min-h-[120px] text-start"
                  error={errors.description?.message}
                />
              )}
            />
          </View>

          {/* Section 2: Classification & Schedule */}
          <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-4">
            <Text className="text-sm font-bold text-foreground">Targeting & Schedule</Text>

            {/* Category Selector */}
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

            {/* Priority Selector */}
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

            {/* Status Selector */}
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

            {/* Scheduled Start Date Picker */}
            {selectedStatus === 'Scheduled' ? (
              <Controller
                control={control}
                name="scheduleDate"
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    label="Scheduled Publish Date & Time *"
                    value={value || new Date()}
                    onChange={onChange}
                    error={errors.scheduleDate?.message}
                  />
                )}
              />
            ) : null}

            {/* Expiry Date Picker */}
            <Controller
              control={control}
              name="expiryDate"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  label="Announcement Expiry Date *"
                  value={value}
                  onChange={onChange}
                  error={errors.expiryDate?.message}
                />
              )}
            />

            {/* Pinned Switch */}
            <Controller
              control={control}
              name="isPinned"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Pin Notice to Top"
                  description="Highlight this announcement at the top of the resident board."
                  value={value || false}
                  onValueChange={onChange}
                  className="bg-muted/20 border border-border px-4 py-2.5 rounded-xl mt-1"
                />
              )}
            />
          </View>

          {/* Section 3: Attachments */}
          <View className="bg-card border border-border rounded-2xl p-4 mb-4 gap-3">
            <View>
              <Text className="text-sm font-bold text-foreground">Attachments</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Attach circulars, photos, or circular notices (Max 5).
              </Text>
            </View>
            <AttachmentPicker
              attachments={images}
              onAdd={handleAddAttachments}
              onRemove={handleRemoveAttachment}
              maxFiles={5}
              accept="images"
            />
          </View>
        </ScrollContainer>

        {/* Sticky Action Bar */}
        <ActionBar>
          <Button variant="outline" className="flex-1" onPress={() => router.back()} disabled={isSubmitting || loading}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1 ms-2"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting || loading}
            disabled={isSubmitting || loading}
          >
            {isEditMode ? 'Update Notice' : 'Publish Notice'}
          </Button>
        </ActionBar>
      </ScreenShell>
    </ErrorBoundary>
  );
}

export default CreateEditNoticeScreen;
