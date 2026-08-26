import mongoose from 'mongoose';
import Organization from './src/features/organization/organization.model.js';
import Enquiry from './src/features/platformCrm/enquiry.model.js';
import CrmInquiry from './src/features/crmInquiry/crmInquiry.model.js';
import PlatformQuote from './src/features/platformQuote/platformQuote.model.js';

async function fixOrg() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');

  const email = 'naveenpv5886@gmail.com';
  const inquiry = await Enquiry.findOne({ $or: [{ email: email }, { contactEmail: email }] }).sort({ createdAt: -1 });
  const crmInq = await CrmInquiry.findOne({ $or: [{ email: email }, { contactEmail: email }] }).sort({ createdAt: -1 });
  const targetInquiry = inquiry || crmInq;
  const quote = targetInquiry ? await PlatformQuote.findOne({ inquiryId: targetInquiry._id }).sort({ createdAt: -1 }) : null;

  const selectedPlan = quote?.pricingSnapshot?.planName || quote?.pricingSnapshot?.tier || targetInquiry?.planName || 'COMMUNITY_PROFESSIONAL';
  const addOns = quote?.pricingSnapshot?.selectedAddOns || targetInquiry?.selectedFeatures || [];
  const customAddonKeys = Array.isArray(addOns) ? addOns.map(a => (typeof a === 'string' ? a : a.code || a.key || a.name)) : [];

  let basePlanFeatures = ['visitor', 'villas', 'users', 'roles', 'complaints', 'notices'];
  const planUpper = String(selectedPlan).toUpperCase();
  if (planUpper.includes('STARTER')) {
    basePlanFeatures = ['visitor', 'villas', 'users', 'roles', 'complaints'];
  } else if (planUpper.includes('ENTERPRISE')) {
    basePlanFeatures = ['visitor', 'villas', 'users', 'roles', 'complaints', 'amenities', 'notices', 'integrations', 'billing'];
  }

  const finalAllowedFeatures = Array.from(new Set([...basePlanFeatures, ...customAddonKeys]));

  const orgs = await Organization.find({ $or: [{ contactEmail: email }, { name: 'Hallan Illam' }] });
  for (const org of orgs) {
    org.allowedFeatures = finalAllowedFeatures;
    await org.save();
    console.log(`Updated Org "${org.name}" allowedFeatures to:`, org.allowedFeatures);
  }

  await mongoose.disconnect();
}

fixOrg();
