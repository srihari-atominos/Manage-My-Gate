import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const { bulkValidateUsers } = await import('./src/features/user/user.services.js').then(m => m.default);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = (await import('./src/features/user/user.model.js')).default;
  const OrgMembership = (await import('./src/features/orgMembership/orgMembership.model.js')).default;
  
  const user = await User.findOne({ email: 'naveen@atominosconsulting.com' }).lean();
  console.log('User:', user ? user._id : 'Not found');
  
  if (user) {
    const memberships = await OrgMembership.find({ userId: user._id }).lean();
    console.log('Memberships:', memberships.map(m => ({ orgId: m.orgId, status: m.status })));
  }
  
  mongoose.disconnect();
}
check();
