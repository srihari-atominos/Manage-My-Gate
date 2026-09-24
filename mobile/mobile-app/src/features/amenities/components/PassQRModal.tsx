import React from 'react';
import { AmenityBooking } from '../store/amenityBookingSlice';
import { AmenityPassDetailsModal } from './AmenityPassDetailsModal';

export interface PassQRModalProps {
  visible: boolean;
  onClose: () => void;
  booking: AmenityBooking | null;
}

/**
 * PassQRModal Component (Forwarding wrapper to AmenityPassDetailsModal)
 * Preserves legacy component signature while providing the modernized
 * Visitor-Management-style Pass Details experience with WhatsApp sharing,
 * keycode card, and action controls.
 */
export function PassQRModal({ visible, onClose, booking }: PassQRModalProps) {
  return (
    <AmenityPassDetailsModal
      visible={visible}
      onClose={onClose}
      booking={booking}
    />
  );
}

export default PassQRModal;
