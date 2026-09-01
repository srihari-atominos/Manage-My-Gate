import React from 'react';
import FeatureDetailScreen from '@/components/dashboard/FeatureDetailScreen';
import { useTranslation } from '@/src/utils/i18n';

export default function OrganizationManagerScreen() {
  const { t } = useTranslation();

  return (
    <FeatureDetailScreen
      title={t('feature_admin_organizations_name', 'Org Manager')}
      categoryName={t('category_administration_security', 'Administration & Security')}
      sharedSlice="organizationSlice.js"
      permission="platform:super_admin"
      iconName="Building"
      iconColor="#a855f7"
      description="Super Admin multi-community management portal for onboarding new gated societies, managing plans, and platform stats."
    />
  );
}
