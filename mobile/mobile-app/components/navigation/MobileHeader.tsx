import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Bell, Home, Building2, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { RoleSwitchModal } from './RoleSwitchModal';
import { VillaSwitchModal } from './VillaSwitchModal';
import { OrgSwitchModal } from './OrgSwitchModal';
import { ProfileModal } from './ProfileModal';

interface MobileHeaderProps {
  unitName?: string | null;
  communityName?: string;
  onNotificationPress?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  unitName = 'Villa 12',
  communityName = 'Green Meadows',
  onNotificationPress,
}) => {
  const { user } = useAuth();
  const [activeVilla, setActiveVilla] = useState<string | null>(unitName || null);
  const [activeCommunity, setActiveCommunity] = useState<string>(communityName);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [villaModalVisible, setVillaModalVisible] = useState(false);
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Avatar initial letter
  const avatarLetter = React.useMemo(() => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }, [user]);

  // Derived context display text
  const hasUnit = Boolean(activeVilla && activeVilla.trim() !== '');

  const handleContextPress = () => {
    if (hasUnit) {
      setVillaModalVisible(true);
    } else {
      setOrgModalVisible(true);
    }
  };

  return (
    <>
      <View className="bg-card border-b border-border px-4 py-2.5 flex-row items-center justify-between shadow-xs">
        {/* Left Section: Compact Context Pill (Constrained to ~62% width max) */}
        <TouchableOpacity
          onPress={handleContextPress}
          activeOpacity={0.8}
          className="flex-row items-center gap-1.5 max-w-[62%] bg-muted/40 border border-border px-2.5 py-1.5 rounded-full active:bg-muted/70"
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
            ellipsizeMode="tail"
            className="text-xs font-bold text-foreground flex-1"
          >
            {hasUnit ? (
              <>
                {activeVilla} <Text className="text-muted-foreground font-normal">• {activeCommunity}</Text>
              </>
            ) : (
              activeCommunity
            )}
          </Text>

          <ChevronDown size={12} color="#03A9F4" className="flex-shrink-0" />
        </TouchableOpacity>

        {/* Right Section: Notification Bell & Profile Avatar (Far Right) */}
        <View className="flex-row items-center gap-3">
          {/* Notification Bell Icon Button */}
          <TouchableOpacity
            onPress={onNotificationPress}
            activeOpacity={0.7}
            className="size-9 rounded-full bg-muted/60 border border-border items-center justify-center relative"
          >
            <Bell size={16} color="#555" />
            <View className="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full min-w-3.5 h-3.5 px-0.5 items-center justify-center border border-card">
              <Text className="text-[8px] font-bold text-white">3</Text>
            </View>
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
    </>
  );
};

export default MobileHeader;
