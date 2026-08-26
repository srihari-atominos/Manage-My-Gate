import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Complaint from './src/features/complaint/complaint.model.js';

async function clearComplaints() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database...');

    const result = await Complaint.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} complaint records from database.`);

  } catch (error) {
    console.error('Error clearing complaints:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB database.');
  }
}

clearComplaints();
