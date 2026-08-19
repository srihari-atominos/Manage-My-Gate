import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import platformPaymentService from '../features/platformPayment/platformPayment.service.js';

async function testDispatchEmail() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    console.log('Dispatching instant Organization Access & Order Confirmation email via Gmail SMTP...');
    await platformPaymentService.sendOrganizationAccessEmail({
      recipientEmail: 'naveenpv5886@gmail.com',
      orgName: 'Green Villa',
      amount: 186300,
      quoteId: 'Q-9610-V2',
      currency: 'INR'
    });
    console.log('✅ Email dispatch operation completed!');
  } catch (err) {
    console.error('Error dispatching test email:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testDispatchEmail();
