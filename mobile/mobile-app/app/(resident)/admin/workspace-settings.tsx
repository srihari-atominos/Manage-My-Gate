import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { WorkspaceModulesForm } from '@/src/features/workspace/components/WorkspaceModulesForm';
import { WorkspaceSettingsForm } from '@/src/features/workspace/components/WorkspaceSettingsForm';
import { useTranslation } from '@/src/utils/i18n';

export default function WorkspaceSettingsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('modules');

  const tabs = [
    { key: 'modules', label: 'Modules' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <ScreenShell title={t('feature_admin_workspace_settings_name', 'Workspace Settings')}>
      <View className="bg-background pt-2 pb-1">
        <TabBar 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          variant="underline"
        />
      </View>
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {activeTab === 'modules' ? <WorkspaceModulesForm /> : <WorkspaceSettingsForm />}
      </ScrollView>
    </ScreenShell>
  );
}
