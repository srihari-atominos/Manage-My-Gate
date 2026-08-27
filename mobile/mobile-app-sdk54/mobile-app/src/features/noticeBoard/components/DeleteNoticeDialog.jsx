import React from 'react';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

export const DeleteNoticeDialog = ({ visible, onConfirm, onCancel }) => {
  return (
    <ConfirmationDialog
      visible={visible}
      title="Delete Notice"
      message="Are you sure you want to permanently delete this notice? This action cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onClose={onCancel}
      variant="danger"
    />
  );
};

export default DeleteNoticeDialog;
