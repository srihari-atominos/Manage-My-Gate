import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Role from './src/features/role/role.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
const ORG_ID = '6a9513437911e056d83636ea';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find Permission model (assuming it is registered or has schema)
  const Permission = mongoose.model('Permission', new mongoose.Schema({}, { strict: false }));
  
  // Find 'billing' 'action_center' permission
  const perm = await Permission.findOne({ feature: 'billing', action: 'action_center' });
  if (!perm) {
    console.error('Permission billing:action_center not found in database!');
    process.exit(1);
  }
  console.log('Found Permission:', perm._id, perm.feature, perm.action);

  // Find Family Member Role for the org
  const role = await Role.findOne({ orgId: ORG_ID, name: 'Family Member' });
  if (!role) {
    console.error('Family Member Role not found for organization!');
    process.exit(1);
  }
  console.log('Found Role:', role._id, role.name);

  // Link role with permission in RolePermission
  const exists = await RolePermission.findOne({ roleId: role._id, permissionId: perm._id });
  if (!exists) {
    await RolePermission.create({ roleId: role._id, permissionId: perm._id });
    console.log('Successfully granted billing:action_center to Family Member role!');
  } else {
    console.log('Permission billing:action_center is already granted to Family Member role.');
  }

  process.exit(0);
}

run().catch(console.error);
