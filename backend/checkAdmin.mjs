import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const role = await mongoose.connection.collection('roles').findOne({name: 'Admin'});
  if (!role) {
    console.log('Admin role not found');
  } else {
    const rp = await mongoose.connection.collection('rolepermissions').find({roleId: role._id}).toArray();
    const perms = await mongoose.connection.collection('permissions').find({_id: {$in: rp.map(p => p.permissionId)}}).toArray();
    console.log('Admin total perms:', perms.length);
    console.log('Has complaints:assign?', perms.some(p => p.name === 'complaints:assign'));
  }
  mongoose.disconnect();
}
check();
