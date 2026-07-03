import { amenityBookingEventEmitter, AMENITY_BOOKING_CREATED, AMENITY_BOOKING_REVIEWED, AMENITY_BOOKING_CANCELLED, AMENITY_BOOKING_CHECKED_IN, AMENITY_BOOKING_COMPLETED } from './amenityBooking.events.js';
import { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_REFUNDED } from '../payment/payment.events.js';
import amenityBookingRepository from './amenityBooking.repository.js';
import notificationService from '../notification/notification.service.js';
import logger from '../../utils/logger.utils.js';
import QRCode from 'qrcode';

const logBookingEvent = async (action, eventData) => {
  try {
    const targetId = eventData._id;
    const actorId = eventData.userId;
    logger.info(`Audit Log: ${action} logged for booking ${targetId} by user ${actorId}`);
  } catch (error) {
    logger.error(`Failed to write audit log for ${action} event: `, error);
  }
};

const sendBookingNotification = async (booking, type, title, message) => {
  try {
    await notificationService.createNotification({
      recipientId: booking.userId,
      title: title,
      body: message,
      type: type === 'alert' ? 'WARNING' : type === 'info' ? 'INFO' : 'SUCCESS',
      actionUrl: `#/resident/amenities/my-bookings`,
      senderId: null // System notification
    });
  } catch (error) {
    logger.error('Failed to send booking notification: ', error);
  }
};

// Listen to standard amenity booking events
amenityBookingEventEmitter.on(AMENITY_BOOKING_CREATED, async (booking) => {
  logBookingEvent('AMENITY_BOOKING_CREATED', booking);
  if (booking.status === 'confirmed') {
    // Generate QR if it bypassed payment
    try {
      const qrData = JSON.stringify({ bookingId: booking._id, userId: booking.userId, amenityId: booking.amenityId });
      const qrCodeUrl = await QRCode.toDataURL(qrData);
      await amenityBookingRepository.updateStatus(booking._id, booking.orgId, 'confirmed', { qrCode: qrCodeUrl });
      await sendBookingNotification(booking, 'alert', 'Booking Confirmed', 'Your amenity booking is confirmed!');
    } catch (e) {
      logger.error('Failed to generate QR for auto-confirmed booking', e);
    }
  } else if (booking.paymentStatus === 'pending') {
    await sendBookingNotification(booking, 'info', 'Payment Required', 'Please complete the payment to confirm your booking.');
  } else {
    await sendBookingNotification(booking, 'info', 'Booking Created', 'Your booking is pending approval.');
  }
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_REVIEWED, async (booking) => {
  logBookingEvent('AMENITY_BOOKING_REVIEWED', booking);
  if (booking.status === 'approved') {
    await sendBookingNotification(booking, 'alert', 'Booking Approved', 'Your booking was approved. Proceed to payment if required.');
  } else if (booking.status === 'rejected') {
    await sendBookingNotification(booking, 'alert', 'Booking Rejected', `Your booking was rejected. Reason: ${booking.rejectionReason}`);
  }
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_CANCELLED, async (booking) => {
  logBookingEvent('AMENITY_BOOKING_CANCELLED', booking);
  await sendBookingNotification(booking, 'alert', 'Booking Cancelled', 'Your booking has been cancelled successfully.');
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_CHECKED_IN, async (booking) => {
  logBookingEvent('AMENITY_BOOKING_CHECKED_IN', booking);
});

amenityBookingEventEmitter.on(AMENITY_BOOKING_COMPLETED, async (booking) => {
  logBookingEvent('AMENITY_BOOKING_COMPLETED', booking);
});


// ---------------------------------------------------------
// Listen to Payment Events (The async payment flow)
// ---------------------------------------------------------

paymentEventEmitter.on(PAYMENT_SUCCESS, async (payment) => {
  if (payment.referenceType !== 'AmenityBooking') return;

  try {
    const booking = await amenityBookingRepository.findById(payment.referenceId, payment.orgId);
    if (booking) {
      // 1. Generate QR Code
      const qrData = JSON.stringify({ bookingId: booking._id, userId: booking.userId, amenityId: booking.amenityId });
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      // 2. Update booking status
      await amenityBookingRepository.updateStatus(booking._id, booking.orgId, 'confirmed', {
        paymentStatus: 'success',
        qrCode: qrCodeUrl,
        qrStatus: 'active'
      });

      // 3. Send Notification
      await sendBookingNotification(booking, 'alert', 'Payment Successful', 'Your booking is now confirmed. View your QR code in your bookings.');
      logger.info(`Successfully processed payment and confirmed booking ${booking._id}`);
    }
  } catch (err) {
    logger.error('Failed to handle PAYMENT_SUCCESS for amenity booking', err);
  }
});

paymentEventEmitter.on(PAYMENT_FAILED, async (payment) => {
  if (payment.referenceType !== 'AmenityBooking') return;

  try {
    const booking = await amenityBookingRepository.findById(payment.referenceId, payment.orgId);
    if (booking) {
      await amenityBookingRepository.updateStatus(booking._id, booking.orgId, 'cancelled', {
        paymentStatus: 'failed'
      });
      await sendBookingNotification(booking, 'alert', 'Payment Failed', 'Your booking was cancelled because the payment failed.');
      logger.info(`Cancelled booking ${booking._id} due to payment failure`);
    }
  } catch (err) {
    logger.error('Failed to handle PAYMENT_FAILED for amenity booking', err);
  }
});

paymentEventEmitter.on(PAYMENT_REFUNDED, async (payment) => {
  if (payment.referenceType !== 'AmenityBooking') return;

  try {
    const booking = await amenityBookingRepository.findById(payment.referenceId, payment.orgId);
    if (booking) {
      await sendBookingNotification(booking, 'info', 'Refund Processed', 'Your refund for the cancelled booking has been processed.');
    }
  } catch (err) {
    logger.error('Failed to handle PAYMENT_REFUNDED for amenity booking', err);
  }
});
