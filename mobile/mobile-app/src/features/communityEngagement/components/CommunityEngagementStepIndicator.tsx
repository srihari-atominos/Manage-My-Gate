import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { WizardStepMeta } from '../types/communityEngagement.types';
import { cn } from '@/lib/utils';

export interface CommunityEngagementStepIndicatorProps {
  steps: WizardStepMeta[];
  currentStepIndex: number;
  onStepPress?: (index: number) => void;
}

export const CommunityEngagementStepIndicator: React.FC<CommunityEngagementStepIndicatorProps> = ({
  steps,
  currentStepIndex,
  onStepPress,
}) => {
  return (
    <View className="bg-card border-b border-border/60 px-4 py-2.5">
      {/* Horizontal Progress Bars */}
      <View className="flex-row items-center gap-1.5">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;

          return (
            <TouchableOpacity
              key={step.key}
              disabled={isUpcoming || !onStepPress}
              onPress={() => onStepPress && onStepPress(idx)}
              activeOpacity={0.7}
              className="flex-1 py-1"
              accessibilityRole="button"
              accessibilityLabel={`Step ${idx + 1}: ${step.title}. ${
                isCompleted ? 'Completed' : isActive ? 'Active' : 'Pending'
              }`}
            >
              <View
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  isCompleted
                    ? 'bg-primary'
                    : isActive
                    ? 'bg-primary shadow-xs'
                    : 'bg-muted'
                )}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active step name and step count indicator */}
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-[11px] font-semibold text-primary">
          {steps[currentStepIndex]?.title}
        </Text>
        <Text className="text-[10px] text-muted-foreground font-medium">
          {currentStepIndex + 1} of {steps.length}
        </Text>
      </View>
    </View>
  );
};

export default CommunityEngagementStepIndicator;
