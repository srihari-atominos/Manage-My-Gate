import React from 'react';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { encodeAppBarcode, AppBarcodeType } from '@/src/utils/appBarcodeProtocol';

export interface VisitorQRCodeProps {
  code?: string;
  passId?: string;
  visitorName?: string;
  type?: AppBarcodeType | string;
  size?: number;
  validityText?: string;
}

/**
 * VisitorQRCode wraps the canonical @/components/ui QRCodeView for visitor pass verification.
 */
export const VisitorQRCode: React.FC<VisitorQRCodeProps> = ({
  code = '849201',
  passId,
  visitorName,
  type = 'GUEST',
  size = 190,
  validityText = 'Scan at security gate for entry verification',
}) => {
  const barcodePayload = encodeAppBarcode(type as AppBarcodeType, code, passId, visitorName);

  return (
    <QRCodeView
      value={barcodePayload}
      size={size}
      caption={validityText}
    />
  );
};
