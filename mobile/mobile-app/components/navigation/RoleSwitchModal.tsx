import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, X, UserCheck } from 'lucide-react-native';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { switchWorkspaceContextThunk } from '../../src/features/auth/store/authSlice';
import { useTranslation } from '@/src/utils/i18n';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface RoleSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRole?: (role: string) => void;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({ visible, onClose, onSelectRole }) => {
  const { user } = useAuth();
  const dispatch = useDispatch<any>();
  const { t, tRole } = useTranslation();

  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isSwitching, setIsSwitching] = React.useState(false);

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
    setIsSwitching(true);
    try {
      const switchPayload: { targetOrgId?: string; targetRole?: string } = {};
      const activeOrgId = (user as any)?.orgId || (user as any)?.activeOrgId;
      if (activeOrgId && typeof activeOrgId === 'string' && /^[0-9a-fA-F]{24}$/.test(activeOrgId.trim())) {
        switchPayload.targetOrgId = activeOrgId.trim();
      }
      if (selectedRole && typeof selectedRole === 'string' && selectedRole.trim()) {
        switchPayload.targetRole = selectedRole.trim();
      }
      await dispatch(switchWorkspaceContextThunk(switchPayload)).unwrap();
      if (onSelectRole) onSelectRole(selectedRole);
      setShowConfirmModal(false);
      setPendingRole(null);
      onClose();
    } catch (err) {
      console.warn('Failed to switch role context via backend, applying local selection:', err);
      if (onSelectRole) onSelectRole(selectedRole);
      setShowConfirmModal(false);
      setPendingRole(null);
      onClose();
    } finally {
      setIsSwitching(false);
    }
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

      {/* Yes/No Switch Confirmation Dialog */}
      <ConfirmationModal
        visible={showConfirmModal}
        variant="info"
        loading={isSwitching}
        title={t('confirm_switch_role_title', 'Switch Role Persona?')}
        message={`${t('confirm_switch_role_msg', 'Are you sure you want to switch to')} ${pendingRole ? tRole(pendingRole, pendingRole) : ''}?`}
        confirmLabel={t('yes_switch', 'Yes, Switch')}
        cancelLabel={t('no_cancel', 'No, Cancel')}
        onConfirm={handleConfirmSwitch}
        onCancel={() => {
          if (isSwitching) return;
          setShowConfirmModal(false);
          setPendingRole(null);
        }}
      />
    </Modal>
  );
};

export default RoleSwitchModal;
