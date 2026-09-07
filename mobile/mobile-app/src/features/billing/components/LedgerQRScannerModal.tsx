import React from 'react';
import { QRScannerModal, QRScannerModalProps } from '@/components/hardware/QRScannerModal';

export interface LedgerQRScannerModalProps extends Partial<QRScannerModalProps> {
  visible: boolean;
  onClose: () => void;
  onScanCode: (code: string) => void;
  title?: string;
  instruction?: string;
}

/**
 * LedgerQRScannerModal wraps the canonical QRScannerModal for invoice/cheque reference barcode scanning.
 */
export const LedgerQRScannerModal: React.FC<LedgerQRScannerModalProps> = ({
  visible,
  onClose,
  onScanCode,
  title = 'Invoice & Cheque Scanner',
  instruction = 'Align Invoice or Cheque QR Code inside Frame',
  ...props
}) => {
  return (
    <QRScannerModal
      visible={visible}
      onClose={onClose}
      onScanCode={onScanCode}
      title={title}
      instruction={instruction}
      {...props}
    />
  );
};

export default LedgerQRScannerModal;
