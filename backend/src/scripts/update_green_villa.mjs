import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import crmInquiryService from '../features/crmInquiry/crmInquiry.service.js';
import CrmInquiry from '../features/crmInquiry/crmInquiry.model.js';

async function updateGreenVilla() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage-my-gate';
  await mongoose.connect(mongoUri);

  try {
    const email = 'naveenpv5886@gmail.com';
    let inquiry = await CrmInquiry.findOne({ contactEmail: email });

    if (inquiry) {
      inquiry.organizationName = 'Green Villa';
      await inquiry.save();
      console.log('Updated existing Inquiry to Green Villa:', inquiry.inquiryId);
    } else {
      inquiry = await crmInquiryService.createInquiry({
        customerName: 'Naveen Vijayakumar',
        organizationName: 'Green Villa',
        unitCount: 150,
        contactEmail: email,
        contactPhone: '+966550000000',
        originSource: 'WEB_FORM',
      });
      console.log('Created new Green Villa Inquiry:', inquiry.inquiryId);
    }
  } catch (err) {
    console.error('Error updating to Green Villa:', err);
  } finally {
    await mongoose.disconnect();
  }
}

updateGreenVilla();
