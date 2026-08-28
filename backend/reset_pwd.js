import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://admin:adminpassword@localhost:27018/manage-my-gate?authSource=admin';

mongoose.connect(uri).then(async () => {
  const hash = await bcrypt.hash('password', 10);
  const res = await mongoose.connection.collection('users').updateMany(
    {
      $or: [
        { username: 'admin' },
        { email: 'admin@mygate.com' },
        { email: 'admin@managemygate.com' },
        { name: 'Community Admin' },
      ],
    },
    { $set: { username: 'admin', password: hash, status: 'Active' } }
  );
  console.log(`Password reset to 'password' for ${res.modifiedCount} user(s).`);
  process.exit(0);
}).catch((err) => {
  console.error('Failed to reset password:', err);
  process.exit(1);
});
