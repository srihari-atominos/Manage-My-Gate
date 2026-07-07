import { amenityBookingEventEmitter, AMENITY_BOOKING_CHECKED_IN, AMENITY_BOOKING_COMPLETED, AMENITY_BOOKING_CANCELLED, AMENITY_BOOKING_DENIED, QR_EXPIRED } from '../amenityBooking/amenityBooking.events.js';
import securityLogService from './securityLog.services.js';
import { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_REFUNDED } from '../payment/payment.events.js';

amenityBookingEventEmitter.on(AMENITY_BOOKING_CHECKED_IN, async (booking) => {
  try {
    await securityLogService.createLog({
      booking,
      orgId: booking.orgId,
      scanType: 'Entry',
      status: 'Success',
      reason: 'Valid QR Code',
      remarks: 'Access Granted'
    });
  } catch (error) {
    console.error('Error creating Entry security log:', error);
  }
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_COMPLETED, async (booking) => {
  try {
    await securityLogService.createLog({
      booking,
      orgId: booking.orgId,
      scanType: 'Exit',
      status: 'Success',
      reason: 'Valid QR Code',
      remarks: 'Exit Recorded'
    });
  } catch (error) {
    console.error('Error creating Exit security log:', error);
  }
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_DENIED, async (data) => {
  try {
    await securityLogService.createLog({
      booking: data.booking, // Might be undefined if QR is totally invalid
      orgId: data.orgId,
      guardId: data.userId, // The guard who scanned it
      scanType: 'Denied',
      status: 'Denied',
      reason: data.reason,
      remarks: data.booking ? `Denied for booking ${data.bookingId}` : `Denied invalid QR: ${data.bookingId}`
    });
  } catch (error) {
    console.error('Error creating Denied security log:', error);
  }
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_CANCELLED, async (booking) => {
  try {
    await securityLogService.createLog({
      booking,
      orgId: booking.orgId,
      scanType: 'Booking Cancelled',
      status: 'Success',
      reason: 'User or Admin Cancelled',
      remarks: 'Booking was cancelled'
    });
  } catch (error) {
    console.error('Error creating Cancelled security log:', error);
  }
});

amenityBookingEventEmitter.on(QR_EXPIRED, async (booking) => {
  try {
    await securityLogService.createLog({
      booking,
      orgId: booking.orgId,
      scanType: 'QR Expired',
      status: 'Denied',
      reason: 'System Auto Expired',
      remarks: 'QR Code reached expiration time'
    });
  } catch (error) {
    console.error('Error creating QR Expired security log:', error);
  }
});

// Assuming payment events
if (paymentEventEmitter) {
  if (PAYMENT_SUCCESS) {
    paymentEventEmitter.on(PAYMENT_SUCCESS, async (data) => {
      try {
        if (data.paymentFor === 'amenity_booking' || data.type === 'amenity_booking') {
          await securityLogService.createLog({
            booking: data.booking,
            orgId: data.orgId,
            scanType: 'Entry', // or 'Payment' but user specified limited types. Let's say 'Manual Verification' or standard.
            status: 'Success',
            reason: 'Payment Completed',
            remarks: `Amount: ${data.amount}`
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
  
  if (PAYMENT_REFUNDED) {
    paymentEventEmitter.on(PAYMENT_REFUNDED, async (data) => {
      try {
        if (data.paymentFor === 'amenity_booking' || data.type === 'amenity_booking') {
          await securityLogService.createLog({
            booking: data.booking,
            orgId: data.orgId,
            scanType: 'Refund',
            status: 'Success',
            reason: 'Booking Cancelled / Refunded',
            remarks: `Refunded: ${data.amount}`
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  }
}
