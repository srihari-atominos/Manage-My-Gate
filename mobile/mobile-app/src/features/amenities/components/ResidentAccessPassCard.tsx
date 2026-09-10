/**
 * ResidentAccessPassCard Component - Phase 6C.3
 * Authoritative digital access pass presentation for residents.
 * Strictly adheres to security rules:
 * - NEVER uses internal verification hash as QR data.
 * - Zero local QR/HMAC/token generation.
 * - Server qrData used only when legitimately available.
 * - Suppresses QR on ACCESS_REVOKED, CHECKED_OUT, or revoked passes.
 * - Lifecycle-aware pass selection when multiple passes exist.
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  QrCode,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertCircle,
  DoorOpen,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QRCodeView } from '@/components/ui/QRCodeView';
import { AmenityReservation, AmenityAccessPass } from '../types/amenityDomain.types';
import { formatUtcToLocalDisplay } from '../utils/amenityStateHelpers';

export interface ResidentAccessPassCardProps {
  pass?: AmenityAccessPass | null;
  passes?: AmenityAccessPass[];
  reservation: AmenityReservation;
  loading?: boolean;
  className?: string;
  testID?: string;
}

/**
 * Selects the displayable pass using explicit lifecycle priority.
 * Prefers an active, non-revoked pass with presentable qrData.
 */
export function selectDisplayablePass(
  passes: AmenityAccessPass[] | undefined | null,
  reservation: AmenityReservation
): AmenityAccessPass | null {
  if (!passes || passes.length === 0) return null;

  // Filter passes belonging to this reservation
  const resPasses = passes.filter((p) => !p.reservationId || p.reservationId === reservation._id);
  if (resPasses.length === 0) return null;

  // 1. Priority: Non-revoked, not checked-out pass with valid qrData
  const activeQrPass = resPasses.find(
    (p) =>
      p.status !== 'REVOKED' &&
      !(p as any).isRevoked &&
      !p.checkedOutAt &&
      typeof p.qrData === 'string' &&
      p.qrData.trim().length > 0
  );
  if (activeQrPass) return activeQrPass;

  // 2. Priority: Active/valid pass without qrData (metadata-only)
  const activeMetadataPass = resPasses.find(
    (p) => p.status !== 'REVOKED' && !(p as any).isRevoked && !p.checkedOutAt
  );
  if (activeMetadataPass) return activeMetadataPass;

  // 3. Priority: Checked in pass
  const checkedInPass = resPasses.find((p) => p.checkedInAt && !p.checkedOutAt);
  if (checkedInPass) return checkedInPass;

  // 4. Priority: Terminal pass (revoked or checked-out, for status display)
  const terminalPass = resPasses.find(
    (p) => p.checkedOutAt || p.status === 'REVOKED' || (p as any).isRevoked
  );
  if (terminalPass) return terminalPass;

  return resPasses[0] || null;
}

/**
 * Predicate enforcing pass presentation security:
 * NEVER render a usable QR if access is revoked, checked out, revoked, or if qrData is absent.
 */
export function shouldRenderQrCode(
  pass: AmenityAccessPass | null,
  reservation: AmenityReservation
): boolean {
  if (!pass) return false;
  if (!pass.qrData || typeof pass.qrData !== 'string' || pass.qrData.trim().length === 0) {
    return false;
  }

  // Never render QR if access is revoked or pass is revoked
  if (reservation.accessStatus === 'ACCESS_REVOKED') return false;
  if (pass.status === 'REVOKED' || (pass as any).isRevoked) return false;

  // Never render QR if checked out
  if (reservation.accessStatus === 'CHECKED_OUT') return false;
  if (pass.checkedOutAt) return false;

  return true;
}

