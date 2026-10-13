import mongoose from 'mongoose';

mongoose.connect('mongodb://admin:password@127.0.0.1:27019/manage_my_gate_dev?authSource=admin&directConnection=true').then(async () => {
  const db = mongoose.connection.useDb('manage_my_gate_dev');
  const user = await db.collection('users').findOne({email: 'naveen@atominosconsulting.com'});
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}).catch(console.error);
