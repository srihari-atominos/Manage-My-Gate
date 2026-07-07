import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { syncPermissions } from './src/utils/permissionSync.util.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  await syncPermissions();
  console.log('Sync complete');
  mongoose.disconnect();
}

run().catch(console.error);
