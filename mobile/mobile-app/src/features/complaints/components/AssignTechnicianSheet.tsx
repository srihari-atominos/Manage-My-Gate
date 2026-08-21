import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextInput } from '@/components/forms/TextInput';
import { TriageTicket } from '../hooks/useComplaintTriage';
import { TechnicianStaff } from '../hooks/useComplaintDispatch';
import { Wrench, Star, Phone, ShieldAlert } from 'lucide-react-native';

export interface AssignTechnicianSheetProps {
  visible: boolean;
  ticket: TriageTicket | null;
  technicians: TechnicianStaff[];
  loading?: boolean;
  onClose: () => void;
  onAssign: (ticketId: string, technicianId: string, technicianName: string, notes?: string) => Promise<void>;
}

export const AssignTechnicianSheet: React.FC<AssignTechnicianSheetProps> = ({
  visible,
  ticket,
  technicians,
  loading = false,
  onClose,
  onAssign,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTech = technicians.find((t) => t._id === selectedTechId);

  const handleConfirm = async () => {
    if (!ticket || !selectedTech) {
      setError('Please select a technician or contractor.');
      return;
    }
    setError(null);
    setAssigning(true);
    try {
      await onAssign(ticket._id, selectedTech._id, selectedTech.name, dispatchNotes.trim());
      setSelectedTechId(null);
      setDispatchNotes('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch ticket.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={ticket ? `Assign Staff (${ticket.complaintNumber} • ${ticket.category})` : 'Assign Staff / Contractor'}
    >
      <View className="gap-3.5 pb-4">
        {error && (
          <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
            <ShieldAlert size={16} className="text-destructive shrink-0" />
            <Text className="text-xs font-semibold text-destructive flex-1">{error}</Text>
          </View>
        )}

        <ScrollView className="max-h-[55vh]" contentContainerClassName="gap-3 pb-2" showsVerticalScrollIndicator={false}>
          <Text className="text-xs font-semibold text-muted-foreground">Select Available Staff or Vendor</Text>

          {/* Technicians List */}
          <View className="gap-2.5">
            {technicians.map((tech) => {
              const isSelected = selectedTechId === tech._id;
              const isBusy = tech.status === 'Busy';
              const isOffDuty = tech.status === 'Off Duty';

              return (
                <TouchableOpacity
                  key={tech._id}
                  onPress={() => setSelectedTechId(tech._id)}
                  className={`p-3 rounded-2xl border ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border'
                  } gap-2`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pe-2">
                      <Text className="text-sm font-bold text-foreground">{tech.name}</Text>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Wrench size={11} className="text-primary" />
                        <Text className="text-xs font-semibold text-primary">{tech.specialty}</Text>
                        <Text className="text-xs text-muted-foreground">• {tech.type}</Text>
                      </View>
                    </View>
                    <StatusBadge
                      label={isOffDuty ? 'OFF DUTY' : isBusy ? `${tech.activeJobsCount} ACTIVE JOBS` : 'AVAILABLE'}
                      variant={isOffDuty ? 'neutral' : isBusy ? 'warning' : 'success'}
                      size="sm"
                    />
                  </View>

                  <View className="flex-row items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                    <View className="flex-row items-center gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <Text className="text-xs font-bold text-foreground">{tech.rating} ★</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Phone size={11} className="text-muted-foreground" />
                      <Text className="text-xs text-muted-foreground">{tech.phone}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dispatch Instructions */}
          <TextInput
            label="Dispatch Instructions / Special Notes (Optional)"
            value={dispatchNotes}
            onChangeText={setDispatchNotes}
            placeholder="e.g. Please bring spare 1/2-inch coupling pipes..."
          />
        </ScrollView>

        {/* Action Buttons */}
        <View className="flex-row gap-2 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onPress={onClose} disabled={assigning || loading}>
            <Text className="text-xs font-semibold text-foreground">Cancel</Text>
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11 rounded-xl"
            onPress={handleConfirm}
            disabled={!selectedTechId || assigning || loading}
            loading={assigning}
            accessibilityLabel="Assign Staff"
          >
            <Text className="text-xs font-bold text-primary-foreground">
              {selectedTech ? `Assign ${selectedTech.name.split(' ')[0]}` : 'Assign Staff'}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default AssignTechnicianSheet;
