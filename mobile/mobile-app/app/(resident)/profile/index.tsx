import React, { useState, useEffect } from 'react';
import { View, ScrollView, Modal, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { SuccessToast } from '@/components/feedback/SuccessToast';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { ProfileHeaderCard, VerifyEmailOtpModal } from '@/src/features/profile/components';
import { useProfile } from '@/src/features/profile/hooks/useProfile';
import authService from '@/src/features/auth/services/authService';
import { updateProfileThunk } from '@/src/features/auth/store/authSlice';
import { useTranslation } from '@/src/utils/i18n';
import { Save, Camera, Image as ImageIcon, FileUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface SelectedAvatarFile {
  uri: string;
  name?: string;
  type?: string;
  file?: any;
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, tRole } = useTranslation();
  const {
    user,
    dynamicUnit,
    dynamicCommunity,
    dynamicRole,
  } = useProfile();

  // Profile editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<SelectedAvatarFile | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Email verification OTP modal state
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpResending, setEmailOtpResending] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const uAny = user as any;
      setName(user.name || user.username || uAny.fullName || (user.email ? user.email.split('@')[0] : ''));
      setEmail(user.email || uAny.emailAddress || '');
      setPhone(user.phone || uAny.phoneNumber || uAny.mobile || '');
      if (user.avatar || uAny.avatarUrl) {
        setAvatarUri(user.avatar || uAny.avatarUrl);
      }
    }
  }, [user]);

  // 1. Live Camera Access
  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    try {
      if (Platform.OS === 'web') {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setAvatarUri(asset.uri);
          setSelectedAvatarFile({
            uri: asset.uri,
            name: asset.fileName || `camera_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
            file: (asset as any).file,
          });
        }
        return;
      }

      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          t('permission_required', 'Permission Required'),
          t('camera_perm_desc', 'Camera access is needed to capture a profile photo.')
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setSelectedAvatarFile({
          uri: asset.uri,
          name: asset.fileName || `camera_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Error taking photo with camera:', err);
    }
  };

  // 2. Photo Gallery
  const handleChooseFromGallery = async () => {
    setShowPhotoOptions(false);
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          t('permission_required', 'Permission Required'),
          t('gallery_perm_desc', 'Photo library access is needed to select a profile photo.')
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setSelectedAvatarFile({
          uri: asset.uri,
          name: asset.fileName || `avatar_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          file: (asset as any).file,
        });
      }
    } catch (err) {
      console.warn('Error picking image from gallery:', err);
    }
  };

  // 3. Document / File Picker
  const handlePickDocument = async () => {
    setShowPhotoOptions(false);
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const objectUrl = URL.createObjectURL(file);
            setAvatarUri(objectUrl);
            setSelectedAvatarFile({
              uri: objectUrl,
              name: file.name,
              type: file.type || 'image/jpeg',
              file: file,
            });
          }
        };
        input.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setSelectedAvatarFile({
          uri: asset.uri,
          name: asset.name || `doc_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Error picking document file:', err);
    }
  };

  const executeProfileUpdate = async (emailToUpdate?: string, emailOtp?: string) => {
    setProfileSaving(true);
    setProfileSuccess(null);
    try {
      let payload: any;
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('phone', phone.trim());
        if (emailToUpdate && emailOtp) {
          formData.append('email', emailToUpdate);
          formData.append('emailOtp', emailOtp);
        }

        if (Platform.OS === 'web') {
          if (selectedAvatarFile.file) {
            formData.append('avatar', selectedAvatarFile.file, selectedAvatarFile.name || 'avatar.jpg');
          } else if (selectedAvatarFile.uri.startsWith('blob:') || selectedAvatarFile.uri.startsWith('data:')) {
            const response = await fetch(selectedAvatarFile.uri);
            const blob = await response.blob();
            formData.append('avatar', blob, selectedAvatarFile.name || 'avatar.jpg');
          }
        } else {
          formData.append('avatar', {
            uri: selectedAvatarFile.uri,
            name: selectedAvatarFile.name || 'avatar.jpg',
            type: selectedAvatarFile.type || 'image/jpeg',
          } as any);
        }
        payload = formData;
      } else {
        payload = {
          name: name.trim(),
          phone: phone.trim(),
          ...(emailToUpdate && emailOtp ? { email: emailToUpdate, emailOtp } : {}),
        };
      }

      const res = await dispatch(updateProfileThunk(payload) as any);
      if (res.meta.requestStatus === 'fulfilled') {
        setProfileSuccess(
          emailToUpdate
            ? t('profile_and_email_updated', 'Profile & email updated successfully!')
            : t('profile_updated', 'Profile updated successfully!')
        );
        setSelectedAvatarFile(null);
        if (emailToUpdate) {
          setShowEmailOtpModal(false);
          setPendingNewEmail('');
          setEmailOtpError(null);
        }
        setTimeout(() => setProfileSuccess(null), 3500);
        return true;
      } else {
        const err = res.payload || t('failed_to_update_profile', 'Failed to update profile');
        if (emailToUpdate) {
          setEmailOtpError(String(err));
        } else {
          Alert.alert(t('error', 'Error'), String(err));
        }
        return false;
      }
    } catch (error: any) {
      const msg = error?.message || t('failed_to_update_profile', 'Failed to update profile');
      if (emailToUpdate) {
        setEmailOtpError(msg);
      } else {
        Alert.alert(t('error', 'Error'), msg);
      }
      return false;
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t('validation_error', 'Validation Error'), t('name_required', 'Please enter your name.'));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();

    // Check email format if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert(t('validation_error', 'Validation Error'), t('invalid_email', 'Please enter a valid email address.'));
      return;
    }

    // If user has changed their email address, request verification OTP
    if (trimmedEmail && trimmedEmail !== currentEmail) {
      setProfileSaving(true);
      setEmailOtpError(null);
      try {
        const otpRes = await authService.requestEmailChangeOtp(trimmedEmail);
        const data = (otpRes as any)?.data || (otpRes as any)?.data?.data || otpRes;
        if (data?.devCode) {
          setDevOtpCode(data.devCode);
        } else {
          setDevOtpCode(null);
        }
        setPendingNewEmail(trimmedEmail);
        setShowEmailOtpModal(true);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || t('failed_send_otp', 'Failed to send verification OTP');
        Alert.alert(t('error', 'Error'), errorMsg);
      } finally {
        setProfileSaving(false);
      }
      return;
    }

    // Email unchanged, update other fields directly
    await executeProfileUpdate();
  };

  const handleVerifyEmailOtp = async (otp: string) => {
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    try {
      await executeProfileUpdate(pendingNewEmail, otp);
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setEmailOtpResending(true);
    setEmailOtpError(null);
    try {
      const otpRes = await authService.requestEmailChangeOtp(pendingNewEmail);
      const data = (otpRes as any)?.data || (otpRes as any)?.data?.data || otpRes;
      if (data?.devCode) {
        setDevOtpCode(data.devCode);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || t('failed_send_otp', 'Failed to resend OTP');
      setEmailOtpError(errorMsg);
    } finally {
      setEmailOtpResending(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/dashboard' as any);
    }
  };

  const displayName = name || user?.name || (user?.email ? user.email.split('@')[0] : t('logged_in_resident', 'Resident User'));

  return (
    <ScreenShell
      title={t('user_profile_account_title', 'User Profile & Account')}
      subtitle={t('edit_profile_subtitle', 'Update personal details & profile photo')}
      iconName="User"
      showBackButton={true}
      onBackPress={handleBack}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-28"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Hero Header Card with Avatar & Live Camera / Photo Trigger */}
        <ProfileHeaderCard
          name={displayName}
          email={email || user?.email}
          phone={phone || user?.phone}
          unitName={dynamicUnit}
          roleName={tRole(dynamicRole, dynamicRole)}
          communityName={dynamicCommunity}
          avatarUrl={avatarUri}
          showCameraBadge={true}
          onAvatarPress={() => setShowPhotoOptions(true)}
        />

        {/* Section: Personal Details & Edit Form */}
        <View className="gap-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase px-1">
            {t('personal_details', 'Personal Details')}
          </Text>

          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs gap-3.5">
            <TextInput
              label={t('full_name', 'Full Name')}
              placeholder="e.g. Naveen"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              label={t('email_address', 'Email Address')}
              placeholder="e.g. user@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              label={t('phone_number', 'Phone Number')}
              placeholder="e.g. +91 9876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {profileSuccess && <SuccessToast message={profileSuccess} />}

            <Button
              variant="default"
              size="default"
              loading={profileSaving}
              leftIcon={Save}
              onPress={handleSaveProfile}
              className="mt-1 h-12 rounded-xl"
              textClassName="font-bold text-sm"
            >
              {t('save_profile_changes', 'Save Profile Changes')}
            </Button>
          </View>
        </View>
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
            <View className="px-5 pb-5 gap-2.5">
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

      {/* Email Verification OTP Modal */}
      <VerifyEmailOtpModal
        visible={showEmailOtpModal}
        email={pendingNewEmail}
        onClose={() => {
          setShowEmailOtpModal(false);
          setEmailOtpError(null);
        }}
        onVerify={handleVerifyEmailOtp}
        onResend={handleResendEmailOtp}
        loading={emailOtpLoading}
        resending={emailOtpResending}
        errorMessage={emailOtpError}
        devCode={devOtpCode}
      />
    </ScreenShell>
  );
}
