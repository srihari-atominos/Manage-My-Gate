import React from 'react';
import { Download } from 'lucide-react-native';
import { Button } from '../common/Button';

export interface ExportReportButtonProps {
  onExport: () => void;
  loading?: boolean;
  className?: string;
}

export const ExportReportButton = ({
  onExport,
  loading = false,
  className,
}: ExportReportButtonProps) => {
  return (
    <Button
      variant="outline"
      onPress={onExport}
      loading={loading}
      leftIcon={Download}
      className={className}
    >
      Export CSV
    </Button>
  );
};
