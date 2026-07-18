import mongoose from 'mongoose';
import User from './src/features/user/user.model.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const user = await User.findOne({ email: 'testuser@example.com' });
  console.log('User Name:', user.name);
  console.log('User Phone:', user.phone);
  console.log('User Username:', user.username);
  await mongoose.disconnect();
}
check().catch(console.error);
