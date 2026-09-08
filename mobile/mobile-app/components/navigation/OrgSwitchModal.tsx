import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Building2, Check, X } from 'lucide-react-native';

import { useDispatch, useSelector } from 'react-redux';
import { switchWorkspaceContextThunk } from '../../src/features/auth/store/authSlice';
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

export const CANONICAL_COMMUNITIES: WorkspaceItem[] = [];

export const OrgSwitchModal: React.FC<OrgSwitchModalProps> = ({
  visible,
  onClose,
  activeCommunity,
  onSelectCommunity,
}) => {
  const { user } = useAuth();
  const dispatch = useDispatch<any>();
  const { t, tRole } = useTranslation();
  const reduxWorkspaces = useSelector((state: any) => state.auth?.user?.availableWorkspaces || state.workspace?.availableWorkspaces);

  const activeOrgId = (user as any)?.orgId || (user as any)?.activeOrgId;
  const activeRole = user?.role || (user as any)?.activeRole;

  const [pendingOrg, setPendingOrg] = React.useState<WorkspaceItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isSwitching, setIsSwitching] = React.useState(false);

  const workspacesList: WorkspaceItem[] = React.useMemo(() => {
    const list = reduxWorkspaces || (user as any)?.availableWorkspaces;
    if (list && Array.isArray(list) && list.length > 0) {
      return list.map((w: any) => ({
        orgId: w.orgId || w._id,
        name: w.name || w.organizationName || w.orgName || w.communityOrg || (w.isPlatform ? 'System Platform' : 'Community Workspace'),
        roleName: w.roleName || (w.roles ? w.roles.join(', ') : 'Admin'),
        isPlatform: w.isPlatform || false,
        villaId: w.villaId || w.unitId,
        villaNumber: w.villaNumber || w.unitNumber,
      }));
    }
    return [];
  }, [reduxWorkspaces, user]);

  const handleSelect = (ws: WorkspaceItem) => {
    setPendingOrg(ws);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingOrg) return;
    const ws = pendingOrg;
    const targetRole = ws.roleName ? ws.roleName.split(',')[0].trim() : undefined;
    setIsSwitching(true);
    try {
      const switchPayload: { targetOrgId?: string; targetRole?: string; targetVillaId?: string } = {};
      if (ws.orgId && typeof ws.orgId === 'string' && /^[0-9a-fA-F]{24}$/.test(ws.orgId.trim())) {
        switchPayload.targetOrgId = ws.orgId.trim();
      }
      if (targetRole && typeof targetRole === 'string' && targetRole.trim()) {
        switchPayload.targetRole = targetRole.trim();
      }
      if (ws.villaId && typeof ws.villaId === 'string' && /^[0-9a-fA-F]{24}$/.test(ws.villaId.trim())) {
        switchPayload.targetVillaId = ws.villaId.trim();
      }

      await dispatch(switchWorkspaceContextThunk(switchPayload)).unwrap();
      onSelectCommunity(ws.name, ws.orgId);
      setShowConfirmModal(false);
      setPendingOrg(null);
      onClose();
    } catch (err) {
      console.warn('Failed to switch community workspace via backend, applying local selection:', err);
      onSelectCommunity(ws.name, ws.orgId);
      setShowConfirmModal(false);
      setPendingOrg(null);
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

          <Text className="text-xs text-muted-foreground">
            {t('select_community_org_sub', 'Select a community organization to switch your workspace context:')}
          </Text>

          {/* Workspaces List */}
          <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5">
              {workspacesList.length === 0 ? (
                <View className="py-6 items-center justify-center">
                  <Text className="text-xs text-muted-foreground text-center">
                    {t('no_workspaces_found', 'No other community workspaces found for this account.')}
                  </Text>
                </View>
              ) : (
                workspacesList.map((ws, index) => {
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
              }))}
            </View>
          </ScrollView>

          <Button onPress={onClose} variant="secondary" className="mt-1 h-11">
            <Text className="font-bold text-foreground text-sm">{t('cancel', 'Cancel')}</Text>
          </Button>
        </View>
      </View>

      {/* Yes/No Switch Confirmation Dialog */}
      <ConfirmationModal
        visible={showConfirmModal}
        variant="info"
        loading={isSwitching}
        title={t('confirm_switch_org_title', 'Switch Community Workspace?')}
        message={`${t('confirm_switch_org_msg', 'Are you sure you want to switch to')} ${pendingOrg?.name || ''}?`}
        confirmLabel={t('yes_switch', 'Yes, Switch')}
        cancelLabel={t('no_cancel', 'No, Cancel')}
        onConfirm={handleConfirmSwitch}
        onCancel={() => {
          if (isSwitching) return;
          setShowConfirmModal(false);
          setPendingOrg(null);
        }}
      />
    </Modal>
  );
};

export default OrgSwitchModal;
