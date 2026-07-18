import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const mems = await mongoose.connection.collection('orgmemberships').find({userId: {$in: users.map(u => u._id)}}).toArray();
  const roles = await mongoose.connection.collection('roles').find({_id: {$in: mems.flatMap(m => m.roleIds || [m.roleId])}}).toArray();
  
  for (const u of users) {
    const uMems = mems.filter(mem => mem.userId.toString() === u._id.toString());
    const uRoles = uMems.flatMap(mem => (mem.roleIds || [mem.roleId]).map(rid => roles.find(r => r._id.toString() === rid?.toString())?.name));
    console.log(u.email, '->', [...new Set(uRoles)].filter(Boolean).join(', '));
  }
  mongoose.disconnect();
}
check();
