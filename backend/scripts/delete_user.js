import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function deleteUserDetails() {
  const email = 'naveen12rvb2022@gmail.com';
  console.log(`Connecting to MongoDB...`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB successfully.`);
    
    const db = mongoose.connection.db;
    
    // Delete from users collection
    const userResult = await db.collection('users').deleteMany({ email: email });
    console.log(`Deleted ${userResult.deletedCount} documents from users collection for ${email}.`);
    
    // Delete from enquiries collection
    const enquiryResult = await db.collection('enquiries').deleteMany({ email: email });
    console.log(`Deleted ${enquiryResult.deletedCount} documents from enquiries collection for ${email}.`);

  } catch (error) {
    console.error(`Error deleting user details:`, error);
  } finally {
    await mongoose.disconnect();
    console.log(`Disconnected from MongoDB.`);
  }
}

deleteUserDetails();
