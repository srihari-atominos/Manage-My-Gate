import mongoose from 'mongoose';
import walletRepository from './wallet.repository.js';
import { walletEventEmitter, WALLET_UPDATED, WALLET_TRANSACTION_CREATED } from './wallet.events.js';
import { paymentEventEmitter, PAYMENT_SUCCESS, PAYMENT_REFUNDED } from '../payment/payment.events.js';
import { amenityBookingEventEmitter, AMENITY_BOOKING_CONFIRMED } from '../amenityBooking/amenityBooking.events.js';
import invoiceService from '../invoice/invoice.services.js';
import paymentService from '../payment/payment.service.js';
import HttpError from '../../utils/httpError.utils.js';
import logger from '../../utils/logger.utils.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

class WalletService {
  constructor() {
    this.registerListeners();
  }

  registerListeners() {
    // Listen for confirmed bookings (both manual and paid)
    amenityBookingEventEmitter.on(AMENITY_BOOKING_CONFIRMED, async ({ booking, paymentMethod, amount }) => {
      try {
        await this.createBookingTransaction(booking, 'Debit', amount || booking.totalPrice, paymentMethod, 'success');
        walletEventEmitter.emit(WALLET_UPDATED, { userId: booking.userId, orgId: booking.orgId });
      } catch (e) {
        logger.error('Error creating wallet transaction for confirmed booking', e);
      }
    });

    // Listen for refunds
    paymentEventEmitter.on(PAYMENT_REFUNDED, async (payment) => {
      if (payment.referenceType === 'AmenityBooking') {
        try {
          const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
          const booking = await amenityBookingService.getBookingById(payment.referenceId, payment.orgId);
          if (booking) {
            await this.createBookingTransaction(booking, 'Credit', payment.amount, payment.paymentMethod, 'refunded');
            walletEventEmitter.emit(WALLET_UPDATED, { userId: booking.userId, orgId: booking.orgId });
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

    walletEventEmitter.emit(WALLET_TRANSACTION_CREATED, transaction);
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
    const updatedWallet = await walletRepository.updateBalance(userId, orgId, amount);

    walletEventEmitter.emit(WALLET_TRANSACTION_CREATED, transaction);
    walletEventEmitter.emit(WALLET_UPDATED, { userId, orgId, balance: updatedWallet.balance });

    return transaction;
  }

  /**
   * Pay open invoice dues using user's digital wallet balance within a Mongoose Transaction.
   */
  async payInvoiceWithWallet({ userId, orgId, invoiceId, amount }) {
    if (!userId || !invoiceId) {
      throw new HttpError(400, 'User ID and Invoice ID are required');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch invoice inside session via invoiceService (no direct model query)
      const invoice = await invoiceService.getInvoiceById(invoiceId, session);

      if (invoice.targetUserId.toString() !== userId.toString()) {
        throw new HttpError(403, 'Unauthorized. Invoice does not belong to this user.');
      }

      if (invoice.status === 'PAID') {
        throw new HttpError(400, 'Invoice is already paid');
      }

      const amountDue = amount || invoice.outstandingAmount || invoice.totalDue;
      const targetOrgId = orgId || invoice.communityId;

      if (amountDue <= 0) {
        throw new HttpError(400, 'Invalid payment amount');
      }

      if (amountDue > (invoice.outstandingAmount || invoice.totalDue)) {
        throw new HttpError(400, 'Payment amount cannot exceed the outstanding balance');
      }

      // 2. Fetch wallet and verify balance
      const wallet = await walletRepository.getWallet(userId, targetOrgId, session);
      if (!wallet || wallet.balance < amountDue) {
        throw new HttpError(400, `Insufficient wallet balance. Total due is ₹${amountDue}, but current wallet balance is ₹${wallet ? wallet.balance : 0}.`);
      }

      // 3. Deduct balance from wallet
      const updatedWallet = await walletRepository.updateBalance(userId, targetOrgId, -amountDue, session);

      // 4. Create wallet debit transaction
      const walletTxn = await walletRepository.createTransaction({
        orgId: targetOrgId,
        userId,
        type: 'Debit',
        amount: amountDue,
        paymentMethod: 'WALLET',
        paymentStatus: 'success',
        referenceType: 'Invoice',
        referenceId: invoice._id,
        description: `Payment for Invoice #${invoice.invoiceNumber}`
      }, session);

      // 5. Settle Invoice using InvoiceService (passing session)
      const updatedInvoice = await invoiceService.settleInvoicePayment(invoiceId, {
        paymentMethod: 'WALLET',
        amount: amountDue,
        paid_at: new Date(),
        settled_at: new Date(),
      }, session);

      // 6. Record Payment entry for auditing via paymentService (no direct repository call)
      const paymentRecord = await paymentService.recordPayment({
        orgId: targetOrgId,
        userId,
        referenceId: invoice._id,
        referenceType: 'Invoice',
        amount: amountDue,
        currency: 'INR',
        status: 'success',
        gateway: 'mock',
        paymentMethod: 'WALLET',
        gatewayTransactionId: walletTxn.transactionId
      }, session);

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Emit decoupled Node events
      paymentEventEmitter.emit(PAYMENT_SUCCESS, paymentRecord);
      walletEventEmitter.emit(WALLET_UPDATED, { userId, orgId: targetOrgId, balance: updatedWallet.balance });
      walletEventEmitter.emit(WALLET_TRANSACTION_CREATED, walletTxn);

      return {
        success: true,
        message: 'Invoice paid successfully using digital wallet balance',
        payment: paymentRecord,
        invoice: updatedInvoice,
        walletBalance: updatedWallet.balance
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      logger.error('Error settling invoice via wallet:', error);
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, `Wallet invoice settlement failed: ${error.message}`);
    }
  }

  async getWalletData(userId, orgId) {
    const wallet = await walletRepository.getWallet(userId, orgId);
    let transactions = await walletRepository.getTransactions(userId, orgId);
    
    // Cross-feature fetch for active passes via service
    const amenityBookingService = (await import('../amenityBooking/amenityBooking.services.js')).default;
    const activeBookings = await amenityBookingService.getActivePasses(userId, orgId);
    
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
      paymentStatus: b.paymentStatus,
      pricingDetails: b.pricingDetails,
      amenityRules: b.amenityId?.bookingRules,
      numberOfPersons: b.numberOfPersons || 1
    }));

    const transactionHistory = transactions.map(t => t.toObject());

    return {
      balance: wallet.balance,
      activePasses,
      transactionHistory
    };
  }

  async createRechargeOrder(userId, amount) {
    const isMock = process.env.PAYMENT_PROVIDER === 'mock' || !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'dummy_key' || process.env.RAZORPAY_KEY_ID === 'test_key';

    if (isMock) {
      logger.info('Creating Mock Razorpay Recharge Order', { userId, amount });
      return {
        id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
        amount: amount * 100, // Razorpay works in paise
        currency: "INR",
        status: "created"
      };
    }

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `rcpt_${userId}_${Date.now()}`.substring(0, 40)
    };

    try {
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      logger.error('Failed to create Razorpay order', error);
      throw new HttpError(500, 'Failed to create Razorpay order');
    }
  }

  async verifyPaymentSignature(userId, orgId, paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = paymentData;

    const isMock = process.env.PAYMENT_PROVIDER === 'mock' || !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'dummy_key' || process.env.RAZORPAY_KEY_ID === 'test_key';

    if (isMock) {
      logger.info('Verifying Mock Razorpay Signature', { userId, orgId, paymentData });
      if (razorpay_signature === 'invalid_mock_signature') {
        throw new HttpError(400, 'Invalid payment signature');
      }

      const numericAmount = Number(amount);

      // Update wallet balance
      const updatedWallet = await walletRepository.updateBalance(userId, orgId, numericAmount);

      // Log transaction
      const transaction = await walletRepository.createRazorpayTransaction({
        orgId,
        userId,
        transactionId: `TXN-${razorpay_payment_id || 'mock_' + Date.now()}`,
        amount: numericAmount,
        paymentStatus: 'success',
        razorpay_order_id: razorpay_order_id || `order_mock_${Date.now()}`,
        razorpay_payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
        description: 'Wallet Recharge via Mock Razorpay'
      });

      walletEventEmitter.emit(WALLET_UPDATED, { userId, orgId, balance: updatedWallet.balance });
      walletEventEmitter.emit(WALLET_TRANSACTION_CREATED, transaction);

      return transaction;
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new HttpError(400, 'Invalid payment signature');
    }

    const numericAmount = Number(amount);

    // Update wallet balance
    const updatedWallet = await walletRepository.updateBalance(userId, orgId, numericAmount);
    
    // Log transaction
    const transaction = await walletRepository.createRazorpayTransaction({
      orgId,
      userId,
      transactionId: `TXN-${razorpay_payment_id}`,
      amount: numericAmount,
      paymentStatus: 'success',
      razorpay_order_id,
      razorpay_payment_id,
      description: 'Wallet Recharge via Razorpay'
    });

    walletEventEmitter.emit(WALLET_UPDATED, { userId, orgId, balance: updatedWallet.balance });
    walletEventEmitter.emit(WALLET_TRANSACTION_CREATED, transaction);

    return transaction;
  }
}

export default new WalletService();
