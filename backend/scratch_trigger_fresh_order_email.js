import mongoose from 'mongoose';
import './src/features/user/user.model.js';
import platformQuoteService from './src/features/platformQuote/platformQuote.service.js';
import CrmInquiry from './src/features/crmInquiry/crmInquiry.model.js';

async function triggerOrderEmail() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');

  let inquiry = await CrmInquiry.findOne({ contactEmail: 'naveenpv5886@gmail.com' });
  if (!inquiry) {
    inquiry = await CrmInquiry.create({
      organizationName: 'Hallan Illam',
      customerName: 'Naveen Pv',
      contactEmail: 'naveenpv5886@gmail.com',
      contactPhone: '+919876543210',
      status: 'DEMO_COMPLETED',
      unitCount: 250
    });
  }

  console.log('Generating fresh Order & Payment email for Inquiry:', inquiry._id);

  const orderResult = await platformQuoteService.generateOrderForInquiry(
    inquiry._id,
    {
      billingCycle: 'YEARLY',
      trialDays: 14,
      isTrial: true,
      freeTrialDuration: 14,
      adminDiscountPercent: 10,
      tierPrice: 50000,
      basePrice: 50000,
      perUnitRate: 500,
      setupFee: 5000,
      subtotal: 180000,
      discountAmount: 18000,
      taxAmount: 24300,
      calculatedTotal: 186300,
      totalAmount: 186300,
      grandTotal: 186300,
      dueToday: 0,
      unitCount: 250,
      planName: 'COMMUNITY_ENTERPRISE',
      skipStatusCheck: true,
      selectedAddOns: [
        { code: 'billing', name: 'Billing & Collection' },
        { code: 'complaints', name: 'Helpdesk & Complaints' },
        { code: 'visitor', name: 'Visitor Management' }
      ]
    },
    null,
    'System Admin'
  );

  console.log('Order generated successfully! Quote Number:', orderResult.quote?.quoteNumber);
  await mongoose.disconnect();
}

triggerOrderEmail();
