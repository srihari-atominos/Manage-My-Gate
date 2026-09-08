import React, { useState } from 'react';
import { View, ScrollView, Modal, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { DetailRow } from '@/components/ui/DetailRow';
import { TextInput } from '@/components/forms/TextInput';
import { SuccessToast } from '@/components/feedback/SuccessToast';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { VillaSwitchModal } from '@/components/navigation/VillaSwitchModal';
import { OrgSwitchModal } from '@/components/navigation/OrgSwitchModal';
import { RoleSwitchModal } from '@/components/navigation/RoleSwitchModal';
import { ProfileHeaderCard } from '@/src/features/profile/components/ProfileHeaderCard';
import { useProfile } from '@/src/features/profile/hooks/useProfile';
import { useTranslation } from '@/src/utils/i18n';
import authService from '@/src/features/auth/services/authService';
import { LogOut, Save, Building2, Home, ShieldCheck, Settings, Camera, Image as ImageIcon, FileUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, tRole } = useTranslation();
  const {
    user,
    dynamicUnit,
    dynamicCommunity,
    dynamicRole,
    emergencyContact,
    saving,
    successMessage,
    villaModalOpen,
    orgModalOpen,
    roleModalOpen,
    setVillaModalOpen,
    setOrgModalOpen,
    setRoleModalOpen,
    updateEmergencyContact,
    logout,
  } = useProfile();

  const [contactName, setContactName] = useState(emergencyContact.name);
  const [contactPhone, setContactPhone] = useState(emergencyContact.phone);

  // Avatar upload states
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const handleSaveContact = () => {
    updateEmergencyContact({
      name: contactName,
      phone: contactPhone,
    });
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : t('logged_in_resident', 'Resident User'));

  const handleBackToDashboard = () => {
    router.replace('/(resident)/dashboard' as any);
  };

  const uploadAvatarFile = async (uri: string, name?: string, type?: string) => {
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('avatar', blob, name || 'avatar.jpg');
      } else {
        formData.append('avatar', {
          uri,
          name: name || 'avatar.jpg',
          type: type || 'image/jpeg',
        } as any);
      }

      await authService.updateProfile(formData);
      setAvatarUri(uri);
      setAvatarSuccess(t('avatar_updated_success', 'Profile photo updated successfully'));
      setTimeout(() => setAvatarSuccess(null), 3000);
    } catch (err: any) {
      console.warn('Avatar upload failed:', err);
      // Fallback local update
      setAvatarUri(uri);
    } finally {
      setAvatarUploading(false);
      setShowPhotoOptions(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_needed', 'Permission Needed'), t('camera_permission_denied', 'Camera permission is required to take a photo.'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAvatarFile(asset.uri, asset.fileName || 'camera.jpg', asset.mimeType || 'image/jpeg');
      }
    } catch (err) {
      console.warn('Camera launch failed:', err);
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_needed', 'Permission Needed'), t('gallery_permission_denied', 'Photo library permission is required to select photos.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAvatarFile(asset.uri, asset.fileName || 'gallery.jpg', asset.mimeType || 'image/jpeg');
      }
    } catch (err) {
      console.warn('Gallery picker failed:', err);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAvatarFile(asset.uri, asset.name, asset.mimeType || 'image/jpeg');
      }
    } catch (err) {
      console.warn('Document picker failed:', err);
    }
  };

  return (
    <ScreenShell
      title={t('user_profile_account_title', 'User Profile & Account')}
      subtitle={t('user_profile_account_subtitle', 'Manage identity, unit binding & emergency contacts')}
      iconName="User"
      showBackButton={true}
      onBackPress={handleBackToDashboard}
      hideBottomNav={true}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Header Card */}
        <ProfileHeaderCard
          name={displayName}
          email={user?.email}
          phone={user?.phone || (user as any)?.phoneNumber}
          unitName={dynamicUnit}
          roleName={tRole(dynamicRole, dynamicRole)}
          communityName={dynamicCommunity}
          status={t('active_resident', 'Active Resident')}
          avatarUrl={avatarUri || user?.avatar || (user as any)?.avatarUrl}
          onAvatarPress={() => setShowPhotoOptions(true)}
          showCameraBadge={true}
        />

        {avatarSuccess && <SuccessToast message={avatarSuccess} />}

        {/* Identity & Account Details */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('account_details_header', 'Account Details')}
          </Text>

          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <DetailRow label={t('resident_name', 'Resident Name')} value={displayName} />
            <DetailRow label={t('email_address_label', 'Email Address')} value={user?.email || t('not_provided', 'Not Provided')} />
            <DetailRow label={t('phone_number_label', 'Phone Number')} value={user?.phone || (user as any)?.phoneNumber || t('not_provided', 'Not Provided')} />
            <DetailRow label={t('active_unit_label', 'Active Unit')} value={dynamicUnit} />
            <DetailRow label={t('community_workspace_label', 'Community Workspace')} value={dynamicCommunity} />
            <DetailRow label={t('role_persona_label', 'Role Persona')} value={tRole(dynamicRole, dynamicRole)} />
          </View>
        </View>

        {/* Context Switchers Section */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('context_switchers_header', 'Context Switchers')}
          </Text>

          <View className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <ListCard
              variant="row"
              title={t('switch_villa_unit_title', 'Switch Villa Unit')}
              subtitle={dynamicUnit}
              leftIcon={Home}
              showChevron={true}
              onPress={() => setVillaModalOpen(true)}
            />

            <ListCard
              variant="row"
              title={t('switch_community_org_title', 'Switch Community Org')}
              subtitle={dynamicCommunity}
              leftIcon={Building2}
              showChevron={true}
              onPress={() => setOrgModalOpen(true)}
            />

            <ListCard
              variant="row"
              title={t('switch_role_persona_title', 'Switch Role Persona')}
              subtitle={tRole(dynamicRole, dynamicRole)}
              leftIcon={ShieldCheck}
              showChevron={true}
              onPress={() => setRoleModalOpen(true)}
            />

            <ListCard
              variant="row"
              title={t('app_settings', 'Settings & Preferences')}
              subtitle={t('settings_subtitle', 'Appearance, themes & notifications')}
              leftIcon={Settings}
              showChevron={true}
              isLastItem={true}
              onPress={() => router.push('/(resident)/settings' as any)}
            />
          </View>
        </View>

        {/* Emergency Contacts Section */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('emergency_contacts_header', 'Emergency Contacts')}
          </Text>

          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs gap-3.5">
            <TextInput
              label={t('emergency_contact_name_label', 'Emergency Contact Name')}
              placeholder="e.g. Fatima Al-Mansoor"
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              label={t('emergency_contact_phone_label', 'Emergency Contact Phone')}
              placeholder="e.g. +971 50 987 6543"
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            {successMessage && <SuccessToast message={successMessage} />}

            <Button
              variant="secondary"
              size="sm"
              loading={saving}
              leftIcon={Save}
              onPress={handleSaveContact}
              className="mt-1 bg-primary/10 border border-primary/20"
              textClassName="text-primary font-semibold text-xs"
            >
              {t('save_emergency_contact_btn', 'Save Emergency Contact')}
            </Button>
          </View>
        </View>

        {/* Sign Out Action */}
        <Button
          variant="destructive"
          leftIcon={LogOut}
          onPress={logout}
          className="h-12 w-full mt-2 rounded-xl"
          textClassName="font-bold text-sm"
        >
          {t('sign_out', 'Sign Out')}
        </Button>
      </ScrollView>

      {/* Photo Picker Options Bottom Sheet Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable className="absolute inset-0" onPress={() => setShowPhotoOptions(false)} />
          <View className="bg-card rounded-t-3xl overflow-hidden border-t border-border">
            <SheetGrabHandle onClose={() => setShowPhotoOptions(false)} />
            <Text className="text-base font-bold text-foreground text-center py-2">
              {t('profile_photo_options', 'Update Profile Photo')}
            </Text>
            <View className="px-5 pb-6 gap-2.5">
              {/* Option 1: Live Camera */}
              <Pressable
                onPress={handleTakePhoto}
                className="flex-row items-center gap-3 px-4 py-3.5 bg-muted/20 rounded-2xl border border-border active:bg-muted/40"
              >
                <View className="size-11 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
                  <Camera size={20} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('take_photo', 'Take Photo')}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {t('take_photo_desc', 'Capture an image with live camera')}
                  </Text>
                </View>
              </Pressable>

              {/* Option 2: Gallery */}
              <Pressable
                onPress={handleChooseFromGallery}
                className="flex-row items-center gap-3 px-4 py-3.5 bg-muted/20 rounded-2xl border border-border active:bg-muted/40"
              >
                <View className="size-11 rounded-xl bg-violet-500/10 border border-violet-500/20 items-center justify-center">
                  <ImageIcon size={20} className="text-violet-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('choose_from_gallery', 'Choose from Photos')}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {t('choose_from_gallery_desc', 'Select from photo library')}
                  </Text>
                </View>
              </Pressable>

              {/* Option 3: Document / File Picker */}
              <Pressable
                onPress={handlePickDocument}
                className="flex-row items-center gap-3 px-4 py-3.5 bg-muted/20 rounded-2xl border border-border active:bg-muted/40"
              >
                <View className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                  <FileUp size={20} className="text-emerald-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('upload_file', 'Upload Photo File')}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {t('upload_file_desc', 'Browse image files on device')}
                  </Text>
                </View>
              </Pressable>

              {/* Cancel */}
              <Pressable
                onPress={() => setShowPhotoOptions(false)}
                className="items-center py-3 mt-1"
              >
                <Text className="text-sm font-semibold text-muted-foreground">
                  {t('cancel', 'Cancel')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Context Modals */}
      <VillaSwitchModal
        visible={villaModalOpen}
        onClose={() => setVillaModalOpen(false)}
        activeVilla={dynamicUnit}
        onSelectVilla={() => setVillaModalOpen(false)}
        communityName={dynamicCommunity}
      />

      <OrgSwitchModal
        visible={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        activeCommunity={dynamicCommunity}
        onSelectCommunity={() => setOrgModalOpen(false)}
      />

      <RoleSwitchModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />
    </ScreenShell>
  );
}
