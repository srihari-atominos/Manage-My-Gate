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
    const collection = Complaint.collection;
    console.log('Dropping index complaintNumber_1...');
    await collection.dropIndex('complaintNumber_1');
    console.log('Index dropped successfully!');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('Index already dropped or not found');
    } else {
      console.error(err);
    }
  } finally {
    mongoose.disconnect();
  }
}

test();
