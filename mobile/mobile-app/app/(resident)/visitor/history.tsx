import React from 'react';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { VisitorHistoryView } from '@/src/features/visitor/components/history/VisitorHistoryView';
import { useTranslation } from '@/src/utils/i18n';

export default function VisitorHistoryScreen() {
  const { t } = useTranslation();

  return (
    <ScreenShell
      title={t('visitor_history_title', 'Visitor Pass History')}
      subtitle={t('visitor_history_sub', 'Active, upcoming, completed & rejected entry logs')}
      iconName="History"
    >
      <VisitorHistoryView />
    </ScreenShell>
  );
}
