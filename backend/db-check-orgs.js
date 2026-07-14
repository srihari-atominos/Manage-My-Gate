import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Organization from './src/features/organization/organization.model.js';
import Complaint from './src/features/complaint/complaint.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const orgs = await Organization.find();
    console.log('Orgs:', orgs.map(o => o._id));
    
    const complaints = await Complaint.find().limit(1);
    console.log('Complaint orgId:', complaints[0].orgId);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
