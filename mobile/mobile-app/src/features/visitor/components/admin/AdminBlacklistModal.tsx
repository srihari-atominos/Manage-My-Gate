import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ShieldAlert, X } from 'lucide-react-native';

interface AdminBlacklistModalProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (data: { visitorName: string; phone?: string; idProofNumber?: string; reason: string }) => Promise<void>;
}

export const AdminBlacklistModal: React.FC<AdminBlacklistModalProps> = ({
  visible,
  loading = false,
  onClose,
  onSubmit,
}) => {
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!visitorName.trim()) {
      setError('Please enter visitor full name');
      return;
    }
    if (!reason.trim()) {
      setError('Please specify reason for blacklisting');
      return;
    }
    
    if (phone && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setError('Contact number must be exactly 10 digits');
        return;
      }
    }

    setError(null);
    try {
      await onSubmit({ visitorName, phone, idProofNumber, reason });
      setVisitorName('');
      setPhone('');
      setIdProofNumber('');
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to blacklist visitor');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-background w-full rounded-2xl p-4 gap-3 border border-border shadow-lg max-w-md">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border pb-3">
            <View className="flex-row items-center gap-2">
              <ShieldAlert size={20} className="text-destructive" />
              <Text className="text-base font-bold text-foreground">Blacklist Visitor</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {error && (
            <View className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl">
              <Text className="text-xs text-destructive font-medium">{error}</Text>
            </View>
          )}

          {/* Form */}
          <View className="gap-2.5">
            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Visitor Name *</Text>
              <TextInput
                value={visitorName}
                onChangeText={setVisitorName}
                placeholder="e.g. John Doe"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">National ID / Govt ID</Text>
              <TextInput
                value={idProofNumber}
                onChangeText={setIdProofNumber}
                placeholder="e.g. AADHAAR / DL Number"
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-muted-foreground mb-1">Blacklist Reason *</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Describe reason for restricting entry..."
                multiline
                numberOfLines={3}
                className="bg-card border border-border rounded-xl p-3 text-sm text-foreground min-h-[70px]"
              />
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" onPress={onClose} disabled={loading}>
              <Text className="text-xs font-semibold">Cancel</Text>
            </Button>
            <Button variant="destructive" className="flex-1" onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-semibold text-white">Add to Blacklist</Text>}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdminBlacklistModal;
