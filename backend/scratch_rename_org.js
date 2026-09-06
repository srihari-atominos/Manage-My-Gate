import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Organization from './src/features/organization/organization.model.js';

async function renameOrg() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev');
  const res = await Organization.updateOne({}, { $set: { name: 'comm' } });
  console.log('Renamed org to comm:', res);
  process.exit(0);
}
renameOrg();
