import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import RolePermission from '../features/rolePermission/rolePermission.model.js';
import Permission from '../features/permission/permission.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

const migrate = async () => {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env file');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Ensure new permissions exist
    const features = ['dashboard', 'active_board', 'manage_notices', 'polls'];
    const newPermissionIds = {};

    for (const action of features) {
      let perm = await Permission.findOne({ name: `notices:${action}` });
      if (!perm) {
        perm = await Permission.create({
          name: `notices:${action}`,
          feature: 'notices',
          action: action
        });
        console.log(`Created new permission: notices:${action}`);
      }
      newPermissionIds[action] = perm._id;
    }

    // 2. Find old permissions
    const readPerm = await Permission.findOne({ name: 'notices:read' });
    const createPerm = await Permission.findOne({ name: 'notices:create' });
    const updatePerm = await Permission.findOne({ name: 'notices:update' });
    const deletePerm = await Permission.findOne({ name: 'notices:delete' });

    // 3. Update RolePermissions
    const rolePerms = await RolePermission.find({});
    console.log(`Checking ${rolePerms.length} RolePermissions for migration...`);

    let updatedCount = 0;

    for (const rp of rolePerms) {
      let needsUpdate = false;
      const permStrings = rp.permissions.map(p => p.toString());
      const newSet = new Set(permStrings);

      // If they had notices:read, give them active_board and polls
      if (readPerm && newSet.has(readPerm._id.toString())) {
        newSet.delete(readPerm._id.toString());
        newSet.add(newPermissionIds['active_board'].toString());
        newSet.add(newPermissionIds['polls'].toString());
        needsUpdate = true;
      }

      // If they had notices:create, give them dashboard and manage_notices
      if (createPerm && newSet.has(createPerm._id.toString())) {
        newSet.delete(createPerm._id.toString());
        newSet.add(newPermissionIds['dashboard'].toString());
        newSet.add(newPermissionIds['manage_notices'].toString());
        needsUpdate = true;
      }

      // Remove obsolete update/delete permissions
      if (updatePerm && newSet.has(updatePerm._id.toString())) {
        newSet.delete(updatePerm._id.toString());
        needsUpdate = true;
      }
      
      if (deletePerm && newSet.has(deletePerm._id.toString())) {
        newSet.delete(deletePerm._id.toString());
        needsUpdate = true;
      }

      if (needsUpdate) {
        rp.permissions = Array.from(newSet).map(id => new mongoose.Types.ObjectId(id));
        await rp.save();
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} role permissions.`);

    // 4. Optionally delete old permissions
    if (readPerm || createPerm || updatePerm || deletePerm) {
      const oldIds = [readPerm, createPerm, updatePerm, deletePerm].filter(Boolean).map(p => p._id);
      await Permission.deleteMany({ _id: { $in: oldIds } });
      console.log('Cleaned up old notices CRUD permissions.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
