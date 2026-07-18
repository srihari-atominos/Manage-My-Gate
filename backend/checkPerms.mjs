import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const role = await mongoose.connection.collection('roles').findOne({name: 'Family Member'});
  const rp = await mongoose.connection.collection('rolepermissions').find({roleId: role._id}).toArray();
  const perms = await mongoose.connection.collection('permissions').find({_id: {$in: rp.map(p => p.permissionId)}}).toArray();
  console.log(perms.map(p => p.feature + ':' + p.action));
  mongoose.disconnect();
}
check();
