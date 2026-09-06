import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Smile } from 'lucide-react-native';
import { CommunityMoodOption, MoodResult } from '../types/communityPulseTypes';

export interface CommunityMoodCardProps {
  userVote: CommunityMoodOption | null;
  totalResponses: number;
  results: MoodResult[];
  onVote: (option: CommunityMoodOption) => void;
}

const MOOD_BUTTONS: Array<{ option: CommunityMoodOption; label: string; emoji: string }> = [
  { option: 'great', label: 'Great', emoji: '😊' },
  { option: 'relaxed', label: 'Relaxed', emoji: '😌' },
  { option: 'energetic', label: 'Energetic', emoji: '🔥' },
  { option: 'quiet', label: 'Quiet', emoji: '🌧️' },
  { option: 'excited', label: 'Excited', emoji: '🎉' },
];

export const CommunityMoodCard = ({
  userVote,
  totalResponses,
  results,
  onVote,
}: CommunityMoodCardProps) => {
  const hasVoted = Boolean(userVote);

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
      <View className="flex-row items-center gap-2">
        <View className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
          <Smile size={16} className="text-emerald-500" />
        </View>
        <View>
          <Text className="text-xs font-bold text-muted-foreground uppercase">Community Vibe</Text>
          <Text className="text-sm font-bold text-foreground">How's the community feeling today?</Text>
        </View>
      </View>

      {!hasVoted ? (
        <View className="flex-row flex-wrap justify-between gap-1.5 pt-1">
          {MOOD_BUTTONS.map((item) => (
            <Pressable
              key={item.option}
              onPress={() => onVote(item.option)}
              className="flex-1 min-w-[28%] items-center justify-center p-3 rounded-2xl bg-card border border-border active:bg-primary/10 shadow-xs"
            >
              <Text className="text-2xl mb-1">{item.emoji}</Text>
              <Text className="text-xs font-bold text-foreground">{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="gap-2 pt-1">
          {results.map((res) => {
            const isMyVote = userVote === res.option;
            return (
              <View
                key={res.option}
                className={`relative overflow-hidden rounded-xl border p-2.5 flex-row items-center justify-between ${
                  isMyVote ? 'bg-emerald-500/10 border-emerald-500' : 'bg-muted/20 border-border'
                }`}
              >
                <View
                  style={{ width: `${res.percentage}%` }}
                  className="absolute top-0 bottom-0 left-0 bg-emerald-500/15 rounded-xl"
                />
                <View className="flex-row items-center gap-2 relative z-10">
                  <Text className="text-base">{res.emoji}</Text>
                  <Text className={`text-xs ${isMyVote ? 'font-bold text-emerald-500' : 'font-semibold text-foreground'}`}>
                    {res.label}
                  </Text>
                </View>
                <Text className="text-xs font-mono font-bold text-foreground relative z-10">
                  {res.percentage}%
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Text className="text-[11px] text-muted-foreground text-center pt-0.5">
        {totalResponses} residents responded
      </Text>
    </View>
  );
};

export default CommunityMoodCard;
