import React from 'react';
import { confirmPickerDisclosure } from '@/src/utils/pickerDisclosure';
import { View, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { UploadCloud, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SECONDARY_CATEGORIES, STATUS_OPTIONS } from '../../../constants/amenityCatalogPresets';
import { generateFacilityCode } from '../../../services/amenityManagementService';
import { prepareImageForUpload } from '@/src/utils/imageUpload';

export interface BasicFacilityInfoData {
  name: string;
  code: string;
  category: string;
  location: string;
  status: 'active' | 'inactive' | 'draft';
  imageUrl?: string;
  description?: string;
}

export interface BasicFacilityInfoStepProps {
  data: BasicFacilityInfoData;
  onChange: (data: BasicFacilityInfoData) => void;
  errors?: Partial<Record<keyof BasicFacilityInfoData, string>>;
}

export const BasicFacilityInfoStep: React.FC<BasicFacilityInfoStepProps> = ({
  data,
  onChange,
  errors = {},
}) => {
  const updateField = (field: keyof BasicFacilityInfoData, val: any) => {
    onChange({
      ...data,
      [field]: val,
    });
  };

  const handleNameChange = (nameText: string) => {
    const isAutoCode =
      !data.code ||
      data.code.startsWith('FAC-') ||
      data.code.startsWith('FACILITY-') ||
      data.code.startsWith('SHARED-') ||
      data.code.startsWith('EXCLUSIVE-') ||
      data.code.startsWith('EVENT-') ||
      data.code.startsWith('ROOM-') ||
      data.code.startsWith('INVENTORY-');
    onChange({
      ...data,
      name: nameText,
      code: isAutoCode ? generateFacilityCode(nameText || 'FACILITY') : data.code,
    });
  };

  const pickFromWeb = () => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/jpg';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      updateField('imageUrl', objectUrl);
    };
    input.click();
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      pickFromWeb();
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Denied',
          'Permission to access media library is required to select images.'
        );
        return;
      }

      if (!(await confirmPickerDisclosure('photo'))) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = await prepareImageForUpload(result.assets[0], { maxDimension: 1440, quality: 0.72, prefix: 'facility' });
        updateField('imageUrl', image.uri);
      }
    } catch (err: any) {
      console.warn('[BasicFacilityInfoStep] launchImageLibraryAsync failed, falling back to document picker:', err);
      // Fallback to DocumentPicker if ImagePicker fails on device/web
      try {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ['image/*'],
          copyToCacheDirectory: true,
        });
        if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
          updateField('imageUrl', docResult.assets[0].uri);
          return;
        }
      } catch (fallbackErr: any) {
        Alert.alert('Image Picker Error', err?.message || 'Failed to select image.');
      }
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-1">
        <Text variant="large" className="font-bold text-foreground">
          Facility Details & Location
        </Text>
        <Text variant="muted" className="text-xs">
          Enter facility identification, zone location, and upload a cover photo.
        </Text>
      </View>

      {/* 1. TOP: General Facility Information */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-3.5">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          General Specifications
        </Text>

        <View className="gap-1">
          <TextInput
            label="Amenity Facility Name *"
            placeholder="e.g. Olympic Swimming Pool, Tennis Court #1"
            value={data.name}
            onChangeText={handleNameChange}
            error={errors.name}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <DropdownSelect
              label="Category Tag"
              options={SECONDARY_CATEGORIES}
              value={data.category}
              onValueChange={(val) => updateField('category', val)}
            />
          </View>
          <View className="flex-1">
            <DropdownSelect
              label="Status *"
              options={STATUS_OPTIONS}
              value={data.status}
              onValueChange={(val) => updateField('status', val)}
            />
          </View>
        </View>

        <TextInput
          label="Location / Zone *"
          placeholder="e.g. Clubhouse West Wing, Block B"
          value={data.location}
          onChangeText={(val) => updateField('location', val)}
          error={errors.location}
        />

        <TextInput
          label="Description & House Rules (Optional)"
          placeholder="Specify operating guidelines, attire requirements, age restrictions..."
          multiline
          numberOfLines={3}
          value={data.description || ''}
          onChangeText={(val) => updateField('description', val)}
        />
      </View>

      {/* 2. BOTTOM: Facility Cover Photo Dropzone */}
      <View className="bg-card p-4 rounded-3xl border border-border gap-2.5">
        <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Facility Cover Photo (Optional)
        </Text>

        {data.imageUrl ? (
          <View className="h-36 w-full rounded-2xl border-2 border-primary/20 bg-muted/10 relative overflow-hidden">
            <Image
              source={{ uri: data.imageUrl }}
              className="w-full h-full rounded-2xl"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/20 items-center justify-center">
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.8}
                className="bg-black/60 px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5"
                accessibilityRole="button"
                accessibilityLabel="Change photo"
              >
                <Icon as={UploadCloud} size={14} className="text-white" />
                <Text className="text-white text-xs font-bold">Change Photo</Text>
              </TouchableOpacity>
            </View>

            <Button
              variant="destructive"
              size="icon"
              onPress={() => updateField('imageUrl', '')}
              className="absolute top-2 end-2 h-7 w-7 rounded-full z-10"
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Icon as={X} size={14} className="text-destructive-foreground" />
            </Button>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.7}
            className="h-36 w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 items-center justify-center p-3 overflow-hidden active:bg-primary/10"
            accessibilityRole="button"
            accessibilityLabel="Upload facility cover photo"
          >
            <View className="items-center justify-center">
              <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mb-1.5">
                <Icon as={UploadCloud} size={22} className="text-primary" />
              </View>
              <Text className="text-sm font-semibold text-foreground text-center">
                Tap to upload photo or <Text className="text-primary font-bold">browse</Text>
              </Text>
              <Text className="text-[11px] text-muted-foreground mt-0.5">
                JPG, PNG supported (Displayed on resident card)
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default BasicFacilityInfoStep;
