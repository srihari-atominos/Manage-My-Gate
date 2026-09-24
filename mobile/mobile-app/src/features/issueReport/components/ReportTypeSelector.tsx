import React from 'react';
import { View, Pressable } from 'react-native';
import { Bug, Sparkles, HelpCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';
import {
  ReportType,
  REPORT_TYPE_OPTIONS,
} from '../constants/issueReport.constants';

export interface ReportTypeSelectorProps {
  value: ReportType | null;
  onSelect: (type: ReportType) => void;
  error?: string;
  disabled?: boolean;
}

const ICON_MAP = {
  Bug,
  Sparkles,
  HelpCircle,
};

export const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
  value,
  onSelect,
  error,
  disabled = false,
}) => {
  const { t } = useTranslation();

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">
          {t('report_issue_type', 'Issue Type')}
          <Text className="text-destructive font-bold"> *</Text>
        </Text>
      </View>

      <View className="flex-row gap-2.5">
        {REPORT_TYPE_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          const IconComponent = ICON_MAP[opt.iconName];

          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={opt.label}
              disabled={disabled}
              onPress={() => onSelect(opt.value)}
              className={cn(
                'flex-1 flex-col items-center justify-center p-3 rounded-2xl border transition-all',
                isSelected
                  ? 'bg-primary/10 border-primary shadow-xs'
                  : 'bg-card border-border active:bg-muted/40',
                disabled && 'opacity-60'
              )}
            >
              <View
                className={cn(
                  'w-9 h-9 rounded-xl items-center justify-center mb-2',
                  isSelected
                    ? 'bg-primary/20'
                    : 'bg-muted'
                )}
              >
                <Icon
                  as={IconComponent}
                  size={18}
                  className={cn(
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </View>

              <Text
                className={cn(
                  'text-xs font-semibold text-center font-sans',
                  isSelected
                    ? 'text-primary font-bold'
                    : 'text-foreground'
                )}
                numberOfLines={1}
              >
                {t(`report_type_${opt.value.toLowerCase()}`, opt.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text className="text-xs text-destructive font-sans mt-0.5">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default ReportTypeSelector;
