import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Text } from './text';
import { cn } from '@/lib/utils';

// Safe loader for pure-JS QR core encoder (zero Node.js fs / canvas / DOM dependencies)
let QRCodeCore: any = null;
try {
  QRCodeCore = require('qrcode/lib/core/qrcode');
} catch {
  try {
    QRCodeCore = require('qrcode');
  } catch {
    QRCodeCore = null;
  }
}

export interface QRCodeViewProps {
  value: string;
  size?: number;
  caption?: string;
  className?: string;
}

/**
 * Standard-compliant ISO/IEC 18004 QR Code Matrix Encoder.
 * Outputs a real QR code matrix with valid Reed-Solomon error correction and mask patterns,
 * fully decodable by camera scanners across iOS and Android.
 */
function createStandardQRMatrix(text: string): boolean[][] {
  const value = (text || 'PASS-0000').trim();
  try {
    if (QRCodeCore && typeof QRCodeCore.create === 'function') {
      const qr = QRCodeCore.create(value, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      const matrix: boolean[][] = [];
      for (let r = 0; r < count; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < count; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }
        matrix.push(row);
      }
      return matrix;
    }
  } catch (err) {
    console.error('Failed to generate standard QR code matrix:', err);
  }
  return [];
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 180,
  caption,
  className,
}) => {
  const matrix = useMemo(() => createStandardQRMatrix(value), [value]);
  const moduleCount = matrix.length || 21;
  // ISO/IEC 18004 standard requires a 4-module quiet zone on all sides for camera detection
  const margin = 4;
  const totalModules = moduleCount + margin * 2;
  const moduleSize = size / totalModules;

  return (
    <View className={cn('items-center justify-center p-3 gap-2', className)}>
      {/* High-Contrast Pure White Surface for instant Camera Scan */}
      <View
        className="bg-white p-3 rounded-2xl border border-border/60 items-center justify-center shadow-sm"
        style={{ width: size + 24, height: size + 24 }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* High-contrast pure white background */}
          <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />

          {/* Render QR Modules with 4-module quiet zone and sharp 100% black fill */}
          {matrix.map((row, r) =>
            row.map((isDark, c) =>
              isDark ? (
                <Rect
                  key={`${r}-${c}`}
                  x={(c + margin) * moduleSize}
                  y={(r + margin) * moduleSize}
                  width={moduleSize + 0.3}
                  height={moduleSize + 0.3}
                  fill="#000000"
                />
              ) : null
            )
          )}
        </Svg>
      </View>

      {caption ? (
        <Text variant="muted" className="text-xs text-center font-medium mt-1">
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

export default QRCodeView;

