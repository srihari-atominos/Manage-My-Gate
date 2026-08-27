import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export interface StepItem {
  key: string;
  title: string;
}

export interface VisitorPassStepIndicatorProps {
  steps: StepItem[];
  currentStepIndex: number;
}

export const VisitorPassStepIndicator: React.FC<VisitorPassStepIndicatorProps> = ({
  steps,
  currentStepIndex,
}) => {
  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;

  return (
    <View className="bg-card px-4 py-2.5 border-b border-border gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="small" className="text-foreground font-semibold">
          Step {currentStepIndex + 1} of {totalSteps}: {currentStep.title}
        </Text>
        <Text variant="muted" className="text-xs font-mono">
          {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%
        </Text>
      </View>

      {/* Segmented Progress Track */}
      <View className="flex-row gap-1.5 items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <View
              key={step.key || idx}
              className={`h-1.5 flex-1 rounded-full ${
                isCompleted
                  ? 'bg-primary'
                  : isCurrent
                  ? 'bg-primary/80'
                  : 'bg-muted'
              }`}
            />
          );
        })}
      </View>
    </View>
  );
};
