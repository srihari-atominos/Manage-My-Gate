import mongoose from 'mongoose';
import { Permission } from '../backend/src/features/permission/permission.model.js';
import { RolePermission } from '../backend/src/features/rolePermission/rolePermission.model.js';
import Role from '../backend/src/features/role/role.model.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manage_my_gate_dev';

async function inspect() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const role = await Role.findOne({ name: 'Community Admin' });
  if (!role) {
    console.log('Community Admin role not found!');
    await mongoose.disconnect();
    return;
  }

  console.log('Role found:', role.name, role._id);

  const mappings = await RolePermission.find({ roleId: role._id }).populate('permissionId');
  console.log('Role has', mappings.length, 'permissions:');
  const names = mappings.map(m => m.permissionId ? m.permissionId.name : 'null');
  console.log(names.sort());

  await mongoose.disconnect();
}

inspect();
