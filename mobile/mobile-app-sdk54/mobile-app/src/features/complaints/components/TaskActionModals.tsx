import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/forms/TextInput';
import { ShieldAlert, PauseCircle, FileText, Send, Check } from 'lucide-react-native';
import { Complaint } from '../types';

interface TaskActionModalProps {
  visible: boolean;
  type: 'REJECT' | 'PAUSE' | 'NOTES';
  complaint: Complaint | null;
  onClose: () => void;
  onSubmit: (id: string, text: string) => Promise<any>;
}

export const TaskActionModal: React.FC<TaskActionModalProps> = ({
  visible,
  type,
  complaint,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
    }
  }, [visible]);

  if (!complaint) return null;

  const getTitle = () => {
    switch (type) {
      case 'REJECT':
        return `Reject Assignment #${complaint.complaintNumber}`;
      case 'PAUSE':
        return `Pause Work on #${complaint.complaintNumber}`;
      case 'NOTES':
        return `Add Task Notes to #${complaint.complaintNumber}`;
      default:
        return 'Task Action';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'REJECT':
        return 'Why are you rejecting this assignment? (e.g., Schedule conflict, out of scope)';
      case 'PAUSE':
        return 'Enter reason for holding/pausing work... (e.g., Waiting for spare parts)';
      case 'NOTES':
        return 'Enter work progress details or technician notes...';
      default:
        return 'Enter details...';
    }
  };

  const getButtonBgColor = () => {
    switch (type) {
      case 'REJECT':
        return '#e11d48'; // red
      case 'PAUSE':
        return '#d97706'; // amber
      case 'NOTES':
        return '#2563eb'; // blue
      default:
        return '#2563eb';
    }
  };

  const getButtonLabel = () => {
    if (isSubmitting) return 'Submitting...';
    switch (type) {
      case 'REJECT':
        return 'Confirm Rejection';
      case 'PAUSE':
        return 'Confirm Pause Work';
      case 'NOTES':
        return 'Save Notes';
      default:
        return 'Submit';
    }
  };

  const handleSubmit = async () => {
    if (type !== 'NOTES' && !reason.trim()) {
      Alert.alert('Reason Required', 'Please enter a explanation before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(complaint._id, reason.trim());
      onClose();
    } catch (err: any) {
      console.error(`Failed to submit ${type}:`, err);
      Alert.alert('Submission Error', err?.message || `Failed to perform ${type} action.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={getTitle()}>
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Ticket Header Banner */}
        <View className="bg-muted/40 border border-border/50 rounded-xl p-3 mb-3 flex-row items-center justify-between">
          <View className="flex-1 me-2">
            <Text className="text-[10px] font-bold text-muted-foreground uppercase">Target Task</Text>
            <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
              {complaint.title}
            </Text>
          </View>
          <View className="bg-primary/10 px-2 py-0.5 rounded-md">
            <Text className="text-[11px] font-bold text-primary">{complaint.category}</Text>
          </View>
        </View>

        {/* Reason / Notes Multiline Input */}
        <TextInput
          label={type === 'REJECT' ? 'Rejection Reason *' : type === 'PAUSE' ? 'Pause Reason *' : 'Technician Work Log Notes'}
          placeholder={getPlaceholder()}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />

        {/* Submit Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: getButtonBgColor(),
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 16,
          }}
        >
          <Icon as={Send} size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
            {getButtonLabel()}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
};

export default TaskActionModal;
