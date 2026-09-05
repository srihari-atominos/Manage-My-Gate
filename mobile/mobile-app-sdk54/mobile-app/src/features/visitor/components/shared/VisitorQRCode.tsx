import React, { useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { ShieldCheck } from 'lucide-react-native';
import { encodeAppBarcode, AppBarcodeType, PASS_TYPE_META } from '@/src/utils/appBarcodeProtocol';

export interface VisitorQRCodeProps {
  code?: string;
  passId?: string;
  visitorName?: string;
  type?: AppBarcodeType | string;
  size?: number;
  validityText?: string;
}

export const VisitorQRCode: React.FC<VisitorQRCodeProps> = ({
  code = '849201',
  passId,
  visitorName,
  type = 'GUEST',
  size = 190,
  validityText = 'Scan at security gate for entry verification',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const meta = PASS_TYPE_META[type.toString().toUpperCase()] || PASS_TYPE_META.GUEST;

  // Encode with Manage-My-Gate official barcode protocol: MMG:{TYPE}:{CODE}[:{ID}][:{NAME}]
  const barcodePayload = encodeAppBarcode(type, code, passId, visitorName);
  const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    barcodePayload
  )}`;

  return (
    <View className="items-center justify-center p-4 bg-card rounded-2xl border border-border gap-3">
      {/* Dynamic QR Frame */}
      <View
        className="bg-white p-3 rounded-2xl border border-border items-center justify-center shadow-md relative"
        style={{ width: size + 24, height: size + 24 }}
      >
        {!imageError ? (
          <>
            {imageLoading && (
              <View className="absolute inset-0 items-center justify-center bg-white z-10 rounded-2xl">
                <ActivityIndicator size="small" color="#0284c7" />
              </View>
            )}
            <Image
              source={{ uri: qrUri }}
              style={{ width: size, height: size }}
              resizeMode="contain"
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <View className="items-center justify-center p-4" style={{ width: size, height: size }}>
            <ShieldCheck size={40} className="text-primary mb-2" />
            <Text className="text-xs font-bold text-foreground text-center">
              MMG Pass Code:
            </Text>
            <Text className="text-lg font-extrabold text-primary font-mono tracking-widest mt-1">
              {code}
            </Text>
          </View>
        )}
      </View>

      {/* Official MMG Pass Verification Tag */}
      <View className="flex-row items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
        <ShieldCheck size={13} className="text-primary" />
        <Text className="text-[10px] font-bold text-primary tracking-wider uppercase">
          MMG {meta.label} • {code}
        </Text>
      </View>

      <Text variant="muted" className="text-xs text-center font-medium">
        {validityText}
      </Text>
    </View>
  );
};

export default VisitorQRCode;
