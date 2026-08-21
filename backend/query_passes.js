import mongoose from 'mongoose';
import { VisitorPass } from './src/features/visitorPass/visitorPass.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const passes = await VisitorPass.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log(JSON.stringify(passes, null, 2));
  process.exit(0);
}
run();
