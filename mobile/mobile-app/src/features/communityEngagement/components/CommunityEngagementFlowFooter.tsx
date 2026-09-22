import React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ArrowRight, ArrowLeft, CheckCircle2, Bookmark } from 'lucide-react-native';

export interface CommunityEngagementFlowFooterProps {
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  loading?: boolean;
  savingDraft?: boolean;
  disabled?: boolean;
  publishNow?: boolean;
}

export const CommunityEngagementFlowFooter: React.FC<CommunityEngagementFlowFooterProps> = ({
  onBack,
  onNext,
  onSaveDraft,
  isFirstStep,
  isLastStep,
  loading = false,
  savingDraft = false,
  disabled = false,
  publishNow = true,
}) => {
  return (
    <View className="bg-card border-t border-border px-4 py-3 pb-6 flex-row items-center gap-2.5">
      {/* Previous / Back CTA */}
      {!isFirstStep && (
        <Button
          variant="outline"
          onPress={onBack}
          disabled={loading || savingDraft}
          className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-1.5 border-border"
          accessibilityRole="button"
          accessibilityLabel="Back to previous step"
        >
          <ArrowLeft size={16} className="text-foreground" />
          <Text className="font-bold text-foreground text-sm">Previous</Text>
        </Button>
      )}

      {/* Save Draft CTA */}
      {onSaveDraft && (
        <Button
          variant="secondary"
          onPress={onSaveDraft}
          disabled={loading || savingDraft || disabled}
          className="h-12 px-4 rounded-2xl flex-row items-center justify-center gap-1.5 border border-border"
          accessibilityRole="button"
          accessibilityLabel="Save as Draft"
        >
          <Bookmark size={15} className="text-foreground" />
          <Text className="font-bold text-foreground text-xs">
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </Text>
        </Button>
      )}

      {/* Next / Publish CTA */}
      <Button
        variant="default"
        onPress={onNext}
        disabled={loading || savingDraft || disabled}
        className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={
          isLastStep
            ? publishNow
              ? 'Publish Announcement Now'
              : 'Schedule Announcement'
            : 'Continue to next step'
        }
      >
        {isLastStep ? (
          <>
            <CheckCircle2 size={18} className="text-primary-foreground" />
            <Text className="font-bold text-primary-foreground text-sm">
              {loading
                ? 'Submitting...'
                : publishNow
                ? 'Publish Now'
                : 'Schedule Content'}
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

export default CommunityEngagementFlowFooter;
