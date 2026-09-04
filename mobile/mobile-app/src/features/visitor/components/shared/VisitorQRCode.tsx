import React from 'react';
import { QRCodeView } from '@/components/ui/QRCodeView';

export interface VisitorQRCodeProps {
  code?: string;
  size?: number;
  validityText?: string;
}

/**
 * VisitorQRCode wraps the canonical @/components/ui QRCodeView for visitor pass verification.
 */
export const VisitorQRCode: React.FC<VisitorQRCodeProps> = ({
  code = '849201',
  size = 180,
  validityText = 'Scan at security gate for entry verification',
}) => {
  return (
    <QRCodeView
      value={code}
      size={size}
      caption={validityText}
    />
  );
};

export default VisitorQRCode;
