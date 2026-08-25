import React, { useState } from 'react';
import { View, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Bell, Home, Building2, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useSelector } from 'react-redux';
import { RoleSwitchModal } from './RoleSwitchModal';
import { VillaSwitchModal } from './VillaSwitchModal';
import { OrgSwitchModal } from './OrgSwitchModal';
import { ProfileModal } from './ProfileModal';
import { NotificationSheetModal } from './NotificationSheetModal';

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
  const insets = useSafeAreaInsets();
  const topInsetPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 28, 28)
      : Platform.OS === 'ios'
      ? Math.max(insets.top, 20)
      : Math.max(insets.top, 10);

  const { user } = useAuth();
  
  // Real-time notification count from Redux store if available
  const storeUnreadCount = useSelector((state: any) => state.notification?.unreadCount);
  const liveUnreadCount = unreadNotificationCount !== undefined 
    ? unreadNotificationCount 
    : (typeof storeUnreadCount === 'number' ? storeUnreadCount : 0);

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

    // 2. Fall back to availableWorkspaces list in Redux
    const workspaces = (user as any)?.availableWorkspaces || [];
    if (Array.isArray(workspaces) && workspaces.length > 0 && workspaces[0]?.name) {
      return workspaces[0].name;
    }

    return 'Community Workspace';
  }, [communityName, user]);

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
      setNotifModalVisible(true);
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

  return (
    <>
      <View
        style={{ paddingTop: topInsetPadding }}
        className="bg-card border-b border-border px-4 pb-3 flex-row items-center justify-between shadow-xs z-20"
      >
        {/* Left Section: Compact Context Pill (Constrained to ~65% width max, height-aligned with right icons) */}
        <TouchableOpacity
          onPress={handleContextPress}
          activeOpacity={canSwitchContext ? 0.8 : 1}
          disabled={!canSwitchContext}
          className="flex-row items-center gap-2 max-w-[65%] h-10 bg-muted/40 border border-border px-3 rounded-full shadow-xs"
        >
          <View className={`w-7 h-7 rounded-full items-center justify-center ${hasUnit ? 'bg-primary/15' : 'bg-indigo-500/15'}`}>
            {hasUnit ? (
              <Home size={16} color="#03A9F4" />
            ) : (
              <Building2 size={16} color="#6366f1" />
            )}
          </View>

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-xs font-extrabold text-foreground flex-1"
          >
            {headerTextString}
          </Text>

          {canSwitchContext ? (
            <ChevronDown size={14} color="#03A9F4" className="flex-shrink-0" />
          ) : null}
        </TouchableOpacity>

        {/* Right Section: Notification Bell & Profile Avatar (Far Right, Height-Aligned) */}
        <View className="flex-row items-center gap-2.5">
          {/* Notification Bell Icon Button */}
          <TouchableOpacity
            onPress={handleBellPress}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-muted/50 border border-border items-center justify-center relative shadow-xs"
          >
            <Bell size={18} color="#555" />
            {liveUnreadCount > 0 ? (
              <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full min-w-4 h-4 px-1 items-center justify-center border-2 border-card z-10">
                <Text className="text-[8px] font-black text-white leading-none">
                  {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Profile Avatar Button (Far Right End) */}
          <TouchableOpacity
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-primary/15 items-center justify-center border border-primary/40 shadow-xs"
          >
            <Text className="text-primary font-bold text-sm">{avatarLetter}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive Villa Switcher Modal */}
      <VillaSwitchModal
        visible={villaModalVisible}
        onClose={() => setVillaModalVisible(false)}
        activeVilla={activeVilla || ''}
        onSelectVilla={(villaNum) => setActiveVilla(villaNum)}
        communityName={activeCommunity}
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
