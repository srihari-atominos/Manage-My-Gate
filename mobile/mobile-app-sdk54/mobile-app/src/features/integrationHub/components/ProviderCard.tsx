import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { Plug } from 'lucide-react-native';
import { ProviderCatalogItem } from '../services/integrationHubApi';

interface ProviderCardProps {
  provider: ProviderCatalogItem;
  activeCount?: number;
  onConnect: (provider: ProviderCatalogItem) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  activeCount = 0,
  onConnect,
}) => {
  const isMapped = activeCount > 0;

  const getProviderColorClass = (id: string) => {
    switch (id.toLowerCase()) {
      case 'smtp':
      case 'resend':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      case 'twilio':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'openai':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      case 'firebase':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      case 'razorpay':
      case 'banking':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onConnect(provider)}
      className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-xs w-60 justify-between me-3"
    >
      {/* Top Header Row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 me-2 gap-2.5">
          <View
            className={`w-10 h-10 rounded-2xl items-center justify-center border shrink-0 ${getProviderColorClass(
              provider.id
            )}`}
          >
            <Text className="text-lg">{provider.icon || '🔌'}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              {provider.name}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {provider.category || 'Integration'}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          className={`flex-row items-center gap-1 px-2.5 py-0.5 rounded-full border ${
            isMapped
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-primary/10 border-primary/20'
          }`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full ${
              isMapped ? 'bg-emerald-500' : 'bg-primary'
            }`}
          />
          <Text
            className={`text-[10px] font-bold uppercase tracking-wide ${
              isMapped ? 'text-emerald-600' : 'text-primary'
            }`}
          >
            {isMapped ? `${activeCount} ACTIVE` : 'READY'}
          </Text>
        </View>
      </View>

      {/* Description Text */}
      {Boolean(provider.description) && (
        <Text className="text-xs text-muted-foreground leading-4 mb-3" numberOfLines={2}>
          {provider.description}
        </Text>
      )}

      {/* Action Button */}
      <Button
        size="sm"
        onPress={() => onConnect(provider)}
        className={`w-full rounded-xl h-8 px-3 ${
          isMapped
            ? 'bg-blue-600 active:bg-blue-700'
            : 'bg-emerald-600 active:bg-emerald-700'
        }`}
      >
        <Icon as={Plug} size={14} className="text-white me-1" />
        <Text className="text-xs font-bold text-white">
          {isMapped ? 'Manage Connection' : 'Configure Connection'}
        </Text>
      </Button>
    </TouchableOpacity>
  );
};

export default ProviderCard;
