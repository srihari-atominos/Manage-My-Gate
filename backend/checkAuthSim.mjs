import mongoose from 'mongoose';
import './src/features/roleBuilder/permission.model.js';
import rolePermissionRepository from './src/features/rolePermission/rolePermission.repository.js';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/manage_my_gate');
  const role = await mongoose.connection.collection('roles').findOne({name: 'Super Admin'});
  
  // Simulate what auth.services.js does:
  const mappings = await rolePermissionRepository.findByRoleId(role._id);
  const permissionsList = mappings.map(m => m.permissionId).filter(p => p !== null && p !== undefined);
  const permissions = permissionsList.map((permission) => permission.name);
  
  console.log('Super Admin permissions count from auth simulation:', permissions.length);
  console.log('Includes complaints:assign?', permissions.includes('complaints:assign'));
  
  mongoose.disconnect();
}
check();
