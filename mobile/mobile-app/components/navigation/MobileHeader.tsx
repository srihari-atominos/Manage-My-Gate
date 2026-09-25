import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bell, Home, Building2, ChevronDown, Sun, Moon, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import storage from '../../src/utils/storage';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useSelector } from 'react-redux';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RoleSwitchModal } from './RoleSwitchModal';
import { VillaSwitchModal } from './VillaSwitchModal';
import { OrgSwitchModal } from './OrgSwitchModal';
import { ProfileModal } from './ProfileModal';
import { NotificationSheetModal } from './NotificationSheetModal';
import { useNotifications } from '@/src/features/notification/hooks/useNotifications';
import { useTranslation } from '@/src/utils/i18n';
import useSettings from '@/src/features/settings/hooks/useSettings';
import { getImageUrl } from '@/src/utils/imageUrl';
import { cn } from '../../lib/utils';

interface MobileHeaderProps {
  unitName?: string | null;
  communityName?: string;
  unreadNotificationCount?: number;
  onNotificationPress?: () => void;
  transparent?: boolean;
}

const EMPTY_ARRAY: any[] = [];

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  unitName,
  communityName,
  unreadNotificationCount,
  onNotificationPress,
  transparent,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const { t, translateText, language } = useTranslation();
  
  // Real-time notification hook initialization to ensure unread badge remains active
  const { unreadCount: hookUnreadCount } = useNotifications();

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

    return t('community_workspace', 'Community Workspace');
  }, [communityName, user, reduxWorkspaces, language, t]);

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

  const params = useLocalSearchParams<{ openProfile?: string }>();

  React.useEffect(() => {
    if (params?.openProfile === 'true') {
      try {
        router.setParams({ openProfile: undefined });
      } catch (e) {}
      router.push('/(resident)/account' as any);
    }
  }, [params?.openProfile, router]);

  // Check if context switching is applicable
  const userUnits = (user as any)?.accessibleUnits || [];
  const hasMultipleOrgs = Array.isArray(reduxWorkspaces) && reduxWorkspaces.length > 1;
  const hasOrgs = (Array.isArray(reduxWorkspaces) && reduxWorkspaces.length > 0) || Boolean((user as any)?.orgId);
  const hasMultipleUnits = Array.isArray(userUnits) && userUnits.length > 1;
  const hasUnit = Boolean(activeVilla && activeVilla.trim() !== '');

  const canSwitchContext = hasUnit || hasOrgs || hasMultipleUnits;

  // Avatar resolution
  const userAny = user as any;
  const userAvatar = user?.avatar || userAny?.avatarUrl;
  const resolvedAvatarUrl = userAvatar ? getImageUrl(userAvatar) : null;
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [resolvedAvatarUrl]);

  // Avatar initial letter
  const avatarLetter = React.useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }, [user]);

  const { themeMode, setThemeMode } = useSettings();
  const { colorScheme } = useColorScheme();

  const toggleTheme = () => {
    const nextTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  };

  const handleContextPress = () => {
    if (!canSwitchContext) return;
    if (hasUnit) {
      setVillaModalVisible(true);
    } else if (hasOrgs) {
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

  // Formatted header string preventing nested Text styling glitches
  const headerTextString = React.useMemo(() => {
    const defaultComm = t('green_meadows', 'Green Meadows');
    const comm = activeCommunity ? translateText(activeCommunity) : defaultComm;
    if (hasUnit && activeVilla) {
      return `${activeVilla} • ${comm}`;
    }
    return comm;
  }, [hasUnit, activeVilla, activeCommunity, language, t, translateText]);

  const insets = useSafeAreaInsets();

  return (
    <>
      <View 
        style={{ paddingTop: Math.max(insets.top, 16) + 4 }}
        className={cn(
          transparent
            ? 'bg-transparent'
            : 'bg-card border-b border-border/70 shadow-2xs',
          'px-4 pb-4 flex-row items-center justify-between'
        )}
      >
        {/* Left Section: Community / Villa Context Pill */}
        <TouchableOpacity
          onPress={handleContextPress}
          activeOpacity={canSwitchContext ? 0.8 : 1}
          disabled={!canSwitchContext}
          className="flex-row items-center gap-2 flex-1 max-w-[65%] me-2 bg-secondary/90 border border-border/70 px-3 py-1.5 rounded-full shadow-2xs"
        >
          <View className="p-1.5 rounded-full bg-primary items-center justify-center border border-primary/20 shrink-0 shadow-2xs">
            {hasUnit ? (
              <Home size={12} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Building2 size={12} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </View>

          <View className="flex-1 flex-row items-center overflow-hidden min-w-0">
            {hasUnit && activeVilla ? (
              <>
                <Text
                  numberOfLines={1}
                  className="text-[15.5px] font-bold font-sans text-foreground shrink-0"
                >
                  {activeVilla}
                </Text>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="text-[14px] font-medium font-sans text-muted-foreground flex-1 ms-1"
                >
                  • {activeCommunity ? translateText(activeCommunity) : t('community', 'Community')}
                </Text>
              </>
            ) : (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-[15.5px] font-bold font-sans text-foreground flex-1"
              >
                {activeCommunity ? translateText(activeCommunity) : t('community_workspace', 'Community Workspace')}
              </Text>
            )}
          </View>

          {canSwitchContext ? (
            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
          ) : null}
        </TouchableOpacity>

        {/* Right Section: Theme Toggle, Notification Bell & Profile Avatar */}
        <View className="flex-row items-center gap-1.5 shrink-0">
          {/* Theme Shift Toggle Icon Button */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-secondary/80 dark:bg-secondary/60 border border-border/70 items-center justify-center active:bg-secondary shadow-2xs"
            accessibilityRole="button"
            accessibilityLabel="Toggle Light and Dark Theme"
          >
            {colorScheme === 'dark' ? (
              <Sun size={17} color="#F59E0B" strokeWidth={2.2} />
            ) : (
              <Moon size={17} color="#334155" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Notification Bell Icon Button */}
          <TouchableOpacity
            onPress={handleBellPress}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-secondary/80 dark:bg-secondary/60 border border-border/70 items-center justify-center relative active:bg-secondary shadow-2xs"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={17} color={colorScheme === 'dark' ? '#F1F5F9' : '#334155'} strokeWidth={2.2} />
            {liveUnreadCount > 0 ? (
              <View className="absolute -top-0.5 -right-0.5 bg-primary rounded-full min-w-4 h-4 px-1 items-center justify-center border-2 border-card shadow-2xs">
                <Text className="text-[8.5px] font-bold font-sans text-primary-foreground leading-tight">
                  {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Profile Avatar / Icon Button */}
          <TouchableOpacity
            onPress={() => router.push('/(resident)/profile' as any)}
            activeOpacity={0.7}
            className="size-10 rounded-full bg-secondary/80 dark:bg-secondary/60 border border-border/70 items-center justify-center overflow-hidden active:bg-secondary shadow-2xs"
            accessibilityRole="button"
            accessibilityLabel={t('profile', 'Profile')}
          >
            {resolvedAvatarUrl && !imageError ? (
              <Image
                source={{ uri: resolvedAvatarUrl }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <User
                size={18}
                color={colorScheme === 'dark' ? '#F1F5F9' : '#334155'}
                strokeWidth={2.2}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive Villa Switcher Modal */}
      {villaModalVisible && (
        <VillaSwitchModal
          visible={villaModalVisible}
          onClose={() => setVillaModalVisible(false)}
          activeVilla={activeVilla || ''}
          onSelectVilla={(villaNum) => setActiveVilla(villaNum)}
          communityName={activeCommunity}
          onOpenOrgModal={() => setOrgModalVisible(true)}
        />
      )}

      {/* Interactive Organization / Community Switcher Modal */}
      {orgModalVisible && (
        <OrgSwitchModal
          visible={orgModalVisible}
          onClose={() => setOrgModalVisible(false)}
          activeCommunity={activeCommunity}
          onSelectCommunity={(orgName) => setActiveCommunity(orgName)}
        />
      )}

      {/* Interactive Role Switcher Modal */}
      {roleModalVisible && (
        <RoleSwitchModal
          visible={roleModalVisible}
          onClose={() => setRoleModalVisible(false)}
        />
      )}

      {/* Profile & Settings Modal */}
      {profileModalVisible && (
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => {
            setProfileModalVisible(false);
            if (params?.openProfile) {
              try {
                router.setParams({ openProfile: undefined });
              } catch (e) {
                // safe fallback
              }
            }
          }}
          unitName={activeVilla || 'No Unit Assigned'}
          communityName={activeCommunity}
          onOpenOrgModal={() => setOrgModalVisible(true)}
          onOpenRoleModal={() => setRoleModalVisible(true)}
          onOpenVillaModal={() => setVillaModalVisible(true)}
        />
      )}

      {/* Notifications Slide-Over Drawer Modal */}
      {notifModalVisible && (
        <NotificationSheetModal
          visible={notifModalVisible}
          onClose={() => setNotifModalVisible(false)}
        />
      )}
    </>
  );
};

export default MobileHeader;
