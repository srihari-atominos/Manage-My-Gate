import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/forms/TextInput';
import { AttachmentPicker, Attachment } from '@/components/ui/AttachmentPicker';
import { CheckCircle2, Send } from 'lucide-react-native';
import { Complaint } from '../types';
import { complaintService } from '../services/complaintService';
import { errorText } from '../utils/complaintStatus';

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
  const [formError, setFormError] = useState<string | null>(null);

  if (!complaint) return null;

  const handleSubmit = async () => {
    const notes = workNotes.trim();
    // The resident decides whether it is fixed based on this, so a note or a photo is required.
    if (!notes && attachments.length === 0) {
      setFormError('Add a short note or a photo of the finished work.');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);

      // Photos must be uploaded first: a phone file path means nothing to the resident or the server.
      let photoUrls: string[] = [];
      const picked = attachments.filter((a) => a.uri);
      if (picked.length > 0) {
        const formData = new FormData();
        picked.forEach((item, i) => {
          if (Platform.OS === 'web' && item.file) {
            formData.append('attachments', item.file);
          } else {
            formData.append('attachments', {
              uri: item.uri,
              name: item.name || `work_proof_${Date.now()}_${i}.jpg`,
              type: item.type || 'image/jpeg',
            } as any);
          }
        });
        const uploadRes: any = await complaintService.uploadAttachments(formData);
        const uploaded = uploadRes?.data || uploadRes || [];
        photoUrls = Array.isArray(uploaded) ? uploaded : [];
        if (photoUrls.length === 0) throw new Error('The photos could not be uploaded. Please try again.');
      }

      await onComplete(complaint._id, { notes: notes || undefined, attachments: photoUrls });
      setWorkNotes('');
      setAttachments([]);
      onClose();
    } catch (err: any) {
      setFormError(errorText(err, 'Could not mark the work as completed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Mark Work Completed #${complaint.complaintNumber}`}>
      <View className="px-1 py-1">
        <Text className="text-xs text-muted-foreground mb-3">
          Tell the resident what you did. They will check it and confirm the ticket is fixed.
        </Text>

        <TextInput
          label="What was done?"
          placeholder="e.g. Replaced the tap washer and tested for leaks"
          value={workNotes}
          onChangeText={(v) => {
            setWorkNotes(v);
            setFormError(null);
          }}
          multiline
          numberOfLines={3}
        />

        <View className="my-2">
          <Text className="text-xs font-bold text-muted-foreground uppercase mb-1">
            Photos of the finished work (recommended)
          </Text>
          <AttachmentPicker
            attachments={attachments}
            onAdd={(files) => setAttachments((prev) => [...prev, ...files])}
            onRemove={(index) => setAttachments((prev) => prev.filter((_, i) => i !== index))}
            maxFiles={3}
          />
        </View>

        {formError ? (
          <Text className="text-xs font-semibold text-destructive mt-2">{formError}</Text>
        ) : null}

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
            {isSubmitting ? 'Sending...' : 'Mark as completed'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export default CompleteWorkSheet;
