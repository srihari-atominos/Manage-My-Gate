import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const roles = await mongoose.connection.collection('roles').find({
    _id: { $in: [new mongoose.Types.ObjectId('6a47a732444a6291458e23b1'), new mongoose.Types.ObjectId('6a48949a431c98c631c618c2')] }
  }).toArray();
  console.log(roles.map(r => r.name));
  mongoose.disconnect();
}
check();