export function ResidentAccessPassCard({
  pass: directPass,
  passes,
  reservation,
  loading = false,
  className = '',
  testID = 'resident-access-pass-card',
}: ResidentAccessPassCardProps) {
  // Select authoritative displayable pass
  const activePass = useMemo(() => {
    if (directPass) return directPass;
    return selectDisplayablePass(passes, reservation);
  }, [directPass, passes, reservation]);

  const isRevoked =
    reservation.accessStatus === 'ACCESS_REVOKED' ||
    activePass?.status === 'REVOKED' ||
    Boolean((activePass as any)?.isRevoked);

  const isCheckedOut =
    reservation.accessStatus === 'CHECKED_OUT' || Boolean(activePass?.checkedOutAt);

  const isCheckedIn =
    reservation.accessStatus === 'CHECKED_IN' || Boolean(activePass?.checkedInAt && !isCheckedOut);

  const canRenderQr = shouldRenderQrCode(activePass, reservation);

  const formattedValidFrom = activePass?.validFrom
    ? formatUtcToLocalDisplay(activePass.validFrom, reservation.facilityTimezone).formatted
    : null;

  const formattedValidUntil = activePass?.validUntil
    ? formatUtcToLocalDisplay(activePass.validUntil, reservation.facilityTimezone).formatted
    : null;

  const formattedCheckIn = activePass?.checkedInAt
    ? formatUtcToLocalDisplay(activePass.checkedInAt, reservation.facilityTimezone).formatted
    : null;

  const formattedCheckOut = activePass?.checkedOutAt
    ? formatUtcToLocalDisplay(activePass.checkedOutAt, reservation.facilityTimezone).formatted
    : null;

  // State 1: Revoked Access
  if (isRevoked) {
    return (
      <View
        testID={testID}
        className={`items-center gap-3 rounded-3xl border border-destructive/40 bg-card p-5 ${className}`}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert size={26} className="text-destructive" />
        </View>
        <View className="items-center gap-1">
          <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
          <StatusBadge label="ACCESS_REVOKED" variant="danger" />
        </View>
        <Text variant="muted" className="max-w-xs text-center text-xs text-muted-foreground">
          Access Revoked. This digital pass is no longer valid for gate entry.
        </Text>
      </View>
    );
  }

  // State 2: Checked Out / Access Completed
  if (isCheckedOut) {
    return (
      <View
        testID={testID}
        className={`items-center gap-3 rounded-3xl border border-border bg-card p-5 ${className}`}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CheckCircle2 size={26} className="text-muted-foreground" />
        </View>
        <View className="items-center gap-1">
          <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
          <StatusBadge label="CHECKED_OUT" variant="neutral" />
        </View>
        <Text variant="muted" className="max-w-xs text-center text-xs text-muted-foreground">
          Access Completed. You have checked out of the facility.
          {formattedCheckOut ? ` (${formattedCheckOut})` : ''}
        </Text>
      </View>
    );
  }

  // State 3: Missing or No Pass Issued
  if (!activePass) {
    return (
      <View
        testID={testID}
        className={`items-center gap-3 rounded-3xl border border-border bg-card p-5 ${className}`}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Clock size={24} className="text-muted-foreground" />
        </View>
        <View className="items-center gap-1">
          <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
          <StatusBadge label={reservation.accessStatus || 'NOT_APPLICABLE'} variant="neutral" />
        </View>
        <Text variant="muted" className="max-w-xs text-center text-xs text-muted-foreground">
          {reservation.bookingStatus === 'PENDING_APPROVAL'
            ? 'Access pass will be generated upon reservation approval.'
            : reservation.accessStatus === 'NOT_APPLICABLE'
              ? 'No digital access pass is required for this facility.'
              : 'Access pass unavailable.'}
        </Text>
      </View>
    );
  }

  // State 4: Checked In Active State
  if (isCheckedIn) {
    return (
      <View
        testID={testID}
        className={`items-center gap-3 rounded-3xl border border-primary/30 bg-card p-5 ${className}`}>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <DoorOpen size={26} className="text-primary" />
        </View>
        <View className="items-center gap-1">
          <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
          <StatusBadge label="CHECKED_IN" variant="info" dot />
        </View>
        <Text variant="muted" className="max-w-xs text-center text-xs text-muted-foreground">
          Currently Checked In. Enjoy your session!
          {formattedCheckIn ? ` (Checked in at ${formattedCheckIn})` : ''}
        </Text>
        {canRenderQr ? (
          <View className="mt-2 items-center">
            <QRCodeView
              value={activePass.qrData}
              size={160}
              caption={activePass.passCode ? `Pass Code: ${activePass.passCode}` : undefined}
            />
          </View>
        ) : null}
      </View>
    );
  }

  // State 5: Active Pass Generated with legitimate server QR Credential
  if (canRenderQr) {
    return (
      <View
        testID={testID}
        className={`shadow-xs items-center gap-3 rounded-3xl border border-border bg-card p-5 ${className}`}>
        <View className="flex-row items-center gap-2">
          <QrCode size={18} className="text-primary" />
          <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
        </View>

        {/* Server-Provided QR Presentation Credential */}
        <QRCodeView
          value={activePass.qrData}
          size={180}
          caption={activePass.passCode ? `Pass Code: ${activePass.passCode}` : undefined}
        />

        <View className="mt-1 flex-row items-center gap-2">
          <StatusBadge
            label={
              reservation.accessStatus === 'PASS_GENERATED'
                ? 'PASS_GENERATED'
                : activePass.status || 'ACTIVE'
            }
            variant="success"
            dot
          />
        </View>

        {/* Server-Provided Validity Window */}
        <View className="mt-1 items-center gap-0.5">
          {formattedValidFrom && formattedValidUntil ? (
            <Text variant="muted" className="text-center text-xs text-muted-foreground">
              Valid: {formattedValidFrom} - {formattedValidUntil}
            </Text>
          ) : formattedValidUntil ? (
            <Text variant="muted" className="text-center text-xs text-muted-foreground">
              Valid until: {formattedValidUntil}
            </Text>
          ) : null}
          {(activePass as any).gateId ? (
            <Text variant="muted" className="text-center text-[11px] text-muted-foreground">
              Gate: {(activePass as any).gateId}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  // State 6: Pass exists in backend metadata, but no resident-presentable QR credential provided
  return (
    <View
      testID={testID}
      className={`items-center gap-3 rounded-3xl border border-border bg-card p-5 ${className}`}>
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <QrCode size={24} className="text-primary" />
      </View>
      <View className="items-center gap-1">
        <Text className="font-bold text-base text-foreground">Digital Access Pass</Text>
        <StatusBadge label="PASS_GENERATED" variant="success" />
      </View>

      <Text variant="muted" className="max-w-xs text-center text-xs text-muted-foreground">
        Digital QR presentation credential is not available for this pass. Please present your
        booking confirmation at the gate.
      </Text>

      {/* Legitimate server metadata presentation */}
      <View className="mt-1 w-full gap-1 rounded-2xl bg-secondary/50 p-3">
        {formattedValidFrom && formattedValidUntil ? (
          <Text variant="muted" className="text-xs text-foreground">
            Valid: {formattedValidFrom} - {formattedValidUntil}
          </Text>
        ) : null}
        {activePass.passType ? (
          <Text variant="muted" className="text-xs text-foreground">
            Type: {activePass.passType}
          </Text>
        ) : null}
        {(activePass as any).gateId ? (
          <Text variant="muted" className="text-xs text-foreground">
            Gate: {(activePass as any).gateId}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default ResidentAccessPassCard;
