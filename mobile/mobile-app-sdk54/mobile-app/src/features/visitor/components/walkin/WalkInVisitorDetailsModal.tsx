import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';
import { Check, X, ShieldAlert, Clock } from 'lucide-react-native';

export interface WalkInVisitorDetailsModalProps {
  visible: boolean;
  item: WalkInApprovalItem | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}

export const WalkInVisitorDetailsModal: React.FC<WalkInVisitorDetailsModalProps> = ({
  visible,
  item,
  onClose,
  onApprove,
  onReject,
}) => {
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  if (!item) return null;

  const handleConfirmReject = () => {
    onReject(item.id);
    setRejectConfirmOpen(false);
    onClose();
  };

  const handleConfirmApprove = () => {
    onApprove(item.id);
    onClose();
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title="Walk-In Entry Verification">
        <ScrollView className="max-h-[520px] p-2">
          <View className="gap-4 pb-6">
            {/* Header Alert Banner */}
            <View className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400" />
                  <Text className="font-extrabold text-foreground text-sm">
                    Visitor Waiting at Gate
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                  <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {item.waitingDurationMinutes}m waiting
                  </Text>
                </View>
              </View>
              <Text variant="muted" className="text-xs">
                Guard at {item.gateName} initiated entry verification for your villa.
              </Text>
            </View>

            {/* Visitor Details Section */}
            <DetailSection title="Visitor Information" iconName="User">
              <DetailRow label="Visitor Full Name" value={item.visitorName} iconName="User" />
              <DetailRow label="Phone Number" value={item.phone} iconName="Phone" copyable />
              <DetailRow label="Pass Category" value={<StatusBadge label={item.passType} variant="info" />} iconName="Tag" />
              <DetailRow label="Purpose of Visit" value={item.purpose} iconName="FileText" />
              {item.vehicleNo ? (
                <DetailRow label="Vehicle Plate No" value={item.vehicleNo} iconName="Car" copyable />
              ) : null}
              {item.notes ? (
                <DetailRow label="Guard Notes" value={item.notes} iconName="ShieldAlert" />
              ) : null}
              <DetailRow label="Gate Location" value={item.gateName} iconName="Shield" isLast />
            </DetailSection>

            {/* Action Bar */}
            <View className="flex-row gap-3 pt-2">
              <Button
                variant="destructive"
                onPress={() => setRejectConfirmOpen(true)}
                className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2"
              >
                <X size={18} color="#fff" />
                <Text className="font-bold text-destructive-foreground text-base">
                  Reject Entry
                </Text>
              </Button>

              <Button
                variant="default"
                onPress={handleConfirmApprove}
                className="flex-1 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-700 flex-row items-center justify-center gap-2"
              >
                <Check size={18} color="#fff" />
                <Text className="font-bold text-white text-base">
                  Approve Entry
                </Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Confirmation Modal for Rejection */}
      <ConfirmationModal
        visible={rejectConfirmOpen}
        title="Reject Walk-In Visitor Entry?"
        message={`Are you sure you want to deny gate entry for ${item.visitorName}? The security guard will be notified immediately.`}
        variant="danger"
        confirmLabel="Reject Entry"
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectConfirmOpen(false)}
      />
    </>
  );
};
