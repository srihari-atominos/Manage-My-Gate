import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ArrowLeft, X, Shield } from 'lucide-react-native';
import { PassTypeKey } from '../../mocks/visitorMocks';

export interface VisitorPassFlowHeaderProps {
  passType: PassTypeKey;
  stepTitle: string;
  stepSubtitle?: string;
  onBack?: () => void;
  onCancel: () => void;
  canGoBack?: boolean;
}

const PASS_TYPE_LABELS: Record<PassTypeKey, string> = {
  GUEST: 'Guest Pass',
  GROUP: 'Group Visit Pass',
  CAB: 'Cab & Auto Pass',
  DELIVERY: 'Delivery Entry Pass',
  SERVICE: 'Staff & Service Pass',
};

export const VisitorPassFlowHeader: React.FC<VisitorPassFlowHeaderProps> = ({
  passType,
  stepTitle,
  stepSubtitle,
  onBack,
  onCancel,
  canGoBack = true,
}) => {
  return (
    <View className="bg-card border-b border-border px-4 pt-3 pb-3 gap-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {canGoBack && onBack ? (
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-muted items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={18} className="text-foreground" />
            </TouchableOpacity>
          ) : (
            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
              <Shield size={18} className="text-primary" />
            </View>
          )}

          <View className="bg-secondary px-2.5 py-1 rounded-full border border-border">
            <Text className="text-xs font-bold text-secondary-foreground">
              {PASS_TYPE_LABELS[passType] || 'Visitor Pass'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full bg-muted items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Cancel flow"
        >
          <X size={18} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>

      <View className="gap-0.5 mt-1">
        <Text variant="h3" className="text-foreground font-bold">
          {stepTitle}
        </Text>
        {stepSubtitle ? (
          <Text variant="muted" className="text-xs">
            {stepSubtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
};
