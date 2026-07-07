import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import Permission from './src/features/permission/permission.model.js';
import RolePermission from './src/features/rolePermission/rolePermission.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const historyPerm = await Permission.findOne({ feature: 'amenities', action: 'history' });
  const settingsPerm = await Permission.findOne({ feature: 'amenities', action: 'settings' });

  const idsToRemove = [];
  if (historyPerm) idsToRemove.push(historyPerm._id);
  if (settingsPerm) idsToRemove.push(settingsPerm._id);

  if (idsToRemove.length > 0) {
    console.log('Deleting permissions:', idsToRemove);
    await Permission.deleteMany({ _id: { $in: idsToRemove } });
    await RolePermission.deleteMany({ permissionId: { $in: idsToRemove } });
    console.log('Successfully deleted permissions and role mappings.');
  } else {
    console.log('Permissions not found in DB.');
  }

  mongoose.disconnect();
}

run().catch(console.error);
