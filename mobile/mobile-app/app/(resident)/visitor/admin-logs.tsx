import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { VisitorHistoryView } from '@/src/features/visitor/components/history/VisitorHistoryView';
import { AdminForceCheckoutModal } from '@/src/features/visitor/components/admin/AdminForceCheckoutModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { Download, Filter } from 'lucide-react-native';

export default function AdminGateLogsScreen() {
  const { forceCheckout, actionStatus } = useAdminVisitor();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const handleExportCSV = () => {
    // CSV export trigger stub
    console.log('[Admin Audit Logs] Triggering CSV Export');
  };

  return (
    <ScreenShell
      title="Admin Gate Audit Logs"
      subtitle="Complete community entry/exit logs & timestamp security audit"
      headerRight={
        <TouchableOpacity
          onPress={handleExportCSV}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full"
        >
          <Download size={14} className="text-primary" />
          <Text className="text-xs font-bold text-primary">Export CSV</Text>
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        <VisitorHistoryView />
      </View>

      <AdminForceCheckoutModal
        visible={checkoutModalOpen}
        visitorName={selectedLog?.visitorName}
        loading={actionStatus === 'loading'}
        onClose={() => setCheckoutModalOpen(false)}
        onConfirm={async (reason) => {
          if (selectedLog?._id) {
            await forceCheckout(selectedLog._id, reason);
          }
        }}
      />
    </ScreenShell>
  );
}
