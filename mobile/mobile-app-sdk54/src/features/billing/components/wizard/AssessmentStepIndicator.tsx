import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export interface AssessmentStepDef {
  key: string;
  title: string;
}

interface AssessmentStepIndicatorProps {
  steps: AssessmentStepDef[];
  currentStepIndex: number;
}

export const AssessmentStepIndicator: React.FC<AssessmentStepIndicatorProps> = ({
  steps,
  currentStepIndex,
}) => {
  return (
    <View className="px-5 pt-3 pb-2 bg-card border-b border-border">
      <View className="flex-row items-center gap-1.5 mb-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isCompleted = idx < currentStepIndex;
          return (
            <View
              key={step.key}
              className={`h-1.5 flex-1 rounded-full ${
                isCompleted
                  ? 'bg-primary'
                  : isActive
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          );
        })}
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs font-extrabold text-foreground">
          {steps[currentStepIndex]?.title || ''}
        </Text>
        <Text className="text-[11px] font-bold text-muted-foreground me-1">
          {currentStepIndex + 1} / {steps.length}
        </Text>
      </View>
    </View>
  );
};

export default AssessmentStepIndicator;
