import React from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export interface DeleteNoticeDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const DeleteNoticeDialog: React.FC<DeleteNoticeDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <ConfirmationModal
      visible={visible}
      title="Delete Notice"
      message="Are you sure you want to permanently delete this notice? This action cannot be undone."
      confirmLabel="Delete Notice"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="danger"
      loading={loading}
    />
  );
};

export default DeleteNoticeDialog;
