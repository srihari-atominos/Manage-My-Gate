import React from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export const DeleteNoticeDialog = ({ visible, onConfirm, onCancel }) => {
  return (
    <ConfirmationModal
      visible={visible}
      title="Delete Notice"
      message="Are you sure you want to permanently delete this notice? This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant="danger"
    />
  );
};

export default DeleteNoticeDialog;
