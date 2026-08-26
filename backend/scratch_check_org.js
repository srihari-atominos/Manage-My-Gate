import mongoose from 'mongoose';
import Organization from './src/features/organization/organization.model.js';
import Enquiry from './src/features/platformCrm/enquiry.model.js';
import CrmInquiry from './src/features/crmInquiry/crmInquiry.model.js';
import PlatformQuote from './src/features/platformQuote/platformQuote.model.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');

  const email = 'naveenpv5886@gmail.com';
  const inquiry = await Enquiry.findOne({ $or: [{ email: email }, { contactEmail: email }] }).sort({ createdAt: -1 });
  const crmInq = await CrmInquiry.findOne({ $or: [{ email: email }, { contactEmail: email }] }).sort({ createdAt: -1 });
  const targetInquiry = inquiry || crmInq;
  const quote = targetInquiry ? await PlatformQuote.findOne({ inquiryId: targetInquiry._id }).sort({ createdAt: -1 }) : null;

  console.log('Inquiry Plan:', targetInquiry?.planName);
  console.log('Inquiry Selected Features:', targetInquiry?.selectedFeatures);
  console.log('Quote Pricing Snapshot:', JSON.stringify(quote?.pricingSnapshot));

  const org = await Organization.findOne({ $or: [{ contactEmail: email }, { name: 'Hallan Illam' }] });
  console.log('Current Org Plan:', org?.subscriptionPlan);
  console.log('Current Org allowedFeatures:', org?.allowedFeatures);

  await mongoose.disconnect();
}

check();
