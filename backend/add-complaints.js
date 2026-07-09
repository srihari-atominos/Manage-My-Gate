import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { syncPermissions } from './src/utils/permissionSync.util.js';
import Organization from './src/features/organization/organization.model.js';
import Role from './src/features/role/role.model.js';
import Permission from './src/features/permission/permission.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // 1. Sync permissions from JSON
    await syncPermissions();

    // 2. Add 'complaints' to all existing organizations' allowedFeatures
    const updateResult = await Organization.updateMany(
      { allowedFeatures: { $ne: 'complaints' } },
      { $push: { allowedFeatures: 'complaints' } }
    );
    console.log(`Updated ${updateResult.modifiedCount} organizations to include 'complaints' feature.`);

    // 3. Find all Complaint permissions
    const complaintPerms = await Permission.find({ feature: 'complaints' });
    const complaintPermIds = complaintPerms.map(p => p._id);
    
    // 4. Add these permissions to all 'Community Admin' and 'Super Admin' roles
    const adminRoles = await Role.find({ name: { $in: ['Community Admin', 'Super Admin', 'Platform Super Admin'] } });
    let rolePermUpdates = 0;

    for (const role of adminRoles) {
      for (const permId of complaintPermIds) {
        // Upsert role permission
        const existing = await RolePermission.findOne({ roleId: role._id, permissionId: permId });
        if (!existing) {
          await RolePermission.create({ roleId: role._id, permissionId: permId });
          rolePermUpdates++;
        }
      }
    }
    
    console.log(`Added ${rolePermUpdates} RolePermission entries for admin roles.`);
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

run();
