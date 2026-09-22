import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { CheckCircle2, Circle } from 'lucide-react-native';

export interface PollOptionRowProps {
  text: string;
  votesCount: number;
  percentage: number;
  isSelected: boolean;
  showResults?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PollOptionRow({
  text,
  votesCount,
  percentage,
  isSelected,
  showResults = false,
  onSelect,
  disabled = false,
}: PollOptionRowProps) {
  const isInteractive = !disabled && !showResults;

  return (
    <Pressable
      onPress={onSelect}
      disabled={!isInteractive}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled: !isInteractive }}
      accessibilityLabel={`${text}, ${votesCount} votes, ${percentage} percent`}
      className={`relative mb-2.5 overflow-hidden rounded-2xl border-2 p-3.5 transition-all ${
        isSelected
          ? 'border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/40 shadow-sm'
          : 'border-border bg-card'
      } ${disabled && !showResults ? 'opacity-60' : 'active:scale-[0.99]'}`}
    >
      {/* Background Percentage Progress Fill when displaying results */}
      {showResults && (
        <View
          className={`absolute inset-y-0 start-0 ${
            isSelected ? 'bg-emerald-500/20 dark:bg-emerald-500/30' : 'bg-muted/70'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      )}

      <View className="relative z-10 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center me-3">
          {/* Radio / Selection Indicator */}
          {(!showResults || isSelected) && (
            <View className="me-2.5">
              {isSelected ? (
                <Icon as={CheckCircle2} size={20} color="#10b981" className="text-emerald-500" />
              ) : (
                <Icon as={Circle} size={20} color="#94a3b8" className="text-muted-foreground" />
              )}
            </View>
          )}

          <Text
            className={`flex-1 text-sm ${
              isSelected ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-medium text-foreground'
            }`}
          >
            {text}
          </Text>
        </View>

        {/* Dynamic Vote Count & Percentage Badge */}
        {showResults ? (
          <View className="flex-row items-center gap-1.5">
            {isSelected && (
              <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Your Vote
                </Text>
              </View>
            )}
            <View
              className={`flex-row items-center px-2.5 py-1 rounded-full border ${
                isSelected ? 'bg-card/90 border-emerald-500/40' : 'bg-card/80 border-border/50'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                }`}
              >
                {percentage}%
              </Text>
              <Text className="text-[11px] text-muted-foreground ms-1.5 font-medium">
                ({votesCount} {votesCount === 1 ? 'vote' : 'votes'})
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default PollOptionRow;
