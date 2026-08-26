import mongoose from 'mongoose';
import Organization from './src/features/organization/organization.model.js';

async function cleanup() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');

  const orgs = await Organization.find({ isPlatform: { $ne: true } });
  for (const org of orgs) {
    if (!org.organizationType) org.organizationType = 'Residential';
    org.allowedFeatures = ['visitor', 'villas', 'users', 'roles', 'complaints', 'billing'];
    await org.save();
    console.log(`Updated Org "${org.name}" allowedFeatures to:`, org.allowedFeatures);
  }

  await mongoose.disconnect();
}

cleanup();
