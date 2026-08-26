import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { TriageTicket } from '../hooks/useComplaintTriage';
import { ShieldAlert, AlertTriangle } from 'lucide-react-native';

export interface TicketEscalationModalProps {
  visible: boolean;
  ticket: TriageTicket | null;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => Promise<void>;
}

const ESCALATION_REASONS = [
  'SLA Breach Imminent (< 1h remaining)',
  'Safety or Structural Hazard Risk',
  'Specialized External Vendor Contractor Required',
  'Resident Repeated Complaint / Escalation Request',
  'Parts Unavailable / High Cost Approval Required',
];

export const TicketEscalationModal: React.FC<TicketEscalationModalProps> = ({
  visible,
  ticket,
  onClose,
  onConfirm,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(ESCALATION_REASONS[0]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleEscalate = async () => {
    if (!ticket) return;
    setLoading(true);
    setError(null);
    try {
      const fullReason = `${selectedReason}${additionalNotes ? ` - ${additionalNotes.trim()}` : ''}`;
      await onConfirm(ticket._id, fullReason);
      setAdditionalNotes('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to escalate ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={ticket ? `Escalate Ticket (${ticket.complaintNumber})` : 'Escalate Ticket'}
    >
      <View className="gap-3.5 pb-2">
        {error && (
          <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
            <ShieldAlert size={16} className="text-destructive shrink-0" />
            <Text className="text-xs font-semibold text-destructive flex-1">{error}</Text>
          </View>
        )}

        <View className="gap-3 pb-2">
          <View className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex-row items-center gap-2">
            <AlertTriangle size={16} className="text-destructive shrink-0" />
            <Text className="text-xs text-destructive font-medium flex-1">
              Escalating this ticket will elevate priority to <Text className="font-bold text-destructive">CRITICAL</Text> and notify facility department heads immediately.
            </Text>
          </View>

          <Text className="text-xs font-semibold text-muted-foreground">Select Primary Escalation Reason</Text>

          {/* Reason Chips */}
          <View className="gap-2">
            {ESCALATION_REASONS.map((r) => {
              const isSelected = selectedReason === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelectedReason(r)}
                  className={`p-3 rounded-xl border ${
                    isSelected
                      ? 'bg-destructive/10 border-destructive'
                      : 'bg-card border-border'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Context */}
          <TextInput
            label="Additional Notes / Action Required (Optional)"
            multiline
            numberOfLines={3}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="e.g. Contacted facility supervisor for emergency override..."
            inputClassName="h-20 py-2 text-start"
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onPress={onClose} disabled={loading}>
            <Text className="text-xs font-semibold text-foreground">Cancel</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5"
            onPress={handleEscalate}
            disabled={loading}
            loading={loading}
            accessibilityLabel="Confirm Escalation"
          >
            <ShieldAlert size={16} className="text-destructive-foreground" />
            <Text className="text-xs font-bold text-destructive-foreground">Confirm Escalation</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default TicketEscalationModal;
