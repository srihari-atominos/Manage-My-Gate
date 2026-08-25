import React from 'react';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { WalkInApprovalsView } from '@/src/features/visitor';

export default function WalkInApprovalsScreen() {
  return (
    <ScreenShell
      title="Gate Walk-In Approvals"
      subtitle="Pending gate verification requests from security guards"
      iconName="ShieldAlert"
    >
      <WalkInApprovalsView />
    </ScreenShell>
  );
}
