import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import complaintRepository from './src/features/complaint/complaint.repository.js';
import Organization from './src/features/organization/organization.model.js';
import Complaint from './src/features/complaint/complaint.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const org = await Organization.findOne();
    const result = await complaintRepository.findAll(org._id, {}, { skip: 0, limit: 1 }, {});
    console.log('Result total:', result.total);
    console.log('Result data length:', result.data.length);
    
    const directCount = await Complaint.countDocuments({ orgId: org._id });
    console.log('Direct count:', directCount);
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
