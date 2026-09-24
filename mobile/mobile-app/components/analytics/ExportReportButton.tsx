import React from 'react';
import { Download } from 'lucide-react-native';
import { Button, ButtonProps } from '../ui/button';
import { Text } from '../ui/text';
import { useTranslation } from '@/src/utils/i18n';
import { cn } from '../../lib/utils';

export interface ExportReportButtonProps {
  onExport: () => void;
  loading?: boolean;
  className?: string;
  variant?: ButtonProps['variant'];
}

export const ExportReportButton = ({
  onExport,
  loading = false,
  className,
  variant = 'outline',
}: ExportReportButtonProps) => {
  const { t } = useTranslation();

  return (
    <Button
      size="sm"
      variant={variant}
      onPress={onExport}
      loading={loading}
      className={cn(
        'flex-row items-center gap-1 px-3 py-1.5 h-8 rounded-full border border-border/80 bg-card active:bg-secondary/70',
        className
      )}
    >
      {!loading && <Download size={14} className="text-[#172B70] dark:text-foreground" />}
      <Text className="text-xs font-bold text-[#172B70] dark:text-foreground">
        {t('export_csv', 'Export CSV')}
      </Text>
    </Button>
  );
};

