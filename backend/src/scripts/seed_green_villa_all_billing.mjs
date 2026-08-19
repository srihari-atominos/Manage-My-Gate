import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import User from '../features/user/user.model.js';
import CrmInquiry from '../features/crmInquiry/crmInquiry.model.js';
import platformQuoteService from '../features/platformQuote/platformQuote.service.js';
import platformSubscriptionService from '../features/platformSubscription/platformSubscription.service.js';
import platformProvisioningJobService from '../features/platformProvisioningJob/platformProvisioningJob.service.js';

async function seedAllBillingData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    let inquiry = await CrmInquiry.findOne({ contactEmail: 'naveenpv5886@gmail.com' }).exec();
    inquiry.status = 'DEMO_COMPLETED';
    await inquiry.save();

    console.log(`Generating complete quote-to-cash records for ${inquiry.organizationName} (${inquiry._id})...`);

    const result = await platformQuoteService.generateOrderForInquiry(inquiry._id, {
      billingCycle: 'YEARLY',
      unitCount: 150,
      adminDiscountPercent: 0
    });

    console.log('Successfully generated full billing records across all 5 aggregate domains:');
    console.log('- Quote ID:', result.quote._id, 'Status:', result.quote.status);
    console.log('- Order ID:', result.order._id, 'Number:', result.order.orderNumber);
    console.log('- Invoice ID:', result.invoice._id, 'Number:', result.invoice.invoiceNumber);
    console.log('- Payment ID:', result.payment._id, 'Amount:', result.payment.amount);
  } catch (err) {
    console.error('Error seeding billing data:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedAllBillingData();
