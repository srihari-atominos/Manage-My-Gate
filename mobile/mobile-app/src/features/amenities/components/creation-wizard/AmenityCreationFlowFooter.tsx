import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react-native';

export interface AmenityCreationFlowFooterProps {
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  loading?: boolean;
  disabled?: boolean;
  isEditing?: boolean;
}

export const AmenityCreationFlowFooter: React.FC<AmenityCreationFlowFooterProps> = ({
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  loading = false,
  disabled = false,
  isEditing = false,
}) => {
  return (
    <View className="bg-card border-t border-border px-4 py-3 pb-6 flex-row items-center gap-3">
      {/* Previous / Back CTA */}
      {!isFirstStep && (
        <Button
          variant="outline"
          onPress={onBack}
          disabled={loading}
          className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 border-border"
          accessibilityRole="button"
          accessibilityLabel="Back to previous step"
        >
          <ArrowLeft size={16} className="text-foreground" />
          <Text className="font-bold text-foreground text-sm">Previous</Text>
        </Button>
      )}

      {/* Next / Submit CTA */}
      <Button
        variant="default"
        onPress={onNext}
        disabled={loading || disabled}
        className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={
          isLastStep
            ? isEditing
              ? 'Save Facility Updates'
              : 'Publish Facility to Catalog'
            : 'Continue to next step'
        }
      >
        {isLastStep ? (
          <>
            <CheckCircle2 size={18} className="text-primary-foreground" />
            <Text className="font-bold text-primary-foreground text-sm">
              {loading
                ? 'Saving Facility...'
                : isEditing
                ? 'Update Facility'
                : 'Publish Facility'}
            </Text>
          </>
        ) : (
          <>
            <Text className="font-bold text-primary-foreground text-sm">Continue</Text>
            <ArrowRight size={16} className="text-primary-foreground" />
          </>
        )}
      </Button>
    </View>
  );
};

export default AmenityCreationFlowFooter;
