import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react-native';

/**
 * NoticeAcknowledgementCard
 * Dedicated visual container for mandatory acknowledgement flows on critical notices.
 */
export function NoticeAcknowledgementCard({
  notice,
  onAcknowledge,
  loading = false,
  isAdmin = false,
}) {
  const [confirming, setConfirming] = useState(false);

  if (!notice || !notice.requiresAcknowledgement) {
    return null;
  }

  const hasAcknowledged = !!notice.hasAcknowledged;
  const deadline = notice.acknowledgementDeadline ? new Date(notice.acknowledgementDeadline) : null;
  const isPastDeadline = deadline ? new Date() > deadline : false;

  const formattedDeadline = deadline
    ? deadline.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handlePressAcknowledge = () => {
    Alert.alert(
      'Acknowledge Notice',
      'By acknowledging, you confirm that you have read and understood this critical community notice.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Acknowledge',
          style: 'default',
          onPress: () => onAcknowledge && onAcknowledge(),
        },
      ]
    );
  };

  return (
    <Card className={`border-2 p-4 mb-4 rounded-xl ${hasAcknowledged ? 'border-success/30 bg-success/5' : isPastDeadline ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/5'}`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          {hasAcknowledged ? (
            <CheckCircle2 size={20} color="#16a34a" className="me-2" />
          ) : (
            <ShieldAlert size={20} color={isPastDeadline ? '#dc2626' : '#d97706'} className="me-2" />
          )}
          <Text className="text-foreground font-bold text-base">
            {hasAcknowledged ? 'Notice Acknowledged' : 'Action Required: Acknowledge'}
          </Text>
        </View>
        <StatusBadge
          label={hasAcknowledged ? 'Completed' : isPastDeadline ? 'Past Deadline' : 'Pending'}
          variant={hasAcknowledged ? 'success' : isPastDeadline ? 'danger' : 'warning'}
          size="sm"
        />
      </View>

      <Text className="text-muted-foreground text-sm mb-3 text-start">
        {hasAcknowledged
          ? 'You have formally acknowledged this critical notice. Your confirmation has been recorded.'
          : 'This is a mandatory compliance notice requiring explicit acknowledgement from residents.'}
      </Text>

      {formattedDeadline && (
        <View className="flex-row items-center mb-3">
          <Clock size={14} color="#737373" className="me-1.5" />
          <Text className="text-xs text-muted-foreground">
            {isPastDeadline ? 'Deadline passed on: ' : 'Acknowledgement Deadline: '}
            <Text className="font-semibold text-foreground">{formattedDeadline}</Text>
          </Text>
        </View>
      )}

      {/* Admin overview progress */}
      {isAdmin && notice.acknowledgementCount !== undefined && (
        <View className="bg-muted p-2.5 rounded-lg mb-3">
          <Text className="text-xs text-muted-foreground">
            Total Community Acknowledgements:{' '}
            <Text className="font-bold text-foreground">{notice.acknowledgementCount}</Text>
          </Text>
        </View>
      )}

      {/* Action CTA */}
      {!hasAcknowledged && (
        <Button
          variant={isPastDeadline ? 'outline' : 'default'}
          size="default"
          onPress={handlePressAcknowledge}
          loading={loading}
          disabled={loading}
          className="w-full mt-1"
        >
          {loading ? 'Submitting...' : 'Acknowledge Notice'}
        </Button>
      )}
    </Card>
  );
}

export default NoticeAcknowledgementCard;
