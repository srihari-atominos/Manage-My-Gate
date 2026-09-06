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
      className={`relative mb-3 overflow-hidden rounded-2xl border p-4 transition-all ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border bg-card'
      } ${disabled && !showResults ? 'opacity-60' : 'active:scale-[0.99]'}`}
    >
      {/* Background Percentage Progress Fill when displaying results */}
      {showResults && (
        <View
          className={`absolute inset-y-0 start-0 ${
            isSelected ? 'bg-primary/20' : 'bg-muted/70'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      )}

      <View className="relative z-10 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center me-3">
          {/* Radio / Selection Indicator */}
          {!showResults && (
            <View className="me-3">
              {isSelected ? (
                <Icon as={CheckCircle2} size={20} className="text-primary" />
              ) : (
                <Icon as={Circle} size={20} className="text-muted-foreground" />
              )}
            </View>
          )}

          <Text
            className={`flex-1 text-base ${
              isSelected ? 'font-bold text-primary' : 'font-medium text-foreground'
            }`}
          >
            {text}
          </Text>
        </View>

        {/* Dynamic Vote Count & Percentage Badge */}
        {showResults ? (
          <View className="flex-row items-center bg-card/80 px-2.5 py-1 rounded-full border border-border/50">
            <Text className="text-xs font-bold text-foreground">
              {percentage}%
            </Text>
            <Text className="text-[11px] text-muted-foreground ms-1.5 font-medium">
              ({votesCount} {votesCount === 1 ? 'vote' : 'votes'})
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default PollOptionRow;
