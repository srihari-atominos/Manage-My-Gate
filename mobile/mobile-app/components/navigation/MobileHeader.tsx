import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
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

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  unitName,
  communityName,
  unreadNotificationCount,
  onNotificationPress,
}) => {
  const { user } = useAuth();
  
  // Real-time notification count from Redux store if available
  const storeUnreadCount = useSelector((state: any) => state.notification?.unreadCount);
  const liveUnreadCount = unreadNotificationCount !== undefined 
    ? unreadNotificationCount 
    : (typeof storeUnreadCount === 'number' ? storeUnreadCount : 0);

  const reduxWorkspaces = useSelector((state: any) => state.auth?.user?.availableWorkspaces || state.workspace?.availableWorkspaces || []);

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
      <View className="bg-card border-b border-border px-4 py-2.5 flex-row items-center justify-between shadow-xs">
        {/* Left Section: Compact Context Pill (Constrained to ~64% width max) */}
        <TouchableOpacity
          onPress={handleContextPress}
          activeOpacity={canSwitchContext ? 0.8 : 1}
          disabled={!canSwitchContext}
          className="flex-row items-center gap-1.5 max-w-[64%] bg-muted/40 border border-border px-2.5 py-1.5 rounded-full"
        >
          <View className={`p-1 rounded-full ${hasUnit ? 'bg-primary/15' : 'bg-indigo-500/15'}`}>
            {hasUnit ? (
              <Home size={12} color="#03A9F4" />
            ) : (
              <Building2 size={12} color="#6366f1" />
            )}
          </View>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="tail"
            className="text-xs font-bold text-foreground flex-1"
          >
            {headerTextString}
          </Text>

          {canSwitchContext ? (
            <ChevronDown size={12} color="#03A9F4" className="flex-shrink-0" />
          ) : null}
        </TouchableOpacity>

        {/* Right Section: Notification Bell & Profile Avatar (Far Right) */}
        <View className="flex-row items-center gap-3">
          {/* Notification Bell Icon Button */}
          <TouchableOpacity
            onPress={handleBellPress}
            activeOpacity={0.7}
            className="size-9 rounded-full bg-muted/60 border border-border items-center justify-center relative"
          >
            <Bell size={16} color="#555" />
            {liveUnreadCount > 0 ? (
              <View className="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full min-w-3.5 h-3.5 px-1 items-center justify-center border border-card">
                <Text className="text-[8px] font-bold text-white">
                  {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Profile Avatar Button (Far Right End) */}
          <TouchableOpacity
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.8}
            className="size-9 rounded-full bg-primary/15 items-center justify-center border border-primary/40 shadow-xs"
          >
            <Text className="text-primary font-extrabold text-xs">{avatarLetter}</Text>
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
