import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
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
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  unitName = 'Villa 12',
  communityName = 'Green Meadows',
  onOpenOrgModal,
  onOpenRoleModal,
  onOpenVillaModal,
}) => {
  const { user, logout } = useAuth();

  const avatarLetter = React.useMemo(() => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  }, [user]);

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-5 shadow-xl gap-4">
          {/* Header Bar */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <Text className="text-base font-bold text-foreground">User Profile & Account</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <X size={18} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-96">
            <View className="gap-4">
              {/* User Card */}
              <View className="items-center bg-primary/5 border border-primary/20 rounded-2xl p-4 gap-1.5">
                <View className="size-14 rounded-full bg-primary/15 items-center justify-center border-2 border-primary/30">
                  <Text className="text-primary font-black text-xl">{avatarLetter}</Text>
                </View>

                <Text className="text-base font-extrabold text-foreground text-center">
                  {user?.email ? user.email.split('@')[0] : 'Resident User'}
                </Text>

                <View className="flex-row items-center gap-1">
                  <Mail size={12} color="#888" />
                  <Text className="text-xs text-muted-foreground text-center">{user?.email || 'admin@enterprise.com'}</Text>
                </View>

                <View className="flex-row gap-2 mt-1">
                  <View className="bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    <Text className="text-primary text-[10px] font-bold">
                      {unitName}
                    </Text>
                  </View>
                  <View className="bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <Text className="text-emerald-600 text-[10px] font-bold">
                      {user?.role || 'Resident'}
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
                  className="bg-muted/30 border border-border rounded-xl p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-indigo-500/10 p-2 rounded-lg">
                      <Building2 size={16} color="#6366f1" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Community</Text>
                      <Text className="text-[10px] text-muted-foreground">{communityName}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#888" />
                </TouchableOpacity>

                {/* Switch Role */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (onOpenRoleModal) onOpenRoleModal();
                  }}
                  activeOpacity={0.7}
                  className="bg-muted/30 border border-border rounded-xl p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/10 p-2 rounded-lg">
                      <ShieldCheck size={16} color="#03A9F4" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Role Persona</Text>
                      <Text className="text-[10px] text-muted-foreground">{user?.role || 'Resident'}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#888" />
                </TouchableOpacity>

                {/* Switch Villa Unit */}
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    if (onOpenVillaModal) onOpenVillaModal();
                  }}
                  activeOpacity={0.7}
                  className="bg-muted/30 border border-border rounded-xl p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-emerald-500/10 p-2 rounded-lg">
                      <Home size={16} color="#10b981" />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-foreground">Switch Villa Unit</Text>
                      <Text className="text-[10px] text-muted-foreground">{unitName}</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Preferences */}
              <View className="gap-2">
                <Text className="text-[11px] font-bold text-muted-foreground uppercase px-1">
                  Preferences
                </Text>

                <TouchableOpacity activeOpacity={0.7} className="bg-muted/30 border border-border rounded-xl p-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Settings size={16} color="#777" />
                    <Text className="text-xs font-medium text-foreground">App Settings</Text>
                  </View>
                  <ChevronRight size={16} color="#888" />
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
