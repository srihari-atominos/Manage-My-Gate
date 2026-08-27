import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/common/Button';

interface AssessmentFlowFooterProps {
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  loading?: boolean;
}

export const AssessmentFlowFooter: React.FC<AssessmentFlowFooterProps> = ({
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  loading = false,
}) => {
  return (
    <View className="p-4 border-t border-border bg-card flex-row gap-3">
      {!isFirstStep && (
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          onPress={onBack}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Back step"
        >
          Back
        </Button>
      )}

      <Button
        variant="default"
        size="lg"
        className={`flex-1 bg-primary ${isFirstStep ? 'w-full' : ''}`}
        onPress={onNext}
        loading={loading}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={isLastStep ? 'Create & Activate Assessment Rule' : 'Continue to next step'}
      >
        {isLastStep ? 'Create & Activate Rule' : 'Continue'}
      </Button>
    </View>
  );
};

export default AssessmentFlowFooter;
