import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/forms/TextInput';
import { AttachmentPicker, Attachment } from '@/components/ui/AttachmentPicker';
import { CheckCircle2, Send } from 'lucide-react-native';
import { Complaint } from '../types';

interface CompleteWorkSheetProps {
  visible: boolean;
  complaint: Complaint | null;
  onClose: () => void;
  onComplete: (id: string, data: { notes?: string; attachments?: string[] }) => Promise<any>;
}

export const CompleteWorkSheet: React.FC<CompleteWorkSheetProps> = ({
  visible,
  complaint,
  onClose,
  onComplete,
}) => {
  const [workNotes, setWorkNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!complaint) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const photoUrls = attachments.map((a) => a.uri).filter((u): u is string => Boolean(u));
      await onComplete(complaint._id, {
        notes: workNotes.trim() || undefined,
        attachments: photoUrls,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to complete work:', err);
      Alert.alert('Completion Error', err?.message || 'Failed to submit work completion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Mark Work Completed #${complaint.complaintNumber}`}>
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 60 }}>
        <Text className="text-xs text-muted-foreground mb-3">
          Upload proof of completion and resolution notes for <Text className="font-bold text-foreground">{complaint.title}</Text>
        </Text>

        <TextInput
          label="Completion Summary & Resolution Notes"
          placeholder="Describe repairs performed, replaced spare parts, or work done..."
          value={workNotes}
          onChangeText={setWorkNotes}
        />

        <View className="my-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">
            Proof of Work Photos (Optional)
          </Text>
          <AttachmentPicker
            attachments={attachments}
            onAdd={(files) => setAttachments((prev) => [...prev, ...files])}
            onRemove={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
            maxFiles={3}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#059669', // solid emerald green
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <Icon as={CheckCircle2} size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
            {isSubmitting ? 'Submitting Completion...' : 'Confirm & Mark Completed'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
};

export default CompleteWorkSheet;
