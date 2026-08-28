import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Building2, Check, X } from 'lucide-react-native';
import { router } from 'expo-router';

import { useDispatch, useSelector } from 'react-redux';
import { switchWorkspaceContextThunk } from '../../src/features/auth/store/authSlice';
import { useAuth } from '../../src/features/auth/hooks/useAuth';

export interface WorkspaceItem {
  orgId: string;
  name: string;
  roleName?: string;
  isPlatform?: boolean;
}

interface OrgSwitchModalProps {
  visible: boolean;
  onClose: () => void;
  activeCommunity: string;
  onSelectCommunity: (orgName: string, orgId: string) => void;
}

export const OrgSwitchModal: React.FC<OrgSwitchModalProps> = ({
  visible,
  onClose,
  activeCommunity,
  onSelectCommunity,
}) => {
  const { user } = useAuth();
  const dispatch = useDispatch<any>();
  const reduxWorkspaces = useSelector((state: any) => state.auth?.user?.availableWorkspaces || state.workspace?.availableWorkspaces);

  const workspacesList: WorkspaceItem[] = React.useMemo(() => {
    const list = reduxWorkspaces || (user as any)?.availableWorkspaces;
    if (list && Array.isArray(list) && list.length > 0) {
      return list.map((w: any) => ({
        orgId: w.orgId || w._id,
        name: w.name || w.organizationName || w.orgName || w.communityOrg || (w.isPlatform ? 'System Platform' : 'Community Workspace'),
        roleName: w.roleName || (w.roles ? w.roles.join(', ') : 'Member'),
        isPlatform: w.isPlatform || false,
      }));
    }
    // Real active org fallback
    const rawName =
      (user as any)?.organizationName ||
      (user as any)?.activeOrganizationName ||
      (user as any)?.orgName ||
      (user as any)?.communityName ||
      (user as any)?.communityOrg;
    const activeName = rawName || 'Community Workspace';
    const activeOrgId = (user as any)?.orgId || 'org-active';
    const isPlatform = Boolean((user as any)?.isPlatform);
    return [{
      orgId: activeOrgId,
      name: activeName,
      roleName: user?.role || 'Member',
      isPlatform,
    }];
  }, [reduxWorkspaces, user]);

  const handleSelect = (ws: WorkspaceItem) => {
    dispatch(switchWorkspaceContextThunk({ targetOrgId: ws.orgId }));
    onSelectCommunity(ws.name, ws.orgId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-4">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2.5 border-b border-border/80">
            <View className="flex-row items-center gap-2">
              <View className="bg-indigo-500/15 border border-indigo-500/25 p-2 rounded-xl">
                <Building2 size={19} color="#6366f1" />
              </View>
              <Text className="text-lg font-bold text-foreground">Switch Community</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1.5 rounded-full bg-secondary">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground">
            Select an active organization / community workspace context:
          </Text>

          {/* Workspaces List */}
          <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5">
              {workspacesList.map((ws) => {
                const isSelected = ws.name === activeCommunity;
                return (
                  <TouchableOpacity
                    key={ws.orgId}
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
                          Role: {ws.roleName || 'Member'}
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
            <Text className="font-bold text-foreground text-sm">Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default OrgSwitchModal;
