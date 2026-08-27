import React from 'react';
import { Stack } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WorkspaceSettingsForm } from '@/features/workspace/components/WorkspaceSettingsForm';

export default function WorkspaceSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Workspace Settings' }} />
      <ScreenShell scrollable>
        <WorkspaceSettingsForm />
      </ScreenShell>
    </>
  );
}
