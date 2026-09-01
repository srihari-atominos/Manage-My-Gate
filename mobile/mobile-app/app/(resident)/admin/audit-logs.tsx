import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';
import { useTranslation } from '@/src/utils/i18n';

export default function AuditLogsScreen() {
  const { t } = useTranslation();

  return (
    <FeatureDetailScreen
      title={t('feature_admin_audit_logs_name', 'Audit Logs')}
      categoryName={t('category_administration_security', 'Administration & Security')}
      sharedSlice="workspaceSlice.js"
      permission="platform:super_admin"
      iconName="FileSpreadsheet"
      iconColor="#64748b"
      description="View immutable system audit logs, correlation ID tracking, admin security overrides, and sensitive data access logs."
    />
  );
}
