import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trash2, Lock } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { IntegrationConnection } from '../services/integrationHubApi';

interface ConnectionCardProps {
  connection: IntegrationConnection;
  onDisconnect: (connection: IntegrationConnection) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onDisconnect,
}) => {
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'smtp':
        return '✉️';
      case 'twilio':
        return '📱';
      case 'openai':
        return '🤖';
      case 'resend':
        return '⚡';
      case 'firebase':
        return '🔥';
      case 'razorpay':
        return '💳';
      case 'banking':
        return '🏦';
      default:
        return '🔌';
    }
  };

  const isConnected = connection.status !== 'error' && connection.status !== 'disconnected';

  const mapStatusVariant = (): StatusVariant => {
    return isConnected ? 'success' : 'danger';
  };

  return (
    <ListCard
      title={connection.accountLabel || `${connection.provider.toUpperCase()} Connection`}
      subtitle={`Provider: ${connection.provider.toUpperCase()} • ID: ${connection.id.slice(-6)}`}
      leftAvatarFallback={getProviderIcon(connection.provider)}
      status={{
        label: isConnected ? 'CONNECTED' : 'DISCONNECTED',
        variant: mapStatusVariant(),
      }}
      showChevron={false}
      className="mb-2 p-2.5 bg-card border border-border/70 rounded-xl shadow-xs"
    >
      {/* Sub-Metadata Footer Row matching User Management / Role Card */}
      <View className="mt-1 pt-2 border-t border-border/40 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="flex-row items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
            <Lock size={10} color="#d97706" />
            <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Encrypted Key Active
            </Text>
          </View>
        </View>

        {/* Disconnect Action Button matching User Management Icon Button */}
        <TouchableOpacity
          onPress={() => onDisconnect(connection)}
          activeOpacity={0.7}
          className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Disconnect Integration"
        >
          <Trash2 size={13} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </ListCard>
  );
};

export default ConnectionCard;
