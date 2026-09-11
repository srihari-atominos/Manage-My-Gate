import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { ScrollContainer } from '@/components/layout/ScrollContainer';
import { TextInput } from '@/components/forms/TextInput';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AttachmentPicker } from '@/components/ui/AttachmentPicker';
import { getStatusTabStyle } from '@/components/ui/statusTabColors';

import { useNoticeBoard } from '../hooks/useNoticeBoard';
import { ErrorBoundary } from '../components';
import {
  FileText,
  Tag,
  Calendar,
  ShieldAlert,
  Paperclip,
} from 'lucide-react-native';

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
  { label: 'Urgent', value: 'Critical' },
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
  isCritical: yup.boolean(),
  allowComments: yup.boolean().default(true),
  requiresAcknowledgement: yup.boolean(),
  acknowledgementDeadline: yup.date().nullable().optional(),
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
    resetFilters,
  } = useNoticeBoard();

  const [images, setImages] = useState([]);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'General',
      priority: 'Medium',
      status: 'Published',
      isPinned: false,
      isCritical: false,
      allowComments: true,
      requiresAcknowledgement: false,
      acknowledgementDeadline: null,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      scheduleDate: new Date(),
    },
  });

  const selectedStatus = watch('status');
  const watchRequiresAck = watch('requiresAcknowledgement');

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
        status: selectedNotice.status || 'Published',
        isPinned: selectedNotice.isPinned || false,
        isCritical: selectedNotice.isCritical || false,
        allowComments: selectedNotice.allowComments !== false,
        requiresAcknowledgement: selectedNotice.requiresAcknowledgement || false,
        acknowledgementDeadline: selectedNotice.acknowledgementDeadline ? new Date(selectedNotice.acknowledgementDeadline) : null,
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
      resetFilters();
      router.push('/(resident)/notices/manage');
    }
  }, [success, clearNoticeSuccess, resetFilters, router]);

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
    formData.append('isCritical', String(data.isCritical || data.requiresAcknowledgement || false));
    formData.append('allowComments', String(data.allowComments !== false));
    formData.append('requiresAcknowledgement', String(data.requiresAcknowledgement || false));

    if (data.requiresAcknowledgement && data.acknowledgementDeadline) {
      formData.append('acknowledgementDeadline', data.acknowledgementDeadline.toISOString());
    }

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
    formData.append('existingImages', JSON.stringify(remoteImages));

    if (isEditMode) {
      await modifyNotice(id, formData);
    } else {
      await submitNotice(formData);
    }
  };

  return (
    <ErrorBoundary>
      <ScreenShell
        title={isEditMode ? 'Edit Community Notice' : 'Create Community Notice'}
        subtitle={isEditMode ? 'Update notice lifecycle, priorities & distribution' : 'Compose announcements, schedule releases & notify residents'}
      >
        <ScrollContainer contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* API Save Errors */}
          {error && (
            <View className="bg-destructive/15 border border-destructive/30 p-3 rounded-2xl mb-4">
              <Text className="text-destructive font-medium text-start text-xs">{error}</Text>
            </View>
          )}

          {/* Section 1: Notice Content Details */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-4 mb-4 shadow-2xs">
            <View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
              <FileText size={18} className="text-primary" />
              <View className="flex-1">
                <Text variant="large" className="font-bold text-foreground">
                  Notice Content
                </Text>
                <Text variant="muted" className="text-xs">
                  Title and announcement description
                </Text>
              </View>
            </View>

            {/* Title Input */}
            <View>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Notice Title *"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. Scheduled Water Maintenance"
                    error={errors.title?.message}
                  />
                )}
              />
            </View>

            {/* Description Input */}
            <View>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    label="Announcement Details *"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Type announcement details, schedules, affected areas..."
                    multiline
                    numberOfLines={5}
                    error={errors.description?.message}
                    style={{ minHeight: 110, textAlignVertical: 'top' }}
                  />
                )}
              />
            </View>
          </View>

          {/* Section 2: Classification & Urgency (Pill Selectors matching Visitor Management) */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-4 mb-4 shadow-2xs">
            <View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
              <Tag size={18} className="text-primary" />
              <View className="flex-1">
                <Text variant="large" className="font-bold text-foreground">
                  Classification & Urgency
                </Text>
                <Text variant="muted" className="text-xs">
                  Category tag and broadcast priority level
                </Text>
              </View>
            </View>

            {/* Category Selector (Horizontal Pill Buttons) */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Category *
              </Text>
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                    >
                      {CATEGORY_OPTIONS.map((option) => {
                        const isSelected = value === option.value;
                        const statusStyle = getStatusTabStyle(option.value, isSelected);
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            activeOpacity={0.8}
                            className={`flex-row items-center px-4 py-2 rounded-full border ${statusStyle.containerClass}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text className={`text-xs font-bold ${statusStyle.textClass}`}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {errors.category?.message && (
                      <Text className="text-xs text-destructive mt-1">{errors.category?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Priority Selector (Horizontal Pill Buttons) */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Priority Level *
              </Text>
              <Controller
                control={control}
                name="priority"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                    >
                      {PRIORITY_OPTIONS.map((option) => {
                        const isSelected = value === option.value || (option.value === 'Critical' && value === 'Urgent');
                        const statusStyle = getStatusTabStyle(option.label, isSelected);
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => {
                              onChange(option.value);
                              if (option.value === 'Critical') {
                                setValue('isCritical', true);
                              }
                            }}
                            activeOpacity={0.8}
                            className={`flex-row items-center px-4 py-2 rounded-full border ${statusStyle.containerClass}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text className={`text-xs font-bold ${statusStyle.textClass}`}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {errors.priority?.message && (
                      <Text className="text-xs text-destructive mt-1">{errors.priority?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>
          </View>

          {/* Section 3: Publishing & Schedule (Status Pills & Date Controls) */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-4 mb-4 shadow-2xs">
            <View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
              <Calendar size={18} className="text-primary" />
              <View className="flex-1">
                <Text variant="large" className="font-bold text-foreground">
                  Publishing & Lifecycle
                </Text>
                <Text variant="muted" className="text-xs">
                  Notice status, scheduled broadcast and expiry dates
                </Text>
              </View>
            </View>

            {/* Status Selector (Horizontal Pill Buttons) */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Publish Status *
              </Text>
              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                    >
                      {STATUS_OPTIONS.map((option) => {
                        const isSelected = value === option.value;
                        const statusStyle = getStatusTabStyle(option.value, isSelected);
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            activeOpacity={0.8}
                            className={`flex-row items-center px-4 py-2 rounded-full border ${statusStyle.containerClass}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                          >
                            <Text className={`text-xs font-bold ${statusStyle.textClass}`}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {errors.status?.message && (
                      <Text className="text-xs text-destructive mt-1">{errors.status?.message}</Text>
                    )}
                  </View>
                )}
              />
            </View>

            {/* Scheduled Start Date Picker */}
            {selectedStatus === 'Scheduled' && (
              <View>
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
            <View>
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
          </View>

          {/* Section 4: Security & Compliance */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-4 mb-4 shadow-2xs">
            <View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
              <ShieldAlert size={18} className="text-primary" />
              <View className="flex-1">
                <Text variant="large" className="font-bold text-foreground">
                  Security & Compliance
                </Text>
                <Text variant="muted" className="text-xs">
                  Pin to top, urgent emergency alerts and read confirmations
                </Text>
              </View>
            </View>

            {/* Pinned Switch */}
            <Controller
              control={control}
              name="isPinned"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Pin Notice to Top"
                  description="Keep this announcement pinned at the top of the community board."
                  value={value}
                  onValueChange={onChange}
                  className="bg-muted/20 border border-border px-4 py-2.5 rounded-xl"
                />
              )}
            />

            {/* Allow Resident Comments Switch */}
            <Controller
              control={control}
              name="allowComments"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Allow Resident Comments"
                  description="Permit residents to post questions and discussions on this announcement."
                  value={value}
                  onValueChange={onChange}
                  className="bg-muted/20 border border-border px-4 py-2.5 rounded-xl"
                />
              )}
            />

            {/* Critical Alert Switch */}
            <Controller
              control={control}
              name="isCritical"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Critical / Urgent Notice"
                  description="Triggers high-priority visual badges and immediate alerts."
                  value={value}
                  onValueChange={(val) => {
                    onChange(val);
                    if (val) {
                      setValue('priority', 'Critical');
                    }
                  }}
                  className="bg-muted/20 border border-border px-4 py-2.5 rounded-xl"
                />
              )}
            />

            {/* Mandatory Acknowledgement Switch */}
            <Controller
              control={control}
              name="requiresAcknowledgement"
              render={({ field: { onChange, value } }) => (
                <ToggleSwitch
                  label="Require Resident Acknowledgement"
                  description="Residents must explicitly confirm they have read this announcement."
                  value={value}
                  onValueChange={(val) => {
                    onChange(val);
                    if (val) {
                      setValue('isCritical', true);
                      setValue('priority', 'Critical');
                    }
                  }}
                  className="bg-muted/20 border border-border px-4 py-2.5 rounded-xl"
                />
              )}
            />

            {/* Acknowledgement Deadline */}
            {watchRequiresAck && (
              <View>
                <Controller
                  control={control}
                  name="acknowledgementDeadline"
                  render={({ field: { onChange, value } }) => (
                    <DatePicker
                      label="Acknowledgement Deadline"
                      value={value || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)}
                      onChange={onChange}
                    />
                  )}
                />
              </View>
            )}
          </View>

          {/* Section 5: Media Attachments */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-4 mb-4 shadow-2xs">
            <View className="flex-row items-center gap-2 border-b border-border/60 pb-3">
              <Paperclip size={18} className="text-primary" />
              <View className="flex-1">
                <Text variant="large" className="font-bold text-foreground">
                  Media Attachments
                </Text>
                <Text variant="muted" className="text-xs">
                  Upload photos, notices or memos (Max 5 images)
                </Text>
              </View>
            </View>

            <AttachmentPicker
              attachments={images}
              onAdd={handleAddAttachments}
              onRemove={handleRemoveAttachment}
              maxFiles={5}
              accept="images"
            />
          </View>

          {/* Action Row */}
          <View className="flex-row gap-3 pt-2 pb-6">
            <View className="flex-1">
              <Button variant="outline" onPress={() => router.back()}>
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button onPress={handleSubmit(onSubmit)} loading={loading}>
                {isEditMode
                  ? 'Update Notice'
                  : selectedStatus === 'Draft'
                  ? 'Save as Draft'
                  : selectedStatus === 'Scheduled'
                  ? 'Schedule Notice'
                  : 'Publish Notice'}
              </Button>
            </View>
          </View>
        </ScrollContainer>
      </ScreenShell>
    </ErrorBoundary>
  );
}
