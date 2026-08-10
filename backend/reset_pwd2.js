import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate').then(async () => {
  const hash = await bcrypt.hash('Test@1234', 10);
  const result = await mongoose.connection.collection('users').updateOne({email: 'admin@enterprise.com'}, {$set: {password: hash}});
  console.log('Password reset result:', result);
  process.exit(0);
});
