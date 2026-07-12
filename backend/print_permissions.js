import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const Permission = mongoose.models.Permission || mongoose.model('Permission', new mongoose.Schema({
    name: String,
    feature: String,
    action: String
  }));

  const perms = await Permission.find({}).sort({ feature: 1, action: 1 });
  console.log('\n--- ALL PERMISSIONS IN DATABASE ---');
  perms.forEach(p => {
    console.log(`ID: ${p._id} | Name: ${p.name} | Feature: ${p.feature} | Action: ${p.action}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
