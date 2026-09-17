import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Image, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import {
  Home,
  Settings,
  Mail,
  Building2,
  ChevronRight,
  Users,
  Sparkles,
  LogOut,
  User as UserIcon,
  Shield,
  Edit3,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ThemeToggleSwitch } from '@/components/settings/ThemeToggleSwitch';
import BottomNavigationBar from '@/components/navigation/BottomNavigationBar';
import { useBottomNavScroll } from '@/components/navigation/BottomNavScrollContext';
import { VillaSwitchModal } from '@/components/navigation/VillaSwitchModal';
import { OrgSwitchModal } from '@/components/navigation/OrgSwitchModal';
import { RoleSwitchModal } from '@/components/navigation/RoleSwitchModal';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useSettings } from '@/src/features/settings/hooks/useSettings';
import { useTranslation } from '@/src/utils/i18n';
import { getImageUrl } from '@/src/utils/imageUrl';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, tRole } = useTranslation();
  const { themeMode, setThemeMode } = useSettings();
  const { handleScroll, scrollHandlerProps } = useBottomNavScroll();

  const userAny = user as any;

  // Active villa & community info
  const dynamicUnit =
    userAny?.villaNumber ||
    userAny?.activeVillaNumber ||
    userAny?.unitNumber ||
    'No Unit Assigned';

  const dynamicCommunity = useMemo(() => {
    const userOrg =
      userAny?.organizationName ||
      userAny?.activeOrganizationName ||
      userAny?.orgName ||
      userAny?.communityName ||
      userAny?.communityOrg ||
      userAny?.organization?.name;

    if (userOrg) return userOrg;

    const workspaces = userAny?.availableWorkspaces || [];
    if (Array.isArray(workspaces) && workspaces.length > 0 && workspaces[0]?.name) {
      return workspaces[0].name;
    }

    return 'Community Workspace';
  }, [userAny]);

  const dynamicRole =
    user?.role ||
    (userAny?.roles && userAny?.roles.length > 0 ? userAny?.roles[0] : 'Resident');

  // Avatar resolution
  const userAvatar = user?.avatar || userAny?.avatarUrl;
  const resolvedAvatarUrl = userAvatar ? getImageUrl(userAvatar) : null;

  const avatarLetter = useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }, [user]);

  // Modal states
  const [villaModalVisible, setVillaModalVisible] = useState(false);
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Scroll animations for bottom navigation bar
  const scrollY = useSharedValue(0);
  const lastScrollTime = React.useRef(0);

  const throttledHandleScroll = React.useCallback(
    (y: number) => {
      const now = Date.now();
      if (now - lastScrollTime.current > 120) {
        lastScrollTime.current = now;
        handleScroll(y);
      }
    },
    [handleScroll]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
      runOnJS(throttledHandleScroll)(event.contentOffset.y);
    },
  });

  // Handle hardware back
  React.useEffect(() => {
    const onHardwareBack = () => {
      if (villaModalVisible) {
        setVillaModalVisible(false);
        return true;
      }
      if (orgModalVisible) {
        setOrgModalVisible(false);
        return true;
      }
      if (roleModalVisible) {
        setRoleModalVisible(false);
        return true;
      }
      if (logoutModalOpen) {
        setLogoutModalOpen(false);
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      router.replace('/(resident)/dashboard' as any);
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [villaModalVisible, orgModalVisible, roleModalVisible, logoutModalOpen, router]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(resident)/dashboard' as any);
    }
  };

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  return (
    <ScreenShell
      title={t('account', 'Account')}
      subtitle={t('account_subtitle', 'Manage preferences, context & workspaces')}
      iconName="User"
      scrollable={false}
      showBackButton={true}
      onBackPress={handleBack}
    >
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        className="flex-1 px-4 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 120 }}
      >
        <View className="gap-4 max-w-md mx-auto w-full pt-2">
          {/* 1. User Profile Header Hero Card */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/profile' as any)}
            activeOpacity={0.82}
            className="items-center bg-card border border-border rounded-3xl p-5 gap-2 shadow-sm active:bg-secondary/40 relative overflow-hidden"
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
          >
            {/* Top Right Edit Hint Pill */}
            <View className="absolute top-3.5 right-3.5 flex-row items-center gap-1 bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full">
              <Edit3 size={11} color="#FF6A00" strokeWidth={2.4} />
              <Text className="text-[11px] font-bold text-primary font-sans">
                {t('edit_profile', 'Edit Profile')}
              </Text>
            </View>

            {/* Avatar */}
            <View className="relative mt-1">
              {resolvedAvatarUrl ? (
                <Image
                  source={{ uri: resolvedAvatarUrl }}
                  className="size-20 rounded-full border-2 border-primary/40 shadow-xs"
                />
              ) : (
                <View className="size-20 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/40 shadow-xs">
                  <Text className="text-primary font-black text-2xl font-sans">{avatarLetter}</Text>
                </View>
              )}
            </View>

            {/* User Name & Details */}
            <View className="items-center mt-0.5">
              <Text className="text-xl font-extrabold text-foreground font-sans text-center">
                {user?.name || (user?.email ? user.email.split('@')[0] : 'User')}
              </Text>
              <Text className="text-xs font-semibold text-primary font-sans text-center mt-0.5">
                {dynamicCommunity}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Mail size={13} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground font-sans text-center">
                {user?.email || ''}
              </Text>
            </View>

            {/* Unit & Role Pills */}
            <View className="flex-row flex-wrap justify-center gap-2 mt-2">
              <View className="bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
                <Text className="text-primary text-[11px] font-bold font-sans">
                  {dynamicUnit}
                </Text>
              </View>
              <View className="bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/25">
                <Text className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold font-sans">
                  {tRole(dynamicRole, dynamicRole)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. Theme Mode Section */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase px-1 font-sans">
              {t('theme_mode', 'Theme Mode')}
            </Text>
            <ThemeToggleSwitch
              themeMode={themeMode}
              onSelectMode={setThemeMode}
              t={t}
            />
          </View>

          {/* 3. Context Switchers Section */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase px-1 font-sans">
              {t('context_switchers', 'Context Switchers')}
            </Text>

            {/* Switch Community */}
            <TouchableOpacity
              onPress={() => setOrgModalVisible(true)}
              activeOpacity={0.7}
              className="bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
                  <Building2 size={18} color="#6366f1" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground font-sans">
                    {t('switch_community', 'Switch Community')}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    {dynamicCommunity}
                  </Text>
                </View>
              </View>
              <ChevronRight size={17} className="text-muted-foreground" />
            </TouchableOpacity>

            {/* Switch Villa Unit */}
            <TouchableOpacity
              onPress={() => setVillaModalVisible(true)}
              activeOpacity={0.7}
              className="bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  <Home size={18} color="#10b981" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground font-sans">
                    {t('switch_unit', 'Switch Villa Unit')}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    {dynamicUnit}
                  </Text>
                </View>
              </View>
              <ChevronRight size={17} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* 4. Community & Directory Section */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase px-1 font-sans">
              {t('community_directory', 'Community & Directory')}
            </Text>

            {/* Community Directory */}
            <TouchableOpacity
              onPress={() => router.push('/(resident)/directory' as any)}
              activeOpacity={0.7}
              className="bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  <Users size={18} color="#10b981" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground font-sans">
                    {t('community_directory', 'Community Directory')}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    {t('find_residents_security', 'Find residents, security & staff')}
                  </Text>
                </View>
              </View>
              <ChevronRight size={17} className="text-muted-foreground" />
            </TouchableOpacity>

            {/* All Community Notes */}
            <TouchableOpacity
              onPress={() => router.push('/(resident)/notes' as any)}
              activeOpacity={0.7}
              className="bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-pink-500/10 border border-pink-500/20 p-2.5 rounded-xl">
                  <Sparkles size={18} color="#ec4899" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground font-sans">
                    {t('all_community_notes', 'All Community Notes')}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    {t('view_24h_notes', 'View 24h status notes & publish')}
                  </Text>
                </View>
              </View>
              <ChevronRight size={17} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* 5. Preferences Section */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-muted-foreground uppercase px-1 font-sans">
              {t('preferences', 'Preferences')}
            </Text>

            {/* App Settings */}
            <TouchableOpacity
              onPress={() => router.push('/(resident)/settings' as any)}
              activeOpacity={0.7}
              className="bg-card border border-border rounded-2xl p-3.5 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
              accessibilityRole="button"
              accessibilityLabel="App Settings"
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-secondary border border-border p-2.5 rounded-xl">
                  <Settings size={18} className="text-foreground" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground font-sans">
                    {t('app_settings', 'App Settings')}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    {t('notifications_lang_security', 'Notifications, language & security')}
                  </Text>
                </View>
              </View>
              <ChevronRight size={17} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* 6. Account Sign Out Section */}
          <View className="gap-2 pt-1">
            <TouchableOpacity
              onPress={() => setLogoutModalOpen(true)}
              activeOpacity={0.75}
              className="bg-destructive/10 border border-destructive/25 rounded-2xl p-4 flex-row items-center justify-center gap-2.5 active:bg-destructive/20 shadow-xs"
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <LogOut size={18} className="text-destructive" />
              <Text className="text-sm font-bold text-destructive font-sans">
                {t('sign_out', 'Sign Out')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Interactive Villa Switcher Modal */}
      {villaModalVisible && (
        <VillaSwitchModal
          visible={villaModalVisible}
          onClose={() => setVillaModalVisible(false)}
          activeVilla={dynamicUnit}
          onSelectVilla={(_villaNum) => setVillaModalVisible(false)}
          communityName={dynamicCommunity}
          onOpenOrgModal={() => setOrgModalVisible(true)}
        />
      )}

      {/* Interactive Organization / Community Switcher Modal */}
      {orgModalVisible && (
        <OrgSwitchModal
          visible={orgModalVisible}
          onClose={() => setOrgModalVisible(false)}
          activeCommunity={dynamicCommunity}
          onSelectCommunity={(_orgName) => setOrgModalVisible(false)}
        />
      )}

      {/* Interactive Role Switcher Modal */}
      {roleModalVisible && (
        <RoleSwitchModal
          visible={roleModalVisible}
          onClose={() => setRoleModalVisible(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutModalOpen}
        title={t('sign_out', 'Sign Out')}
        message={t('confirm_sign_out', 'Are you sure you want to sign out of your account?')}
        confirmLabel={t('sign_out', 'Sign Out')}
        cancelLabel={t('cancel', 'Cancel')}
        variant="danger"
        loading={isLoggingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setLogoutModalOpen(false)}
      />
    </ScreenShell>
  );
}
