import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ActionBar } from '@/components/ui/ActionBar';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';
import { Check, X, ShieldAlert } from 'lucide-react-native';

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
            {/* Canonical Header Alert Banner */}
            <View className="bg-status-warning/15 border border-status-warning/30 p-3.5 rounded-xl gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 me-2">
                  <Icon as={ShieldAlert} size={18} className="text-status-warning shrink-0" />
                  <Text className="font-bold text-foreground text-sm flex-1" numberOfLines={1}>
                    Visitor Waiting at Gate
                  </Text>
                </View>
                <StatusBadge
                  label={`${item.waitingDurationMinutes}m waiting`}
                  variant="warning"
                  dot
                  size="sm"
                />
              </View>
              <Text variant="muted" className="text-xs text-muted-foreground">
                Guard at {item.gateName} initiated entry verification for your villa.
              </Text>
            </View>

            {/* Canonical Visitor Details Section */}
            <DetailSection title="Visitor Information" iconName="User">
              <DetailRow label="Visitor Full Name" value={item.visitorName} iconName="User" />
              <DetailRow label="Phone Number" value={item.phone} iconName="Phone" copyable />
              <DetailRow
                label="Pass Category"
                value={<StatusBadge label={item.passType} variant="info" size="sm" />}
                iconName="Tag"
              />
              <DetailRow label="Purpose of Visit" value={item.purpose} iconName="FileText" />
              {item.vehicleNo ? (
                <DetailRow label="Vehicle Plate No" value={item.vehicleNo} iconName="Car" copyable />
              ) : null}
              {item.notes ? (
                <DetailRow label="Guard Notes" value={item.notes} iconName="ShieldAlert" />
              ) : null}
              <DetailRow label="Gate Location" value={item.gateName} iconName="Shield" isLast />
            </DetailSection>

            {/* Canonical Bottom Action Bar */}
            <ActionBar className="border-t border-border px-0 pt-3 bg-transparent">
              <Button
                variant="destructive"
                onPress={() => setRejectConfirmOpen(true)}
                className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-2"
                accessibilityRole="button"
                accessibilityLabel={`Reject Entry for ${item.visitorName}`}
              >
                <Icon as={X} size={18} className="text-destructive-foreground me-1.5" />
                <Text className="font-bold text-destructive-foreground">Reject Entry</Text>
              </Button>

              <Button
                variant="default"
                onPress={handleConfirmApprove}
                className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-2"
                accessibilityRole="button"
                accessibilityLabel={`Approve Entry for ${item.visitorName}`}
              >
                <Icon as={Check} size={18} className="text-primary-foreground me-1.5" />
                <Text className="font-bold text-primary-foreground">Approve Entry</Text>
              </Button>
            </ActionBar>
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

export default WalkInVisitorDetailsModal;
