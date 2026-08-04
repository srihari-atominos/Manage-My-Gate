import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react-native';

export interface VisitorPassFlowFooterProps {
  onBack?: () => void;
  onNext: () => void;
  canGoBack?: boolean;
  nextLabel?: string;
  isLastStep?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export const VisitorPassFlowFooter: React.FC<VisitorPassFlowFooterProps> = ({
  onBack,
  onNext,
  canGoBack = true,
  nextLabel,
  isLastStep = false,
  loading = false,
  disabled = false,
}) => {
  const defaultNextLabel = isLastStep ? 'Generate Visitor Pass' : 'Continue';
  const labelText = nextLabel || defaultNextLabel;

  return (
    <View className="bg-card border-t border-border p-4 pb-6 flex-row items-center gap-3">
      {canGoBack && onBack ? (
        <Button
          variant="outline"
          onPress={onBack}
          disabled={loading}
          className="h-12 px-4 rounded-xl flex-row items-center gap-1.5"
        >
          <ArrowLeft size={16} className="text-foreground" />
          <Text className="font-semibold text-foreground">Back</Text>
        </Button>
      ) : null}

      <Button
        variant="default"
        onPress={onNext}
        disabled={disabled || loading}
        className="flex-1 h-12 rounded-xl bg-primary flex-row items-center justify-center gap-2"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text className="font-bold text-primary-foreground text-base">
              {labelText}
            </Text>
            {isLastStep ? (
              <CheckCircle2 size={18} color="#fff" />
            ) : (
              <ArrowRight size={18} color="#fff" />
            )}
          </>
        )}
      </Button>
    </View>
  );
};
