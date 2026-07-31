import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Invoice from './src/features/invoice/invoice.model.js';
import userService from './src/features/user/user.services.js';
import paymentService from './src/features/payment/payment.service.js';
import { invoiceEventEmitter, INVOICE_GENERATED } from './src/features/invoice/invoice.events.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage_my_gate';

async function testResend() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const invoices = await Invoice.find({ status: 'UNPAID' });
    console.log(`Found ${invoices.length} unpaid invoices globally.`);

    let resentCount = 0;
    for (const invoice of invoices) {
      console.log(`Processing invoice ${invoice._id} for target user ${invoice.targetUserId}`);
      let targetUser = null;
      try {
        targetUser = await userService.getUserById(invoice.targetUserId);
        console.log(`Target user found: ${targetUser.name} / ${targetUser.phone}`);
      } catch (err) {
        console.log(`Failed to fetch target user for invoice ${invoice._id}`);
      }

      if (targetUser) {
        let paymentLink = invoice.paymentLink;
        
        if (!paymentLink) {
          console.log(`Payment link missing, generating for invoice ${invoice._id}...`);
          try {
            paymentLink = await paymentService.createPaymentLink(invoice, targetUser);
            if (paymentLink) {
              await Invoice.updateOne({ _id: invoice._id }, { $set: { paymentLink } });
              invoice.paymentLink = paymentLink;
              console.log(`Generated payment link: ${paymentLink}`);
            }
          } catch (err) {
            console.log(`Failed to generate missing payment link: ${err.message}`);
          }
        }

        if (paymentLink) {
          const targetPhone = targetUser?.contactSettings?.phone || targetUser?.phone;
          const userName = targetUser?.name || targetUser?.username || 'Resident';

          if (targetPhone) {
            console.log(`Emitting INVOICE_GENERATED for ${targetPhone}`);
            invoiceEventEmitter.emit(INVOICE_GENERATED, {
              invoiceId: invoice._id,
              amount: invoice.totalDue,
              targetPhone,
              userName,
              paymentLink: invoice.paymentLink
            });
            resentCount++;
          } else {
             console.log(`No phone number for user ${userName}`);
          }
        }
      }
    }
    
    console.log(`Resent count: ${resentCount}`);
    
    // Give event emitter time to fire twilio request
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testResend();
