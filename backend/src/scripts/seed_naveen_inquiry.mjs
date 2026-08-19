import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import '../features/user/user.model.js';
import crmInquiryService from '../features/crmInquiry/crmInquiry.service.js';
import userService from '../features/user/user.services.js';

async function seedNaveenInquiry() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    const email = 'naveenpv5886@gmail.com';
    const user = await userService.getUserByEmail(email).catch(() => null);

    const customerName = user?.name || user?.username || 'Naveen Vijayakumar';
    const organizationName = 'Naveen Community Compound';
    const unitCount = 150;
    const contactPhone = user?.phone || '+966550000000';

    console.log(`Creating CRM Inquiry for ${email}...`);

    const inquiry = await crmInquiryService.createInquiry({
      customerName,
      organizationName,
      unitCount,
      contactEmail: email,
      contactPhone,
      originSource: 'WEB_FORM',
    });

    console.log('Successfully created CRM Inquiry:', inquiry.inquiryId, 'Status:', inquiry.status);
  } catch (err) {
    console.error('Error creating inquiry:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedNaveenInquiry();
