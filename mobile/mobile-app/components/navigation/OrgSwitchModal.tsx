import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Building2, Check, X, ShieldAlert } from 'lucide-react-native';

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

// Sample organizations list for multi-tenant community users
const MOCK_WORKSPACES: WorkspaceItem[] = [
  { orgId: 'org-01', name: 'Green Meadows', roleName: 'Resident', isPlatform: false },
  { orgId: 'org-02', name: 'Palm Heights Compound', roleName: 'Villa Owner', isPlatform: false },
  { orgId: 'org-03', name: 'Enterprise Platform Org', roleName: 'Platform Super Admin', isPlatform: true },
];

export const OrgSwitchModal: React.FC<OrgSwitchModalProps> = ({
  visible,
  onClose,
  activeCommunity,
  onSelectCommunity,
}) => {
  const handleSelect = (ws: WorkspaceItem) => {
    onSelectCommunity(ws.name, ws.orgId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-card border border-border rounded-3xl w-full max-w-sm p-6 shadow-xl gap-4">
          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-border">
            <View className="flex-row items-center gap-2">
              <View className="bg-indigo-500/10 p-2 rounded-xl">
                <Building2 size={20} color="#6366f1" />
              </View>
              <Text className="text-lg font-bold text-foreground">Switch Community</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} className="p-1">
              <X size={20} color="#888" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground">
            Select an active organization / community workspace context:
          </Text>

          {/* Workspaces List */}
          <ScrollView className="max-h-60">
            <View className="gap-2.5">
              {MOCK_WORKSPACES.map((ws) => {
                const isSelected = ws.name === activeCommunity;
                return (
                  <TouchableOpacity
                    key={ws.orgId}
                    onPress={() => handleSelect(ws)}
                    activeOpacity={0.8}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl border ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className={`p-2.5 rounded-xl ${
                          isSelected ? 'bg-indigo-500/20' : 'bg-muted'
                        }`}
                      >
                        <Building2
                          size={18}
                          color={isSelected ? '#6366f1' : '#777'}
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className={`text-sm font-bold text-truncate ${
                              isSelected ? 'text-indigo-600 font-extrabold' : 'text-foreground'
                            }`}
                          >
                            {ws.name}
                          </Text>
                          {ws.isPlatform && (
                            <View className="bg-primary/10 px-1.5 py-0.5 rounded-md">
                              <Text className="text-primary text-[9px] font-bold">Platform</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] text-muted-foreground mt-0.5">
                          Role: {ws.roleName || 'Member'}
                        </Text>
                      </View>
                    </View>

                    {isSelected && <Check size={18} color="#6366f1" />}
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

export default OrgSwitchModal;
