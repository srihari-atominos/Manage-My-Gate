import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { TriageTicket } from '../hooks/useComplaintTriage';
import { Check, ShieldAlert } from 'lucide-react-native';

export interface TicketStatusUpdateModalProps {
  visible: boolean;
  ticket: TriageTicket | null;
  onClose: () => void;
  onSubmit: (id: string, newStatus: string, remarks?: string) => Promise<void>;
}

const STATUS_CHOICES = [
  { label: 'Open / Unassigned', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'On Hold (Awaiting Parts)', value: 'On Hold' },
  { label: 'Work Completed', value: 'Work Completed' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed (Administrative)', value: 'Closed' },
  { label: 'Rejected / Invalid', value: 'Rejected' },
];

export const TicketStatusUpdateModal: React.FC<TicketStatusUpdateModalProps> = ({
  visible,
  ticket,
  onClose,
  onSubmit,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('In Progress');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status || 'In Progress');
      setRemarks('');
      setError(null);
    }
  }, [ticket]);

  const handleSave = async () => {
    if (!ticket) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(ticket._id, selectedStatus, remarks.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update ticket status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={ticket ? `Update Status (${ticket.complaintNumber})` : 'Update Ticket Status'}
    >
      <View className="gap-3.5 pb-4">
        {error && (
          <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
            <ShieldAlert size={16} className="text-destructive shrink-0" />
            <Text className="text-xs font-semibold text-destructive flex-1">{error}</Text>
          </View>
        )}

        <View className="gap-3 pb-2">
          <Text className="text-xs font-semibold text-muted-foreground">Select New Status</Text>

          {/* Status Selection Cards */}
          <View className="gap-2">
            {STATUS_CHOICES.map((choice) => {
              const isSelected = selectedStatus === choice.value;
              return (
                <TouchableOpacity
                  key={choice.value}
                  onPress={() => setSelectedStatus(choice.value)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    isSelected ? 'bg-primary/10 border-primary' : 'bg-card border-border'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {choice.label}
                  </Text>
                  {isSelected && <Check size={16} className="text-primary" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Remarks */}
          <TextInput
            label="Manager Remarks & Transition Notes (Optional)"
            multiline
            numberOfLines={3}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="e.g. Parts approved by storekeeper, work resumed..."
            inputClassName="h-20 py-2 text-start"
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onPress={onClose} disabled={loading}>
            <Text className="text-xs font-semibold text-foreground">Cancel</Text>
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11 rounded-xl"
            onPress={handleSave}
            disabled={loading}
            loading={loading}
            accessibilityLabel="Save Status"
          >
            <Text className="text-xs font-bold text-primary-foreground">Save Status</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default TicketStatusUpdateModal;
