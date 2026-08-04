import React from 'react';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WalkInApprovalsView } from '@/src/features/visitor/components/walkin/WalkInApprovalsView';

export default function WalkInApprovalsScreen() {
  return (
    <ScreenShell title="Gate Walk-In Approvals" subtitle="Pending gate verification requests from security guards">
      <WalkInApprovalsView />
    </ScreenShell>
  );
}
