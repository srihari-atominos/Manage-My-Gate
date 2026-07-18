import mongoose from 'mongoose';
import orgMembershipService from './src/features/orgMembership/orgMembership.services.js';
import User from './src/features/user/user.model.js';
import OrgMembership from './src/features/orgMembership/orgMembership.model.js';

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  
  const user = await User.findOne({ email: 'testuser@example.com' });
  const membership = await OrgMembership.findOne({ userId: user._id });
  
  console.log('OrgId:', membership.orgId);
  
  const result = await orgMembershipService.getPaginatedUsersForOrg(membership.orgId, 1, 10, {});
  
  console.log(JSON.stringify(result.data.find(u => u.email === 'testuser@example.com'), null, 2));
  
  await mongoose.disconnect();
}
test().catch(console.error);
