import React, { useState } from 'react';
import { View, ScrollView, Modal, Pressable, Alert, Image, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ThemeToggleSwitch } from '@/components/settings/ThemeToggleSwitch';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { ResidentDirectoryModal } from '@/components/settings/ResidentDirectoryModal';
import { SettingToggleRow } from '@/src/features/settings/components/SettingToggleRow';
import { useSettings } from '@/src/features/settings/hooks/useSettings';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useRouter } from 'expo-router';
import { LANGUAGE_OPTIONS } from '@/src/utils/i18n';
import { useCommunityPulse } from '@/src/features/communityPulse/hooks/useCommunityPulse';
import { InterestSelectorModal } from '@/src/features/communityPulse/components/InterestSelectorModal';
import { CreatePulseBottomSheet } from '@/src/features/communityPulse/components/CreatePulseBottomSheet';
import {
  Bell,
  Check,
  LogOut,
  Trash2,
  Pencil,
  Users,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Globe,
  Settings,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [createPulseOpen, setCreatePulseOpen] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  const {
    themeMode,
    setThemeMode,
    languageCode,
    setLanguageCode,
    currentLanguageLabel,
    languageModalOpen,
    setLanguageModalOpen,
    preferences,
    updatePreference,
    handleClearCache,
    t,
  } = useSettings();

  const {
    activePulses,
    userActivePulse,
    userInterests,
    masterInterests,
    createPulse,
    saveInterests,
  } = useCommunityPulse();

  const handleSignOut = async () => {
    const doLogout = async () => {
      try {
        await logout();
      } catch (e) {}
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        t('confirm_sign_out', 'Are you sure you want to sign out of your account?')
      );
      if (confirmed) {
        await doLogout();
      }
    } else {
      Alert.alert(
        t('sign_out', 'Sign Out'),
        t('confirm_sign_out', 'Are you sure you want to sign out of your account?'),
        [
          { text: t('cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('sign_out', 'Sign Out'),
            style: 'destructive',
            onPress: doLogout,
          },
        ]
      );
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Native Mobile Status Bar Header */}
      <View
        style={{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) }}
        className="bg-card border-b border-border"
      >
        <View className="flex-row items-center px-4 pb-3 min-h-[48px]">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(resident)/all-features' as any);
            }}
            className="p-1 rounded-full active:bg-muted/60 -ms-1 me-2"
            hitSlop={8}
          >
            <ChevronLeft size={24} className="text-foreground" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">
              {t('app_settings', 'Settings')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile Card ─── */}
        <Pressable
          onPress={() => setEditProfileOpen(true)}
          className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden active:opacity-90"
        >
          <View className="p-4 flex-row items-center gap-3">
            <View className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 items-center justify-center overflow-hidden shrink-0">
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} className="h-full w-full" />
              ) : (
                <UserIcon size={26} className="text-primary" />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                {user?.username || user?.name || user?.email || 'Logged In Resident'}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                {user?.role || 'Community Admin'}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                {user?.email || 'naveen@atominosconsulting.com'}
              </Text>
            </View>
            <ChevronRight size={20} className="text-muted-foreground shrink-0" />
          </View>
        </Pressable>

        {/* ─── Community ─── */}
        <Text className="text-xs font-bold text-muted-foreground uppercase px-5 mt-5 mb-2">
          Community
        </Text>
        <View className="mx-4 bg-card rounded-2xl border border-border overflow-hidden">
          <Pressable
            onPress={() => setDirectoryOpen(true)}
            className="flex-row items-center px-4 py-3.5 active:bg-muted/40"
          >
            <View className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 items-center justify-center me-3 shrink-0">
              <Users size={18} className="text-blue-500" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">Community Directory</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">Neighbor pulses & shared interests</Text>
            </View>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </Pressable>
        </View>

        {/* ─── Appearance ─── */}
        <Text className="text-xs font-bold text-muted-foreground uppercase px-5 mt-5 mb-2">
          {t('appearance_language', 'Appearance & Language')}
        </Text>
        <View className="mx-4 bg-card rounded-2xl border border-border overflow-hidden">
          {/* Theme Mode Row */}
          <View className="px-4 pt-4 pb-3">
            <ThemeToggleSwitch
              themeMode={themeMode}
              onSelectMode={setThemeMode}
              t={t}
              className="border-0 p-0 shadow-none bg-transparent"
            />
          </View>

          <View className="h-px bg-border mx-4" />

          {/* Language Row */}
          <Pressable
            onPress={() => setLanguageModalOpen(true)}
            className="flex-row items-center px-4 py-3.5 active:bg-muted/40"
          >
            <View className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center me-3 shrink-0">
              <Globe size={18} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {t('language', 'Language')}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">{currentLanguageLabel}</Text>
            </View>
            <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          </Pressable>
        </View>

        {/* ─── Notifications ─── */}
        <Text className="text-xs font-bold text-muted-foreground uppercase px-5 mt-5 mb-2">
          {t('notifications', 'Notifications')}
        </Text>
        <View className="mx-4 bg-card rounded-2xl border border-border overflow-hidden px-4 py-1">
          <SettingToggleRow
            label={t('push_notifications', 'Push Notifications')}
            description={t('push_desc', 'Gate arrival & security alerts')}
            icon={Bell}
            value={preferences.gateAlerts}
            onValueChange={(val) => updatePreference('gateAlerts', val)}
            isLastItem={true}
          />
        </View>

        {/* ─── Account ─── */}
        <Text className="text-xs font-bold text-muted-foreground uppercase px-5 mt-5 mb-2">
          {t('account_actions', 'Account')}
        </Text>
        <View className="mx-4 bg-card rounded-2xl border border-border overflow-hidden">
          <Pressable
            onPress={handleClearCache}
            className="flex-row items-center px-4 py-3.5 active:bg-muted/40"
          >
            <View className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 items-center justify-center me-3 shrink-0">
              <Trash2 size={18} className="text-amber-600" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {t('clear_cache', 'Clear Application Cache')}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">Free up temporary storage</Text>
            </View>
          </Pressable>

          <View className="h-px bg-border mx-4" />

          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center px-4 py-3.5 active:bg-destructive/10"
          >
            <View className="h-9 w-9 rounded-xl bg-destructive/10 border border-destructive/20 items-center justify-center me-3 shrink-0">
              <LogOut size={18} className="text-destructive" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-destructive">
                {t('sign_out', 'Sign Out')}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">Log out of your account</Text>
            </View>
          </Pressable>
        </View>

        {/* Version Footer */}
        <Text className="text-center text-xs text-muted-foreground mt-6 mb-2">
          Manage My Gate v1.0.0
        </Text>
      </ScrollView>

      {/* ─── Language Selection Bottom Sheet ─── */}
      <Modal
        visible={languageModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="absolute inset-0"
            onPress={() => setLanguageModalOpen(false)}
          />
          <View className="bg-card rounded-t-3xl overflow-hidden">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </View>
            <Text className="text-base font-bold text-foreground text-center py-2">
              {t('select_language', 'Select Language')}
            </Text>
            <View className="px-5 pb-6 gap-2">
              {LANGUAGE_OPTIONS.map((item) => {
                const isSelected = item.code === languageCode;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => {
                      setLanguageCode(item.code);
                      setLanguageModalOpen(false);
                    }}
                    className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl ${
                      isSelected
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-muted/30 border border-border active:bg-muted/60'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected ? 'font-bold text-primary' : 'font-medium text-foreground'
                      }`}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} className="text-primary" />}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: Math.max(insets.bottom, 8) }} />
          </View>
        </View>
      </Modal>

      {/* ─── Edit Profile Modal ─── */}
      <EditProfileModal
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={user}
        userPulse={userActivePulse}
        userInterests={userInterests}
        masterInterests={masterInterests}
        onCreatePulse={() => {
          setEditProfileOpen(false);
          setCreatePulseOpen(true);
        }}
        onSaveInterests={(ids) => saveInterests(ids)}
        t={t}
      />

      {/* ─── Community Directory Modal ─── */}
      <ResidentDirectoryModal
        visible={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        pulses={activePulses}
      />

      {/* ─── Interests Modal ─── */}
      <InterestSelectorModal
        visible={interestsOpen}
        onClose={() => setInterestsOpen(false)}
        masterInterests={masterInterests}
        selectedInterests={userInterests}
        onSave={(selectedIds) => saveInterests(selectedIds)}
      />

      {/* ─── Create Pulse Sheet ─── */}
      <CreatePulseBottomSheet
        visible={createPulseOpen}
        onClose={() => setCreatePulseOpen(false)}
        initialPulse={userActivePulse}
        onSubmit={(text, emoji, category, contextText) =>
          createPulse(text, emoji, category, contextText)
        }
      />
    </View>
  );
}
