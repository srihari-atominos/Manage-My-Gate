import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Activity, Plus, Sparkles, Heart } from 'lucide-react-native';
import { PulseItem } from '../types/communityPulseTypes';
import { formatRemainingTime } from '../hooks/useCommunityPulse';

export interface ProfilePulseWidgetProps {
  userPulse: PulseItem | null;
  userInterests: string[];
  masterInterests: Array<{ id: string; name: string; emoji: string }>;
  onCreatePulse: () => void;
  onEditInterests: () => void;
}

export const ProfilePulseWidget = ({
  userPulse,
  userInterests,
  masterInterests,
  onCreatePulse,
  onEditInterests,
}: ProfilePulseWidgetProps) => {
  const selectedInterests = masterInterests.filter((item) => userInterests.includes(item.id));

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-4 shadow-xs">
      {/* Active Pulse Section */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 items-center justify-center">
              <Activity size={14} className="text-primary" />
            </View>
            <Text className="text-xs font-bold text-muted-foreground uppercase">Your Active Pulse</Text>
          </View>

          <Button
            size="sm"
            variant="outline"
            onPress={onCreatePulse}
            leftIcon={userPulse ? Sparkles : Plus}
            className="h-7 px-2.5 border-border"
          >
            {userPulse ? 'Change' : 'Create'}
          </Button>
        </View>

        {userPulse ? (
          <View className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1 me-2">
              <Text className="text-xl">{userPulse.emoji || '💬'}</Text>
              <View className="flex-1">
                <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                  {userPulse.text}
                </Text>
                {userPulse.contextText ? (
                  <Text className="text-[11px] text-muted-foreground font-medium" numberOfLines={1}>
                    {userPulse.contextText}
                  </Text>
                ) : null}
                <Text className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  Expires in {formatRemainingTime(userPulse.expiresAt)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="bg-muted/20 border border-dashed border-border rounded-xl p-3 items-center justify-center">
            <Text className="text-xs text-muted-foreground">Share what's happening today with your neighbors.</Text>
          </View>
        )}
      </View>

      {/* Community Interests Chips Section */}
      <View className="gap-2 pt-1 border-t border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 items-center justify-center">
              <Heart size={14} className="text-rose-500" />
            </View>
            <Text className="text-xs font-bold text-muted-foreground uppercase">My Interests</Text>
          </View>

          <Pressable onPress={onEditInterests} className="py-1 px-2">
            <Text className="text-xs font-semibold text-primary">Edit</Text>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-1.5 pt-1">
          {selectedInterests.length > 0 ? (
            selectedInterests.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-xs"
              >
                <Text className="text-xs">{item.emoji}</Text>
                <Text className="text-xs font-semibold text-foreground">{item.name}</Text>
              </View>
            ))
          ) : (
            <Text className="text-xs text-muted-foreground">No interests selected yet. Tap edit to pick 3-5 interests.</Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProfilePulseWidget;
