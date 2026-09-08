import React from 'react';
import { QRScannerModal, QRScannerModalProps } from '@/components/hardware/QRScannerModal';

export interface GuardQRScannerModalProps extends Partial<QRScannerModalProps> {
  visible: boolean;
  onClose: () => void;
  onScanCode: (code: string) => void;
  title?: string;
  instruction?: string;
}

/**
 * GuardQRScannerModal wraps the canonical QRScannerModal for guard gate visitor verification.
 */
export const GuardQRScannerModal: React.FC<GuardQRScannerModalProps> = ({
  visible,
  onClose,
  onScanCode,
  title = 'Guard Gate QR Scanner',
  instruction = 'Align Visitor QR Code inside Frame',
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

export default GuardQRScannerModal;
