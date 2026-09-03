import mongoose from 'mongoose';
import { hashPassword } from './src/utils/crypto.utils.js';
import User from './src/features/user/user.model.js';

async function createGuard() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/database_name');
    
    const email = 'guard123@enterprise.com';
    const password = 'Password@123';
    const orgId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9a0');
    const roleId = new mongoose.Types.ObjectId('6a6efd60f62f21f2b26eb9ed');
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Check if exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists, updating...');
      user.password = hashedPassword;
      user.role = roleId;
      user.orgId = orgId;
      user.status = 'Active';
      await user.save();
    } else {
      console.log('Creating new user...');
      user = new User({
        email,
        password: hashedPassword,
        name: 'Security Guard',
        login: email,
        status: 'Active',
        orgId: orgId,
        role: roleId,
      });
      await user.save();
    }
    
    console.log('Guard user created/updated successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
createGuard();
