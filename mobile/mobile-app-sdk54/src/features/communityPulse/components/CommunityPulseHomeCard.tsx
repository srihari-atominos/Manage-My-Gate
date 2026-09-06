import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, Activity, MessageSquare } from 'lucide-react-native';
import { PulseItem } from '../types/communityPulseTypes';
import { formatRelativeTime } from '../hooks/useCommunityPulse';

export interface CommunityPulseHomeCardProps {
  pulses: PulseItem[];
  onCreatePulse: () => void;
  onViewAll: () => void;
}

export const CommunityPulseHomeCard = ({
  pulses,
  onCreatePulse,
  onViewAll,
}: CommunityPulseHomeCardProps) => {
  // Mobile Catalog Constraint: Strictly render at most 3 items on Dashboard
  const previewItems = pulses.slice(0, 3);

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
      {/* Header Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
            <Activity size={16} className="text-primary" />
          </View>
          <View>
            <Text className="text-sm font-bold text-foreground">Community Pulse</Text>
            <Text className="text-[11px] text-muted-foreground">What's happening around you today</Text>
          </View>
        </View>

        <Button
          size="sm"
          onPress={onCreatePulse}
          leftIcon={Plus}
          className="h-8 px-3 bg-primary rounded-xl"
        >
          Pulse
        </Button>
      </View>

      {/* 3-Item Preview List */}
      {previewItems.length > 0 ? (
        <View className="gap-2 pt-1">
          {previewItems.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between bg-muted/20 border border-border rounded-xl p-2.5"
            >
              <View className="flex-row items-center gap-2.5 flex-1 me-2">
                <View className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 items-center justify-center shrink-0">
                  <Text className="text-base">{item.emoji || '💬'}</Text>
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                      {item.userName}
                    </Text>
                    {item.userVilla ? (
                      <Text className="text-[10px] text-muted-foreground">• {item.userVilla}</Text>
                    ) : null}
                  </View>
                  <Text className="text-xs text-foreground font-semibold mt-0.5" numberOfLines={1}>
                    {item.text}
                  </Text>
                  {item.contextText ? (
                    <Text className="text-[11px] text-muted-foreground font-medium" numberOfLines={1}>
                      {item.contextText}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text className="text-[10px] font-mono text-muted-foreground shrink-0">
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="items-center justify-center py-4 bg-muted/20 border border-dashed border-border rounded-xl">
          <MessageSquare size={20} className="text-muted-foreground mb-1" />
          <Text className="text-xs font-semibold text-foreground">No Pulses yet 👋</Text>
          <Text className="text-[11px] text-muted-foreground">Be the first to share what's happening today.</Text>
        </View>
      )}

      {/* Footer "See All →" Link */}
      <Pressable
        onPress={onViewAll}
        className="flex-row items-center justify-center gap-1 pt-1 active:opacity-70"
      >
        <Text className="text-xs font-semibold text-primary">See All Activity ({pulses.length})</Text>
        <ChevronRight size={14} className="text-primary" />
      </Pressable>
    </View>
  );
};

export default CommunityPulseHomeCard;
