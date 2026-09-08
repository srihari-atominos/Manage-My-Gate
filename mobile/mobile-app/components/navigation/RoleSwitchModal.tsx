import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, X, UserCheck, Lock } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { performLogout } from '../../src/features/auth/store/authSlice';
import { useTranslation } from '@/src/utils/i18n';
import { useRouter } from 'expo-router';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface RoleSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRole?: (role: string) => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ visible, onClose, onSelectRole }) => {
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useDispatch<any>();
  const { t, tRole } = useTranslation();

  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  // The 3 standard canonical roles: Admin, Tenant/Owner, Security
  const canonicalRoles = ['Admin', 'Tenant/Owner', 'Security'];

  const roles: string[] = React.useMemo(() => {
    if (!user) return canonicalRoles;
    const userAny = user as any;
    if (userAny.roles && Array.isArray(userAny.roles) && userAny.roles.length > 0) {
      const merged = Array.from(new Set([...userAny.roles, ...canonicalRoles]));
      return merged;
    }
    return canonicalRoles;
  }, [user]);

  const activeRole = user?.role || roles[0] || 'Admin';

  const handleSelectRole = (selectedRole: string) => {
    setPendingRole(selectedRole);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingRole) return;
    const selectedRole = pendingRole;
    setShowConfirmModal(false);
    setPendingRole(null);
    onClose();
    // 1. Terminate current session
    await dispatch(performLogout());
    // 2. Redirect to Login screen with target role parameters
    router.replace({
      pathname: '/(auth)/login' as any,
      params: {
        switchType: 'role',
        targetName: selectedRole,
        targetRole: selectedRole,
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-3.5">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 p-2 rounded-xl">
                <ShieldCheck size={20} color="#03A9F4" />
              </View>
              <Text className="text-lg font-bold text-foreground">{t('switch_role', 'Switch Role Context')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1.5 rounded-full bg-secondary">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Logout & Re-authentication Warning Badge */}
          <View className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 flex-row items-center gap-2">
            <Lock size={15} color="#F59E0B" />
            <Text className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex-1 leading-tight">
              Switching role persona will log you out and require login credentials for that role.
            </Text>
          </View>

          <Text className="text-xs text-muted-foreground">
            {t('select_role_persona_sub', 'Select an active role persona to customize your mobile tools & permissions:')}
          </Text>

          {/* Roles List */}
          <ScrollView className="max-h-60">
            <View className="gap-2.5">
              {roles.map((role, idx) => {
                const isSelected = role === activeRole;
                const localizedRole = tRole(role, role);
                return (
                  <TouchableOpacity
                    key={`${role}-${idx}`}
                    onPress={() => handleSelectRole(role)}
                    activeOpacity={0.8}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border shadow-xs ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border/80 active:bg-secondary/50'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`p-2 rounded-xl border ${
                          isSelected ? 'bg-primary/20 border-primary/30' : 'bg-secondary border-border/50'
                        }`}
                      >
                        <UserCheck
                          size={18}
                          color={isSelected ? '#172B70' : '#a1a1aa'}
                        />
                      </View>
                      <View>
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {localizedRole}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground">
                          {tRole(role, `${role} Role`)}
                        </Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} className="text-primary" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Button onPress={onClose} variant="secondary" className="mt-2 h-11">
            <Text className="font-bold text-foreground text-sm">{t('cancel', 'Cancel')}</Text>
          </Button>
        </View>
      </View>

      {/* Yes/No Permission Confirmation Dialog */}
      <ConfirmationModal
        visible={showConfirmModal}
        variant="warning"
        title={t('confirm_switch_role_title', 'Switch Role Persona?')}
        message={`${t('confirm_switch_role_msg', 'Switching will sign you out and require login credentials for')} ${pendingRole ? tRole(pendingRole, pendingRole) : ''}. ${t('do_you_want_to_proceed', 'Do you want to proceed?')}`}
        confirmLabel={t('yes_switch', 'Yes, Switch')}
        cancelLabel={t('no_cancel', 'No, Cancel')}
        onConfirm={handleConfirmSwitch}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingRole(null);
        }}
      />
    </Modal>
  );
};

export default RoleSwitchModal;
