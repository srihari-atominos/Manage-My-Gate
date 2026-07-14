import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from './src/features/complaint/complaint.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const complaints = await Complaint.find().select('complaintNumber orgId title').lean();
    console.log(complaints);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

test();
