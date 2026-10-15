import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { StaffMember, StaffQrData, staffService } from '../services/staffService';
import { ShieldCheck, QrCode, AlertCircle, RefreshCw } from 'lucide-react-native';
import { StaffAvatar } from './StaffAvatar';

export interface StaffQrPassModalProps {
  visible: boolean;
  onClose: () => void;
  staffMember: StaffMember;
}

export const StaffQrPassModal: React.FC<StaffQrPassModalProps> = ({
  visible,
  onClose,
  staffMember,
}) => {
  const [qrData, setQrData] = useState<StaffQrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffService.getMyQr();
      setQrData(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load your digital staff pass. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchQr();
    }
  }, [visible]);

  const barcodePayload =
    qrData?.barcodePayload ||
    `MMG:SERVICE:${staffMember.staffCode || staffMember._id}:${staffMember._id}:${(staffMember.name || 'Staff').replace(/\s+/g, '_')}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['75%']}>
      <View className="p-4 items-center">
        {/* Header Title */}
        <View className="flex-row items-center justify-center mb-1">
          <QrCode size={20} className="text-primary me-2" />
          <Text className="text-lg font-bold text-foreground">
            Staff Digital Pass
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground text-center mb-4">
          Present this official QR code at estate security gates for attendance
        </Text>

        {/* Loading / Error / QR State */}
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-xs text-muted-foreground mt-3">
              Generating secure attendance token...
            </Text>
          </View>
        ) : error ? (
          <View className="py-8 px-4 items-center">
            <AlertCircle size={36} className="text-destructive mb-2" />
            <Text className="text-sm font-semibold text-destructive text-center mb-2">
              Failed to Load Pass
            </Text>
            <Text className="text-xs text-muted-foreground text-center mb-4">
              {error}
            </Text>
            <Button variant="outline" size="sm" onPress={fetchQr}>
              <RefreshCw size={14} className="me-1" />
              <Text className="text-xs font-semibold">Retry</Text>
            </Button>
          </View>
        ) : (
          <View className="items-center w-full">
            {/* Visual QR Code Display */}
            <View className="p-4 rounded-3xl bg-white border border-border shadow-sm items-center justify-center mb-4">
              <QRCodeView
                value={barcodePayload}
                size={210}
                caption="Scan for Gate Check-In / Check-Out"
              />
            </View>

            {/* Staff Pass Details */}
            <View className="w-full rounded-2xl bg-muted/40 border border-border p-3.5 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 me-3">
                  <StaffAvatar name={staffMember.name} photoUrl={staffMember.photoUrl} size={42} />
                  <Text className="ms-2.5 text-sm font-bold text-foreground flex-1" numberOfLines={1}>
                    {staffMember.name}
                  </Text>
                </View>
                <StatusBadge
                  label={staffMember.status}
                  variant={staffMember.status === 'Active' ? 'success' : 'neutral'}
                  size="sm"
                />
              </View>

              <View className="flex-row items-center justify-between text-xs text-muted-foreground">
                <Text className="text-xs text-muted-foreground">
                  Department: <Text className="font-semibold text-foreground">{staffMember.department}</Text>
                </Text>
                {staffMember.staffCode ? (
                  <View className="flex-row items-center">
                    <ShieldCheck size={12} className="text-primary me-1" />
                    <Text className="text-xs font-bold text-primary">
                      {staffMember.staffCode}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Gate Instructions */}
            <View className="w-full p-3 rounded-xl bg-primary/5 border border-primary/20 mb-3">
              <Text className="text-xs text-primary leading-relaxed text-center">
                Security guards will record your entry and exit automatically. Multiple daily sessions are supported.
              </Text>
            </View>
          </View>
        )}

        <Button variant="outline" className="w-full mt-2" onPress={onClose}>
          <Text className="font-semibold">Done</Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default StaffQrPassModal;
