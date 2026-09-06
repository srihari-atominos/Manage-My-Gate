import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/common/Button';
import { Icon } from '@/components/ui/icon';
import { ShieldCheck, Calendar, Lock, Edit3, Trash2, Plug } from 'lucide-react-native';
import { IntegrationConnection } from '../services/integrationHubApi';

interface ConnectionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  connection: IntegrationConnection | null;
  onEdit: (connection: IntegrationConnection) => void;
  onDisconnect: (connection: IntegrationConnection) => void;
}

export const ConnectionDetailsModal: React.FC<ConnectionDetailsModalProps> = ({
  visible,
  onClose,
  connection,
  onEdit,
  onDisconnect,
}) => {
  if (!connection) return null;

  const isConnected = connection.status !== 'error' && connection.status !== 'disconnected';
  const createdDate = connection.createdAt
    ? new Date(connection.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Active';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={connection.accountLabel || `${connection.provider.toUpperCase()} Integration`}
    >
      <ScrollView className="max-h-[480px] py-1" showsVerticalScrollIndicator={false}>
        <View className="space-y-4">
          {/* Main Info Card */}
          <View className="bg-muted/50 p-4 rounded-xl border border-border space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Connection Status</Text>
              <StatusBadge
                label={isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                variant={isConnected ? 'success' : 'danger'}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Provider Key</Text>
              <View className="flex-row items-center gap-1 bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                <Icon as={Plug} size={12} className="text-primary" />
                <Text className="text-xs font-bold text-primary uppercase">
                  {connection.provider}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Connection ID</Text>
              <Text className="text-xs font-mono font-bold text-foreground">
                {connection.id}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Created Date</Text>
              <View className="flex-row items-center gap-1">
                <Icon as={Calendar} size={12} className="text-muted-foreground" />
                <Text className="text-xs font-bold text-foreground">{createdDate}</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between pt-2 border-t border-border/40">
              <Text className="text-xs font-semibold text-muted-foreground uppercase">Security Vault</Text>
              <View className="flex-row items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Icon as={Lock} size={11} className="text-amber-600 dark:text-amber-400" />
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  AES-256 Encrypted
                </Text>
              </View>
            </View>
          </View>

          {/* Security Assurance Banner */}
          <View className="bg-card p-3 rounded-xl border border-border flex-row items-center gap-2.5">
            <Icon as={ShieldCheck} size={18} className="text-status-success" />
            <Text className="text-xs text-muted-foreground flex-1">
              Credentials for this provider are encrypted before persistence. Plaintext keys are never transmitted back to clients.
            </Text>
          </View>

          {/* Action Row */}
          <View className="flex-row items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => {
                onClose();
                onEdit(connection);
              }}
            >
              <Icon as={Edit3} size={14} className="text-foreground me-1" />
              <Text className="text-xs font-semibold text-foreground">Edit Label</Text>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onPress={() => {
                onClose();
                onDisconnect(connection);
              }}
            >
              <Icon as={Trash2} size={14} className="text-destructive-foreground me-1" />
              <Text className="text-xs font-semibold text-destructive-foreground">Disconnect</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default ConnectionDetailsModal;
