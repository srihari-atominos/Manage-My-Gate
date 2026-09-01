import React from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WorkspaceModulesForm } from '@/src/features/workspace/components/WorkspaceModulesForm';
import { useTranslation } from '@/src/utils/i18n';

export default function WorkspaceSettingsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenShell title={t('feature_admin_workspace_settings_name', 'Workspace Settings')}>
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <WorkspaceModulesForm />
      </ScrollView>
    </ScreenShell>
  );
}
