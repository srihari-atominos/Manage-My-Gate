import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Org = (await import('./src/features/organization/organization.model.js')).default;
  const org = await Org.findOne({}).lean();
  console.log(org.allowedFeatures);
  process.exit(0);
}
run();
