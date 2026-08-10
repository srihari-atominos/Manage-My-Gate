import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui';
import { TextInput, DropdownSelect, FileUploadField, FileInfo } from '@/components/forms';
import { Button } from '@/components/common';
import { Building2 } from 'lucide-react-native';

interface OfflineSettlementModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: any | null;
  onSubmit: (data: { offlineReference: string; paymentMethod: string; proofUrl?: string }) => void;
  loading?: boolean;
}

export const OfflineSettlementModal: React.FC<OfflineSettlementModalProps> = ({
  visible,
  onClose,
  invoice,
  onSubmit,
  loading = false,
}) => {
  const [offlineReference, setOfflineReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState('');

  if (!invoice) return null;

  const handleSubmit = () => {
    if (!offlineReference.trim()) {
      setError('Please provide a valid transaction reference or cheque number');
      return;
    }
    setError('');
    onSubmit({
      offlineReference,
      paymentMethod,
      proofUrl: files[0]?.uri || undefined,
    });
  };

  const paymentOptions = [
    { label: 'Bank NEFT / RTGS Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cheque Deposit', value: 'CHEQUE' },
    { label: 'Cash Payment to Office', value: 'CASH' },
    { label: 'Other Offline Reference', value: 'OTHER' },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Record Offline Settlement">
      <ScrollView className="space-y-4 pb-6" showsVerticalScrollIndicator={false}>
        <View className="bg-amber-500/10 p-3 rounded-xl flex-row items-center space-x-2 my-1">
          <Building2 size={20} className="text-amber-600 dark:text-amber-400 me-2" />
          <Text className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1 text-start">
            Offline payments require admin approval. Status will change to Verification Pending once submitted.
          </Text>
        </View>

        <DropdownSelect
          label="Payment Method Type"
          value={paymentMethod}
          onValueChange={(val: string) => setPaymentMethod(val)}
          options={paymentOptions}
        />

        <TextInput
          label="Transaction Reference / Cheque No."
          placeholder="e.g. UTR123456789 or CHQ-998877"
          value={offlineReference}
          onChangeText={(text) => {
            setOfflineReference(text);
            if (error) setError('');
          }}
          error={error}
        />

        <View className="space-y-1">
          <FileUploadField
            label="Payment Receipt Proof (Optional)"
            files={files}
            onUploadPress={() => {
              setFiles([
                {
                  name: 'receipt_proof.jpg',
                  uri: 'https://placeholder.com/receipt.jpg',
                  type: 'image',
                },
              ]);
            }}
            onRemoveFile={(idx) => {
              setFiles(files.filter((_, i) => i !== idx));
            }}
          />
        </View>

        <View className="pt-4 flex-row space-x-2">
          <View className="flex-1 me-1">
            <Button variant="outline" size="lg" onPress={onClose} disabled={loading}>
              Cancel
            </Button>
          </View>
          <View className="flex-1 ms-1">
            <Button variant="default" size="lg" onPress={handleSubmit} loading={loading}>
              Submit Settlement
            </Button>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default OfflineSettlementModal;
