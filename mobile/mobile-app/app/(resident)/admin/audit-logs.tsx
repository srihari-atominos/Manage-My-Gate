import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';

export default function AuditLogsScreen() {
  return (
    <FeatureDetailScreen
      title="System Audit Logs"
      categoryName="Administration & Security"
      sharedSlice="workspaceSlice.js"
      permission="platform:super_admin"
      iconName="FileSpreadsheet"
      iconColor="#64748b"
      description="View immutable system audit logs, correlation ID tracking, admin security overrides, and sensitive data access logs."
    />
  );
}
