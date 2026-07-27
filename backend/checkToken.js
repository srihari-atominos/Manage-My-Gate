import mongoose from 'mongoose';
import authService from './src/features/auth/auth.services.js';
import User from './src/features/user/user.model.js';
import { Permission } from './src/features/permission/permission.model.js';

async function checkToken() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const user = await User.findOne({ email: 'naveenpv5886@gmail.com' });
  const payload = await authService.getScopedTokenPayload(user);
  console.log('Permissions in token:', payload.permissions.length);
  console.log('Has workspaces:read?', payload.permissions.includes('workspaces:read'));
  console.log('Has notices:polls?', payload.permissions.includes('notices:polls'));
  
  if (!payload.permissions.includes('workspaces:read')) {
    console.log('All perms in token:', payload.permissions.join(', '));
  }
  process.exit(0);
}
checkToken();
