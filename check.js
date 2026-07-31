
const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const OrgMembership = mongoose.model('OrgMembership', new mongoose.Schema({}, { strict: false }));
  const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }));
  
  const user = await User.findOne({ email: 'naveenpv5886@gmail.com' });
  console.log('User:', user._id);
  
  const membership = await OrgMembership.findOne({ userId: user._id });
  console.log('Membership roleIds:', membership.roleIds);
  console.log('Membership roleId:', membership.roleId);
  
  const roles = await Role.find({ _id: { $in: membership.roleIds || [] }});
  console.log('Roles:', roles.map(r => r.name));
  
  process.exit(0);
});

