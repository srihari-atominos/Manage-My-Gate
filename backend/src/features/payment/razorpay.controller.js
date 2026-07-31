import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import WalletLedger from '../wallet/walletLedger.model.js';
import AmenityBooking from '../amenityBooking/amenityBooking.model.js';
import HttpError from '../../utils/httpError.utils.js';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret'
});

class RazorpayController {
  
  /**
   * 1. Initiate Payment: Creates a Razorpay Order
   */
  async initiatePayment(req, res, next) {
    try {
      const { amount, currency = 'INR', receipt, notes } = req.body;
      const userId = req.user?._id || req.body.userId;

      if (!amount || !userId) {
        throw new HttpError(400, 'Amount and User ID are required.');
      }

      const options = {
        amount: amount * 100, // Razorpay expects amount in smallest currency unit (paise)
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: {
          ...notes,
          userId: userId.toString()
        }
      };

      const order = await razorpay.orders.create(options);

      res.status(200).json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. Webhook Handler for Razorpay Events
   */
  async razorpayWebhook(req, res, next) {
    try {
      // 3. Cryptographic Signature Verification (HMAC SHA256)
      const webhookSignature = req.headers['x-razorpay-signature'];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      // FIX GAP 1: Use req.rawBody captured by Express router middleware
      if (!req.rawBody) {
        throw new Error('rawBody is missing. Ensure router uses express.json({ verify: ... })');
      }
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody)
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        console.error('Invalid Razorpay Signature');
        return res.status(400).send('Invalid signature');
      }

      // Valid Signature - Process Event
      const event = req.body.event;
      const payload = req.body.payload;

      // 4. ACID Compliant Database Updates
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          
          if (event === 'payment.captured') {
            const payment = payload.payment.entity;
            const userId = payment.notes?.userId;
            const amountInRupees = payment.amount / 100;
            const paymentId = payment.id;

            if (userId) {
              // FIX GAP 2: Idempotency Check (Prevent Double-Credit)
              const existingLedger = await WalletLedger.findOne({ 
                description: `Razorpay Wallet Recharge: ${paymentId}` 
              }).session(session);

              if (!existingLedger) {
                const newLedgerEntry = new WalletLedger({
                  userId,
                  amount: amountInRupees,
                  transactionType: 'credit',
                  description: `Razorpay Wallet Recharge: ${paymentId}`
                });
                await newLedgerEntry.save({ session });
              }
            }
          } 
          
          else if (event === 'refund.processed') {
            const refund = payload.refund.entity;
            const paymentId = refund.payment_id;
            
            // FIX GAP 3: Use razorpayTransactionId matching the schema
            const booking = await AmenityBooking.findOne({ razorpayTransactionId: paymentId }).session(session);
            
            if (booking) {
              booking.paymentStatus = 'refunded';
              booking.status = 'cancelled';
              await booking.save({ session });
            }
          }
          
        });
        
        // Transaction successful
        res.status(200).json({ status: 'ok' });
        
      } catch (dbError) {
        console.error('Webhook DB Transaction Error:', dbError);
        res.status(500).json({ error: 'Internal Database Error' });
      } finally {
        await session.endSession();
      }

    } catch (error) {
      next(error);
    }
  }
}

export default new RazorpayController();
