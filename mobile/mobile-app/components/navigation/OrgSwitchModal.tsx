import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Building2, Check, X, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useDispatch, useSelector } from 'react-redux';
import { performLogout } from '../../src/features/auth/store/authSlice';
import { useAuth } from '../../src/features/auth/hooks/useAuth';
import { useTranslation } from '@/src/utils/i18n';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export interface WorkspaceItem {
  orgId: string;
  name: string;
  roleName?: string;
  isPlatform?: boolean;
  villaId?: string;
  villaNumber?: string;
}

interface OrgSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  activeCommunity: string;
  onSelectCommunity: (orgName: string, orgId: string) => void;
}

export const CANONICAL_COMMUNITIES: WorkspaceItem[] = [
  {
    orgId: '650000000000000000000001',
    name: 'Palm Meadows Community',
    roleName: 'Admin',
    villaId: '650000000000000000000101',
    villaNumber: 'Villa 101',
  },
  {
    orgId: '650000000000000000000002',
    name: 'Emerald Valley Community',
    roleName: 'Tenant/Owner',
    villaId: '650000000000000000000201',
    villaNumber: 'Villa 201',
  },
  {
    orgId: '650000000000000000000003',
    name: 'Skyline Heights Apartments',
    roleName: 'Tenant/Owner',
    villaId: '650000000000000000000301',
    villaNumber: 'Block A - 101',
  },
];

export const OrgSwitchModal: React.FC<OrgSwitchModalProps> = ({
  visible,
  onClose,
  activeCommunity,
  onSelectCommunity,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useDispatch<any>();
  const { t, tRole } = useTranslation();
  const reduxWorkspaces = useSelector((state: any) => state.auth?.user?.availableWorkspaces || state.workspace?.availableWorkspaces);

  const activeOrgId = (user as any)?.orgId || (user as any)?.activeOrgId;
  const activeRole = user?.role || (user as any)?.activeRole;

  const [pendingOrg, setPendingOrg] = React.useState<WorkspaceItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const workspacesList: WorkspaceItem[] = React.useMemo(() => {
    const list = reduxWorkspaces || (user as any)?.availableWorkspaces;
    if (list && Array.isArray(list) && list.length > 0) {
      const mapped: WorkspaceItem[] = list.map((w: any) => ({
        orgId: w.orgId || w._id,
        name: w.name || w.organizationName || w.orgName || w.communityOrg || (w.isPlatform ? 'System Platform' : 'Community Workspace'),
        roleName: w.roleName || (w.roles ? w.roles.join(', ') : 'Admin'),
        isPlatform: w.isPlatform || false,
        villaId: w.villaId || w.unitId,
        villaNumber: w.villaNumber || w.unitNumber,
      }));
      // Merge with canonical communities to guarantee all 3 are available
      const orgIds = new Set(mapped.map((m: any) => m.orgId));
      CANONICAL_COMMUNITIES.forEach((c) => {
        if (!orgIds.has(c.orgId)) {
          mapped.push(c);
        }
      });
      return mapped;
    }
    return CANONICAL_COMMUNITIES;
  }, [reduxWorkspaces, user]);

  const handleSelect = (ws: WorkspaceItem) => {
    setPendingOrg(ws);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingOrg) return;
    const ws = pendingOrg;
    const targetRole = ws.roleName ? ws.roleName.split(',')[0].trim() : undefined;
    setShowConfirmModal(false);
    setPendingOrg(null);
    onClose();
    // 1. Terminate current session
    await dispatch(performLogout());
    // 2. Redirect to Login screen with target community parameters
    router.replace({
      pathname: '/(auth)/login' as any,
      params: {
        switchType: 'community',
        targetName: ws.name,
        targetRole: targetRole || 'Member',
        targetOrgId: ws.orgId,
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-3.5">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2.5 border-b border-border/80">
            <View className="flex-row items-center gap-2">
              <View className="bg-indigo-500/15 border border-indigo-500/25 p-2 rounded-xl">
                <Building2 size={19} color="#6366f1" />
              </View>
              <Text className="text-lg font-bold text-foreground">{t('switch_community', 'Switch Community')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1.5 rounded-full bg-secondary">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Logout & Re-authentication Warning Badge */}
          <View className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 flex-row items-center gap-2">
            <Lock size={15} color="#F59E0B" />
            <Text className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex-1 leading-tight">
              Switching community workspace will log you out and require login credentials for that organization.
            </Text>
          </View>

          <Text className="text-xs text-muted-foreground">
            {t('select_community_org_sub', 'Select a community organization to switch your workspace context:')}
          </Text>

          {/* Workspaces List */}
          <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5">
              {workspacesList.map((ws, index) => {
                const isOrgMatch = ws.orgId ? ws.orgId === activeOrgId : ws.name === activeCommunity;
                const isRoleMatch = !ws.roleName || !activeRole || 
                  ws.roleName.toLowerCase().includes(activeRole.toLowerCase()) || 
                  activeRole.toLowerCase().includes(ws.roleName.toLowerCase());
                const isSelected = isOrgMatch && isRoleMatch;

                return (
                  <TouchableOpacity
                    key={`${ws.orgId || 'ws'}-${ws.roleName || ''}-${index}`}
                    onPress={() => handleSelect(ws)}
                    activeOpacity={0.8}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border shadow-xs ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border/80 active:bg-secondary/50'
                    }`}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className={`p-2.5 rounded-xl border ${
                          isSelected ? 'bg-primary/20 border-primary/30' : 'bg-secondary border-border/50'
                        }`}
                      >
                        <Building2
                          size={18}
                          color={isSelected ? '#172B70' : '#a1a1aa'}
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            className={`text-sm font-bold flex-1 ${
                              isSelected ? 'text-primary font-extrabold' : 'text-foreground'
                            }`}
                          >
                            {ws.name}
                          </Text>
                          {ws.isPlatform && (
                            <View className="bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded-md">
                              <Text className="text-primary text-[9px] font-bold">Platform</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] text-muted-foreground mt-0.5">
                          {t('role_persona_label', 'Role')}: {tRole(ws.roleName, ws.roleName || 'Member')}{ws.villaNumber ? ` • ${t('unit_label', 'Unit')} ${ws.villaNumber}` : ''}
                        </Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} className="text-primary" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Button onPress={onClose} variant="secondary" className="mt-1 h-11">
            <Text className="font-bold text-foreground text-sm">{t('cancel', 'Cancel')}</Text>
          </Button>
        </View>
      </View>

      {/* Yes/No Permission Confirmation Dialog */}
      <ConfirmationModal
        visible={showConfirmModal}
        variant="warning"
        title={t('confirm_switch_org_title', 'Switch Community Workspace?')}
        message={`${t('confirm_switch_org_msg', 'Switching will sign you out and require login credentials for')} ${pendingOrg?.name || ''}. ${t('do_you_want_to_proceed', 'Do you want to proceed?')}`}
        confirmLabel={t('yes_switch', 'Yes, Switch')}
        cancelLabel={t('no_cancel', 'No, Cancel')}
        onConfirm={handleConfirmSwitch}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingOrg(null);
        }}
      />
    </Modal>
  );
};

export default OrgSwitchModal;
