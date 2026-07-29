import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, X, UserCheck } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { updateTokenAndUser } from '../../src/features/auth/store/authSlice';

interface RoleSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRole?: (role: string) => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ visible, onClose, onSelectRole }) => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  // Extract available roles array
  const roles: string[] = React.useMemo(() => {
    if (!user) return ['Resident', 'Admin', 'Guard'];
    const userAny = user as any;
    if (userAny.roles && Array.isArray(userAny.roles) && userAny.roles.length > 0) {
      return userAny.roles;
    }
    if (user.role) {
      const split = user.role.split(',').map((r: string) => r.trim()).filter(Boolean);
      return Array.from(new Set([...split, 'Resident', 'Admin', 'Guard']));
    }
    return ['Resident', 'Admin', 'Guard'];
  }, [user]);

  const activeRole = user?.role || roles[0] || 'Resident';

  const handleSelectRole = (selectedRole: string) => {
    if (user) {
      dispatch(updateTokenAndUser({ user: { ...user, role: selectedRole } }));
    }
    if (onSelectRole) {
      onSelectRole(selectedRole);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-4">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 p-2 rounded-xl">
                <ShieldCheck size={20} color="#03A9F4" />
              </View>
              <Text className="text-lg font-bold text-foreground">Switch Role Context</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <X size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground">
            Select an active role persona to customize your mobile tools & permissions:
          </Text>

          {/* Roles List */}
          <ScrollView className="max-h-60">
            <View className="gap-2.5">
              {roles.map((role) => {
                const isSelected = role === activeRole;
                return (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleSelectRole(role)}
                    activeOpacity={0.8}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`p-2 rounded-xl ${
                          isSelected ? 'bg-primary/20' : 'bg-muted'
                        }`}
                      >
                        <UserCheck
                          size={18}
                          color={isSelected ? '#03A9F4' : '#777'}
                        />
                      </View>
                      <View>
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {role}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground">
                          {role === 'Resident'
                            ? 'Villa Owner / Tenant'
                            : role === 'Guard'
                            ? 'Security Gate Access'
                            : 'Community Admin'}
                        </Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} color="#03A9F4" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Button onPress={onClose} className="mt-2 h-11 bg-muted border border-border">
            <Text className="font-bold text-foreground text-sm">Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default RoleSwitchModal;
