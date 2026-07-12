import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Atominos Consulting/web app/Manage-My-Gate/backend/.env' });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function main() {
  console.log('Connecting to:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const visitorPassSchema = new mongoose.Schema({}, { strict: false });
  const VisitorPass = mongoose.models.VisitorPass || mongoose.model('VisitorPass', visitorPassSchema, 'visitorpasses');

  const passes = await VisitorPass.find({}).sort({ createdAt: -1 }).limit(5);
  console.log('\n--- RECENT VISITOR PASSES IN DATABASE ---');
  console.log(JSON.stringify(passes, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
