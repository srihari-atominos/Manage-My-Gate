import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AttachmentPicker, Attachment } from '@/components/ui/AttachmentPicker';
import { CheckCircle2, ShieldAlert } from 'lucide-react-native';

export interface ProofOfWorkModalProps {
  visible: boolean;
  workOrderId: string | null;
  ticketNumber?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: { notes: string; partsUsed: string; attachments: Attachment[] }) => Promise<void>;
}

export const ProofOfWorkModal: React.FC<ProofOfWorkModalProps> = ({
  visible,
  ticketNumber,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [notes, setNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('Please provide resolution notes describing work done.');
      return;
    }
    setError(null);
    try {
      await onSubmit({ notes: notes.trim(), partsUsed: partsUsed.trim(), attachments });
      setNotes('');
      setPartsUsed('');
      setAttachments([]);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit proof of work.');
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={ticketNumber ? `Proof of Work (${ticketNumber})` : 'Submit Proof of Work'}
    >
      <View className="gap-3.5 pb-2">
        {error && (
          <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
            <ShieldAlert size={16} className="text-destructive shrink-0" />
            <Text className="text-xs font-semibold text-destructive flex-1">{error}</Text>
          </View>
        )}

        {/* Work Resolution Notes */}
        <TextInput
          label="Work Performed & Resolution Summary *"
            required
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe repairs carried out, cause identified, and outcome..."
            inputClassName="h-24 py-2 text-start"
          />

          {/* Parts / Materials Replaced */}
          <TextInput
            label="Materials & Spare Parts Replaced (Optional)"
            value={partsUsed}
            onChangeText={setPartsUsed}
            placeholder="e.g. 1x 1/2-inch brass ball valve, 2x rubber washer"
          />

          {/* Photo Proof Upload */}
          <View>
            <Text className="text-xs font-semibold text-muted-foreground mb-1.5">
              Resolution Photos & Proof (Max 5)
            </Text>
            <AttachmentPicker
              attachments={attachments}
              onAdd={(files) => setAttachments((prev) => [...prev, ...files].slice(0, 5))}
              onRemove={(idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
              maxFiles={5}
              accept="images"
            />
          </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 pt-2 border-t border-border">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onPress={onClose} disabled={loading}>
            <Text className="text-xs font-semibold text-foreground">Cancel</Text>
          </Button>
          <Button
            variant="default"
            className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5"
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            accessibilityLabel="Complete Work Order"
          >
            <CheckCircle2 size={16} className="text-primary-foreground" />
            <Text className="text-xs font-bold text-primary-foreground">Complete Work Order</Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ProofOfWorkModal;
