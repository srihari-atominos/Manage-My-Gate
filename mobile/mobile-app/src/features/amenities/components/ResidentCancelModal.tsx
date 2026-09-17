/**
 * ResidentCancelModal Component
 * Reusable modal for confirming reservation cancellation.
 * Wraps global ConfirmationModal and captures optional cancellation reason.
 */

import React, { useState } from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { AmenityReservation } from '../types/amenityDomain.types';

export interface ResidentCancelModalProps {
  reservation: AmenityReservation | null;
  visible: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
  loading?: boolean;
  initialReason?: string;
  testID?: string;
}

export function ResidentCancelModal({
  reservation,
  visible,
  onConfirm,
  onClose,
  loading = false,
  initialReason = '',
}: ResidentCancelModalProps) {
  const [reason, setReason] = useState<string>(initialReason);

  if (!reservation) return null;

  const facilityName = reservation.facilityName || 'Amenity Facility';
  const resNumber = reservation.reservationNumber ? ` (${reservation.reservationNumber})` : '';

  const handleConfirm = () => {
    if (loading) return;
    onConfirm(reason.trim() || undefined);
  };

  const handleCancel = () => {
    if (loading) return;
    setReason(initialReason);
    onClose();
  };

  return (
    <ConfirmationModal
      visible={visible}
      title="Cancel Reservation"
      message={`Are you sure you want to cancel your reservation for ${facilityName}${resNumber}? This action will release your reserved slot and revoke any active digital access passes. If payment was completed, an automated refund will be scheduled.`}
      confirmLabel="Yes, Cancel Booking"
      cancelLabel="Keep Reservation"
      variant="danger"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}

export default ResidentCancelModal;
