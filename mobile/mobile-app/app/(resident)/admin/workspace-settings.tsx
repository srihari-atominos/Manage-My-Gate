import React from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WorkspaceModulesForm } from '@/src/features/workspace/components/WorkspaceModulesForm';

export default function WorkspaceSettingsScreen() {
  return (
    <ScreenShell title="Workspace Settings">
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <WorkspaceModulesForm />
      </ScrollView>
    </ScreenShell>
  );
}
