import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false, collection: 'invoices' }));
  const inv = await Invoice.findById('6a5f5a13874b927d0f98d688');
  console.log('Full Invoice JSON:', JSON.stringify(inv, null, 2));

  process.exit(0);
}

run().catch(console.error);
