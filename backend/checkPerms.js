import mongoose from 'mongoose';
import { Permission } from './src/features/permission/permission.model.js';

async function checkPerms() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate');
  const perms = await Permission.find({}, 'name group module');
  console.log('Total perms:', perms.length);
  const names = perms.map(p => p.name);
  console.log('Has workspaces:read:', names.includes('workspaces:read'));
  console.log('Has notices:polls:', names.includes('notices:polls'));
  process.exit(0);
}
checkPerms();
