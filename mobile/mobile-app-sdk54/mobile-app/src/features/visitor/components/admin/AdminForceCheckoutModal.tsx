import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { LogOut, X } from 'lucide-react-native';

interface AdminForceCheckoutModalProps {
  visible: boolean;
  visitorName?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const AdminForceCheckoutModal: React.FC<AdminForceCheckoutModalProps> = ({
  visible,
  visitorName = 'Visitor',
  loading = false,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    await onConfirm(reason || 'Admin Emergency Force Checkout');
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-background w-full rounded-2xl p-4 gap-3 border border-border shadow-lg max-w-md">
          <View className="flex-row items-center justify-between border-b border-border pb-3">
            <View className="flex-row items-center gap-2">
              <LogOut size={20} className="text-amber-600 dark:text-amber-400" />
              <Text className="text-base font-bold text-foreground">Force Check-Out</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-muted-foreground">
            Are you sure you want to manually check out <Text className="font-bold text-foreground">{visitorName}</Text>? This will mark the entry log as COMPLETED.
          </Text>

          <View>
            <Text className="text-xs font-semibold text-muted-foreground mb-1">Optional Reason / Guard Note</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Visitor left without scanning out"
              className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
            />
          </View>

          <View className="flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" onPress={onClose} disabled={loading}>
              <Text className="text-xs font-semibold">Cancel</Text>
            </Button>
            <Button variant="default" className="flex-1 bg-amber-600" onPress={handleConfirm} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-semibold text-white">Check-Out Visitor</Text>}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdminForceCheckoutModal;
