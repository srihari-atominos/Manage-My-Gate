import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { Home, LogOut, X, Settings, ShieldCheck, Mail, Building2, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  unitName?: string;
  communityName?: string;
  onOpenOrgModal?: () => void;
  onOpenRoleModal?: () => void;
  onOpenVillaModal?: () => void;
  onOpenSettings?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  unitName,
  communityName,
  onOpenOrgModal,
  onOpenRoleModal,
  onOpenVillaModal,
  onOpenSettings,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const userAny = user as any;

  const dynamicUnit = userAny?.villaNumber || userAny?.activeVillaNumber || userAny?.unitNumber || unitName || 'No Unit Assigned';
  const dynamicCommunity = React.useMemo(() => {
    if (communityName) return communityName;

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
  }, [communityName, userAny]);
  const dynamicRole = user?.role || (userAny?.roles && userAny?.roles.length > 0 ? userAny?.roles[0] : 'Member');

  const avatarLetter = React.useMemo(() => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }, [user]);

  const handleOpenSettings = () => {
    onClose();
    setTimeout(() => {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        router.push('/(resident)/settings' as any);
      }
    }, 120);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-5 shadow-xl gap-4">
          {/* Header Bar */}
          <View className="flex-row justify-between items-center pb-2.5 border-b border-border/80">
            <Text className="text-base font-bold text-foreground">User Profile & Account</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1 rounded-full bg-secondary">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              {/* User Liquid Glass Card */}
              <View className="items-center bg-primary/10 border border-primary/25 rounded-2xl p-4 gap-1.5 shadow-xs">
                <View className="size-14 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/40 shadow-xs">
                  <Text className="text-primary font-black text-xl">{avatarLetter}</Text>
                </View>

                <Text className="text-base font-extrabold text-foreground text-center">
                  {user?.name || (user?.email ? user.email.split('@')[0] : 'User')}
                </Text>

                <View className="flex-row items-center gap-1">
                  <Mail size={12} className="text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground text-center">{user?.email || ''}</Text>
                </View>

                <View className="flex-row gap-2 mt-1">
                  <View className="bg-primary/15 px-2.5 py-0.5 rounded-full border border-primary/30">
                    <Text className="text-primary text-[10px] font-bold">
                      {dynamicUnit}
                    </Text>
                  </View>
                  <View className="bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                    <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      {dynamicRole}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Context Switchers Section */}
              <View className="gap-2">
                <Text className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                  Context Switchers
                </Text>

                {/* Switch Community */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (onOpenOrgModal) onOpenOrgModal();
                  }}
                  activeOpacity={0.7}
                  className="bg-card border border-border/80 rounded-xl p-3 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg">
                      <Building2 size={16} color="#6366f1" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Community</Text>
                      <Text className="text-[10px] text-muted-foreground">{dynamicCommunity}</Text>
                    </View>
                  </View>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </TouchableOpacity>

                {/* Switch Role */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (onOpenRoleModal) onOpenRoleModal();
                  }}
                  activeOpacity={0.7}
                  className="bg-card border border-border/80 rounded-xl p-3 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/10 border border-primary/20 p-2 rounded-lg">
                      <ShieldCheck size={16} className="text-primary" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Role Persona</Text>
                      <Text className="text-[10px] text-muted-foreground">{dynamicRole}</Text>
                    </View>
                  </View>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </TouchableOpacity>

                {/* Switch Villa Unit */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (onOpenVillaModal) onOpenVillaModal();
                  }}
                  activeOpacity={0.7}
                  className="bg-card border border-border/80 rounded-xl p-3 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                      <Home size={16} color="#10b981" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Villa Unit</Text>
                      <Text className="text-[10px] text-muted-foreground">{dynamicUnit}</Text>
                    </View>
                  </View>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </TouchableOpacity>
              </View>

              {/* Preferences */}
              <View className="gap-2">
                <Text className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                  Preferences
                </Text>

                <TouchableOpacity
                  onPress={handleOpenSettings}
                  activeOpacity={0.7}
                  className="bg-card border border-border/80 rounded-xl p-3 flex-row items-center justify-between active:bg-secondary/50 shadow-xs"
                  accessibilityRole="button"
                  accessibilityLabel="App Settings"
                >
                  <View className="flex-row items-center gap-3">
                    <Settings size={16} className="text-muted-foreground" />
                    <Text className="text-xs font-medium text-foreground">App Settings</Text>
                  </View>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer: Logout Button */}
          <Button
            onPress={handleLogout}
            className="h-11 bg-rose-500/10 border border-rose-500/20 rounded-xl flex-row items-center justify-center gap-2 mt-1"
          >
            <LogOut size={16} color="#f43f5e" />
            <Text className="font-bold text-rose-500 text-xs">Sign Out</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default ProfileModal;
