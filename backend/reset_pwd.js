import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

mongoose.connect('mongodb://localhost:27017/manage_my_gate_dev').then(async () => {
  const hash = await bcrypt.hash('Test@1234', 10);
  await mongoose.connection.collection('users').updateOne({email: 'admin@enterprise.com'}, {$set: {password: hash}});
  console.log('Password reset to Test@1234');
  process.exit(0);
});
