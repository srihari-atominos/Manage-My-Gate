import React, { useState, useEffect } from 'react';
import { confirmPickerDisclosure } from '@/src/utils/pickerDisclosure';
import * as Location from 'expo-location';
import { View, ScrollView, Modal, Pressable, TouchableOpacity, Alert, Platform, TextInput as RNTextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { SuccessToast } from '@/components/feedback/SuccessToast';
import { SheetGrabHandle } from '@/components/ui/SheetGrabHandle';
import { ProfileHeaderCard, ContactChangeWizardModal, LocationPickerModal } from '@/src/features/profile/components';
import { EmergencySosCard, EmergencySosModal, useEmergencySosSocket } from '@/src/features/emergencySos';
import { RoleSwitchModal, OrgSwitchModal, AssignmentSwitchModal, VillaSwitchModal } from '@/components/navigation';
import { useProfile } from '@/src/features/profile/hooks/useProfile';
import { useBottomNavScroll } from '@/components/navigation/BottomNavScrollContext';
import authService from '@/src/features/auth/services/authService';
import { updateProfileThunk } from '@/src/features/auth/store/authSlice';
import { useTranslation } from '@/src/utils/i18n';
import {
  Save,
  Camera,
  Image as ImageIcon,
  FileUp,
  Trash2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Home,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BriefcaseBusiness,
  UserRound,
  LocateFixed,
  Sparkles,
  Plus,
  Check,
  Navigation,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { validateEmail, validatePhone, parseBackendError } from '@/src/utils/validation';
import {
  INTEREST_CATEGORIES,
  WORK_SUGGESTIONS,
  BIO_SUGGESTIONS,
  HOMETOWN_QUICK_SUGGESTIONS,
} from '@/src/features/profile/data/profileSuggestions';
import { reverseGeocodeCoords } from '@/src/features/profile/data/locationData';
import { AppLoader } from '@/components/ui/AppLoader';

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
    dynamicAssignment,
    isResidentRole,
    isSecurity,
    isFacility,
    hasMultipleOrgs,
    hasMultipleRoles,
    hasMultipleUnits,
    hasMultipleAssignments,
    villaModalOpen,
    setVillaModalOpen,
    roleModalOpen,
    setRoleModalOpen,
    orgModalOpen,
    setOrgModalOpen,
    assignmentModalOpen,
    setAssignmentModalOpen,
  } = useProfile();
  const { scrollHandlerProps } = useBottomNavScroll();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);

  const handleProfileScroll = (event: any) => {
    scrollHandlerProps?.onScroll?.(event);
    const y = event.nativeEvent?.contentOffset?.y || 0;
    setScrollOffsetY(y);
  };

  // Profile editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [work, setWork] = useState('');
  const [hometown, setHometown] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [allowCalls, setAllowCalls] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<SelectedAvatarFile | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean }>({});

  // Email verification OTP modal state
  const [wizardVisible, setWizardVisible] = useState(false);
  const [wizardType, setWizardType] = useState<'email' | 'phone'>('email');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpResending, setEmailOtpResending] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [activeInterestCategory, setActiveInterestCategory] = useState<string>('sports');
  const [sosModalVisible, setSosModalVisible] = useState(false);

  useEmergencySosSocket();

  // Parse current interests array
  const currentInterests = React.useMemo(() => {
    return interestsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [interestsText]);

  // Active items for selected interest category
  const activeCategoryItems = React.useMemo(() => {
    const cat = INTEREST_CATEGORIES.find((c) => c.id === activeInterestCategory);
    return cat ? cat.items : (INTEREST_CATEGORIES[0]?.items || []);
  }, [activeInterestCategory]);

  const [customInterestInput, setCustomInterestInput] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Toggle an interest from suggestion chips
  const handleToggleInterest = (interestName: string) => {
    const exists = currentInterests.some(
      (item) => item.toLowerCase() === interestName.toLowerCase()
    );
    if (exists) {
      const updated = currentInterests.filter(
        (item) => item.toLowerCase() !== interestName.toLowerCase()
      );
      setInterestsText(updated.join(', '));
    } else {
      if (currentInterests.length >= 20) {
        Alert.alert(t('max_interests', 'Maximum Interests'), t('max_interests_desc', 'You can select up to 20 interests.'));
        return;
      }
      const updated = [...currentInterests, interestName];
      setInterestsText(updated.join(', '));
    }
  };

  // Add custom interest from text input
  const handleAddCustomInterest = () => {
    const trimmed = customInterestInput.trim();
    if (!trimmed) return;
    if (currentInterests.length >= 20) {
      Alert.alert(t('max_interests', 'Maximum Interests'), t('max_interests_desc', 'You can select up to 20 interests.'));
      return;
    }
    const exists = currentInterests.some((i) => i.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const updated = [...currentInterests, trimmed];
      setInterestsText(updated.join(', '));
    }
    setCustomInterestInput('');
  };

  // Remove a specific interest tag
  const handleRemoveInterest = (interestName: string) => {
    const updated = currentInterests.filter(
      (item) => item.toLowerCase() !== interestName.toLowerCase()
    );
    setInterestsText(updated.join(', '));
  };

  const handleSelectWorkSuggestion = (suggestion: string) => {
    setWork(suggestion);
  };

  const handleSelectBioSuggestion = (suggestion: string) => {
    setBio(suggestion);
  };

  const handleSelectHometown = (loc: string) => {
    setHometown(loc);
  };

  // Quick 1-tap GPS Geolocation direct from profile
  const handleQuickGpsDetect = async () => {
    setIsDetectingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsDetectingGps(false);
        setShowLocationModal(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const formatted = await reverseGeocodeCoords(latitude, longitude);
      if (formatted) {
        setHometown(formatted);
      } else {
        setShowLocationModal(true);
      }
    } catch (err) {
      console.warn('[Profile] GPS error:', err);
      setShowLocationModal(true);
    } finally {
      setIsDetectingGps(false);
    }
  };

  useEffect(() => {
    if (user) {
      const uAny = user as any;
      setName(user.name || user.username || uAny.fullName || (user.email ? user.email.split('@')[0] : ''));
      setEmail(user.email || uAny.emailAddress || '');
      setPhone(user.phone || uAny.phoneNumber || uAny.mobile || '');
      setBio(uAny.bio || '');
      setWork(uAny.work || '');
      setHometown(uAny.hometown || '');
      setInterestsText(Array.isArray(uAny.interests) ? uAny.interests.join(', ') : '');
      setAllowCalls(uAny.allowIntercomCalls !== false);
      if (user.avatar || uAny.avatarUrl) {
        setAvatarUri(user.avatar || uAny.avatarUrl);
      } else {
        setAvatarUri(null);
      }
    }
  }, [user]);

  // Immediate auto-upload and persistence when photo is chosen
  const uploadAvatarDirectly = async (fileObj: SelectedAvatarFile) => {
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      if (name.trim()) formData.append('name', name.trim());
      if (phone.trim()) formData.append('phone', phone.trim());

      if (Platform.OS === 'web') {
        if (fileObj.file) {
          formData.append('avatar', fileObj.file, fileObj.name || 'avatar.jpg');
        } else {
          try {
            const response = await fetch(fileObj.uri);
            const blob = await response.blob();
            const file = new File([blob], fileObj.name || 'avatar.jpg', {
              type: fileObj.type || blob.type || 'image/jpeg',
            });
            formData.append('avatar', file);
          } catch (fetchErr) {
            console.warn('Fallback web blob append:', fetchErr);
            formData.append('avatar', fileObj.uri);
          }
        }
      } else {
        formData.append('avatar', {
          uri: fileObj.uri,
          name: fileObj.name || `avatar_${Date.now()}.jpg`,
          type: fileObj.type || 'image/jpeg',
        } as any);
      }

      const res = await dispatch(updateProfileThunk(formData) as any);
      if (res.meta.requestStatus === 'fulfilled') {
        setSelectedAvatarFile(null);
        const updatedAvatar = res.payload?.avatar;
        if (updatedAvatar) {
          setAvatarUri(updatedAvatar);
        }
        setProfileSuccess(t('profile_photo_saved', 'Profile photo updated successfully!'));
        setTimeout(() => setProfileSuccess(null), 3500);
      } else {
        const parsed = parseBackendError(res.payload, t('failed_to_save_photo', 'Failed to save profile photo.'));
        Alert.alert(t('error', 'Error'), parsed.userMessage);
      }
    } catch (err: any) {
      console.error('Error auto-uploading avatar:', err);
      const parsed = parseBackendError(err, t('failed_to_save_photo', 'Failed to save profile photo.'));
      Alert.alert(t('error', 'Error'), parsed.userMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePhotoSelected = async (fileObj: SelectedAvatarFile) => {
    setSelectedAvatarFile(fileObj);
    setAvatarUri(fileObj.uri);
    await uploadAvatarDirectly(fileObj);
  };

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
          await handlePhotoSelected({
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
        await handlePhotoSelected({
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
      if (!(await confirmPickerDisclosure('photo'))) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await handlePhotoSelected({
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
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const objectUrl = URL.createObjectURL(file);
            await handlePhotoSelected({
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

      if (!(await confirmPickerDisclosure('document'))) return;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await handlePhotoSelected({
          uri: asset.uri,
          name: asset.name || `doc_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Error picking document file:', err);
    }
  };

  // 4. Remove Photo & Restore Default
  const handleRemovePhoto = async () => {
    setShowPhotoOptions(false);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('removeAvatar', 'true');
      if (name.trim()) formData.append('name', name.trim());
      if (phone.trim()) formData.append('phone', phone.trim());

      const res = await dispatch(updateProfileThunk(formData) as any);
      if (res.meta.requestStatus === 'fulfilled') {
        setSelectedAvatarFile(null);
        setAvatarUri(null);
        setProfileSuccess(t('profile_photo_removed', 'Profile photo removed. Default avatar restored.'));
        setTimeout(() => setProfileSuccess(null), 3500);
      } else {
        const parsed = parseBackendError(res.payload, t('failed_to_remove_photo', 'Failed to remove profile photo.'));
        Alert.alert(t('error', 'Error'), parsed.userMessage);
      }
    } catch (err: any) {
      console.error('Error removing avatar:', err);
      const parsed = parseBackendError(err, t('failed_to_remove_photo', 'Failed to remove profile photo.'));
      Alert.alert(t('error', 'Error'), parsed.userMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  const executeProfileUpdate = async (emailToUpdate?: string, emailOtp?: string) => {
    setProfileSaving(true);
    setProfileSuccess(null);
    try {
      const interests = interestsText
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean)
        .slice(0, 20);
      let payload: any;
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('phone', phone.trim());
        formData.append('bio', bio.trim());
        formData.append('work', work.trim());
        formData.append('hometown', hometown.trim());
        formData.append('allowIntercomCalls', String(allowCalls));
        formData.append('interests', JSON.stringify(interests));
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
          bio: bio.trim(),
          work: work.trim(),
          hometown: hometown.trim(),
          allowIntercomCalls: allowCalls,
          interests,
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
          
          setPendingNewEmail('');
          setEmailOtpError(null);
        }
        
        // Strictly move to main dashboard after a short delay to show success toast
        setTimeout(() => {
          setProfileSuccess(null);
          router.replace('/(resident)/dashboard' as any);
        }, 800);
        
        return true;
      } else {
        const parsed = parseBackendError(res.payload, t('failed_to_update_profile', 'Failed to update profile'));
        const err = parsed.userMessage;
        if (emailToUpdate) {
          setEmailOtpError(err);
        } else {
          const lower = err.toLowerCase();
          if (lower.includes('email')) {
            setFieldErrors((prev) => ({ ...prev, email: err }));
          } else if (lower.includes('phone') || lower.includes('mobile')) {
            setFieldErrors((prev) => ({ ...prev, phone: err }));
          } else {
            Alert.alert(t('error', 'Error'), err);
          }
        }
        return false;
      }
    } catch (error: any) {
      const parsed = parseBackendError(error, t('failed_to_update_profile', 'Failed to update profile'));
      const msg = parsed.userMessage;
      if (emailToUpdate) {
        setEmailOtpError(msg);
      } else {
        const lower = msg.toLowerCase();
        if (lower.includes('email')) {
          setFieldErrors((prev) => ({ ...prev, email: msg }));
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          setFieldErrors((prev) => ({ ...prev, phone: msg }));
        } else {
          Alert.alert(t('error', 'Error'), msg);
        }
      }
      return false;
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setTouched({ name: true, email: true, phone: true });
    setFieldErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFieldErrors((prev) => ({ ...prev, name: t('name_required', 'Please enter your name.') }));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const currentEmail = (user?.email || '').trim().toLowerCase();

    // Check email format if provided
    if (trimmedEmail) {
      const emailRes = validateEmail(trimmedEmail);
      if (emailRes.status === 'invalid' || emailRes.status === 'incomplete') {
        setFieldErrors((prev) => ({ ...prev, email: emailRes.message || t('invalid_email', 'Please enter a valid email address.') }));
        return;
      }
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const phoneRes = validatePhone(trimmedPhone, 'IN');
      if (phoneRes.status === 'invalid') {
        setFieldErrors((prev) => ({ ...prev, phone: phoneRes.message }));
        return;
      }
    }

    // If user has changed their email address, request verification OTP
    if (false) {
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
        
      } catch (err: any) {
        const errorMsg = parseBackendError(err, t('failed_send_otp', 'Failed to send verification OTP')).userMessage;
        if (errorMsg.toLowerCase().includes('email')) {
          setFieldErrors((prev) => ({ ...prev, email: errorMsg }));
        } else {
          Alert.alert(t('error', 'Error'), errorMsg);
        }
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
      title={t('profile', 'Profile')}
      subtitle={t('edit_profile_subtitle', 'Update personal details & profile photo')}
      iconName="User"
      scrollable={false}
      showBackButton={true}
      onBackPress={handleBack}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-36"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled={true}
        bounces={true}
        scrollEventThrottle={16}
        onScroll={handleProfileScroll}
      >
        {/* Profile Hero Header Card with Avatar & Live Camera / Photo Trigger */}
        <ProfileHeaderCard
          name={displayName}
          email={email || user?.email}
          phone={phone || user?.phone}
          unitName={isResidentRole ? dynamicUnit : undefined}
          roleName={dynamicRole}
          communityName={dynamicCommunity}
          avatarUrl={avatarUri}
          showCameraBadge={true}
          isAvatarLoading={avatarUploading}
          onAvatarPress={() => setShowPhotoOptions(true)}
          onUnitPress={isResidentRole ? () => setVillaModalOpen(true) : undefined}
        />

        {/* Safety & Emergency SOS Panic */}
        <EmergencySosCard
          unitNumber={isResidentRole ? dynamicUnit : undefined}
          onPressOpen={() => setSosModalVisible(true)}
          className="mx-0 mt-0"
        />

        {/* Section: Community, Role & Villa Switching */}
        <View className="gap-2.5">
          <Text className="text-base font-extrabold font-sans text-foreground tracking-tight">
            {t('community_context', 'Community, Role & Villa')}
          </Text>

          <View className="bg-card border border-border/70 rounded-3xl p-5 shadow-2xs gap-4">
            {/* Current Community */}
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="size-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center">
                  <Building2 size={18} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('current_community', 'Current Community')}
                  </Text>
                  <Text className="text-base font-bold text-foreground mt-0.5" numberOfLines={1}>
                    {dynamicCommunity}
                  </Text>
                </View>
              </View>
            </View>

            {/* Current Role */}
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="size-10 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                  <ShieldCheck size={18} color="#03A9F4" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('current_role', 'Current Role')}
                  </Text>
                  <Text className="text-base font-bold text-foreground mt-0.5" numberOfLines={1}>
                    {tRole(dynamicRole, dynamicRole)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Current Property Unit (Resident roles only) */}
            {isResidentRole ? (
              <Pressable
                onPress={() => setVillaModalOpen(true)}
                className="flex-row items-center justify-between gap-3 p-2 -m-2 rounded-2xl active:bg-secondary/60"
                accessibilityRole="button"
                accessibilityLabel={t('switch_unit', 'Switch Villa Unit')}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                    <Home size={18} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('current_unit', 'Current Property Unit')}
                    </Text>
                    <Text className="text-base font-bold text-foreground mt-0.5" numberOfLines={1}>
                      {dynamicUnit ? `Unit ${dynamicUnit}` : t('no_unit_assigned', 'No Unit Assigned')}
                    </Text>
                  </View>
                </View>

                {/* Explicit Switch Unit trigger button */}
                <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {t('switch', 'Switch')}
                  </Text>
                  <ChevronRight size={14} color="#10b981" />
                </View>
              </Pressable>
            ) : null}

            {/* Current Assignment (Security / Facility roles only) */}
            {(isSecurity || isFacility) && dynamicAssignment ? (
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="size-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 items-center justify-center">
                    <MapPin size={18} color="#0ea5e9" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('current_assignment', 'Current Assignment')}
                    </Text>
                    <Text className="text-base font-bold text-foreground mt-0.5" numberOfLines={1}>
                      {dynamicAssignment}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Action Buttons (Rendered if multiple switchable options exist) */}
            {(hasMultipleOrgs || hasMultipleRoles || (isResidentRole && hasMultipleUnits) || hasMultipleAssignments) && (
              <View className="flex-col gap-2.5 pt-2 border-t border-border/50">
                {hasMultipleOrgs && (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full h-11 rounded-2xl border-indigo-500/40 bg-indigo-500/5 active:bg-indigo-500/10"
                    onPress={() => setOrgModalOpen(true)}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Building2 size={15} color="#6366f1" />
                      <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {t('switch_community', 'Switch Community')}
                      </Text>
                    </View>
                  </Button>
                )}

                {hasMultipleRoles && (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full h-11 rounded-2xl border-primary/40 bg-primary/5 active:bg-primary/10"
                    onPress={() => setRoleModalOpen(true)}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <ShieldCheck size={15} color="#03A9F4" />
                      <Text className="text-xs font-bold text-primary">
                        {t('switch_role', 'Switch Role')}
                      </Text>
                    </View>
                  </Button>
                )}

                {isResidentRole && hasMultipleUnits && (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full h-11 rounded-2xl border-emerald-500/40 bg-emerald-500/5 active:bg-emerald-500/10"
                    onPress={() => setVillaModalOpen(true)}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Home size={15} color="#10b981" />
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {t('switch_unit', 'Switch Villa Unit')}
                      </Text>
                    </View>
                  </Button>
                )}

                {hasMultipleAssignments && (
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full h-11 rounded-2xl border-sky-500/40 bg-sky-500/5 active:bg-sky-500/10 mt-1"
                    onPress={() => setAssignmentModalOpen(true)}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <MapPin size={15} color="#0ea5e9" />
                      <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">
                        {t('switch_assignment', 'Switch Assignment / Scope')}
                      </Text>
                    </View>
                  </Button>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Section: Personal Details & Edit Form */}
        <View className="gap-2.5">
          <Text
            className="text-base font-extrabold font-sans text-foreground tracking-tight"
            style={{ fontWeight: 'bold' }}
          >
            {t('personal_details', 'Personal Details')}
          </Text>

          <View className="bg-card border border-border/70 rounded-3xl p-5 shadow-2xs gap-4">
            <TextInput
              label={t('full_name', 'Full Name')}
              labelClassName="text-sm font-bold"
              required
              placeholder={t('full_name_placeholder', 'e.g. Jane Doe')}
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (touched.name && !val.trim()) {
                  setFieldErrors((prev) => ({ ...prev, name: t('name_required', 'Please enter your name.') }));
                } else if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              status={fieldErrors.name ? 'invalid' : touched.name && name.trim() ? 'valid' : 'idle'}
              error={fieldErrors.name}
              clearable
              onClear={() => {
                setName('');
                setTouched((prev) => ({ ...prev, name: true }));
                setFieldErrors((prev) => ({ ...prev, name: t('name_required', 'Please enter your name.') }));
              }}
            />

            <TextInput
              label={t('email_address', 'Email Address')}
              labelClassName="text-sm font-bold"
              value={email}
              editable={false}
              error={fieldErrors.email}
              rightIcon={<Text className="text-[#F45A0A] font-bold text-sm me-2">{t('change', 'Change')}</Text>}
              onRightIconPress={() => { setWizardType('email'); setWizardVisible(true); }}
            />

            <TextInput
              label={t('phone_number', 'Phone Number')}
              labelClassName="text-sm font-bold"
              value={phone}
              editable={false}
              error={fieldErrors.phone}
              rightIcon={<Text className="text-[#F45A0A] font-bold text-sm me-2">{t('change', 'Change')}</Text>}
              onRightIconPress={() => { setWizardType('phone'); setWizardVisible(true); }}
            />

            <View className="h-px bg-border/70" />

            {/* Bio with suggestions */}
            <View className="gap-2">
              <TextInput
                label={t('bio', 'Bio')}
                labelClassName="text-sm font-bold"
                placeholder={t('bio_placeholder', 'Tell your neighbours about yourself')}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={500}
                leftIcon={UserRound}
              />
              <View className="gap-1.5">
                <View className="flex-row items-center gap-1.5 px-0.5">
                  <Sparkles size={12} className="text-primary" />
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('quick_bio_suggestions', 'Quick Bio Suggestions')}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} className="flex-row gap-1.5 pb-0.5">
                  {BIO_SUGGESTIONS.map((suggestion, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSelectBioSuggestion(suggestion)}
                      className={`px-3 py-1.5 rounded-xl border me-1.5 active:opacity-75 ${
                        bio === suggestion
                          ? 'bg-primary/15 border-primary'
                          : 'bg-card border-border/80'
                      }`}
                    >
                      <Text className={`text-xs ${bio === suggestion ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`} numberOfLines={1}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Work / Profession (Full Width) */}
            <View className="gap-2">
              <TextInput
                containerClassName="w-full"
                label={t('work', 'Work / Profession')}
                labelClassName="text-sm font-bold"
                placeholder={t('add_work', 'e.g. Software Engineer, Doctor, Architect')}
                value={work}
                onChangeText={setWork}
                maxLength={120}
                leftIcon={BriefcaseBusiness}
              />
              <View className="gap-1.5">
                <View className="flex-row items-center gap-1.5 px-0.5">
                  <Sparkles size={12} className="text-primary" />
                  <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {t('popular_roles', 'Popular Roles')}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} className="flex-row gap-1.5 pb-0.5">
                  {WORK_SUGGESTIONS.map((w) => (
                    <Pressable
                      key={w}
                      onPress={() => handleSelectWorkSuggestion(w)}
                      className={`px-3 py-1.5 rounded-xl border me-1.5 active:opacity-75 ${
                        work === w
                          ? 'bg-primary/15 border-primary'
                          : 'bg-card border-border/80'
                      }`}
                    >
                      <Text className={`text-xs ${work === w ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
                        {w}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Hometown / Location (Full Width & Accessible) */}
            <View className="gap-2">
              <View className="flex-row items-center justify-between px-0.5">
                <View className="flex-row items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  <Text className="text-sm font-bold font-sans text-foreground">
                    {t('hometown', 'Hometown / Location')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowLocationModal(true)}
                  className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 active:bg-primary/20"
                >
                  <LocateFixed size={12} className="text-primary" />
                  <Text className="text-xs font-bold text-primary">
                    {t('select_location', 'All Locations')} &gt;
                  </Text>
                </Pressable>
              </View>

              <TextInput
                containerClassName="w-full"
                placeholder={t('add_hometown', 'e.g. Bengaluru, Karnataka, India')}
                value={hometown}
                onChangeText={setHometown}
                maxLength={120}
                leftIcon={MapPin}
                rightIcon={LocateFixed}
                rightIconColor="#EA580C"
                onRightIconPress={() => setShowLocationModal(true)}
              />

              {/* Location Shortcuts Row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} className="pb-0.5" contentContainerClassName="gap-2 pe-4">
                {/* 1. All Locations Picker trigger */}
                <Pressable
                  onPress={() => setShowLocationModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 flex-row items-center gap-1.5 active:opacity-75"
                >
                  <MapPin size={13} className="text-primary" />
                  <Text className="text-xs font-bold text-primary">
                    {t('choose_location', 'Select Country / State')}
                  </Text>
                </Pressable>

                {/* 2. Direct GPS auto-detect trigger */}
                <Pressable
                  onPress={handleQuickGpsDetect}
                  disabled={isDetectingGps}
                  className="px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 flex-row items-center gap-1.5 active:opacity-75"
                >
                  {isDetectingGps ? (
                    <AppLoader variant="inline" />
                  ) : (
                    <LocateFixed size={13} className="text-blue-600 dark:text-blue-400" />
                  )}
                  <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {isDetectingGps ? t('detecting', 'Detecting GPS...') : t('current_gps', 'Current GPS')}
                  </Text>
                </Pressable>

                {/* 3. Popular Cities */}
                {HOMETOWN_QUICK_SUGGESTIONS.map((ht) => {
                  const cityName = ht.split(',')[0];
                  const isSelected = hometown === ht;
                  return (
                    <Pressable
                      key={ht}
                      onPress={() => handleSelectHometown(ht)}
                      className={`px-3 py-1.5 rounded-xl border me-1.5 active:opacity-75 ${
                        isSelected
                          ? 'bg-primary/15 border-primary'
                          : 'bg-card border-border/80'
                      }`}
                    >
                      <Text className={`text-xs ${isSelected ? 'text-primary font-bold' : 'text-muted-foreground font-medium'}`}>
                        {cityName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>



            {profileSuccess && <SuccessToast message={profileSuccess} />}

            <Button
              variant="default"
              size="default"
              loading={profileSaving}
              disabled={profileSaving}
              leftIcon={Save}
              onPress={handleSaveProfile}
              className="mt-2 h-12 rounded-2xl shadow-2xs"
              textClassName="font-bold text-sm"
            >
              {t('save_profile_changes', 'Save Profile Changes')}
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Quick Scroll Navigation Controls (Go Up / Go Down) */}
      <View pointerEvents="box-none" className="absolute bottom-24 end-4 items-center gap-2 z-40">
        {scrollOffsetY > 250 ? (
          <TouchableOpacity
            onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
            activeOpacity={0.8}
            className="size-11 rounded-full bg-card/95 border border-border shadow-md items-center justify-center active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel={t('scroll_to_top', 'Go to Top')}
          >
            <ChevronUp size={22} className="text-foreground" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            activeOpacity={0.8}
            className="size-11 rounded-full bg-card/95 border border-border shadow-md items-center justify-center active:bg-muted"
            accessibilityRole="button"
            accessibilityLabel={t('scroll_to_bottom', 'Go to Bottom')}
          >
            <ChevronDown size={22} className="text-foreground" />
          </TouchableOpacity>
        )}
      </View>

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
            <Text className="text-lg font-extrabold text-foreground text-center py-2">
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
                    {t('take_photo', 'Take photo')}
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
                    {t('choose_from_gallery', 'Choose from Gallery')}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {t('choose_from_gallery_desc', 'Select an existing image from your device')}
                  </Text>
                </View>
              </Pressable>

              {/* Option 3: Upload from device */}
              <Pressable
                onPress={handlePickDocument}
                className="flex-row items-center gap-3 px-4 py-3.5 bg-muted/20 rounded-2xl border border-border active:bg-muted/40"
              >
                <View className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                  <FileUp size={20} className="text-emerald-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('upload_from_device', 'Upload from device')}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {t('upload_from_device_desc', 'Browse image files on device')}
                  </Text>
                </View>
              </Pressable>

              {/* Option 4: Remove photo (Restore Default) */}
              <Pressable
                onPress={handleRemovePhoto}
                className="flex-row items-center gap-3 px-4 py-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 active:bg-rose-500/20"
              >
                <View className="size-11 rounded-xl bg-rose-500/15 border border-rose-500/30 items-center justify-center">
                  <Trash2 size={20} className="text-rose-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    {t('remove_photo', 'Remove photo')}
                  </Text>
                  <Text className="text-xs text-rose-500/80 mt-0.5">
                    {t('remove_photo_desc', 'Remove custom photo and use default avatar')}
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
      <ContactChangeWizardModal
        visible={wizardVisible}
        type={wizardType}
        onClose={() => setWizardVisible(false)}
        onSuccess={async (payload) => {
          setWizardVisible(false);
          const formData = new FormData() as any;
          if (payload.email) {
            formData.append('email', payload.email);
            formData.append('emailOtp', payload.emailOtp);
          } else {
            formData.append('phone', payload.phone);
            formData.append('phoneOtp', payload.phoneOtp);
          }
          formData.append('updateAuthToken', payload.updateAuthToken);
          
          const res = await dispatch(updateProfileThunk(formData) as any);
          if (res.meta.requestStatus === 'fulfilled') {
            setProfileSuccess(t('profile_updated', 'Profile updated successfully!'));
            setTimeout(() => setProfileSuccess(null), 2000);
          } else {
            Alert.alert('Error', (res.payload as any)?.message || 'Failed to update profile');
          }
        }}
      />

      {/* Role Switch Modal */}
      <RoleSwitchModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />

      {/* Community Switch Modal */}
      <OrgSwitchModal
        visible={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        activeCommunity={dynamicCommunity}
        onSelectCommunity={() => {}}
      />

      {/* Villa Switch Modal */}
      <VillaSwitchModal
        visible={villaModalOpen}
        onClose={() => setVillaModalOpen(false)}
        activeVilla={dynamicUnit}
        onSelectVilla={() => {}}
      />

      {/* Assignment Switch Modal */}
      <AssignmentSwitchModal
        visible={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
      />

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentValue={hometown}
        onSelectLocation={handleSelectHometown}
      />

      {/* Emergency SOS Panic Modal */}
      <EmergencySosModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
        unitNumber={isResidentRole ? dynamicUnit : undefined}
      />
    </ScreenShell>
  );
}
