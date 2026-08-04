import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, Share } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { VisitorPassCode } from '../shared/VisitorPassCode';
import { VisitorQRCode } from '../shared/VisitorQRCode';
import { ExtendedVisitorPass } from '../../mocks/visitorMocks';
import { useVisitorPass } from '../../hooks/useVisitorPass';
import { X, ShieldAlert, Share2, QrCode } from 'lucide-react-native';

export interface VisitorLogDetailsModalProps {
  visible: boolean;
  pass: ExtendedVisitorPass | null;
  onClose: () => void;
}

export const VisitorLogDetailsModal: React.FC<VisitorLogDetailsModalProps> = ({
  visible,
  pass,
  onClose,
}) => {
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [submittingRevoke, setSubmittingRevoke] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const { revokePass, actionStatus } = useVisitorPass();

  if (!pass) return null;

  const rawPass = pass.rawPass || {};
  const passType = pass.passType || 'GUEST';
  const shortKey = pass.code || rawPass.shortKey || rawPass.code;

  const canRevoke = pass.status === 'PENDING' || pass.status === 'ACTIVE';

  const statusVariant =
    pass.status === 'ACTIVE'
      ? 'success'
      : pass.status === 'PENDING'
      ? 'warning'
      : pass.status === 'REVOKED'
      ? 'danger'
      : 'neutral';

  const usageText = rawPass.usageLimit
    ? `${rawPass.usageLimit.currentUses || 0} / ${rawPass.usageLimit.maxUses || 1} Uses`
    : null;

  const handleSharePass = async () => {
    if (!shortKey) return;
    const shareMessage =
      `*Manage-My-Gate Visitor Pass*\n\n` +
      `Visitor Name: ${pass.visitorName || 'Guest'}\n` +
      `Pass Category: ${passType}\n` +
      `Entry Pass Code: ${shortKey}\n` +
      `Valid Until: ${pass.validUntil ? new Date(pass.validUntil).toLocaleString() : 'Today'}\n\n` +
      `Please show this 6-digit passcode or QR code at the security gate for entry.`;

    try {
      await Share.share({
        title: 'Visitor Entry Pass',
        message: shareMessage,
      });
    } catch (err) {
      console.log('Error sharing pass', err);
    }
  };

  const handleConfirmRevoke = async () => {
    if (submittingRevoke || actionStatus === 'loading') return;
    setSubmittingRevoke(true);
    setRevokeError(null);

    const targetId = pass._id || (pass as any).id || rawPass._id;
    try {
      const resultAction = await revokePass(targetId);
      if (resultAction && (resultAction as any).meta?.requestStatus === 'rejected') {
        setRevokeError((resultAction as any).payload || 'Failed to revoke visitor pass');
      } else {
        setRevokeConfirmOpen(false);
      }
    } catch (err: any) {
      setRevokeError(err.message || 'Failed to revoke visitor pass');
    } finally {
      setSubmittingRevoke(false);
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title="Visitor Pass Details">
        <ScrollView className="max-h-[520px] p-2">
          <View className="gap-4 pb-6">
            {/* Status Header */}
            <View className="flex-row items-center justify-between bg-card border border-border p-3.5 rounded-2xl">
              <View className="gap-1">
                <StatusBadge label={pass.status} variant={statusVariant} dot />
                <View className="mt-0.5">
                  <StatusBadge label={passType} variant="info" />
                </View>
              </View>
              {shortKey ? <VisitorPassCode code={shortKey} /> : null}
            </View>

            {/* Share Pass & QR Code Action Bar */}
            <View className="flex-row gap-2">
              <Button
                variant="default"
                onPress={handleSharePass}
                className="flex-1 h-11 rounded-xl bg-primary flex-row items-center justify-center gap-2"
              >
                <Share2 size={16} color="#fff" />
                <Text className="font-bold text-primary-foreground text-xs">
                  Share Pass & Code
                </Text>
              </Button>

              <Button
                variant="outline"
                onPress={() => setShowQR(!showQR)}
                className="h-11 px-3.5 rounded-xl flex-row items-center justify-center gap-1.5"
              >
                <QrCode size={16} className="text-foreground" />
                <Text className="font-bold text-foreground text-xs">
                  {showQR ? 'Hide QR' : 'Show QR'}
                </Text>
              </Button>
            </View>

            {/* QR Code Presentation */}
            {showQR && (
              <VisitorQRCode
                code={shortKey || '849201'}
                validityText={`Valid for ${pass.visitorName || 'Guest'}`}
              />
            )}

            {/* Error Banner */}
            {revokeError && (
              <View className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex-row items-center gap-2">
                <ShieldAlert size={16} className="text-destructive" />
                <Text className="text-xs text-destructive flex-1 font-medium">{revokeError}</Text>
              </View>
            )}

            {/* Primary Visitor Info */}
            <DetailSection title="Visitor Details" iconName="User">
              <DetailRow label="Visitor / Event" value={pass.visitorName} iconName="User" />
              <DetailRow
                label="Phone Number"
                value={pass.phone || 'Not Provided'}
                iconName="Phone"
                copyable={Boolean(pass.phone)}
              />
              {pass.purpose ? (
                <DetailRow label="Purpose of Visit" value={pass.purpose} iconName="Tag" />
              ) : null}
              {rawPass.visitorDetails?.idProofType ? (
                <DetailRow
                  label="ID Proof Type"
                  value={rawPass.visitorDetails.idProofType}
                  iconName="ShieldCheck"
                />
              ) : null}
              {rawPass.visitorDetails?.idProofNumber ? (
                <DetailRow
                  label="ID Proof Number"
                  value={rawPass.visitorDetails.idProofNumber}
                  iconName="FileText"
                  copyable
                  isLast={!pass.vehicleNo && !pass.provider}
                />
              ) : null}
            </DetailSection>

            {/* Group Pass Details */}
            {passType === 'GROUP' && (
              <DetailSection title="Group Guest List" iconName="Users">
                <DetailRow
                  label="Total Guests"
                  value={`${pass.guestCount || pass.guestList?.length || 0} Guests`}
                  iconName="Users"
                />
                {Array.isArray(pass.guestList) && pass.guestList.length > 0 ? (
                  <View className="p-3 bg-muted/30 rounded-xl gap-2 mt-1">
                    {pass.guestList.map((guest, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center justify-between py-1 border-b border-border/50 last:border-b-0"
                      >
                        <Text className="text-xs font-medium text-foreground">
                          {idx + 1}. {guest.name}
                        </Text>
                        {guest.phone ? (
                          <Text className="text-xs text-muted-foreground">{guest.phone}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </DetailSection>
            )}

            {/* Cab Pass Details */}
            {passType === 'CAB' && (
              <DetailSection title="Cab & Driver Details" iconName="Car">
                {pass.provider ? (
                  <DetailRow label="Cab Provider" value={pass.provider} iconName="Car" />
                ) : null}
                {pass.vehicleNo ? (
                  <DetailRow
                    label="Vehicle Plate No"
                    value={pass.vehicleNo}
                    iconName="FileText"
                    copyable
                  />
                ) : null}
                {rawPass.vehicleDetails?.vehicleType ? (
                  <DetailRow
                    label="Vehicle Type"
                    value={rawPass.vehicleDetails.vehicleType}
                    iconName="Car"
                    isLast
                  />
                ) : null}
              </DetailSection>
            )}

            {/* Delivery Pass Details */}
            {passType === 'DELIVERY' && (
              <DetailSection title="Delivery Details" iconName="Package">
                {pass.provider ? (
                  <DetailRow label="Delivery Partner" value={pass.provider} iconName="Package" />
                ) : null}
                {pass.orderId ? (
                  <DetailRow label="Order ID" value={pass.orderId} iconName="Tag" copyable />
                ) : null}
                {pass.packageCount ? (
                  <DetailRow
                    label="Package Count"
                    value={`${pass.packageCount} Package(s)`}
                    iconName="Box"
                  />
                ) : null}
                {pass.deliveryAction ? (
                  <DetailRow label="Delivery Action" value={pass.deliveryAction} iconName="Truck" />
                ) : null}
                {pass.deliveryInstructions ? (
                  <DetailRow
                    label="Instructions"
                    value={pass.deliveryInstructions}
                    iconName="FileText"
                    isLast
                  />
                ) : null}
              </DetailSection>
            )}

            {/* Service Pass Details */}
            {passType === 'SERVICE' && (
              <DetailSection title="Service & Schedule Details" iconName="Wrench">
                {pass.provider ? (
                  <DetailRow label="Service Category" value={pass.provider} iconName="Wrench" />
                ) : null}
                {pass.serviceNotes ? (
                  <DetailRow label="Service Notes" value={pass.serviceNotes} iconName="FileText" />
                ) : null}
                {Array.isArray(pass.allowedWeekdays) && pass.allowedWeekdays.length > 0 ? (
                  <DetailRow
                    label="Allowed Days"
                    value={pass.allowedWeekdays.join(', ')}
                    iconName="Calendar"
                  />
                ) : null}
                {pass.timeWindow ? (
                  <DetailRow
                    label="Daily Time Window"
                    value={`${pass.timeWindow.startTime} - ${pass.timeWindow.endTime}`}
                    iconName="Clock"
                    isLast
                  />
                ) : null}
              </DetailSection>
            )}

            {/* Validity & Usage Limits */}
            <DetailSection title="Pass Validity & Rules" iconName="Clock">
              <DetailRow
                label="Valid From"
                value={pass.validFrom ? new Date(pass.validFrom).toLocaleString() : 'Immediate'}
                iconName="Calendar"
              />
              <DetailRow
                label="Valid Until"
                value={pass.validUntil ? new Date(pass.validUntil).toLocaleString() : 'End of Day'}
                iconName="Calendar"
              />
              {usageText ? (
                <DetailRow label="Usage Counter" value={usageText} iconName="Repeat" isLast />
              ) : null}
            </DetailSection>

            {/* Revoke Action Button */}
            {canRevoke && (
              <View className="pt-2 border-t border-border mt-2">
                <Button
                  variant="destructive"
                  disabled={submittingRevoke || actionStatus === 'loading'}
                  onPress={() => setRevokeConfirmOpen(true)}
                  className="h-12 rounded-xl flex-row items-center justify-center gap-2"
                >
                  {submittingRevoke ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <X size={18} color="#fff" />
                      <Text className="font-bold text-destructive-foreground text-base">
                        Revoke Pass
                      </Text>
                    </>
                  )}
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Revocation Confirmation Modal */}
      <ConfirmationModal
        visible={revokeConfirmOpen}
        title="Revoke Visitor Pass?"
        message={`Are you sure you want to revoke this pass for ${
          pass.visitorName || 'this visitor'
        }? The 6-digit key and QR code will be invalidated immediately.`}
        variant="danger"
        confirmLabel="Revoke Pass"
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeConfirmOpen(false)}
      />
    </>
  );
};

export default VisitorLogDetailsModal;
