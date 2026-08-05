import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './backend/src/features/user/user.model.js';
import Role from './backend/src/features/role/role.model.js';

async function checkAdminPermissions() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'admin@enterprise.com' }).lean();
  console.log('User raw:', user);

  if (user && user.roles && user.roles.length > 0) {
    const roles = await Role.find({ _id: { $in: user.roles } }).lean();
    console.log('User roles:', roles);
  }
  process.exit(0);
}

checkAdminPermissions();
