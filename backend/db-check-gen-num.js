import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import complaintService from './src/features/complaint/complaint.service.js';
import Organization from './src/features/organization/organization.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const org = await Organization.findOne();
    const num = await complaintService.generateComplaintNumber(org._id);
    console.log('Next number:', num);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
