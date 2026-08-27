import React from 'react';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { VisitorHistoryView } from '@/src/features/visitor/components/history/VisitorHistoryView';

export default function VisitorHistoryScreen() {
  return (
    <ScreenShell title="Visitor Pass History" subtitle="Active, upcoming, completed & rejected entry logs">
      <VisitorHistoryView />
    </ScreenShell>
  );
}
