import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Org = (await import('./src/features/organization/organization.model.js')).default;
  const orgs = await Org.find({}, '_id name').limit(3).lean();
  console.log(JSON.stringify(orgs, null, 2));
  process.exit(0);
}
run();
