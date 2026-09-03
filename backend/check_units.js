import mongoose from 'mongoose';
import { Villa } from './src/features/villa/villa.model.js';

const uri = 'mongodb://127.0.0.1:27017/database_name';

async function runSim() {
  await mongoose.connect(uri);
  const orgId = '6a6efd60f62f21f2b26eb9a0';
  
  try {
    const units = await Villa.find({ orgId: new mongoose.Types.ObjectId(orgId), status: 'Occupied' });
    console.log('Units found:', units.map(u => u.unitNumber || u.villaNumber));
  } catch (err) {
    console.error('Error generating:', err);
  }

  await mongoose.disconnect();
}

runSim().catch(console.error);
