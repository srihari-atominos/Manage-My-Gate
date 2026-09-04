import { paymentEventEmitter, PAYMENT_SUCCESS } from '../payment/payment.events.js';
import invoiceService from './invoice.services.js';
import logger from '../../utils/logger.utils.js';
import Invoice from './invoice.model.js';

/**
 * Register background event listeners for the Invoice module.
 */
export const registerInvoiceListeners = () => {
  paymentEventEmitter.on(PAYMENT_SUCCESS, async (payment) => {
    if (payment.referenceType === 'Invoice') {
      try {
        logger.info(`Processing PAYMENT_SUCCESS for Invoice ${payment.referenceId}`);
        // Avoid double processing if already paid
        const invoice = await Invoice.findById(payment.referenceId);
        if (invoice && invoice.status !== 'PAID') {
           let methodToUse = payment.paymentMethod;
           const validMethods = ['UPI', 'CARD', 'NETBANKING', 'BANK_TRANSFER', 'NEFT', 'CASH', 'WALLET', 'RAZORPAY'];
           if (!methodToUse || methodToUse === 'credit_card' || !validMethods.includes(methodToUse)) {
             methodToUse = 'RAZORPAY';
           }

           await invoiceService.settleInvoicePayment(payment.referenceId, {
             paymentMethod: methodToUse,
             amount: payment.amount,
             paid_at: new Date(),
             settled_at: new Date(),
             offlineReference: payment.gatewayTransactionId,
           });
           logger.info(`Successfully settled Invoice ${payment.referenceId} via PAYMENT_SUCCESS event`);
        } else {
           logger.info(`Invoice ${payment.referenceId} is already PAID or not found. Skipping settlement.`);
        }
      } catch (err) {
        logger.error('Failed to handle PAYMENT_SUCCESS for invoice', err);
      }
    }
  });
};

// Auto-register immediately upon import
registerInvoiceListeners();
