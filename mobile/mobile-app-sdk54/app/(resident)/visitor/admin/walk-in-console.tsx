import React from 'react';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WalkInApprovalsView } from '@/src/features/visitor/components/walkin/WalkInApprovalsView';

export default function AdminWalkInConsoleScreen() {
  return (
    <ScreenShell title="Master Gate Walk-In Console" subtitle="Override & monitor pending gate verification requests">
      <WalkInApprovalsView />
    </ScreenShell>
  );
}
