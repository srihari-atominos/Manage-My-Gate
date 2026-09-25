import React from 'react';
import { View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTranslation } from '@/src/utils/i18n';
import {
  ReportType,
  FeatureModule,
  REPORT_TYPE_OPTIONS,
  FEATURE_MODULE_OPTIONS,
} from '../constants/issueReport.constants';

export interface ReportSubmittedViewProps {
  reportNumber: string;
  createdAt: string;
  reportType: ReportType;
  feature: FeatureModule;
  title: string;
  onDone: () => void;
}

export const ReportSubmittedView: React.FC<ReportSubmittedViewProps> = ({
  reportNumber,
  createdAt,
  reportType,
  feature,
  title,
  onDone,
}) => {
  const { t } = useTranslation();

  const reportTypeLabel =
    REPORT_TYPE_OPTIONS.find((opt) => opt.value === reportType)?.label || reportType;

  const featureLabel =
    FEATURE_MODULE_OPTIONS.find((opt) => opt.value === feature)?.label || feature;

  const formattedDate = React.useMemo(() => {
    try {
      return new Date(createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return createdAt;
    }
  }, [createdAt]);

  return (
    <View className="flex-1 bg-background px-5 py-8 items-center justify-center">
      {/* 1. Success Icon */}
      <View className="w-20 h-20 rounded-full bg-emerald-500/10 items-center justify-center mb-5">
        <Icon as={CheckCircle2} size={44} className="text-emerald-500" />
      </View>

      {/* 2. Heading & Subtitle */}
      <Text className="text-2xl font-black text-foreground text-center font-sans mb-1.5">
        {t('report_submitted_title', 'Report Submitted')}
      </Text>
      <Text className="text-sm text-muted-foreground text-center font-sans max-w-[280px] mb-5">
        {t(
          'report_submitted_desc',
          'Thank you for helping us improve Nahom. Our technical team has received your report.'
        )}
      </Text>

      {/* 3. Generated Report Number Pill */}
      <View className="bg-primary/10 border border-primary/30 rounded-full px-5 py-2 mb-6 shadow-xs">
        <Text className="text-sm font-black text-primary font-sans">
          {`${t('report_number_label', 'Report #')}: ${reportNumber}`}
        </Text>
      </View>

      {/* 4. Report Summary Card */}
      <Card className="w-full bg-card border border-border rounded-2xl p-4 gap-3 mb-8 shadow-xs">
        <View className="flex-row items-center justify-between pb-2.5 border-b border-border/40">
          <Text className="text-xs text-muted-foreground font-medium font-sans">
            {t('report_type_label', 'Report Type')}
          </Text>
          <StatusBadge
            label={reportTypeLabel}
            variant={reportType === 'BUG' ? 'danger' : reportType === 'FEATURE_REQUEST' ? 'info' : 'neutral'}
          />
        </View>

        <View className="flex-row items-center justify-between pb-2.5 border-b border-border/40">
          <Text className="text-xs text-muted-foreground font-medium font-sans">
            {t('feature_module_label', 'Feature / Module')}
          </Text>
          <Text className="text-xs font-bold text-foreground font-sans">
            {featureLabel}
          </Text>
        </View>

        <View className="flex-row items-center justify-between pb-2.5 border-b border-border/40">
          <Text className="text-xs text-muted-foreground font-medium font-sans">
            {t('title_label', 'Title')}
          </Text>
          <Text
            className="text-xs font-bold text-foreground font-sans max-w-[180px] text-end"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground font-medium font-sans">
            {t('submitted_at_label', 'Submitted At')}
          </Text>
          <Text className="text-xs font-semibold text-muted-foreground font-sans">
            {formattedDate}
          </Text>
        </View>
      </Card>

      {/* 5. Primary Action */}
      <View className="w-full">
        <Button
          variant="primary"
          size="lg"
          onPress={onDone}
          accessibilityLabel={t('done', 'Done')}
        >
          {t('done', 'Done')}
        </Button>
      </View>
    </View>
  );
};

export default ReportSubmittedView;
