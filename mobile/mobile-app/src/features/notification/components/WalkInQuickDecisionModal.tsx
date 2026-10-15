import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/DetailRow';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ShieldAlert, User, Check, X, Phone, Car } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';
import { NotificationItemData } from '../services/notificationService';

export interface WalkInQuickDecisionModalProps {
  visible: boolean;
  notification: NotificationItemData | null;
  onClose: () => void;
  onApprove: (logId: string) => Promise<void>;
  onReject: (logId: string) => Promise<void>;
}

export const extractWalkInLogId = (notification?: NotificationItemData | null): string => {
  if (!notification) return '';
  const meta = notification.metadata || {};
  return (
    meta.logId ||
    meta.visitorLogId ||
    meta.entityId ||
    meta._id ||
    meta.id ||
    ''
  );
};

export const isWalkInNotification = (notification?: NotificationItemData | null): boolean => {
  if (!notification) return false;
  const meta = notification.metadata || {};
  const type = String(notification.type || meta.type || '').toUpperCase();
  if (type === 'VISITOR_REQUEST') return true;

  const title = (notification.title || '').toLowerCase();
  const body = (notification.body || '').toLowerCase();
  const url = (notification.actionUrl || '').toLowerCase();

  return (
    title.includes('gate approval') ||
    title.includes('walk-in') ||
    title.includes('walkin') ||
    body.includes('waiting at the gate') ||
    url.includes('tab=walkin') ||
    url.includes('walk-in')
  );
};

export const WalkInQuickDecisionModal: React.FC<WalkInQuickDecisionModalProps> = ({
  visible,
  notification,
  onClose,
  onApprove,
  onReject,
}) => {
  const { t, translateText } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

  if (!notification) return null;

  const meta = notification.metadata || {};
  const logId = extractWalkInLogId(notification);

  let visitorName = meta.visitorName;
  if (!visitorName && notification.body) {
    const match = notification.body.match(/Visitor "([^"]+)"/i);
    if (match) visitorName = match[1];
  }
  visitorName = visitorName || 'Walk-In Visitor';

  const phone = meta.phone || '';
  const vehicleNumber = meta.vehicleNumber || '';
  const gateName = meta.gateName || 'Main gate';

  const handleApprovePress = async () => {
    if (!logId) return;
    setLoading(true);
    setActionType('APPROVE');
    try {
      await onApprove(logId);
      onClose();
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!logId) return;
    setConfirmRejectOpen(false);
    setLoading(true);
    setActionType('REJECT');
    try {
      await onReject(logId);
      onClose();
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={t('gate_walkin_request', 'Gate Walk-In Approval')}
      >
        <View className="gap-4 pb-6">
          {/* Header Warning Banner */}
          <View className="bg-amber-500/15 border border-amber-500/30 p-3.5 rounded-2xl flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-full bg-amber-500/20 items-center justify-center">
              <ShieldAlert size={20} className="text-amber-600" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                {t('visitor_at_gate', 'Visitor Waiting at Gate')}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {translateText(gateName)} • {t('action_required', 'Action Required')}
              </Text>
            </View>
            <StatusBadge label={t('pending', 'Pending')} variant="warning" dot size="sm" />
          </View>

          {/* Visitor Details */}
          <View className="bg-card border border-border rounded-2xl p-3 gap-2">
            <DetailRow
              label={t('visitor_name', 'Visitor Name')}
              value={visitorName}
              iconName="User"
            />
            {phone ? (
              <DetailRow
                label={t('phone_number', 'Phone Number')}
                value={phone}
                iconName="Phone"
                copyable
              />
            ) : null}
            {vehicleNumber ? (
              <DetailRow
                label={t('vehicle_number', 'Vehicle Plate')}
                value={vehicleNumber}
                iconName="Car"
                copyable
              />
            ) : null}
            <DetailRow
              label={t('gate_location', 'Gate Location')}
              value={translateText(gateName)}
              iconName="Shield"
              isLast
            />
          </View>

          {/* Action CTAs */}
          <View className="flex-row items-center gap-2.5 pt-2">
            <Button
              variant="destructive"
              onPress={() => setConfirmRejectOpen(true)}
              disabled={loading}
              loading={loading && actionType === 'REJECT'}
              className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-1.5"
            >
              <X size={18} color="#fff" />
              <Text className="text-white font-bold text-sm">{t('deny', 'Deny')}</Text>
            </Button>

            <Button
              variant="default"
              onPress={handleApprovePress}
              disabled={loading}
              loading={loading && actionType === 'APPROVE'}
              className="flex-1 h-12 rounded-xl bg-emerald-600 active:bg-emerald-700 flex-row items-center justify-center gap-1.5"
            >
              <Check size={18} color="#fff" />
              <Text className="text-white font-bold text-sm">{t('approve', 'Approve')}</Text>
            </Button>
          </View>
        </View>
      </BottomSheet>

      <ConfirmationModal
        visible={confirmRejectOpen}
        title={t('deny_walkin_title', 'Deny Walk-In Entry?')}
        message={t(
          'deny_walkin_msg',
          `Are you sure you want to deny gate entry for ${visitorName}? Security will be notified immediately.`
        )}
        variant="danger"
        confirmLabel={t('deny_entry', 'Deny Entry')}
        onConfirm={handleRejectConfirm}
        onCancel={() => setConfirmRejectOpen(false)}
      />
    </>
  );
};

export default WalkInQuickDecisionModal;
