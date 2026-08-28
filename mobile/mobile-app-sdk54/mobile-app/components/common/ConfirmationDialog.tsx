import React from 'react';
import { View, Text } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react-native';

export interface ConfirmationDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmationDialog = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
}: ConfirmationDialogProps) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertTriangle size={32} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={32} className="text-amber-500" />;
      case 'info': return <Info size={32} className="text-blue-500" />;
      default: return <HelpCircle size={32} className="text-slate-500" />;
    }
  };

  const getConfirmVariant = () => {
    switch (variant) {
      case 'danger': return 'destructive';
      case 'warning': return 'default'; // Maybe a warning variant if supported
      default: return 'default';
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} contentClassName="items-center text-center">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-muted">
        {getIcon()}
      </View>
      <Text className="mb-2 text-xl font-bold text-foreground text-center">
        {title}
      </Text>
      <Text className="mb-6 text-center text-base text-muted-foreground">
        {message}
      </Text>
      <View className="w-full flex-row space-x-3">
        <Button
          variant="outline"
          className="flex-1 me-2"
          onPress={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={getConfirmVariant()}
          className="flex-1 ms-2"
          onPress={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </View>
    </Modal>
  );
};
