/**
 * AmenityPassDetailsReference Tests
 * Validates adoption of the Visitor Management pass design into Amenities & Booking:
 * 1. buildAmenityPassShareMessage formatting
 * 2. ResidentReservationCard rendering the Pass Code button (matching VisitorPassCard)
 * 3. AmenityPassDetailsModal rendering keycode, WhatsApp CTA, and action buttons
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { buildAmenityPassShareMessage } from '@/src/utils/appBarcodeProtocol';
import { ResidentReservationCard } from '../components/ResidentReservationCard';
import { AmenityPassDetailsModal } from '../components/AmenityPassDetailsModal';
import { AmenityReservation } from '../types/amenityDomain.types';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedStyle: (fn: any) => (typeof fn === 'function' ? fn() : {}),
    useSharedValue: (val: any) => ({ value: val }),
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...args: any[]) => args[0],
    FadeIn: { duration: () => ({}) },
    FadeOut: { duration: () => ({}) },
  };
});

// Mock sharing utilities
jest.mock('@/src/utils/qrPngGenerator', () => ({
  shareQrImage: jest.fn(() => Promise.resolve(true)),
  generateUnicodeQr: jest.fn(() => '██████'),
}));

const mockReservation: AmenityReservation = {
  _id: '64a1b2c3d4e5f6a7b8c9d0e1',
  orgId: 'org-101',
  facilityId: 'fac-202',
  facilityName: 'Olympic Swimming Pool',
  reservationNumber: 'RES-849201',
  residentId: 'user-303',
  unitId: 'unit-404',
  bookingStatus: 'CONFIRMED',
  paymentStatus: 'PAID',
  approvalStatus: 'NOT_REQUIRED',
  accessStatus: 'PASS_GENERATED',
  completionStatus: 'PENDING',
  startDateTime: '2026-10-15T09:00:00.000Z',
  endDateTime: '2026-10-15T10:00:00.000Z',
  facilityTimezone: 'Asia/Kolkata',
  headcount: 2,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('Amenity Pass Details Reference Alignment (Visitor Pattern)', () => {
  describe('Protocol & Share Message Formatting', () => {
    it('builds canonical amenity pass share message with keycode, facility, and instructions', () => {
      const msg = buildAmenityPassShareMessage({
        passCode: '849201',
        facilityName: 'Olympic Swimming Pool',
        residentName: 'Jane Resident',
        date: '15 Oct 2026',
        timeWindow: '09:00 AM - 10:00 AM',
        location: 'Clubhouse West',
        destinationUnit: 'Villa 404',
        barcodePayload: 'MMG:AMENITY:mockToken123456',
      });

      expect(msg).toContain('AMENITY ACCESS PASS');
      expect(msg).toContain('*PASS CODE:* *849201*');
      expect(msg).toContain('*Facility:* Olympic Swimming Pool');
      expect(msg).toContain('*Passholder:* Jane Resident');
      expect(msg).toContain('*Unit / Villa:* Villa 404');
      expect(msg).toContain('*Date:* 15 Oct 2026');
      expect(msg).toContain('*Time Window:* 09:00 AM - 10:00 AM');
      expect(msg).toContain('QR PASS:');
      expect(msg).toContain('Please present this Pass Code (849201) or the QR code');
    });
  });

  describe('ResidentReservationCard Quick Pass Code Action', () => {
    it('renders Pass Code button when onShowQR is provided', async () => {
      const onShowQR = jest.fn();
      const onPress = jest.fn();

      await render(
        <ResidentReservationCard
          reservation={mockReservation}
          onPress={onPress}
          onShowQR={onShowQR}
        />
      );

      const passCodeBtn = screen.getByLabelText('View Pass Code for Olympic Swimming Pool');
      expect(passCodeBtn).toBeTruthy();

      // Pressing Pass Code invokes onShowQR and stops propagation
      fireEvent.press(passCodeBtn);
      expect(onShowQR).toHaveBeenCalledTimes(1);
      expect(onShowQR).toHaveBeenCalledWith(mockReservation);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not render Pass Code button if reservation is CANCELLED', async () => {
      const onShowQR = jest.fn();
      const cancelledRes = { ...mockReservation, bookingStatus: 'CANCELLED' as const };

      await render(
        <ResidentReservationCard
          reservation={cancelledRes}
          onShowQR={onShowQR}
        />
      );

      expect(screen.queryByLabelText('View Pass Code for Olympic Swimming Pool')).toBeNull();
    });
  });

  describe('AmenityPassDetailsModal Presentation', () => {
    it('renders the keycode header, WhatsApp CTA, action row, and status badge', async () => {
      const onClose = jest.fn();

      await render(
        <AmenityPassDetailsModal
          visible={true}
          reservation={mockReservation}
          onClose={onClose}
        />
      );

      // Top Keycode Header (matching Visitor Pass Details Modal)
      expect(screen.getByText('AMENITY PASSKEYCODE')).toBeTruthy();
      expect(screen.getAllByText('POOL-849201').length).toBeGreaterThanOrEqual(1);

      // WhatsApp Button
      expect(screen.getByText('Share Barcode & Pass to WhatsApp')).toBeTruthy();

      // Action Buttons
      expect(screen.getByText('Copy Code')).toBeTruthy();
      expect(screen.getByText('Share Pass')).toBeTruthy();
      expect(screen.getByText('Hide')).toBeTruthy();

      // Pass Status row
      expect(screen.getByText('Pass Status')).toBeTruthy();
      expect(screen.getByText(/confirmed/i)).toBeTruthy();

      // Details
      expect(screen.getByText('Olympic Swimming Pool')).toBeTruthy();
    });
  });
});
