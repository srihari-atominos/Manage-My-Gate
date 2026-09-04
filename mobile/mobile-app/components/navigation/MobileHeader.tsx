import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bell, Home, Building2, ChevronDown, Sun, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import storage from '../../src/utils/storage';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { RoleSwitchModal } from './RoleSwitchModal';
import { VillaSwitchModal } from './VillaSwitchModal';
import { OrgSwitchModal } from './OrgSwitchModal';
import { ProfileModal } from './ProfileModal';
import { NotificationSheetModal } from './NotificationSheetModal';
import { useNotifications } from '@/src/features/notification/hooks/useNotifications';
import { RealtimeNotificationToast } from '@/components/feedback/RealtimeNotificationToast';
import { mapActionUrlToMobileRoute } from '@/src/features/notification/utils/notificationNavigation';
import { useTranslation } from '@/src/utils/i18n';

interface MobileHeaderProps {
  unitName?: string | null;
  communityName?: string;
  unreadNotificationCount?: number;
  onNotificationPress?: () => void;
}

const EMPTY_ARRAY: any[] = [];

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  unitName,
  communityName,
  unreadNotificationCount,
  onNotificationPress,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  // Real-time notification hook initialization to ensure WebSockets & state remain active
  const {
    unreadCount: hookUnreadCount,
    latestNotification,
    dismissLatestNotification,
    markAsRead,
  } = useNotifications();

  // Real-time notification count from Redux store or prop override
  const liveUnreadCount = unreadNotificationCount !== undefined 
    ? unreadNotificationCount 
    : (typeof hookUnreadCount === 'number' ? hookUnreadCount : 0);

  const reduxWorkspaces = useSelector((state: any) => state.auth?.user?.availableWorkspaces || state.workspace?.availableWorkspaces || EMPTY_ARRAY);

  // Fully dynamic active villa & community from user session
  const dynamicVilla = React.useMemo(() => {
    if (unitName !== undefined && unitName !== null) return unitName;
    return (user as any)?.villaNumber || (user as any)?.activeVillaNumber || (user as any)?.unitNumber || null;
  }, [unitName, user]);

  const dynamicCommunity = React.useMemo(() => {
    const userOrg =
      (user as any)?.organizationName ||
      (user as any)?.activeOrganizationName ||
      (user as any)?.orgName ||
      (user as any)?.communityName ||
      (user as any)?.communityOrg ||
      (user as any)?.organization?.name;

    if (userOrg) return userOrg;

    // 2. Fall back to availableWorkspaces list matching active workspace orgId
    const activeOrgId = (user as any)?.orgId || (user as any)?.activeOrgId;
    const workspaces = (user as any)?.availableWorkspaces || reduxWorkspaces || [];
    if (Array.isArray(workspaces) && workspaces.length > 0) {
      if (activeOrgId) {
        const activeWs = workspaces.find(
          (w: any) => w.orgId === activeOrgId || w._id === activeOrgId || w.id === activeOrgId,
        );
        if (activeWs?.name) return activeWs.name;
      }
      if (workspaces[0]?.name) {
        return workspaces[0].name;
      }
    }

    return 'Community Workspace';
  }, [communityName, user, reduxWorkspaces]);

  const [activeVilla, setActiveVilla] = useState<string | null>(dynamicVilla);
  const [activeCommunity, setActiveCommunity] = useState<string>(dynamicCommunity);

  // Sync state dynamically when user session or props change
  React.useEffect(() => {
    setActiveVilla(dynamicVilla);
  }, [dynamicVilla]);

  React.useEffect(() => {
    setActiveCommunity(dynamicCommunity);
  }, [dynamicCommunity]);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [villaModalVisible, setVillaModalVisible] = useState(false);
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Check if context switching is applicable
  const userUnits = (user as any)?.accessibleUnits || [];
  const hasMultipleOrgs = Array.isArray(reduxWorkspaces) && reduxWorkspaces.length > 1;
  const hasMultipleUnits = Array.isArray(userUnits) && userUnits.length > 1;
  const hasUnit = Boolean(activeVilla && activeVilla.trim() !== '');

  const canSwitchContext = hasUnit || hasMultipleOrgs || hasMultipleUnits;

  // Avatar initial letter
  const avatarLetter = React.useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }, [user]);

  const { colorScheme, setColorScheme } = useColorScheme();

  const toggleTheme = async () => {
    const nextTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(nextTheme);
    try {
      await storage.setItem('theme_preference', nextTheme);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  const handleContextPress = () => {
    if (!canSwitchContext) return;
    if (hasUnit) {
      setVillaModalVisible(true);
    } else if (hasMultipleOrgs) {
      setOrgModalVisible(true);
    }
  };

  const handleBellPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/(resident)/notifications' as any);
    }
  };

  const handleToastPress = (notification: any) => {
    const notifId = notification?.id || notification?._id;
    if (notifId && !notification.isRead) {
      markAsRead(notifId);
    }
    if (notification.actionUrl) {
      const route = mapActionUrlToMobileRoute(notification.actionUrl, notification.type);
      router.push(route as any);
    } else {
      router.push('/(resident)/notifications' as any);
    }
  };

  // Formatted header string preventing nested Text styling glitches
  const headerTextString = React.useMemo(() => {
    const comm = activeCommunity || 'Green Meadows';
    if (hasUnit && activeVilla) {
      return `${activeVilla} • ${comm}`;
    }
    return comm;
  }, [hasUnit, activeVilla, activeCommunity]);

  const insets = useSafeAreaInsets();

  return (
    <>
      <View 
        style={{ paddingTop: Math.max(insets.top, 16) }}
        className="bg-card border-b border-border px-4 pb-3 flex-row items-center justify-between shadow-xs"
      >
        {/* Left Section: Community Context Pill */}
        <TouchableOpacity
          onPress={handleContextPress}
          activeOpacity={canSwitchContext ? 0.8 : 1}
          disabled={!canSwitchContext}
          className="flex-row items-center gap-2 max-w-[55%] bg-secondary border border-border/80 px-3 py-1.5 rounded-full shadow-xs"
        >
          <View className="p-1.5 rounded-full bg-primary items-center justify-center border border-primary/30">
            {hasUnit ? (
              <Home size={12} color="#FFFFFF" />
            ) : (
              <Building2 size={12} color="#FFFFFF" />
            )}
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="tail"
            className="text-[13px] font-bold font-sans text-foreground flex-1 tracking-tight"
          >
            {headerTextString}
          </Text>

          {canSwitchContext ? (
            <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" />
          ) : null}
        </TouchableOpacity>

        {/* Right Section: Theme Toggle, Notification Bell & Profile Avatar */}
        <View className="flex-row items-center gap-2">
          {/* Theme Shift Toggle Icon Button */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-secondary/80 dark:bg-secondary border border-border items-center justify-center active:bg-secondary shadow-xs"
            accessibilityRole="button"
            accessibilityLabel="Toggle Light and Dark Theme"
          >
            {colorScheme === 'dark' ? (
              <Sun size={18} color="#F59E0B" strokeWidth={2.2} />
            ) : (
              <Moon size={18} color="#334155" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Notification Bell Icon Button */}
          <TouchableOpacity
            onPress={handleBellPress}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-secondary/80 dark:bg-secondary border border-border items-center justify-center relative active:bg-secondary shadow-xs"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color={colorScheme === 'dark' ? '#F1F5F9' : '#334155'} strokeWidth={2.2} />
            {liveUnreadCount > 0 ? (
              <View className="absolute -top-0.5 -right-0.5 bg-[#FF6A00] rounded-full min-w-4 h-4 px-1 items-center justify-center border-2 border-card">
                <Text className="text-[8.5px] font-bold font-sans text-white leading-tight">
                  {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Profile Avatar Button */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/profile' as any)}
            activeOpacity={0.85}
            className="size-10 rounded-full bg-primary items-center justify-center border border-primary shadow-xs active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="User Profile"
          >
            <Text className="text-white font-bold font-sans text-[14px]">{avatarLetter}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Real-time Notification Banner Toast */}
      <RealtimeNotificationToast
        notification={latestNotification}
        onDismiss={dismissLatestNotification}
        onPressBanner={handleToastPress}
      />

      {/* Interactive Villa Switcher Modal */}
      <VillaSwitchModal
        visible={villaModalVisible}
        onClose={() => setVillaModalVisible(false)}
        activeVilla={activeVilla || ''}
        onSelectVilla={(villaNum) => setActiveVilla(villaNum)}
        communityName={activeCommunity}
        onOpenOrgModal={() => setOrgModalVisible(true)}
      />

      {/* Interactive Organization / Community Switcher Modal */}
      <OrgSwitchModal
        visible={orgModalVisible}
        onClose={() => setOrgModalVisible(false)}
        activeCommunity={activeCommunity}
        onSelectCommunity={(orgName) => setActiveCommunity(orgName)}
      />

      {/* Interactive Role Switcher Modal */}
      <RoleSwitchModal
        visible={roleModalVisible}
        onClose={() => setRoleModalVisible(false)}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        unitName={activeVilla || 'No Unit Assigned'}
        communityName={activeCommunity}
        onOpenOrgModal={() => setOrgModalVisible(true)}
        onOpenRoleModal={() => setRoleModalVisible(true)}
        onOpenVillaModal={() => setVillaModalVisible(true)}
      />

      {/* Notifications Slide-Over Drawer Modal */}
      <NotificationSheetModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
      />
    </>
  );
};

export default MobileHeader;
