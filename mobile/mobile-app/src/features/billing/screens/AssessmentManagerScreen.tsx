import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenShell, KPICard } from '@/components/ui';
import { ErrorBanner, SuccessToast } from '@/components/feedback';
import { useBilling } from '../hooks/useBilling';
import { AssessmentTemplateList, BatchBillingTriggerModal } from '../components';

export const AssessmentManagerScreen: React.FC = () => {
  const {
    kpis,
    assessmentTemplates,
    loadingStates,
    error,
    fetchKPIs,
    triggerManualBilling,
    clearError,
  } = useBilling();

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIs('current-community');
  }, [fetchKPIs]);

  const handleTriggerBatch = (template: any) => {
    setSelectedTemplate(template);
    setShowBatchModal(true);
  };

  const handleConfirmBatch = async (data: { assessmentId: string; billingPeriodString: string }) => {
    setShowBatchModal(false);
    try {
      await triggerManualBilling(data.assessmentId, data.billingPeriodString);
      setSuccessMessage(`Batch invoice generation triggered for period ${data.billingPeriodString}!`);
    } catch (err) {}
  };

  // Mock template list fallback if backend templates array is empty
  const defaultTemplates = assessmentTemplates.length
    ? assessmentTemplates
    : [
        {
          _id: 'asm_001',
          title: 'Monthly Maintenance Levy',
          frequency: 'Monthly',
          rate: 1500,
          status: 'ACTIVE',
        },
        {
          _id: 'asm_002',
          title: 'Special Security Surcharge',
          frequency: 'Quarterly',
          rate: 500,
          status: 'ACTIVE',
        },
      ];

  const currencySymbol = '₹';

  return (
    <ScreenShell
      title="Assessment Manager"
      subtitle="Configure recurring levy rates & trigger batch invoice runs"
      iconName="Calculator"
    >
      <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
        {error && <ErrorBanner message={error} onDismiss={clearError} />}
        {successMessage && (
          <SuccessToast
            message={successMessage}
            visible={Boolean(successMessage)}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        {/* Executive KPI Overview */}
        <View className="mb-2 flex-row space-x-2">
          <View className="flex-1 me-1">
            <KPICard
              title="Gross Demand"
              value={`${currencySymbol}${(kpis.grossDemand || 0).toLocaleString()}`}
              iconName="CreditCard"
              iconColor="#03A9F4"
            />
          </View>
          <View className="flex-1 ms-1">
            <KPICard
              title="Total Collected"
              value={`${currencySymbol}${(kpis.totalCollected || 0).toLocaleString()}`}
              iconName="CheckCircle2"
              iconColor="#10b981"
            />
          </View>
        </View>

        <AssessmentTemplateList
          templates={defaultTemplates}
          loading={loadingStates.fetchKPIs}
          onRefresh={() => fetchKPIs('current-community')}
          onTriggerBatch={handleTriggerBatch}
        />
      </ScrollView>

      <BatchBillingTriggerModal
        visible={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        template={selectedTemplate}
        onConfirm={handleConfirmBatch}
        loading={loadingStates.triggerManual}
      />
    </ScreenShell>
  );
};

export default AssessmentManagerScreen;
