import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, DetailSection, DetailRow } from '@/components/ui';
import { TextInput } from '@/components/forms';
import { Button } from '@/components/common';
import { Play } from 'lucide-react-native';

interface BatchBillingTriggerModalProps {
  visible: boolean;
  onClose: () => void;
  template: any | null;
  onConfirm: (data: { assessmentId: string; billingPeriodString: string }) => void;
  loading?: boolean;
}

export const BatchBillingTriggerModal: React.FC<BatchBillingTriggerModalProps> = ({
  visible,
  onClose,
  template,
  onConfirm,
  loading = false,
}) => {
  const defaultPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const [billingPeriodString, setBillingPeriodString] = useState(defaultPeriod);

  if (!template) return null;

  const handleTrigger = () => {
    onConfirm({
      assessmentId: template._id || template.id,
      billingPeriodString,
    });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Trigger Batch Billing">
      <View className="space-y-4 pb-6">
        <DetailSection title="Assessment Details">
          <DetailRow label="Schedule Title" value={template.title || template.name || 'Maintenance'} />
          <DetailRow label="Frequency" value={template.frequency || 'Monthly'} />
          <DetailRow label="Base Levy Amount" value={`₹${template.rate || template.baseAmount || 0}`} />
        </DetailSection>

        <TextInput
          label="Billing Period (YYYY-MM)"
          placeholder="e.g. 2026-08"
          value={billingPeriodString}
          onChangeText={setBillingPeriodString}
        />

        <View className="pt-4 flex-row space-x-2">
          <View className="flex-1 me-1">
            <Button variant="outline" size="lg" onPress={onClose} disabled={loading}>
              Cancel
            </Button>
          </View>
          <View className="flex-1 ms-1">
            <Button variant="default" size="lg" onPress={handleTrigger} loading={loading}>
              <Play size={16} className="me-2" />
              Generate Bills
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default BatchBillingTriggerModal;
