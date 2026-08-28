import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface PollOptionRowProps {
  text: string;
  votesCount: number;
  percentage: number;
  isSelected: boolean;
  showResults?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export default function PollOptionRow({
  text,
  votesCount,
  percentage,
  isSelected,
  showResults,
  onSelect,
  disabled,
}: PollOptionRowProps) {
  return (
    <TouchableOpacity
      className={`mb-2 rounded-lg border p-3 ${
        isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card'
      } ${disabled && !showResults ? 'opacity-50' : ''}`}
      onPress={onSelect}
      disabled={disabled || showResults}
    >
      <View className="flex-row items-center justify-between z-10 relative">
        <View className="flex-row items-center flex-1">
          {/* Custom Radio Button */}
          {!showResults && (
            <View
              className={`h-5 w-5 rounded-full border-2 mr-3 items-center justify-center ${
                isSelected ? 'border-primary' : 'border-muted-foreground'
              }`}
            >
              {isSelected && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </View>
          )}
          <Text
            className={`flex-1 text-base ${
              isSelected ? 'font-semibold text-primary' : 'text-foreground'
            }`}
          >
            {text}
          </Text>
        </View>

        {showResults && (
          <Text className="text-sm font-medium text-muted-foreground ml-2">
            {votesCount} ({percentage}%)
          </Text>
        )}
      </View>

      {/* Progress Bar Background for Results */}
      {showResults && (
        <View
          className={`absolute left-0 top-0 bottom-0 rounded-lg ${
            isSelected ? 'bg-primary/20' : 'bg-muted'
          }`}
          style={{ width: `${percentage}%`, opacity: 0.5 }}
        />
      )}
    </TouchableOpacity>
  );
}
