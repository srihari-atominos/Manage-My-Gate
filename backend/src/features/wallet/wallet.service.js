import walletRepository from './wallet.repository.js';
import amenityBookingRepository from '../amenityBooking/amenityBooking.repository.js';
import { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_REFUNDED } from '../payment/payment.events.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CONFIRMED } from '../amenityBooking/amenityBooking.events.js';
import logger from '../../utils/logger.utils.js';

class WalletService {
  constructor() {
    this.registerListeners();
  }

  registerListeners() {
    // Listen for confirmed bookings (both manual and paid)
    amenityBookingEventEmitter.on(AMENITY_BOOKING_CONFIRMED, async ({ booking, paymentMethod, amount }) => {
      try {
        await this.createBookingTransaction(booking, 'Debit', amount || booking.totalPrice, paymentMethod, 'success');
        
        // Emit Socket Event after transaction creation
        const { getIO } = await import('../../config/socket.js');
        const io = getIO();
        if (io) {
          io.to(`user:${booking.userId}`).emit('paymentSuccess'); // Inform frontend that wallet is ready
          io.to(`user:${booking.userId}`).emit('bookingUpdated'); 
        }
      } catch (e) {
        logger.error('Error creating wallet transaction for confirmed booking', e);
      }
    });

    // Listen for refunds
    paymentEventEmitter.on(PAYMENT_REFUNDED, async (payment) => {
      if (payment.referenceType === 'AmenityBooking') {
        try {
          const booking = await amenityBookingRepository.findById(payment.referenceId, payment.orgId);
          if (booking) {
            await this.createBookingTransaction(booking, 'Credit', payment.amount, payment.paymentMethod, 'refunded');
            const { getIO } = await import('../../config/socket.js');
            const io = getIO();
            if (io) {
              io.to(`user:${booking.userId}`).emit('paymentRefunded');
              io.to(`user:${booking.userId}`).emit('bookingUpdated');
            }
          }
        } catch (e) {
          logger.error('Error creating wallet transaction for refund', e);
        }
      }
    });
  }

  async createBookingTransaction(booking, type, amount, paymentMethod, paymentStatus) {
    const amenityService = (await import('../amenity/amenity.services.js')).default;
    const amenity = await amenityService.getAmenityById(booking.amenityId, booking.orgId);

    const transactionData = {
      orgId: booking.orgId,
      userId: booking.userId,
      bookingId: booking.bookingId,
      type,
      amount,
      paymentMethod,
      paymentStatus,
      referenceType: 'AmenityBooking',
      referenceId: booking._id,
      amenityName: amenity ? amenity.name : 'Unknown Amenity',
      description: type === 'Debit' ? `Booking for ${amenity ? amenity.name : 'Amenity'}` : `Refund for ${amenity ? amenity.name : 'Amenity'}`
    };

    const transaction = await walletRepository.createTransaction(transactionData);

    if (paymentMethod === 'wallet' || type === 'Credit') {
      const delta = type === 'Debit' ? -amount : amount;
      await walletRepository.updateBalance(booking.userId, booking.orgId, delta);
    }

    return transaction;
  }

  async addMoney(userId, orgId, amount, paymentMethod) {
    const transactionData = {
      orgId,
      userId,
      type: 'Credit',
      amount,
      paymentMethod,
      paymentStatus: 'success',
      referenceType: 'Recharge',
      description: 'Wallet Recharge'
    };

    const transaction = await walletRepository.createTransaction(transactionData);
    await walletRepository.updateBalance(userId, orgId, amount);

    try {
      const { getIO } = await import('../../config/socket.js');
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('walletUpdated');
      }
    } catch (e) {
      logger.error('Error emitting wallet update', e);
    }

    return transaction;
  }

  async getWalletData(userId, orgId) {
    const wallet = await walletRepository.getWallet(userId, orgId);
    let transactions = await walletRepository.getTransactions(userId, orgId);
    
    // Cross-feature fetch for active passes
    const amenityServiceModule = await import('../amenityBooking/amenityBooking.services.js');
    const amenityBookingService = amenityServiceModule.default;
    
    const activeBookings = await amenityBookingService.getActivePasses(userId, orgId);
    
    // Format passes for the frontend
    const activePasses = activeBookings.map(b => ({
      _id: b._id,
      bookingId: b.bookingId,
      amenityName: b.amenityId?.name || 'Amenity',
      amenityImage: b.amenityId?.images?.[0] || 'https://via.placeholder.com/150',
      location: b.amenityId?.location || 'Community Center',
      residentName: b.userId?.name || 'Resident',
      date: b.bookingDate,
      startTime: b.startTime,
      endTime: b.endTime,
      qrPayload: b.qrCode,
      qrStatus: b.qrStatus,
      status: b.status,
      paymentStatus: b.paymentStatus
    }));

    const transactionHistory = transactions.map(t => t.toObject());

    return {
      balance: wallet.balance,
      activePasses,
      transactionHistory
    };
  }
}

export default new WalletService();
