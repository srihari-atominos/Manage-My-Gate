import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ComplaintSettings from './src/features/complaintSettings/complaintSettings.model.js';
import Organization from './src/features/organization/organization.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const org = await Organization.findOne();
    const settings = await ComplaintSettings.findOne({ orgId: org._id });
    const elec = settings.categories.find(c => c.name === 'Electrical');
    console.log('Electrical issues count:', elec?.suggestedIssues?.length);
    console.log('Electrical issues:', elec?.suggestedIssues?.map(i => i.name));
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

check();
