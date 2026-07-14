import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Villa from '../src/features/villa/villa.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gated_community';

async function checkVillas() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const totalVillas = await Villa.countDocuments({});
    console.log(`\n=============================================`);
    console.log(`TOTAL VILLAS / UNITS IN DB: ${totalVillas}`);
    console.log(`=============================================`);

    if (totalVillas > 0) {
      const sample = await Villa.find({}).limit(5);
      console.log('\nSample Villas in DB:');
      sample.forEach(v => {
        console.log(`- ID: ${v._id}, orgId: ${v.orgId}, Unit: ${v.unitNumber}, Status: ${v.status}, Residents Count: ${v.residents?.length || 0}`);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error checking villas in DB:', error);
    process.exit(1);
  }
}

checkVillas();
