import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import permissionService from '../features/permission/permission.services.js';
import roleService from '../features/role/role.services.js';
import rolePermissionService from '../features/rolePermission/rolePermission.services.js';
import userService from '../features/user/user.services.js';
import logger from './logger.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads permissions.json, syncs all permission entries to MongoDB,
 * maps all permissions to the 'Super Admin' role, and bootstraps a Super Admin user.
 */
export const syncPermissions = async () => {
  try {
    logger.info('Starting permission synchronization and Super Admin bootstrapping...');

    // 1. Read the permissions.json list
    const permissionsPath = path.resolve(__dirname, '../config/permissions.json');
    const fileData = await readFile(permissionsPath, 'utf8');
    const features = JSON.parse(fileData);

    // 2. Upsert permissions
    const upsertedPermissions = [];
    for (const item of features) {
      const { feature, actions } = item;
      for (const action of actions) {
        const permission = await permissionService.upsertPermission(feature, action);
        upsertedPermissions.push(permission);
      }
    }
    logger.info(`Synced ${upsertedPermissions.length} permissions successfully in database.`);

    // 3. Upsert default 'Super Admin' role
    let superAdminRole = await roleService.getRoleByName('Super Admin');
    if (!superAdminRole) {
      superAdminRole = await roleService.createRole({
        name: 'Super Admin',
        description: 'System-wide Super Administrator role with full access permissions.',
      });
      logger.info('Created "Super Admin" role.');
    }

    // 4. Map all system permissions to Super Admin role
    const permissionIds = upsertedPermissions.map((p) => p._id.toString());
    await rolePermissionService.updateRolePermissions(superAdminRole._id.toString(), permissionIds);
    logger.info('Mapped all system permissions to the "Super Admin" role.');

    // 5. Bootstrap default Super Admin user using env credentials
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminUsername = process.env.SUPER_ADMIN_USERNAME;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminUsername || !adminPassword) {
      logger.warn('Super Admin environment credentials missing. Skipping Super Admin user bootstrapping.');
      return;
    }

    let superAdminUser = await userService.getUserByEmail(adminEmail);

    if (!superAdminUser) {
      superAdminUser = await userService.createUser({
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        isPlatformAdmin: true,
      });
      logger.info(`Successfully bootstrapped default Super Admin user: email="${adminEmail}", username="${adminUsername}"`);
    } else {
      if (!superAdminUser.isPlatformAdmin) {
        await userService.updateUser(superAdminUser._id.toString(), { isPlatformAdmin: true });
        logger.info('Super Admin user role updated to platform administrator.');
      } else {
        logger.info('Super Admin user already bootstrapped.');
      }
    }

    logger.info('Permission synchronization and Super Admin bootstrapping finished successfully.');
  } catch (error) {
    logger.error('Failed to synchronize permissions and bootstrap Super Admin user:', error);
    throw error;
  }
};

export default syncPermissions;
